/**
 * Tier 1 in the browser.
 *
 * A faithful mirror of `server/app/agent/rules.py`. Keeping the same matching
 * semantics on both sides is what lets the widget validate steps with no
 * network at all -- a student on a slow rural connection, or one whose
 * institution has the API blocked, still gets the procedural guidance that
 * makes up the large majority of interventions.
 *
 * If you change matching behaviour here, change it there too. The 20-case
 * suite in `server/tests/test_agent_suite.py` is the shared contract.
 */

export interface KbStep {
  id: string;
  order: number;
  task: string;
  title: string;
  requires: string[];
  optional?: boolean;
  milestone?: boolean;
  detect?: Detector;
  stuck_after_seconds?: number;
  hints: {
    nudge: string;
    specific: string;
    interactive?: { highlight: string; frame?: string; text: string };
  };
}

export interface Detector {
  action: string;
  selector?: string;
  frame?: string;
  task?: string;
  value_min?: number;
  value_max?: number;
  value_pattern?: string;
  value_in?: string[];
  count?: number;
}

export interface KbError {
  id: string;
  severity: "fatal" | "recoverable";
  when: Record<string, unknown>;
  message: string;
  correction_step?: string;
  confidence?: number;
}

export interface ClientRules {
  experiment_id: string;
  kb_version: string;
  title: string;
  tasks: string[];
  steps: KbStep[];
  errors: KbError[];
}

export interface Observation {
  action: string;
  task?: string;
  selector?: string;
  frame: string;
  value?: string;
  numericValue?: number;
}

export interface LocalState {
  completed: Set<string>;
  shownErrors: Set<string>;
  shownConcepts: Set<string>;
  hintLevels: Record<string, number>;
  counts: Record<string, number>;
  idleSeconds: number;
  currentTask?: string;
}

export interface LocalVerdict {
  kind: "NO_ACTION" | "WARN" | "HINT" | "CONCEPT";
  severity?: string;
  title?: string;
  message?: string;
  stepId?: string;
  correctionStepId?: string;
  errorId?: string;
  hintLevel?: number;
  confidence: number;
  highlightSelector?: string;
  highlightFrame?: string;
}

export function selectorMatches(
  pattern: string | undefined,
  actual: string | undefined,
  label?: string,
): boolean {
  if (!pattern) return true;
  if (!actual && !label) return false;

  for (const raw of pattern.split(",")) {
    const candidate = raw.trim();
    if (!candidate) continue;
    if (actual && (candidate === actual || actual.includes(candidate))) return true;
    if (actual && candidate.startsWith("#") && actual.endsWith(candidate)) return true;
    if (actual && candidate.startsWith(".") && actual.includes(candidate.slice(1))) return true;
    const attr = candidate.match(/^\w*\[([\w-]+)\*?=['"]?([^'"\]]+)['"]?\]$/);
    if (attr && actual && actual.includes(attr[2])) return true;
    // Match a control by its visible label. Several Virtual Labs simulators
    // give their buttons no stable id, so text is the only handle a knowledge
    // base author has.
    if (label && candidate.toLowerCase() === label.trim().toLowerCase()) return true;
  }
  return false;
}

function framesMatch(pattern: string | undefined, actual: string): boolean {
  if (!pattern || pattern === actual) return true;
  return pattern === "sim" && actual.startsWith("sim");
}

export function matchStep(rules: ClientRules, obs: Observation, state: LocalState): KbStep | null {
  for (const step of rules.steps) {
    if (state.completed.has(step.id)) continue;
    const d = step.detect;
    if (!d || d.action !== obs.action) continue;

    if (obs.action === "navigate") {
      if (d.task && d.task === obs.task) return step;
      continue;
    }
    if (!framesMatch(d.frame, obs.frame)) continue;
    if (!selectorMatches(d.selector, obs.selector, obs.value)) continue;
    if (obs.numericValue != null) {
      if (d.value_min != null && obs.numericValue < d.value_min) continue;
      if (d.value_max != null && obs.numericValue > d.value_max) continue;
    }
    if (d.value_pattern && obs.value && !new RegExp(d.value_pattern).test(obs.value)) continue;
    if (d.value_in && (!obs.value || !d.value_in.includes(obs.value))) continue;

    const needed = d.count ?? 1;
    if (needed > 1 && (state.counts[step.id] ?? 0) < needed) return null;
    return step;
  }
  return null;
}

function conditionHolds(err: KbError, obs: Observation, state: LocalState): boolean {
  const w = err.when as Record<string, any>;
  if (!w || Object.keys(w).length === 0) return false;

  if (w.action && w.action !== obs.action) return false;
  if (w.on_task && w.on_task !== (obs.task ?? state.currentTask)) return false;
  if (w.frame && !framesMatch(w.frame, obs.frame)) return false;
  if (w.selector && !selectorMatches(w.selector, obs.selector, obs.value)) return false;

  if (w.unless_completed?.some((s: string) => state.completed.has(s))) return false;
  if (w.after_completed && !w.after_completed.every((s: string) => state.completed.has(s)))
    return false;

  if (w.value_out_of_range) {
    if (obs.numericValue == null) return false;
    const { min, max } = w.value_out_of_range;
    const inRange =
      (min == null || obs.numericValue >= min) && (max == null || obs.numericValue <= max);
    if (inRange) return false;
  }
  if (w.value_equals != null && obs.value !== w.value_equals) return false;
  if (w.repeat_count && (state.counts[`err:${err.id}`] ?? 0) < w.repeat_count) return false;
  if (w.idle_seconds && state.idleSeconds < w.idle_seconds) return false;

  return true;
}

export function nextStep(rules: ClientRules, state: LocalState, task?: string): KbStep | null {
  const pick = (steps: KbStep[]) =>
    steps.find(
      (s) =>
        !state.completed.has(s.id) &&
        !s.optional &&
        s.requires.every((r) => state.completed.has(r)),
    ) ?? null;

  if (task) {
    const onPage = pick(rules.steps.filter((s) => s.task === task));
    if (onPage) return onPage;
  }
  return pick(rules.steps);
}

function hintFor(
  step: KbStep,
  level: number,
): { text: string; highlight?: string; frame?: string } {
  if (level <= 1) return { text: step.hints.nudge };
  if (level === 2) return { text: step.hints.specific || step.hints.nudge };
  const interactive = step.hints.interactive;
  if (interactive) {
    return { text: interactive.text, highlight: interactive.highlight, frame: interactive.frame };
  }
  return { text: step.hints.specific || step.hints.nudge };
}

export function evaluate(
  rules: ClientRules,
  obs: Observation,
  state: LocalState,
  warnThreshold = 0.9,
): LocalVerdict {
  const candidates = rules.errors
    .filter((e) => !state.shownErrors.has(e.id))
    .sort((a, b) => (a.severity === "fatal" ? 0 : 1) - (b.severity === "fatal" ? 0 : 1));

  for (const err of candidates) {
    if (!conditionHolds(err, obs, state)) continue;
    const confidence = err.confidence ?? 1;
    // Same confidence gate as the server: an author who flags a pattern as
    // uncertain gets a hint, not a warning.
    if (confidence < warnThreshold) {
      const stepId = err.correction_step;
      return {
        kind: "HINT",
        title: "One thing to consider",
        message: err.message,
        stepId,
        errorId: err.id,
        hintLevel: (state.hintLevels[stepId ?? ""] ?? 0) + 1,
        confidence,
      };
    }
    return {
      kind: "WARN",
      severity: err.severity,
      title: err.severity === "fatal" ? "This will affect your result" : "Heads up",
      message: err.message,
      correctionStepId: err.correction_step,
      errorId: err.id,
      confidence,
    };
  }

  const step = matchStep(rules, obs, state);
  if (step) {
    const arrivedOnly = step.detect?.action === "navigate";
    if (step.milestone && !arrivedOnly && !state.shownConcepts.has(step.id)) {
      // The concept text itself lives server-side; locally we only know a
      // milestone was reached. The widget asks for the explanation rather than
      // inventing one.
      return { kind: "CONCEPT", stepId: step.id, confidence: 1 };
    }
    return { kind: "NO_ACTION", stepId: step.id, confidence: 1 };
  }

  const pending = nextStep(rules, state, obs.task ?? state.currentTask);
  if (pending && state.idleSeconds >= (pending.stuck_after_seconds ?? 45)) {
    const level = (state.hintLevels[pending.id] ?? 0) + 1;
    const hint = hintFor(pending, level);
    if (hint.text) {
      return {
        kind: "HINT",
        title: pending.title,
        message: hint.text,
        stepId: pending.id,
        hintLevel: level,
        highlightSelector: hint.highlight,
        highlightFrame: hint.frame,
        confidence: 0.8,
      };
    }
  }

  return { kind: "NO_ACTION", confidence: 1 };
}

export function progressPercent(rules: ClientRules, state: LocalState): number {
  const required = rules.steps.filter((s) => !s.optional);
  if (!required.length) return 0;
  const done = required.filter((s) => state.completed.has(s.id)).length;
  return Math.round((done * 100) / required.length);
}
