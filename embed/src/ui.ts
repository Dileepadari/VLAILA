/**
 * The VLAILA surface: orb, intervention panel, chat and summary card.
 *
 * Vanilla DOM inside a Shadow root -- no framework, no webfont, no external
 * request. The whole widget is a few tens of kilobytes because it is injected
 * into pages whose budget belongs to the experiment, not to us.
 */

import { CSS } from "./styles";
import { CHARACTER_SVG, POSES, type Avatar, type Pose } from "./character";
import { t } from "./i18n";

export type OrbState = "idle" | "ok" | "hint" | "warn";

export interface Intervention {
  kind: "WARN" | "HINT" | "CONCEPT";
  severity?: string;
  title?: string;
  message?: string;
  concept?: string;
  interventionId?: string;
  stepId?: string;
  correctionStepId?: string;
  highlightSelector?: string;
  highlightFrame?: string;
  actions?: { label: string; kind: string }[];
  tier?: string;
}

export interface SummaryData {
  experimentTitle: string;
  durationSeconds: number;
  stepsCompleted: number;
  stepsTotal: number;
  precisionScore: number;
  hintsUsed: number;
  deviations: number;
  deviationsRecovered: number;
  narrative: string;
  conceptsToReview: string[];
  quiz: {
    id: string;
    question: string;
    options: string[];
    answer_index: number;
    explanation: string;
  }[];
}

export interface UiHandlers {
  onAction: (kind: string, intervention: Intervention) => void;
  onSend: (message: string) => void;
  onReport: (intervention: Intervention) => void;
  onQuizSubmit: (answers: Record<string, number>) => Promise<{
    score: number;
    total: number;
    per_question: Record<string, boolean>;
    feedback: Record<string, string>;
  } | null>;
  onOpen: () => void;
  onClose: () => void;
  onOptOut: () => void;
}

/**
 * A very small Markdown subset: bold, italic, inline code, and line breaks.
 * Enough for the prose the agent actually produces, and small enough to audit.
 * Everything is escaped first, so agent or model output can never inject HTML
 * into a page we do not own.
 */
function md(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return escaped
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])_([^_]+)_/g, "$1<em>$2</em>")
    .replace(/\n/g, "<br>");
}

/**
 * Match the host page's theme rather than the operating system's.
 *
 * Virtual Labs pages are overwhelmingly light. A student whose OS is in dark
 * mode would otherwise get a dark panel floating over a white lab page, which
 * reads as a stray browser extension rather than part of the experiment. So we
 * measure the page's own background and follow it, falling back to the OS
 * preference only when the page does not declare one.
 */
function detectHostTheme(): "light" | "dark" {
  const probe = (node: Element | null): string | null => {
    if (!node) return null;
    const bg = getComputedStyle(node).backgroundColor;
    return bg && bg !== "transparent" && !/rgba\(0,\s*0,\s*0,\s*0\)/.test(bg) ? bg : null;
  };
  const bg = probe(document.body) ?? probe(document.documentElement);
  if (bg) {
    const rgb = bg
      .match(/\d+(\.\d+)?/g)
      ?.slice(0, 3)
      .map(Number);
    if (rgb && rgb.length === 3) {
      // Rec. 709 relative luminance.
      const luminance = (0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2]) / 255;
      return luminance < 0.4 ? "dark" : "light";
    }
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Record<string, string> = {},
  html?: string,
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  if (html != null) node.innerHTML = html;
  return node;
}

export class Ui {
  private host: HTMLElement;
  private root: ShadowRoot;
  private stage!: HTMLButtonElement;
  private figure!: SVGElement;
  private badge!: HTMLElement;
  private thought!: HTMLButtonElement;
  private panel!: HTMLElement;
  private tabs!: HTMLElement;
  private body!: HTMLElement;
  private progressBar!: HTMLElement;
  private live!: HTMLElement;
  private subtitle!: HTMLElement;

  private tab: "assist" | "chat" | "summary" = "assist";
  private current: Intervention | null = null;
  private summary: SummaryData | null = null;
  private messages: { role: "user" | "agent"; text: string; citations?: string[] }[] = [];
  private streaming: HTMLElement | null = null;
  private ring: HTMLElement | null = null;
  private autoRetract?: number;
  private open = false;
  private unread = 0;

  constructor(
    private handlers: UiHandlers,
    private locale: string,
    private avatar: Avatar = "ravi",
  ) {
    this.host = el("div", { id: "vlaila-root", "data-theme": detectHostTheme() });
    this.host.style.cssText = "all:initial;position:static";
    this.root = this.host.attachShadow({ mode: "open" });

    const style = document.createElement("style");
    style.textContent = CSS;
    this.root.appendChild(style);

    this.build();
    document.body.appendChild(this.host);
  }

  // -- construction -------------------------------------------------------

  private build(): void {
    const root = el("div", { class: "root" });

    // Screen readers get intervention text announced without focus being
    // stolen: a hint must never interrupt what the student is typing.
    this.live = el("div", { class: "sr-only", role: "status", "aria-live": "polite" });
    root.appendChild(this.live);

    // The assistant. A button, because it is the widget's one control -- a
    // student should be able to tab to them and press Enter.
    this.stage = el("button", {
      class: "stage",
      type: "button",
      "data-state": "idle",
      "data-pose": "idle",
      "aria-label": t(this.locale, "orbLabel"),
      "aria-expanded": "false",
    }) as HTMLButtonElement;
    this.stage.innerHTML = CHARACTER_SVG(this.avatar);
    this.figure = this.stage.querySelector("svg") as SVGElement;
    this.badge = el("span", { class: "badge", hidden: "" }, "");
    this.stage.appendChild(this.badge);
    this.stage.addEventListener("click", () => this.toggle());
    root.appendChild(this.stage);
    this.setPose("idle");

    // The thought bubble: how the assistant says anything by default. It
    // hovers beside their head and trails down to them, so a remark reads as
    // something they are thinking rather than as a chat notification.
    this.thought = el("button", {
      class: "thought",
      type: "button",
      hidden: "",
      "data-kind": "hint",
    }) as HTMLButtonElement;
    this.thought.addEventListener("click", () => {
      this.hideThought();
      this.setOpen(true);
      this.setTab("assist");
    });
    root.appendChild(this.thought);

    this.panel = el("div", {
      class: "panel",
      hidden: "",
      "data-mode": "speech",
      role: "dialog",
      "aria-label": "VLAILA lab assistant",
    });
    const trail = el("div", { class: "thought-trail", "aria-hidden": "true" });
    trail.append(el("i"), el("i"), el("i"));
    this.panel.appendChild(trail);

    const head = el("div", { class: "panel-head" });
    // The bubble is attributed to a person, not to a product. "Ravi ·
    // Lab assistant" is what makes the message read as something someone
    // said rather than as a system notification.
    const name = t(this.locale, this.avatar === "asha" ? "nameAsha" : "nameRavi");
    head.appendChild(el("span", { class: "mark", "aria-hidden": "true" }, name.charAt(0)));
    const titles = el("div");
    titles.appendChild(el("div", { class: "title" }, `${name} · ${t(this.locale, "roleLabel")}`));
    this.subtitle = el("div", { class: "sub" }, t(this.locale, "subtitle"));
    titles.appendChild(this.subtitle);
    head.appendChild(titles);
    head.appendChild(el("div", { class: "spacer" }));

    // Who the student wants helping them. Persisted, because a student who
    // picked one assistant should not have to pick again on the next page.
    const who = el("div", {
      class: "who",
      role: "group",
      "aria-label": t(this.locale, "chooseAssistant"),
    });
    for (const option of ["ravi", "asha"] as Avatar[]) {
      const btn = el(
        "button",
        {
          type: "button",
          "aria-pressed": String(option === this.avatar),
        },
        t(this.locale, option === "asha" ? "nameAsha" : "nameRavi"),
      );
      btn.addEventListener("click", () => this.setAvatar(option));
      who.appendChild(btn);
    }
    head.appendChild(who);

    const optOut = el(
      "button",
      {
        class: "icon-btn",
        type: "button",
        title: t(this.locale, "optOut"),
        "aria-label": t(this.locale, "optOut"),
      },
      "⦸",
    );
    optOut.addEventListener("click", () => {
      this.handlers.onOptOut();
      this.destroy();
    });
    head.appendChild(optOut);

    const close = el(
      "button",
      {
        class: "icon-btn",
        type: "button",
        "aria-label": t(this.locale, "close"),
      },
      "✕",
    );
    close.addEventListener("click", () => this.setOpen(false));
    head.appendChild(close);
    this.panel.appendChild(head);

    const progress = el("div", {
      class: "progress",
      role: "progressbar",
      "aria-valuemin": "0",
      "aria-valuemax": "100",
      "aria-valuenow": "0",
    });
    this.progressBar = el("i");
    this.progressBar.style.width = "0%";
    progress.appendChild(this.progressBar);
    this.panel.appendChild(progress);

    this.tabs = el("div", { class: "tabs", role: "tablist" });
    for (const [key, label] of [
      ["assist", t(this.locale, "tabAssist")],
      ["chat", t(this.locale, "tabChat")],
      ["summary", t(this.locale, "tabSummary")],
    ] as const) {
      const btn = el(
        "button",
        {
          type: "button",
          role: "tab",
          "data-tab": key,
          "aria-selected": String(key === "assist"),
        },
        label,
      );
      btn.addEventListener("click", () => this.setTab(key as typeof this.tab));
      this.tabs.appendChild(btn);
    }
    this.panel.appendChild(this.tabs);

    this.body = el("div", { class: "body" });
    this.panel.appendChild(this.body);
    root.appendChild(this.panel);

    this.root.appendChild(root);

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && this.open) {
        this.setOpen(false);
        this.stage.focus();
      }
    });

    this.renderAssist();
  }

  destroy(): void {
    this.clearHighlight();
    this.host.remove();
  }

  /** The assistant a student picked last time, if any. */
  static storedAvatar(): Avatar | null {
    try {
      const v = localStorage.getItem("vlaila:avatar");
      return v === "asha" || v === "ravi" ? v : null;
    } catch {
      return null;
    }
  }

  // -- state --------------------------------------------------------------

  /**
   * Set the assistant's state.
   *
   * Expressed three ways at once, so it never depends on colour alone
   * (WCAG 1.4.1): the pose and facial expression, the tint of the contact
   * shadow, and the wording of the message itself.
   */
  setOrbState(state: OrbState): void {
    this.stage.setAttribute("data-state", state);
    const pose: Pose =
      state === "warn"
        ? "concerned"
        : state === "hint"
          ? "thinking"
          : state === "ok"
            ? "pleased"
            : "idle";
    this.setPose(pose);

    if (state !== "idle") {
      this.stage.classList.remove("is-alerting");
      void this.stage.offsetWidth; // restart the animation
      this.stage.classList.add("is-alerting");
    }
  }

  /** Drive the rig: rotate the joints and reshape the mouth for a pose. */
  setPose(pose: Pose): void {
    const p = POSES[pose];
    this.stage.setAttribute("data-pose", pose);

    const set = (selector: string, transform: string) => {
      const node = this.figure.querySelector<SVGElement>(selector);
      if (node) node.style.transform = transform;
    };
    set(".vl-arm-left", `rotate(${p.armL}deg)`);
    set(".vl-arm-right", `rotate(${p.armR}deg)`);
    set(".vl-head", `rotate(${p.headTilt}deg) translateY(${p.headNod}px)`);
    set(".vl-brows", `translateY(${p.browY}px)`);

    this.figure.querySelector(".vl-mouth")?.setAttribute("d", p.mouth);
    const clipboard = this.figure.querySelector<SVGElement>(".vl-clipboard");
    if (clipboard) clipboard.style.opacity = String(p.clipboard);
  }

  /** Swap which assistant is on screen, keeping pose and state. */
  setAvatar(avatar: Avatar): void {
    if (avatar === this.avatar) return;
    this.avatar = avatar;
    try {
      localStorage.setItem("vlaila:avatar", avatar);
    } catch {
      /* private browsing: the choice simply does not persist */
    }
    const pose = (this.stage.getAttribute("data-pose") as Pose) || "idle";
    this.stage.innerHTML = CHARACTER_SVG(avatar);
    this.figure = this.stage.querySelector("svg") as SVGElement;
    this.stage.appendChild(this.badge);
    this.setPose(pose);

    const name = t(this.locale, avatar === "asha" ? "nameAsha" : "nameRavi");
    const mark = this.panel.querySelector(".mark");
    if (mark) mark.textContent = name.charAt(0);
    const title = this.panel.querySelector(".panel-head .title");
    if (title) title.textContent = `${name} · ${t(this.locale, "roleLabel")}`;
    for (const btn of Array.from(this.panel.querySelectorAll<HTMLButtonElement>(".who button"))) {
      btn.setAttribute("aria-pressed", String(btn.textContent === name));
    }
  }

  private showThought(intervention: Intervention): void {
    const kind = intervention.kind.toLowerCase();
    const label =
      intervention.kind === "WARN"
        ? intervention.severity === "fatal"
          ? t(this.locale, "chipFatal")
          : t(this.locale, "chipRecoverable")
        : intervention.kind === "HINT"
          ? t(this.locale, "chipHint")
          : t(this.locale, "chipConcept");

    this.thought.setAttribute("data-kind", kind);
    this.thought.replaceChildren();
    this.thought.appendChild(el("span", { class: "t-kind" }, label));
    this.thought.appendChild(
      el("span", { class: "t-text" }, md(intervention.message ?? intervention.title ?? "")),
    );
    this.thought.appendChild(el("span", { class: "t-more" }, t(this.locale, "tapToOpen")));
    const dots = el("span", { class: "t-dots", "aria-hidden": "true" });
    dots.append(el("i"), el("i"), el("i"));
    this.thought.appendChild(dots);
    this.thought.setAttribute(
      "aria-label",
      `${label}. ${intervention.message ?? ""}. ${t(this.locale, "tapToOpen")}`,
    );
    this.thought.removeAttribute("hidden");
  }

  private hideThought(): void {
    this.thought.setAttribute("hidden", "");
  }

  /** Hold the talking pose for as long as text is arriving. */
  setTalking(talking: boolean): void {
    if (talking) {
      this.setPose("talking");
    } else if (this.stage.getAttribute("data-pose") === "talking") {
      this.setPose(this.current ? "thinking" : "idle");
    }
  }

  setProgress(percent: number): void {
    this.progressBar.style.width = `${Math.max(0, Math.min(100, percent))}%`;
    this.progressBar.parentElement?.setAttribute("aria-valuenow", String(percent));
  }

  setSubtitle(text: string): void {
    this.subtitle.textContent = text;
  }

  /**
   * The always-available read on how the session is going.
   *
   * Stored rather than pushed: it renders in the assist tab when there is no
   * intervention to show, so a student who wants to know can look, and one who
   * does not is never interrupted by it. The orb also picks up the tone, which
   * is how "you seem stuck" gets communicated without saying anything.
   */
  setCoach(
    read: { headline: string; detail: string; tone: "good" | "watch" | "stuck" },
    metrics?: Record<string, number>,
  ): void {
    this.coachRead = read;
    this.coachMetrics = metrics ?? null;
    if (!this.current) {
      this.setOrbState(read.tone === "stuck" ? "warn" : read.tone === "watch" ? "hint" : "idle");
    }
    if (this.open && this.tab === "assist") this.renderAssist();
  }

  /** Navigator pages have no procedure to track, so the panel leads with help. */
  setNavigatorMode(hello: { title: string; message: string }): void {
    this.navigator = hello;
    if (this.open && this.tab === "assist") this.renderAssist();
  }

  private coachRead: { headline: string; detail: string; tone: "good" | "watch" | "stuck" } | null =
    null;
  private coachMetrics: Record<string, number> | null = null;
  private navigator: { title: string; message: string } | null = null;

  toggle(): void {
    this.setOpen(!this.open);
  }

  setOpen(open: boolean): void {
    this.open = open;
    this.stage.setAttribute("aria-expanded", String(open));
    if (open) {
      this.unread = 0;
      this.badge.setAttribute("hidden", "");
      this.hideThought();
      this.panel.removeAttribute("hidden");
      requestAnimationFrame(() => this.panel.classList.add("is-open"));
      this.handlers.onOpen();
    } else {
      this.panel.classList.remove("is-open");
      window.setTimeout(() => this.panel.setAttribute("hidden", ""), 180);
      // Re-offer the open thought as a bubble rather than losing it.
      if (this.current) this.showThought(this.current);
      this.clearHighlight();
      this.handlers.onClose();
    }
  }

  private setTab(tab: "assist" | "chat" | "summary"): void {
    this.tab = tab;
    if (tab !== "assist") this.panel.setAttribute("data-mode", "speech");
    for (const btn of Array.from(this.tabs.querySelectorAll("button"))) {
      btn.setAttribute("aria-selected", String(btn.getAttribute("data-tab") === tab));
    }
    if (tab === "assist") this.renderAssist();
    if (tab === "chat") this.renderChat();
    if (tab === "summary") this.renderSummary();
  }

  // -- intervention -------------------------------------------------------

  showIntervention(intervention: Intervention): void {
    this.current = intervention;
    const state: OrbState =
      intervention.kind === "WARN" ? "warn" : intervention.kind === "CONCEPT" ? "ok" : "hint";
    this.setOrbState(state);

    // A warning is addressed to the student, so it gets a spoken tail. A hint
    // or a concept is the assistant thinking out loud beside them, so it gets
    // the trailing dots of a thought bubble -- the same distinction a comic
    // panel makes, and it sets expectations about how much attention is owed.
    this.panel.setAttribute("data-mode", intervention.kind === "WARN" ? "speech" : "thought");
    this.live.textContent = `${intervention.title ?? ""}. ${intervention.message ?? ""}`;

    if (this.open) {
      // The panel is already up, so update it in place rather than throwing a
      // bubble over the top of it.
      this.hideThought();
      this.setTab("assist");
    } else {
      // Everything starts as a thought beside their head. The student decides
      // whether it is worth opening -- nothing steals the screen mid-step.
      this.showThought(intervention);
      this.unread += 1;
      this.badge.textContent = String(this.unread);
      this.badge.removeAttribute("hidden");
    }

    // Auto-retract. The assistant noticing you fixed it yourself and getting
    // out of the way is the single most trust-building behaviour it has.
    window.clearTimeout(this.autoRetract);
    if (intervention.kind !== "WARN") {
      this.autoRetract = window.setTimeout(() => this.dismissCurrent("auto_resolved"), 30_000);
    }
  }

  /**
   * Retract when the student fixes it themselves.
   *
   * Called when a step completes that the open intervention was pointing at.
   * The assistant simply stops talking about it and looks pleased -- no
   * "well done", no extra message. Noticing the correction and then saying
   * nothing about it is the polite version of being right.
   */
  resolveIfCorrecting(completedStepId: string): void {
    const intervention = this.current;
    if (!intervention) return;
    const target = intervention.correctionStepId ?? intervention.stepId;
    if (target !== completedStepId) return;

    if (intervention.interventionId) {
      this.handlers.onAction("auto_resolved", intervention);
    }
    this.current = null;
    this.setOrbState("ok");
    this.clearHighlight();
    this.hideThought();
    if (this.open && this.tab === "assist") this.renderAssist();
    // Settle back to neutral rather than holding the pleased pose.
    window.setTimeout(() => {
      if (!this.current) this.setOrbState("idle");
    }, 2600);
  }

  dismissCurrent(reason = "dismissed"): void {
    if (this.current?.interventionId && reason !== "kept") {
      this.handlers.onAction(reason, this.current);
    }
    this.current = null;
    this.setOrbState("idle");
    this.clearHighlight();
    this.hideThought();
    if (this.tab === "assist") this.renderAssist();
  }

  private renderAssist(): void {
    this.body.replaceChildren();
    const card = el("div", { class: "card" });

    if (!this.current) {
      // With nothing to correct, the panel's job is to say how it is going.
      const read = this.coachRead;
      const hello = this.navigator;

      // The chip has to agree with the headline: a green "On track" above
      // "this step is fighting you" reads as the assistant contradicting
      // itself, which costs more trust than the read-out earns.
      const chipLabel = hello
        ? "Guide"
        : read?.tone === "stuck"
          ? "Heads up"
          : read?.tone === "watch"
            ? "Keeping an eye"
            : t(this.locale, "watching");

      card.appendChild(
        el(
          "span",
          { class: "chip", "data-kind": read?.tone === "stuck" ? "warn" : "idle" },
          chipLabel,
        ),
      );
      card.appendChild(
        el("h3", {}, hello ? hello.title : (read?.headline ?? t(this.locale, "idleTitle"))),
      );
      card.appendChild(
        el("p", {}, hello ? hello.message : (read?.detail ?? t(this.locale, "idleBody"))),
      );

      // The numbers behind the read, so the judgement is inspectable rather
      // than something the assistant simply asserts.
      if (!hello && this.coachMetrics) {
        const m = this.coachMetrics;
        const stats = el("div", { class: "stats" });
        const stat = (label: string, value: string) => {
          const wrap = el("div", { class: "stat" });
          wrap.appendChild(el("span", { class: "stat-v" }, value));
          wrap.appendChild(el("span", { class: "stat-l" }, label));
          stats.appendChild(wrap);
        };
        stat("actions", String(m.clicks ?? 0));
        stat("focused", `${Math.max(1, Math.round((m.activeSeconds ?? 0) / 60))}m`);
        stat("retried", String((m.rageClicks ?? 0) + (m.corrections ?? 0)));
        card.appendChild(stats);
      }

      const actions = el("div", { class: "actions" });
      const ask = el(
        "button",
        { class: "btn primary", type: "button" },
        hello ? "Find something" : t(this.locale, "askMe"),
      );
      ask.addEventListener("click", () => this.setTab("chat"));
      actions.appendChild(ask);
      card.appendChild(actions);
      this.body.appendChild(card);
      return;
    }

    const kind = this.current.kind.toLowerCase();
    const chipLabel =
      this.current.kind === "WARN"
        ? this.current.severity === "fatal"
          ? t(this.locale, "chipFatal")
          : t(this.locale, "chipRecoverable")
        : this.current.kind === "HINT"
          ? t(this.locale, "chipHint")
          : t(this.locale, "chipConcept");

    card.appendChild(el("span", { class: "chip", "data-kind": kind }, chipLabel));
    if (this.current.title) card.appendChild(el("h3", {}, md(this.current.title)));
    if (this.current.message) card.appendChild(el("p", {}, md(this.current.message)));

    const actions = el("div", { class: "actions" });
    for (const action of this.current.actions ?? [
      { label: t(this.locale, "gotIt"), kind: "acknowledge" },
    ]) {
      const btn = el(
        "button",
        { class: action.kind === "show_me" ? "btn primary" : "btn", type: "button" },
        action.label,
      );
      btn.addEventListener("click", () => {
        const intervention = this.current;
        if (!intervention) return;
        if (action.kind === "explain") {
          if (intervention.concept) {
            this.pushAgentMessage(intervention.concept);
          }
          this.setTab("chat");
        }
        this.handlers.onAction(action.kind, intervention);
        if (action.kind === "acknowledge" || action.kind === "dismiss") {
          this.current = null;
          this.setOrbState("idle");
          this.clearHighlight();
          this.renderAssist();
        }
      });
      actions.appendChild(btn);
    }
    card.appendChild(actions);

    // The human check on the knowledge base. Every dismissal here feeds the
    // Agent Health Monitor's flag queue.
    const meta = el("div", { class: "meta" });
    meta.appendChild(el("span", {}, this.current.tier ? `via ${this.current.tier}` : ""));
    meta.appendChild(el("span", {}, "·"));
    const report = el("button", { type: "button" }, t(this.locale, "reportWrong"));
    report.addEventListener("click", () => {
      const intervention = this.current;
      if (!intervention) return;
      this.handlers.onReport(intervention);
      this.current = null;
      this.setOrbState("idle");
      this.clearHighlight();
      this.renderAssist();
      this.live.textContent = t(this.locale, "reportThanks");
    });
    meta.appendChild(report);
    card.appendChild(meta);

    this.body.appendChild(card);
  }

  // -- chat ---------------------------------------------------------------

  private renderChat(): void {
    this.body.replaceChildren();
    const thread = el("div", { class: "thread" });

    if (!this.messages.length) {
      // Navigator mode has no experiment to ask about, so the invitation has
      // to be a different one or it reads as broken.
      this.messages.push({
        role: "agent",
        text: this.navigator
          ? "Tell me a subject, a lab or an experiment and I will take you there."
          : t(this.locale, "chatGreeting"),
      });
    }
    for (const m of this.messages) thread.appendChild(this.messageNode(m));
    this.body.appendChild(thread);

    if (this.messages.length <= 1) {
      const suggestions = el("div", { class: "suggestions" });
      const prompts = this.navigator
        ? "Show me the labs here|Where do I start?|Find an experiment"
        : t(this.locale, "suggestions");
      for (const q of prompts.split("|")) {
        const btn = el("button", { type: "button" }, q);
        btn.addEventListener("click", () => this.submit(q));
        suggestions.appendChild(btn);
      }
      this.body.appendChild(suggestions);
    }

    const composer = el("div", { class: "composer" });
    const input = el("input", {
      type: "text",
      placeholder: t(this.locale, "askPlaceholder"),
      "aria-label": t(this.locale, "askPlaceholder"),
    }) as HTMLInputElement;

    const mic = el(
      "button",
      {
        class: "send mic",
        type: "button",
        "aria-label": t(this.locale, "voice"),
        "data-active": "false",
      },
      "🎙",
    );
    const recognition = this.speechRecognition();
    if (!recognition) mic.style.display = "none";
    mic.addEventListener("click", () => {
      if (!recognition) return;
      if (mic.getAttribute("data-active") === "true") {
        recognition.stop();
        return;
      }
      mic.setAttribute("data-active", "true");
      recognition.lang = this.locale === "hi" ? "hi-IN" : "en-IN";
      recognition.onresult = (e: any) => {
        input.value = e.results[0][0].transcript;
      };
      recognition.onend = () => mic.setAttribute("data-active", "false");
      recognition.start();
    });

    const send = el(
      "button",
      {
        class: "send",
        type: "button",
        "aria-label": t(this.locale, "send"),
      },
      "➤",
    ) as HTMLButtonElement;

    const submit = () => {
      const text = input.value.trim();
      if (!text) return;
      input.value = "";
      this.submit(text);
    };
    send.addEventListener("click", submit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
      e.stopPropagation();
    });

    composer.append(mic, input, send);
    this.body.parentElement?.insertBefore(composer, null);
    this.panel.appendChild(composer);
    // Keep exactly one composer alive across tab switches.
    const composers = this.panel.querySelectorAll(".composer");
    composers.forEach((node, i) => {
      if (i < composers.length - 1) node.remove();
    });

    window.setTimeout(() => input.focus(), 60);
    this.scrollToEnd();
  }

  private messageNode(m: { role: string; text: string; citations?: string[] }): HTMLElement {
    const node = el("div", { class: `msg ${m.role}` }, md(m.text));
    if (m.citations?.length) {
      node.appendChild(
        el("span", { class: "cite" }, `${t(this.locale, "source")}: ${m.citations.join(" · ")}`),
      );
    }
    return node;
  }

  private submit(text: string): void {
    this.messages.push({ role: "user", text });
    if (this.tab !== "chat") this.setTab("chat");
    const thread = this.body.querySelector(".thread");
    thread?.appendChild(this.messageNode({ role: "user", text }));
    this.body.querySelector(".suggestions")?.remove();

    this.streaming = el("div", { class: "msg agent" });
    this.streaming.innerHTML = '<span class="typing"><i></i><i></i><i></i></span>';
    thread?.appendChild(this.streaming);
    this.scrollToEnd();

    // The assistant visibly starts talking, and keeps talking until the
    // answer finishes streaming.
    this.setTalking(true);
    this.handlers.onSend(text);
  }

  appendChatDelta(delta: string): void {
    if (!this.streaming) return;
    const existing = this.streaming.getAttribute("data-text") ?? "";
    const next = existing + delta;
    this.streaming.setAttribute("data-text", next);
    this.streaming.innerHTML = md(next);
    this.scrollToEnd();
  }

  finishChat(citations: string[] = []): void {
    if (!this.streaming) return;
    const text = this.streaming.getAttribute("data-text") ?? "";
    this.messages.push({ role: "agent", text, citations });
    if (citations.length) {
      this.streaming.appendChild(
        el("span", { class: "cite" }, `${t(this.locale, "source")}: ${citations.join(" · ")}`),
      );
    }
    this.streaming = null;
    this.setTalking(false);
    this.scrollToEnd();
  }

  pushAgentMessage(text: string): void {
    this.messages.push({ role: "agent", text });
    if (this.tab === "chat") {
      this.body.querySelector(".thread")?.appendChild(this.messageNode({ role: "agent", text }));
      this.scrollToEnd();
    }
  }

  private scrollToEnd(): void {
    requestAnimationFrame(() => {
      this.body.scrollTop = this.body.scrollHeight;
    });
  }

  private speechRecognition(): any {
    const w = window as any;
    const Ctor = w.SpeechRecognition || w.webkitSpeechRecognition;
    return Ctor ? new Ctor() : null;
  }

  // -- summary ------------------------------------------------------------

  showSummary(summary: SummaryData): void {
    this.summary = summary;
    this.setOrbState("ok");
    this.setOpen(true);
    this.setTab("summary");
  }

  private renderSummary(): void {
    this.body.replaceChildren();
    this.panel.querySelectorAll(".composer").forEach((n) => n.remove());

    const card = el("div", { class: "card" });
    if (!this.summary) {
      card.appendChild(el("span", { class: "chip" }, t(this.locale, "tabSummary")));
      card.appendChild(el("p", {}, t(this.locale, "summaryPending")));
      this.body.appendChild(card);
      return;
    }

    const s = this.summary;
    card.appendChild(
      el("span", { class: "chip", "data-kind": "concept" }, t(this.locale, "complete")),
    );
    card.appendChild(el("h3", {}, s.experimentTitle));
    card.appendChild(el("p", {}, md(s.narrative)));

    const stats = el("div", { class: "stats" });
    const mins = Math.floor(s.durationSeconds / 60);
    const secs = s.durationSeconds % 60;
    const cells: [string, string, string][] = [
      [
        t(this.locale, "precision"),
        `${s.precisionScore}%`,
        s.precisionScore >= 80 ? "good" : "warn",
      ],
      [t(this.locale, "time"), `${mins}m ${String(secs).padStart(2, "0")}s`, ""],
      [t(this.locale, "steps"), `${s.stepsCompleted}/${s.stepsTotal}`, ""],
      [t(this.locale, "hints"), String(s.hintsUsed), ""],
    ];
    for (const [k, v, tone] of cells) {
      const cell = el("div", { class: "stat" });
      cell.appendChild(el("div", { class: "k" }, k));
      cell.appendChild(el("div", { class: `v ${tone}` }, v));
      stats.appendChild(cell);
    }
    card.appendChild(stats);

    if (s.conceptsToReview.length) {
      card.appendChild(
        el(
          "div",
          { class: "k", style: "font-size:11px;color:var(--vl-fg-muted)" },
          t(this.locale, "revisit"),
        ),
      );
      const review = el("div", { class: "review" });
      for (const c of s.conceptsToReview) review.appendChild(el("span", {}, c));
      card.appendChild(review);
    }

    if (s.quiz.length) {
      const actions = el("div", { class: "actions" });
      const start = el(
        "button",
        { class: "btn primary", type: "button" },
        t(this.locale, "takeQuiz"),
      );
      start.addEventListener("click", () => this.renderQuiz());
      actions.appendChild(start);
      card.appendChild(actions);
    }

    this.body.appendChild(card);
  }

  private renderQuiz(): void {
    if (!this.summary) return;
    this.body.replaceChildren();
    const card = el("div", { class: "card" });
    card.appendChild(el("span", { class: "chip" }, t(this.locale, "quiz")));
    card.appendChild(el("h3", {}, t(this.locale, "quizTitle")));

    const form = el("form");
    for (const [i, q] of this.summary.quiz.entries()) {
      const block = el("div", { class: "quiz-q", "data-q": q.id });
      block.appendChild(el("p", {}, `${i + 1}. ${q.question}`));
      for (const [j, option] of q.options.entries()) {
        const label = el("label", { class: "opt" });
        const input = el("input", { type: "radio", name: q.id, value: String(j) });
        label.append(input, el("span", {}, option));
        block.appendChild(label);
      }
      form.appendChild(block);
    }
    card.appendChild(form);

    const actions = el("div", { class: "actions" });
    const submit = el("button", { class: "btn primary", type: "button" }, t(this.locale, "submit"));
    submit.addEventListener("click", async () => {
      const answers: Record<string, number> = {};
      for (const q of this.summary!.quiz) {
        const picked = form.querySelector<HTMLInputElement>(`input[name="${q.id}"]:checked`);
        if (picked) answers[q.id] = Number(picked.value);
      }
      submit.setAttribute("disabled", "");
      const result = await this.handlers.onQuizSubmit(answers);
      if (!result) {
        submit.removeAttribute("disabled");
        return;
      }
      for (const q of this.summary!.quiz) {
        const block = form.querySelector(`[data-q="${q.id}"]`);
        if (!block) continue;
        const options = Array.from(block.querySelectorAll(".opt"));
        options.forEach((opt, j) => {
          if (j === q.answer_index) opt.classList.add("correct");
          else if (answers[q.id] === j) opt.classList.add("wrong");
          opt.querySelector("input")?.setAttribute("disabled", "");
        });
        block.appendChild(el("div", { class: "feedback" }, md(result.feedback[q.id] ?? "")));
      }
      const score = el(
        "p",
        { style: "margin-top:14px;font-weight:650;color:var(--vl-fg)" },
        `${t(this.locale, "score")}: ${result.score} / ${result.total}`,
      );
      card.appendChild(score);
      submit.remove();
      this.live.textContent = `${t(this.locale, "score")} ${result.score} of ${result.total}`;
    });
    actions.appendChild(submit);

    const back = el("button", { class: "btn ghost", type: "button" }, t(this.locale, "back"));
    back.addEventListener("click", () => this.renderSummary());
    actions.appendChild(back);
    card.appendChild(actions);

    this.body.appendChild(card);
  }

  // -- highlighting -------------------------------------------------------

  /**
   * Draw a ring around a real control -- including one inside the simulator
   * iframe, whose coordinates have to be translated into page space.
   */
  highlight(selector: string, doc: Document): void {
    this.clearHighlight();
    let target: Element | null = null;
    try {
      target = doc.querySelector(selector);
    } catch {
      return;
    }
    if (!target) return;

    const rect = target.getBoundingClientRect();
    let offsetX = window.scrollX;
    let offsetY = window.scrollY;

    if (doc !== document) {
      const frame = doc.defaultView?.frameElement as HTMLElement | null;
      if (!frame) return;
      const frameRect = frame.getBoundingClientRect();
      offsetX += frameRect.left;
      offsetY += frameRect.top;
    }

    this.ring = el("div", { class: "hl-ring ping" });
    Object.assign(this.ring.style, {
      left: `${rect.left + offsetX - 4}px`,
      top: `${rect.top + offsetY - 4}px`,
      width: `${rect.width + 8}px`,
      height: `${rect.height + 8}px`,
      position: "absolute",
    });
    // Appended to the shadow root so the host page's stylesheets cannot
    // restyle or clip it.
    this.root.querySelector(".root")?.appendChild(this.ring);

    target.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => this.clearHighlight(), 6000);
  }

  clearHighlight(): void {
    this.ring?.remove();
    this.ring = null;
  }
}
