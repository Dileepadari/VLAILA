/**
 * The Coach.
 *
 * Behaviour signals are raw observations; this decides which of them are worth
 * saying out loud, when, and in what words. It is deliberately a separate
 * layer from the Behaviour Engine, because the hard part of a monitoring
 * assistant is not noticing things -- it is choosing to stay quiet.
 *
 * The governing risk from the proposal is a false positive: a student who is
 * told they are struggling when they are not stops trusting the assistant, and
 * a distrusted assistant is worse than none. So every rule here is filtered
 * through three gates:
 *
 *   - Confidence. The signal itself must clear its own bar.
 *   - Cooldown. Each kind may speak at most once in its window, and there is a
 *     global floor between any two remarks.
 *   - Budget. A hard ceiling per session. When it is spent the coach stops,
 *     permanently, rather than degrading into nagging.
 *
 * Tone differs by mode. On an experiment page the assistant is a demonstrator
 * standing at your shoulder; everywhere else it is a guide at the front desk,
 * and the bar for interrupting is higher because there is no procedure to get
 * wrong.
 */

import type { BehaviourSignal, BehaviourSignalKind, BehaviourSnapshot } from './behaviour';

export type CoachMode = 'lab' | 'navigator';

export interface CoachNudge {
  kind: 'HINT' | 'CONCEPT' | 'WARN';
  title: string;
  message: string;
  /** Distinguishes a behavioural read from a procedural one in analytics. */
  source: 'behaviour';
  signal: BehaviourSignalKind;
  selector?: string;
  actions?: { label: string; kind: 'show_me' | 'acknowledge' | 'dismiss' | 'open_chat' }[];
}

/** Per-kind cooldowns. Generous, because these repeat naturally. */
const COOLDOWN_MS: Record<BehaviourSignalKind, number> = {
  rage_click: 60_000,
  hesitation: 90_000,
  thrash: 120_000,
  idle: 120_000,
  attention_lost: 180_000,
  returned: 300_000,
  skimmed: 240_000,
  read: 600_000,
  backtrack: 120_000,
  wandering: 150_000,
  flow: 600_000,
};

const GLOBAL_FLOOR_MS = 45_000;
const SESSION_BUDGET = 6;
/** Nothing at all for the first stretch: let the student settle in. */
const WARMUP_MS = 20_000;

export class Coach {
  private mode: CoachMode;
  private lastSpokeAt = 0;
  private lastByKind = new Map<BehaviourSignalKind, number>();
  private spent = 0;
  private startedAt = Date.now();
  private muted = false;

  constructor(mode: CoachMode) {
    this.mode = mode;
  }

  setMode(mode: CoachMode): void {
    this.mode = mode;
  }

  /** A student who dismisses coaching gets none for the rest of the session. */
  mute(): void {
    this.muted = true;
  }

  get exhausted(): boolean {
    return this.muted || this.spent >= SESSION_BUDGET;
  }

  /**
   * Decide whether a signal earns a remark. Returns null far more often than
   * not, which is the point.
   */
  consider(signal: BehaviourSignal, snapshot: BehaviourSnapshot): CoachNudge | null {
    if (this.exhausted) return null;
    const now = signal.at;
    if (now - this.startedAt < WARMUP_MS) return null;
    if (now - this.lastSpokeAt < GLOBAL_FLOOR_MS) return null;
    if (signal.confidence < 0.65) return null;

    const cooldown = COOLDOWN_MS[signal.kind] ?? 120_000;
    const last = this.lastByKind.get(signal.kind) ?? 0;
    if (now - last < cooldown) return null;

    const nudge = this.compose(signal, snapshot);
    if (!nudge) return null;

    this.lastByKind.set(signal.kind, now);
    this.lastSpokeAt = now;
    this.spent += 1;
    return nudge;
  }

  private compose(signal: BehaviourSignal, snap: BehaviourSnapshot): CoachNudge | null {
    const lab = this.mode === 'lab';
    const target = signal.detail ? `“${signal.detail}”` : 'that control';

    switch (signal.kind) {
      case 'rage_click':
        return {
          kind: 'WARN',
          title: lab ? 'That control is not responding' : 'That does not seem to be working',
          message: lab
            ? `You have hit ${target} several times in a row. Either the simulator is still busy with the last change, or this step needs something set before it will do anything. Want me to point at what comes first?`
            : `${target} has been clicked a few times without moving. It may be a heading rather than a link — I can show you where this section actually leads.`,
          source: 'behaviour',
          signal: signal.kind,
          selector: signal.selector,
          actions: [
            { label: 'Show me', kind: 'show_me' },
            { label: 'It is fine', kind: 'dismiss' },
          ],
        };

      case 'hesitation':
        // Only worth saying when there is other evidence of difficulty --
        // hovering while thinking is normal and healthy.
        if (snap.struggle < 0.25) return null;
        return {
          kind: 'HINT',
          title: 'Not sure about that one?',
          message: lab
            ? `You have been holding over ${target} without picking it. If you are weighing it up, I can tell you what this control changes before you commit.`
            : `You have been hovering ${target} for a while. Tell me what you are trying to find and I will take you straight there.`,
          source: 'behaviour',
          signal: signal.kind,
          selector: signal.selector,
          actions: [
            { label: 'What does it do?', kind: 'open_chat' },
            { label: 'I know', kind: 'dismiss' },
          ],
        };

      case 'thrash':
        if (!lab) return null;
        return {
          kind: 'HINT',
          title: 'Second-guessing that value?',
          message:
            'You have rewritten that field several times. If you are unsure what range it should sit in, the procedure gives a working value you can start from and adjust.',
          source: 'behaviour',
          signal: signal.kind,
          selector: signal.selector,
          actions: [
            { label: 'What should it be?', kind: 'open_chat' },
            { label: 'Got it', kind: 'acknowledge' },
          ],
        };

      case 'idle':
        return {
          kind: 'HINT',
          title: lab ? 'Still on this step?' : 'Anything I can find for you?',
          message: lab
            ? 'Nothing has moved for a while. If the next step is not obvious, say the word and I will walk you through it — or I can explain why this step matters before you do it.'
            : 'You have been on this page a little while. I can search the labs by topic, or take you to where you left off.',
          source: 'behaviour',
          signal: signal.kind,
          actions: [
            { label: 'Walk me through', kind: 'show_me' },
            { label: 'Just reading', kind: 'dismiss' },
          ],
        };

      case 'wandering':
        return {
          kind: 'HINT',
          title: 'Looking for something specific?',
          message: lab
            ? 'You are scanning the page rather than working through it. Tell me what you are after — a control, a value, or the next step — and I will point at it.'
            : 'There is a lot on this page. Tell me the subject or the experiment you want and I will jump you there instead.',
          source: 'behaviour',
          signal: signal.kind,
          actions: [
            { label: 'Ask me', kind: 'open_chat' },
            { label: 'Browsing', kind: 'dismiss' },
          ],
        };

      case 'backtrack':
        if (!lab) return null;
        return {
          kind: 'CONCEPT',
          title: 'Going back to check something?',
          message: `Coming back to ${signal.detail ?? 'an earlier page'} usually means a result did not look the way you expected. If you tell me what you are seeing, I can say whether it is wrong or just surprising.`,
          source: 'behaviour',
          signal: signal.kind,
          actions: [
            { label: 'Here is what I see', kind: 'open_chat' },
            { label: 'Just checking', kind: 'dismiss' },
          ],
        };

      case 'skimmed':
        if (!lab) return null;
        return {
          kind: 'CONCEPT',
          title: 'Worth a second look',
          message:
            'You moved through that page quickly. The simulator will still run, but the results are much easier to interpret with the theory behind them — I can give you the two ideas that actually matter in about a line each.',
          source: 'behaviour',
          signal: signal.kind,
          actions: [
            { label: 'Give me the short version', kind: 'open_chat' },
            { label: 'I have read it', kind: 'dismiss' },
          ],
        };

      case 'attention_lost':
        return {
          kind: 'HINT',
          title: 'Welcome back',
          message: lab
            ? 'You were away for a bit. I have kept your place — you were part-way through this step, and nothing was lost.'
            : 'You were away for a bit. Everything is where you left it.',
          source: 'behaviour',
          signal: signal.kind,
          actions: [{ label: 'Thanks', kind: 'acknowledge' }],
        };

      case 'flow':
        return {
          kind: 'CONCEPT',
          title: 'This is going well',
          message: lab
            ? `Steady work — ${snap.metrics.clicks} actions, nothing retried, and no steps out of order. I will keep out of your way unless something actually goes wrong.`
            : 'You are moving through this quickly. I will stay out of the way.',
          source: 'behaviour',
          signal: signal.kind,
          actions: [{ label: 'Good', kind: 'acknowledge' }],
        };

      // Observed and reported to the server for analytics, but not worth
      // interrupting a student to announce.
      case 'read':
      case 'returned':
        return null;

      default:
        return null;
    }
  }
}

/**
 * The plain-language read-out shown in the panel.
 *
 * Separate from the nudges on purpose: this is always available and never
 * interrupts, so a student who wants to know how they are doing can look,
 * and one who does not is never told.
 */
export function readout(
  snap: BehaviourSnapshot,
  mode: CoachMode,
): { headline: string; detail: string; tone: 'good' | 'watch' | 'stuck' } {
  if (snap.struggle > 0.55) {
    return {
      tone: 'stuck',
      headline: 'This step is fighting you',
      detail:
        mode === 'lab'
          ? 'Several retries and a few changes of mind. Worth asking me rather than pushing on.'
          : 'You have been going back and forth. Tell me what you are looking for.',
    };
  }
  if (snap.focus < 0.5) {
    return {
      tone: 'watch',
      headline: 'Picking up where you left off',
      detail: `About ${snap.metrics.awaySeconds}s away from this page. Your place is kept.`,
    };
  }
  if (snap.struggle > 0.25) {
    return {
      tone: 'watch',
      headline: 'Going steadily',
      detail: `${snap.metrics.clicks} actions so far, with a couple of second thoughts. That is normal on this step.`,
    };
  }
  return {
    tone: 'good',
    headline: 'On track',
    detail:
      snap.metrics.clicks > 0
        ? `${snap.metrics.clicks} actions, nothing retried. ${Math.round(snap.metrics.activeSeconds / 60) || 1} min of focused work.`
        : 'Nothing to flag yet. I am watching the steps as you take them.',
  };
}
