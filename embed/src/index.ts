/**
 * VLAILA — Virtual Labs AI Lab Assistant.
 *
 * Drop-in integration, no configuration:
 *
 *   <script src="https://vlaila.vlabs.ac.in/vlaila.js" defer></script>
 *
 * The widget identifies the lab, the experiment, the discipline, the institute
 * and the current step from the metadata every ph3-lab-mgmt page already
 * publishes. Adding that one line to the shared template covers every lab on
 * the platform in a single upstream commit.
 *
 * Optional attributes:
 *   data-vlaila-api        override the API base URL
 *   data-vlaila-experiment override the detected experiment slug
 *   data-vlaila-locale     force a language (en, hi, …)
 *   data-vlaila-user       pseudonymous key, when an institution has enrolled
 *   data-vlaila-institution institution name, for instructor analytics
 */

import { Api } from "./api";
import type { AgentResponse } from "./api";
import { detect, currentTask } from "./detect";
import { Observer } from "./observer";
import type { StepEvent } from "./observer";
import {
  evaluate,
  progressPercent,
  type ClientRules,
  type LocalState,
  type LocalVerdict,
} from "./rules";
import { Ui, type Intervention } from "./ui";
import type { Avatar } from "./character";
import { detectLocale, t } from "./i18n";
import { Behaviour, type BehaviourSignal, type BehaviourSnapshot } from "./behaviour";
import { Coach, readout, type CoachMode } from "./coach";
import { greeting, pageContext, resolve, type PageContext } from "./navigator";
import { simulatorFrames } from "./detect";

const DEFAULT_API = "https://vlaila.vlabs.ac.in/api";
const OPT_OUT_KEY = "vlaila:opt-out";
const SESSION_KEY = "vlaila:session";

class Vlaila {
  private api!: Api;
  private ui!: Ui;
  private observer!: Observer;
  private rules: ClientRules | null = null;
  private sessionId: string | null = null;
  private locale = "en";
  private ended = false;

  private behaviour!: Behaviour;
  private coach!: Coach;
  private mode: CoachMode = "lab";
  private page: PageContext | null = null;
  /** Signals since the last report, batched so the API sees one call a minute. */
  private pendingSignals: BehaviourSignal[] = [];
  private lastSnapshot: BehaviourSnapshot | null = null;

  /** Local mirror of session memory, so Tier 1 works with no network. */
  private state: LocalState = {
    completed: new Set(),
    shownErrors: new Set(),
    shownConcepts: new Set(),
    hintLevels: {},
    counts: {},
    idleSeconds: 0,
  };

  async boot(): Promise<void> {
    // A student who turns VLAILA off stays off for the whole visit, across
    // page navigations within the experiment.
    if (sessionStorage.getItem(OPT_OUT_KEY) === "1") return;

    const { ref, apiOverride } = detect();

    // No experiment on this page means the portal, a lab's own pages, or a
    // dashboard. The assistant still belongs there -- as a guide rather than a
    // demonstrator -- so it boots in navigator mode instead of bailing out.
    if (!ref) {
      this.bootNavigator(apiOverride);
      return;
    }

    this.locale = detectLocale();
    this.api = new Api(apiOverride || DEFAULT_API);

    const script =
      document.currentScript ?? document.querySelector<HTMLScriptElement>('script[src*="vlaila"]');
    const dataset = (script as HTMLScriptElement | null)?.dataset ?? {};

    const started = await this.api.startSession(ref, {
      userKey: dataset.vlailaUser,
      institution: dataset.vlailaInstitution,
      locale: this.locale,
    });

    // No session means the API is unreachable. Staying silent is the right
    // failure mode: a broken assistant must never become a broken lab page.
    if (!started) return;

    this.sessionId = started.session_id;
    this.rules = started.rules ?? null;
    sessionStorage.setItem(SESSION_KEY, started.session_id);

    this.ui = new Ui(
      {
        onAction: (kind, intervention) => this.onAction(kind, intervention),
        onSend: (message) => void this.onSend(message),
        onReport: (intervention) => this.onReport(intervention),
        onQuizSubmit: (answers) => this.onQuizSubmit(answers),
        onOpen: () => undefined,
        onClose: () => undefined,
        onOptOut: () => {
          sessionStorage.setItem(OPT_OUT_KEY, "1");
          this.observer.stop();
        },
      },
      this.locale,
      Ui.storedAvatar() ?? (dataset.vlailaAvatar as Avatar) ?? "ravi",
    );

    this.ui.setSubtitle(
      started.title ? this.truncate(started.title, 42) : t(this.locale, "subtitle"),
    );

    this.observer = new Observer((event) => void this.onEvent(event));
    this.observer.start();

    this.startBehaviour("lab");

    // Arriving on a page is itself a step in several experiments' procedures.
    const task = currentTask();
    if (task) void this.onEvent({ action: "navigate", task, frame: "host" });

    // A student sitting on one step is the signal for a hint. Poll rather than
    // wait for an interaction, because being stuck means not interacting.
    window.setInterval(() => this.checkStuck(), 10_000);

    // The Feedback page is the platform's own end-of-experiment marker.
    if (task === "Feedback" || task === "Posttest") {
      window.setTimeout(() => void this.finish(), 4000);
    }
    window.addEventListener("pagehide", () => this.flushEnd());
  }

  // -- behaviour ----------------------------------------------------------

  /**
   * Start watching how the session is going, as opposed to what was clicked.
   *
   * Runs in both modes. The engine itself is mode-agnostic; the Coach decides
   * what is worth saying, and its bar is higher off the experiment pages.
   */
  private startBehaviour(mode: CoachMode): void {
    this.mode = mode;
    this.coach = new Coach(mode);
    this.behaviour = new Behaviour(
      (signal) => this.onBehaviourSignal(signal),
      (snapshot) => this.onBehaviourSnapshot(snapshot),
    );
    this.behaviour.start();

    // Simulator frames are separate documents with their own event streams;
    // without this the engine would go blind exactly where it matters most.
    if (mode === "lab") {
      const followFrames = () => {
        for (const { doc } of simulatorFrames()) this.behaviour.attach(doc);
      };
      followFrames();
      window.setInterval(followFrames, 4000);
    }

    // Batched, so a busy session still costs one request a minute.
    window.setInterval(() => this.reportBehaviour(), 60_000);
    window.addEventListener("pagehide", () => this.reportBehaviour());
  }

  private onBehaviourSignal(signal: BehaviourSignal): void {
    this.pendingSignals.push(signal);
    if (this.pendingSignals.length > 40) this.pendingSignals.shift();

    const snapshot = this.lastSnapshot ?? this.behaviour.snapshot();
    const nudge = this.coach.consider(signal, snapshot);
    if (!nudge) return;

    // A behavioural nudge is presented through the same surface as a
    // procedural one, so the student never has to learn two vocabularies --
    // but it is tagged so analytics can tell them apart.
    this.ui.showIntervention({
      kind: nudge.kind,
      title: nudge.title,
      message: nudge.message,
      highlightSelector: nudge.selector,
      highlightFrame: "host",
      actions: nudge.actions,
      tier: "behaviour",
    } as Intervention);
  }

  private onBehaviourSnapshot(snapshot: BehaviourSnapshot): void {
    this.lastSnapshot = snapshot;
    this.ui?.setCoach(readout(snapshot, this.mode), snapshot.metrics);
  }

  private reportBehaviour(): void {
    if (!this.sessionId || !this.lastSnapshot) return;
    if (!this.pendingSignals.length && this.lastSnapshot.metrics.clicks === 0) return;
    void this.api.behaviour(this.sessionId, this.lastSnapshot, this.pendingSignals);
    this.pendingSignals = [];
  }

  // -- navigator mode -----------------------------------------------------

  /**
   * The assistant everywhere that is not an experiment.
   *
   * No session and no knowledge base: there is no procedure to validate, so
   * there is nothing for the agent to be wrong about. It reads the page's own
   * links as its index and answers "where do I find X" locally, which also
   * means it works with the API down.
   */
  private bootNavigator(apiOverride?: string): void {
    this.locale = detectLocale();
    this.api = new Api(apiOverride || DEFAULT_API);
    this.page = pageContext();

    this.ui = new Ui(
      {
        onAction: () => undefined,
        onSend: (message) => this.onNavigate(message),
        onReport: () => undefined,
        onQuizSubmit: async () => null,
        onOpen: () => undefined,
        onClose: () => undefined,
        onOptOut: () => {
          sessionStorage.setItem(OPT_OUT_KEY, "1");
          this.behaviour?.stop();
          this.coach?.mute();
        },
      },
      this.locale,
      Ui.storedAvatar() ?? "ravi",
    );

    const hello = greeting(this.page);
    this.ui.setSubtitle(this.truncate(this.page.title, 42));
    this.ui.setNavigatorMode(hello);

    this.startBehaviour("navigator");
  }

  /** Resolve a typed request against the page index and offer the matches. */
  private onNavigate(message: string): void {
    const ctx = this.page ?? pageContext();
    const matches = resolve(message, ctx.targets);

    if (!matches.length) {
      this.ui.pushAgentMessage(
        `I could not find that on this page. Try a subject — “circuits”, “titration”, “sorting” — or go to the [home page](/) and I will search the whole catalogue from there.`,
      );
      this.ui.finishChat([]);
      return;
    }

    const list = matches.map((m) => `- [${m.label}](${m.href})`).join("\n");
    this.ui.pushAgentMessage(
      matches.length === 1
        ? `That is here:\n\n${list}`
        : `Closest matches on this page:\n\n${list}`,
    );
    this.ui.finishChat([]);
  }

  // -- event flow ---------------------------------------------------------

  private async onEvent(event: StepEvent): Promise<void> {
    this.state.idleSeconds = this.observer?.idleSeconds() ?? 0;
    if (event.task) this.state.currentTask = event.task;

    // Feed the behavioural read from the semantic stream too: which task the
    // student moved to, and which fields they keep rewriting, are things only
    // the Observer knows.
    if (event.action === "navigate" && event.task) this.behaviour?.noteTask(event.task);
    if ((event.action === "input" || event.action === "change") && event.selector) {
      this.behaviour?.noteFieldChange(event.selector);
    }

    // Tier 1 first, in the browser. It answers immediately and covers the
    // large majority of interventions; the network round trip is only ever
    // an enhancement.
    const local = this.rules
      ? evaluate(
          this.rules,
          {
            action: event.action,
            task: event.task,
            selector: event.selector,
            frame: event.frame,
            value: event.value,
            numericValue: event.numericValue,
          },
          this.state,
        )
      : ({ kind: "NO_ACTION", confidence: 1 } as LocalVerdict);

    this.applyLocal(local);

    const remote = this.sessionId ? await this.api.sendEvent(this.sessionId, event) : null;
    if (remote) {
      this.applyRemote(remote);
    } else if (local.kind !== "NO_ACTION") {
      // Offline: present the local verdict ourselves.
      this.present({
        kind: local.kind,
        severity: local.severity,
        title: local.title,
        message: local.message,
        highlightSelector: local.highlightSelector,
        highlightFrame: local.highlightFrame,
        tier: "offline",
      });
    }
  }

  /** Keep the local mirror in step with what Tier 1 just decided. */
  private applyLocal(verdict: LocalVerdict): void {
    if (verdict.stepId && verdict.kind === "NO_ACTION") this.state.completed.add(verdict.stepId);
    if (verdict.errorId) this.state.shownErrors.add(verdict.errorId);
    if (verdict.kind === "CONCEPT" && verdict.stepId) {
      this.state.shownConcepts.add(verdict.stepId);
      this.state.completed.add(verdict.stepId);
    }
    if (verdict.kind === "HINT" && verdict.stepId) {
      this.state.hintLevels[verdict.stepId] = verdict.hintLevel ?? 1;
    }
    if (this.rules) this.ui?.setProgress(progressPercent(this.rules, this.state));
  }

  private applyRemote(response: AgentResponse): void {
    if (response.progress) {
      // The server is authoritative on progress; adopt its view so a resumed
      // or multi-tab session cannot drift.
      this.state.completed = new Set(response.progress.completed_steps);
      this.ui.setProgress(response.progress.percent);
    }
    if (response.verdict === "NO_ACTION") {
      // The student just did the thing we asked for. Retract without being
      // told to: an assistant that notices you fixed it yourself and gets out
      // of the way is the single most trust-building behaviour it has.
      if (response.step_id) this.ui.resolveIfCorrecting(response.step_id);
      return;
    }

    this.present({
      kind: response.verdict,
      severity: response.severity,
      title: response.title,
      message: response.message,
      concept: response.concept,
      interventionId: response.intervention_id,
      stepId: response.step_id,
      correctionStepId: response.correction_step_id,
      highlightSelector: response.highlight_selector,
      highlightFrame: response.highlight_frame,
      actions: response.actions,
      tier: response.tier,
    });
  }

  private present(intervention: Intervention): void {
    this.ui.showIntervention(intervention);
  }

  private checkStuck(): void {
    if (!this.rules || this.ended) return;
    this.state.idleSeconds = this.observer.idleSeconds();
    const verdict = evaluate(
      this.rules,
      { action: "dwell", task: currentTask(), frame: "host" },
      this.state,
    );
    if (verdict.kind !== "HINT") return;
    this.applyLocal(verdict);
    this.present({
      kind: "HINT",
      title: verdict.title,
      message: verdict.message,
      highlightSelector: verdict.highlightSelector,
      highlightFrame: verdict.highlightFrame,
      tier: "rules",
      actions: [
        { label: "Show me", kind: "show_me" },
        { label: "I'm fine", kind: "dismiss" },
      ],
    });
  }

  // -- UI callbacks -------------------------------------------------------

  private onAction(kind: string, intervention: Intervention): void {
    if (kind === "show_me" && intervention.highlightSelector) {
      const doc = this.observer.documentFor(intervention.highlightFrame);
      this.ui.highlight(intervention.highlightSelector, doc);
      // The assistant physically points at the control while the ring is up,
      // so the gesture and the highlight are one action rather than two.
      this.ui.setPose("pointing");
      window.setTimeout(() => this.ui.setPose("idle"), 6000);
    }
    if (!this.sessionId || !intervention.interventionId) return;

    const outcome =
      kind === "dismiss" ? "dismissed" : kind === "auto_resolved" ? "auto_resolved" : "accepted";
    void this.api.feedback(this.sessionId, intervention.interventionId, outcome);
  }

  private onReport(intervention: Intervention): void {
    if (!this.sessionId || !intervention.interventionId) return;
    void this.api.feedback(
      this.sessionId,
      intervention.interventionId,
      "reported_wrong",
      "Reported from the widget",
    );
  }

  private async onSend(message: string): Promise<void> {
    if (!this.sessionId) return;
    let citations: string[] = [];
    for await (const chunk of this.api.chat(this.sessionId, message, [])) {
      if (chunk.delta) this.ui.appendChatDelta(chunk.delta);
      if (chunk.done) {
        citations = ((chunk.citations ?? []) as { heading: string }[])
          .map((c) => c.heading)
          .slice(0, 3);
      }
    }
    this.ui.finishChat(citations);
  }

  private async onQuizSubmit(answers: Record<string, number>) {
    if (!this.sessionId) return null;
    return this.api.submitQuiz(this.sessionId, answers);
  }

  // -- completion ---------------------------------------------------------

  private async finish(): Promise<void> {
    if (this.ended || !this.sessionId) return;
    this.ended = true;
    const summary = await this.api.endSession(this.sessionId, "completed");
    if (!summary) return;
    this.ui.showSummary({
      experimentTitle: summary.experiment_title,
      durationSeconds: summary.duration_seconds,
      stepsCompleted: summary.steps_completed,
      stepsTotal: summary.steps_total,
      precisionScore: summary.precision_score,
      hintsUsed: summary.hints_used,
      deviations: summary.deviations,
      deviationsRecovered: summary.deviations_recovered,
      narrative: summary.narrative,
      conceptsToReview: summary.concepts_to_review,
      quiz: summary.quiz,
    });
  }

  /**
   * Close the session on unload.
   *
   * `sendBeacon` because a normal fetch is cancelled when the page goes away,
   * and without this every student who simply closes the tab would look like
   * an abandonment in the drop-off analysis.
   */
  private flushEnd(): void {
    if (this.ended || !this.sessionId) return;
    const body = JSON.stringify({ session_id: this.sessionId, reason: "navigated_away" });
    navigator.sendBeacon?.(
      `${(this.api as unknown as { base: string }).base}/session/end`,
      new Blob([body], { type: "application/json" }),
    );
  }

  private truncate(text: string, max: number): string {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }

  /**
   * Re-evaluate after a client-side route change.
   *
   * Static lab pages navigate with a full document load and never need this;
   * the portal is a single-page app, where the URL changes under a widget that
   * has already booted. Crossing the boundary between an experiment and
   * everything else changes what the assistant *is*, so that case tears down
   * and boots again. Staying on the same side is just a context refresh.
   */
  async refresh(): Promise<void> {
    const { ref } = detect();
    const shouldBeLab = !!ref;
    const isLab = this.mode === "lab";

    if (shouldBeLab !== isLab) {
      this.teardown();
      await this.boot();
      return;
    }

    if (!shouldBeLab) {
      this.page = pageContext();
      this.ui?.setSubtitle(this.truncate(this.page.title, 42));
      this.ui?.setNavigatorMode(greeting(this.page));
    }
  }

  private teardown(): void {
    this.reportBehaviour();
    this.behaviour?.stop();
    this.observer?.stop();
    this.ui?.destroy();
    this.sessionId = null;
    this.ended = false;
    this.pendingSignals = [];
    this.lastSnapshot = null;
    this.state = {
      completed: new Set(),
      shownErrors: new Set(),
      shownConcepts: new Set(),
      hintLevels: {},
      counts: {},
      idleSeconds: 0,
    };
  }
}

function boot(): void {
  const w = window as unknown as { __vlaila?: Vlaila };
  if (w.__vlaila) return; // a lab that includes the script twice gets one widget
  const instance = new Vlaila();
  w.__vlaila = instance;
  void instance.boot();
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", boot);
} else {
  boot();
}
