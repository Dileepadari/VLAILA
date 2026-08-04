/**
 * The Behaviour Engine.
 *
 * The Screen Observer answers "what did the student do?". This answers the
 * harder question the proposal actually cares about: "how is it going?" -- and
 * it has to answer it from the outside, because a student who is lost rarely
 * says so and often stops interacting altogether.
 *
 * So it watches the shape of the interaction rather than its content: where
 * the pointer hovers without committing, how often a control is hit in
 * frustration, whether the page was read or skimmed, how long attention has
 * been elsewhere. Those are the signals a good demonstrator reads across a lab
 * bench, and they are all available in the browser.
 *
 * Three rules govern everything here, and they are the reason it is safe to
 * run this on every page of a government education platform:
 *
 *   - Shapes, never content. Keystrokes are counted, never recorded. No field
 *     value, no selection text, no clipboard content leaves this module. What
 *     it emits are durations, counts and coordinates-derived scores.
 *   - Never in the way. Every listener is passive and capture-phase, sampling
 *     is throttled to animation frames, and the per-tick work is O(few).
 *   - Degrade to silence. If a signal is ambiguous it is not emitted. A wrong
 *     "you seem stuck" is far more damaging than a missed one.
 */

export type BehaviourSignalKind =
  | 'rage_click'
  | 'hesitation'
  | 'thrash'
  | 'idle'
  | 'attention_lost'
  | 'returned'
  | 'skimmed'
  | 'read'
  | 'backtrack'
  | 'wandering'
  | 'flow';

export interface BehaviourSignal {
  kind: BehaviourSignalKind;
  /** 0-1. Below ~0.6 the coach stays quiet. */
  confidence: number;
  /** A stable selector for whatever the signal is about, when there is one. */
  selector?: string;
  detail?: string;
  at: number;
}

/** The rolling read on the student, recomputed on every tick. */
export interface BehaviourSnapshot {
  /** 0-1. Is attention on this page at all. */
  focus: number;
  /** 0-1. Evidence of difficulty: hesitation, rage, thrash, backtracking. */
  struggle: number;
  /** 0-1. Decisiveness -- hovering briefly then committing. */
  confidence: number;
  /** 0-1. How much of the page has actually been looked at. */
  coverage: number;
  metrics: {
    activeSeconds: number;
    idleSeconds: number;
    awaySeconds: number;
    clicks: number;
    rageClicks: number;
    hesitations: number;
    corrections: number;
    scrollDepth: number;
    pointerDistance: number;
    tasksVisited: number;
  };
}

interface HoverRecord {
  enteredAt: number;
  totalMs: number;
  committed: boolean;
}

const TICK_MS = 2000;
/** Three hits on one target inside this window reads as frustration. */
const RAGE_WINDOW_MS = 1200;
const RAGE_CLICKS = 3;
/** Hovering an interactive control this long without clicking is hesitation. */
const HESITATE_MS = 1800;
const IDLE_MS = 25_000;
/** Below this, a scroll through a text page was a skim rather than a read. */
const READ_MS_PER_SCREEN = 4000;

const INTERACTIVE =
  'a,button,input,select,textarea,label,canvas,[role="button"],[role="tab"],md-select,md-slider';

function describe(el: Element): string {
  if (el.id) return `${el.tagName.toLowerCase()}#${el.id}`;
  const cls = (el.getAttribute('class') || '')
    .split(/\s+/)
    .filter((c) => c && !/^(ng-|is-|active$|selected$)/.test(c))
    .slice(0, 2)
    .join('.');
  return cls ? `${el.tagName.toLowerCase()}.${cls}` : el.tagName.toLowerCase();
}

function closestInteractive(target: EventTarget | null): Element | null {
  const node = target as Element | null;
  if (!node || node.nodeType !== 1 || typeof node.closest !== 'function') return null;
  return node.closest(INTERACTIVE);
}

export class Behaviour {
  private onSignal: (signal: BehaviourSignal) => void;
  private onSnapshot: (snapshot: BehaviourSnapshot) => void;

  private startedAt = Date.now();
  private lastActivityAt = Date.now();
  private awaySince: number | null = null;
  private awayMs = 0;
  private idleAnnounced = false;

  private clicks: { at: number; selector: string }[] = [];
  private rageClicks = 0;
  private hesitations = 0;
  private corrections = 0;

  private hovers = new Map<string, HoverRecord>();
  private activeHover: { selector: string; el: Element } | null = null;
  private hesitationTimer?: number;

  /** Pointer path length in px, and direction reversals -- the shape of a search. */
  private pointerDistance = 0;
  private pointerReversals = 0;
  private lastPointer: { x: number; y: number; dx: number; dy: number } | null = null;
  private pointerFrame = 0;

  private scrollDepth = 0;
  private scrollStartedAt = Date.now();
  private scrolledPage = false;

  /** Per-field change counts. Rewriting one field repeatedly is thrash. */
  private fieldChanges = new Map<string, number>();

  private tasksVisited: string[] = [];
  private ticker?: number;
  private docs = new WeakSet<Document>();
  private stopped = false;

  constructor(
    onSignal: (signal: BehaviourSignal) => void,
    onSnapshot: (snapshot: BehaviourSnapshot) => void,
  ) {
    this.onSignal = onSignal;
    this.onSnapshot = onSnapshot;
  }

  start(): void {
    this.attach(document);
    document.addEventListener('visibilitychange', () => this.onVisibility(), { passive: true });
    this.ticker = window.setInterval(() => this.tick(), TICK_MS);
  }

  stop(): void {
    this.stopped = true;
    window.clearInterval(this.ticker);
    window.clearTimeout(this.hesitationTimer);
  }

  /** Simulator frames are separate documents; the engine follows them. */
  attach(doc: Document): void {
    if (this.docs.has(doc)) return;
    this.docs.add(doc);
    const opts: AddEventListenerOptions = { capture: true, passive: true };

    doc.addEventListener('pointermove', (e) => this.onPointerMove(e as PointerEvent), opts);
    doc.addEventListener('pointerover', (e) => this.onPointerOver(e), opts);
    doc.addEventListener('pointerout', (e) => this.onPointerOut(e), opts);
    doc.addEventListener('click', (e) => this.onClick(e), opts);
    doc.addEventListener('keydown', () => this.markActive(), opts);
    doc.addEventListener('scroll', () => this.onScroll(doc), { capture: true, passive: true });
  }

  /** Called by the host when a step event names a task, to spot backtracking. */
  noteTask(task: string): void {
    const previous = this.tasksVisited.indexOf(task);
    this.tasksVisited.push(task);

    // Returning to a page already visited is meaningful in one direction only:
    // going back to Theory from Simulation is a student trying to recover, not
    // a student browsing. Only flag it when they had moved on at least twice.
    if (previous >= 0 && this.tasksVisited.length - previous > 2) {
      this.emit({
        kind: 'backtrack',
        confidence: 0.75,
        detail: task,
        at: Date.now(),
      });
    }
    this.resetPageScoped();
  }

  /** A field rewritten several times over is a student second-guessing. */
  noteFieldChange(selector: string): void {
    const n = (this.fieldChanges.get(selector) ?? 0) + 1;
    this.fieldChanges.set(selector, n);
    if (n === 4) {
      this.corrections += 1;
      this.emit({ kind: 'thrash', confidence: 0.7, selector, at: Date.now() });
    }
  }

  snapshot(): BehaviourSnapshot {
    const now = Date.now();
    const idleSeconds = (now - this.lastActivityAt) / 1000;
    const elapsed = Math.max(1, (now - this.startedAt) / 1000);
    const awaySeconds = this.awayMs / 1000 + (this.awaySince ? (now - this.awaySince) / 1000 : 0);
    const activeSeconds = Math.max(0, elapsed - awaySeconds);

    // Focus falls off with time away and with a long idle stretch, but a
    // student reading a wall of theory is idle and perfectly focused -- so
    // idle only counts against focus once it is past the reading threshold.
    const awayPenalty = Math.min(1, awaySeconds / Math.max(elapsed, 1));
    const idlePenalty = Math.min(1, Math.max(0, idleSeconds - IDLE_MS / 1000) / 60);
    const focus = clamp01(1 - awayPenalty * 0.7 - idlePenalty * 0.5);

    // Struggle is deliberately hard to trigger: it takes several independent
    // signals to reach the level the coach acts on.
    const struggle = clamp01(
      this.rageClicks * 0.28 + this.hesitations * 0.12 + this.corrections * 0.2,
    );

    // Decisiveness: clicks that followed a short hover, against those that
    // followed a long one or never came.
    const committed = [...this.hovers.values()].filter((h) => h.committed).length;
    const considered = this.hovers.size || 1;
    const confidence = clamp01(
      0.35 + (committed / considered) * 0.65 - this.hesitations * 0.08 - this.rageClicks * 0.1,
    );

    return {
      focus,
      struggle,
      confidence,
      coverage: clamp01(this.scrollDepth),
      metrics: {
        activeSeconds: Math.round(activeSeconds),
        idleSeconds: Math.round(idleSeconds),
        awaySeconds: Math.round(awaySeconds),
        clicks: this.clicks.length,
        rageClicks: this.rageClicks,
        hesitations: this.hesitations,
        corrections: this.corrections,
        scrollDepth: Math.round(this.scrollDepth * 100) / 100,
        pointerDistance: Math.round(this.pointerDistance),
        tasksVisited: new Set(this.tasksVisited).size,
      },
    };
  }

  // -- listeners ----------------------------------------------------------

  private markActive(): void {
    this.lastActivityAt = Date.now();
    if (this.idleAnnounced) {
      this.idleAnnounced = false;
      this.emit({ kind: 'returned', confidence: 0.8, at: Date.now() });
    }
  }

  /**
   * Pointer sampling, throttled to one frame.
   *
   * Distance and reversals together separate two very different states that
   * look identical in a click log: a straight, short path to a control is
   * someone who knows where they are going; a long path that keeps changing
   * direction without landing is someone hunting for something.
   */
  private onPointerMove(e: PointerEvent): void {
    this.markActive();
    if (this.pointerFrame) return;
    this.pointerFrame = requestAnimationFrame(() => {
      this.pointerFrame = 0;
      const last = this.lastPointer;
      if (last) {
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        const dist = Math.hypot(dx, dy);
        if (dist < 400) this.pointerDistance += dist;
        // A reversal is a sign change on either axis with real movement.
        if (dist > 6 && (Math.sign(dx) !== Math.sign(last.dx) || Math.sign(dy) !== Math.sign(last.dy))) {
          this.pointerReversals += 1;
        }
        this.lastPointer = { x: e.clientX, y: e.clientY, dx, dy };
      } else {
        this.lastPointer = { x: e.clientX, y: e.clientY, dx: 0, dy: 0 };
      }
    });
  }

  private onPointerOver(e: Event): void {
    const el = closestInteractive(e.target);
    if (!el) return;
    const selector = describe(el);
    this.activeHover = { selector, el };
    const record = this.hovers.get(selector) ?? { enteredAt: 0, totalMs: 0, committed: false };
    record.enteredAt = Date.now();
    this.hovers.set(selector, record);

    // Hovering a control and not committing is the clearest pre-verbal sign of
    // "I think it's this one but I'm not sure".
    window.clearTimeout(this.hesitationTimer);
    this.hesitationTimer = window.setTimeout(() => {
      if (this.activeHover?.selector !== selector) return;
      const current = this.hovers.get(selector);
      if (!current || current.committed) return;
      this.hesitations += 1;
      this.emit({
        kind: 'hesitation',
        confidence: 0.72,
        selector,
        detail: labelFor(el),
        at: Date.now(),
      });
    }, HESITATE_MS);
  }

  private onPointerOut(e: Event): void {
    const el = closestInteractive(e.target);
    if (!el) return;
    const selector = describe(el);
    const record = this.hovers.get(selector);
    if (record?.enteredAt) {
      record.totalMs += Date.now() - record.enteredAt;
      record.enteredAt = 0;
    }
    if (this.activeHover?.selector === selector) this.activeHover = null;
    window.clearTimeout(this.hesitationTimer);
  }

  private onClick(e: Event): void {
    this.markActive();
    const el = closestInteractive(e.target);
    const selector = el ? describe(el) : 'non-interactive';
    const now = Date.now();
    this.clicks.push({ at: now, selector });
    if (this.clicks.length > 200) this.clicks.shift();

    const record = this.hovers.get(selector);
    if (record) record.committed = true;

    // Repeated hits on the same target in quick succession: the control is
    // not responding the way the student expects.
    const recent = this.clicks.filter((c) => now - c.at < RAGE_WINDOW_MS && c.selector === selector);
    if (recent.length >= RAGE_CLICKS) {
      this.rageClicks += 1;
      this.clicks = this.clicks.filter((c) => c.selector !== selector);
      this.emit({
        kind: 'rage_click',
        confidence: 0.85,
        selector,
        detail: el ? labelFor(el) : undefined,
        at: now,
      });
    }
  }

  private onScroll(doc: Document): void {
    this.markActive();
    this.scrolledPage = true;
    const scroller = doc.scrollingElement || doc.documentElement;
    const max = Math.max(1, scroller.scrollHeight - scroller.clientHeight);
    const depth = Math.min(1, scroller.scrollTop / max);
    if (depth > this.scrollDepth) this.scrollDepth = depth;
  }

  private onVisibility(): void {
    if (document.hidden) {
      this.awaySince = Date.now();
      return;
    }
    if (this.awaySince) {
      const gone = Date.now() - this.awaySince;
      this.awayMs += gone;
      this.awaySince = null;
      this.markActive();
      if (gone > 30_000) {
        this.emit({
          kind: 'attention_lost',
          confidence: 0.8,
          detail: `${Math.round(gone / 1000)}s`,
          at: Date.now(),
        });
      }
    }
  }

  // -- tick ---------------------------------------------------------------

  private tick(): void {
    if (this.stopped) return;
    const now = Date.now();
    const idleMs = now - this.lastActivityAt;

    if (idleMs > IDLE_MS && !this.idleAnnounced && !document.hidden) {
      this.idleAnnounced = true;
      this.emit({
        kind: 'idle',
        confidence: 0.7,
        detail: `${Math.round(idleMs / 1000)}s`,
        at: now,
      });
    }

    // A long, reversing pointer path with nothing clicked is hunting. Only
    // meaningful once there has been enough movement to be sure.
    if (this.pointerDistance > 4000 && this.pointerReversals > 25 && this.clicks.length === 0) {
      this.pointerReversals = 0;
      this.pointerDistance = 0;
      this.emit({ kind: 'wandering', confidence: 0.65, at: now });
    }

    // Steady, decisive work with nothing going wrong is worth saying out loud
    // once -- the proposal's hint-acceptance target depends on the assistant
    // being something other than a bearer of bad news.
    const snap = this.snapshot();
    if (
      snap.metrics.clicks >= 6 &&
      snap.struggle < 0.15 &&
      snap.focus > 0.8 &&
      snap.metrics.activeSeconds > 45 &&
      !this.flowAnnounced
    ) {
      this.flowAnnounced = true;
      this.emit({ kind: 'flow', confidence: 0.7, at: now });
    }

    this.onSnapshot(snap);
  }

  private flowAnnounced = false;

  /**
   * Reading versus skimming, decided when the page is left rather than while
   * it is being read -- the judgement needs the whole visit.
   */
  private resetPageScoped(): void {
    if (this.scrolledPage) {
      const dwell = Date.now() - this.scrollStartedAt;
      const screens = Math.max(1, this.scrollDepth * 3);
      if (this.scrollDepth > 0.6 && dwell > READ_MS_PER_SCREEN * screens) {
        this.emit({ kind: 'read', confidence: 0.7, at: Date.now() });
      } else if (this.scrollDepth > 0.5 && dwell < READ_MS_PER_SCREEN) {
        this.emit({ kind: 'skimmed', confidence: 0.75, at: Date.now() });
      }
    }
    this.scrollDepth = 0;
    this.scrolledPage = false;
    this.scrollStartedAt = Date.now();
    this.hovers.clear();
    this.fieldChanges.clear();
  }

  private emit(signal: BehaviourSignal): void {
    if (this.stopped) return;
    this.onSignal(signal);
  }
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

function labelFor(el: Element): string | undefined {
  const aria = el.getAttribute('aria-label') || el.getAttribute('title');
  if (aria) return aria.trim().slice(0, 60);
  const text = ((el as HTMLElement).innerText || el.textContent || '').trim().replace(/\s+/g, ' ');
  return text ? text.slice(0, 60) : undefined;
}
