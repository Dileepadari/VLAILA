"""Tier 1: the deterministic rules engine.

Pure functions over (knowledge base entry, session state, event). No model, no
network, no randomness -- which is exactly why it can be trusted to fire a
WARN. An authored error pattern either matches the observed interaction or it
does not; there is no inference step that could be wrong.

This module is mirrored almost line for line in `embed/src/rules.ts` so the
offline browser path and the server path never disagree about what counts as an
error. If you change matching semantics here, change them there too.
"""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Any

from ..kb import ErrorPattern, ExperimentKB, Step


@dataclass
class SessionState:
    """Everything the rules engine needs to know about the session so far."""

    completed_steps: set[str] = field(default_factory=set)
    first_try_steps: set[str] = field(default_factory=set)
    hint_levels: dict[str, int] = field(default_factory=dict)
    shown_errors: set[str] = field(default_factory=set)
    shown_concepts: set[str] = field(default_factory=set)
    current_task: str | None = None
    action_counts: dict[str, int] = field(default_factory=dict)
    idle_seconds: float = 0.0
    deviations: int = 0


@dataclass
class Observation:
    """A normalized event, already resolved to its KB step where possible."""

    action: str
    task: str | None = None
    selector: str | None = None
    frame: str = "host"
    value: str | None = None
    numeric_value: float | None = None
    elapsed_ms: int | None = None


@dataclass
class RuleVerdict:
    kind: str  # WARN | HINT | CONCEPT | NO_ACTION
    severity: str = "info"
    title: str | None = None
    message: str | None = None
    concept: str | None = None
    step_id: str | None = None
    correction_step_id: str | None = None
    error_id: str | None = None
    hint_level: int = 0
    confidence: float = 1.0
    highlight_selector: str | None = None
    highlight_frame: str | None = None


# ---------------------------------------------------------------------------
# Selector matching
# ---------------------------------------------------------------------------


def selector_matches(pattern: str | None, actual: str | None, label: str | None = None) -> bool:
    """Match a KB selector against what the observer reported.

    A KB author writes ordinary CSS, including comma-separated groups
    (`#a, #b`). The observer reports the specific selector it resolved plus the
    element's accessible label, so this also supports matching a button by its
    visible text -- which is the only option on the several Virtual Labs
    simulators whose controls have no stable id.
    """
    if not pattern:
        return True
    if not actual and not label:
        return False
    for raw in pattern.split(","):
        candidate = raw.strip()
        if not candidate:
            continue
        if actual and (candidate == actual or candidate in actual):
            return True
        # `#protonopiaBtn` should match an observed `button#protonopiaBtn`.
        if actual and candidate.startswith("#") and actual.endswith(candidate):
            return True
        if actual and candidate.startswith(".") and candidate[1:] in actual:
            return True
        # Attribute selectors such as a[href*='Simulator1'].
        attr = re.match(r"^\w*\[([\w-]+)\*?=['\"]?([^'\"\]]+)['\"]?\]$", candidate)
        if attr and actual and attr.group(2) in actual:
            return True
        if label and candidate.lower() == label.strip().lower():
            return True
    return False


def _frames_match(pattern: str | None, actual: str) -> bool:
    if not pattern or pattern == actual:
        return True
    # `sim` is the parent of every nested simulator frame, so a KB author can
    # write `sim` to mean "anywhere inside the simulator".
    return pattern == "sim" and actual.startswith("sim")


# ---------------------------------------------------------------------------
# Step resolution
# ---------------------------------------------------------------------------


def match_step(kb: ExperimentKB, obs: Observation, state: SessionState) -> Step | None:
    """Which KB step, if any, does this interaction satisfy?

    Earliest incomplete step wins. A student who re-clicks a control they have
    already used is not re-completing that step, and treating it as a fresh
    completion would inflate the precision score.
    """
    for step in kb.steps:
        if step.id in state.completed_steps:
            continue
        det = step.detect
        if not det or det.get("action") != obs.action:
            continue
        if obs.action == "navigate":
            if det.get("task") and det["task"] == obs.task:
                return step
            continue
        if not _frames_match(det.get("frame"), obs.frame):
            continue
        if not selector_matches(det.get("selector"), obs.selector, obs.value):
            continue
        if obs.numeric_value is not None:
            if det.get("value_min") is not None and obs.numeric_value < det["value_min"]:
                continue
            if det.get("value_max") is not None and obs.numeric_value > det["value_max"]:
                continue
        if det.get("value_pattern") and obs.value:
            if not re.search(det["value_pattern"], obs.value):
                continue
        if det.get("value_in") and obs.value not in det["value_in"]:
            continue
        # `count` lets one control stand for repeated work (log four rows,
        # take six readings) without the author inventing synthetic steps.
        needed = det.get("count", 1)
        if needed > 1:
            key = f"{step.id}"
            if state.action_counts.get(key, 0) + 1 < needed:
                return None
        return step
    return None


# ---------------------------------------------------------------------------
# Error matching
# ---------------------------------------------------------------------------


def _condition_holds(err: ErrorPattern, obs: Observation, state: SessionState) -> bool:
    when = err.when
    if not when:
        return False

    if when.get("action") and when["action"] != obs.action:
        return False
    if when.get("on_task") and when["on_task"] != (obs.task or state.current_task):
        return False
    if when.get("frame") and not _frames_match(when["frame"], obs.frame):
        return False
    if when.get("selector") and not selector_matches(when["selector"], obs.selector, obs.value):
        return False

    # The out-of-order detector: fires only when none of the listed steps have
    # been completed.
    unless = when.get("unless_completed")
    if unless and any(s in state.completed_steps for s in unless):
        return False

    after = when.get("after_completed")
    if after and not all(s in state.completed_steps for s in after):
        return False

    rng = when.get("value_out_of_range")
    if rng:
        if obs.numeric_value is None:
            return False
        lo, hi = rng.get("min"), rng.get("max")
        in_range = (lo is None or obs.numeric_value >= lo) and (
            hi is None or obs.numeric_value <= hi
        )
        if in_range:
            return False

    if when.get("value_equals") is not None and obs.value != when["value_equals"]:
        return False

    # The thrashing detector.
    repeat = when.get("repeat_count")
    if repeat:
        key = f"err:{err.id}"
        if state.action_counts.get(key, 0) + 1 < repeat:
            return False

    idle = when.get("idle_seconds")
    if idle and state.idle_seconds < idle:
        return False

    return True


def match_error(
    kb: ExperimentKB, obs: Observation, state: SessionState
) -> ErrorPattern | None:
    """First matching, not-yet-shown error pattern.

    Fatal patterns are considered before recoverable ones: if a student has
    simultaneously tripped a "this invalidates your data" rule and a "you could
    have done this more cleanly" rule, only the first is worth their attention.
    """
    candidates = [e for e in kb.errors if e.id not in state.shown_errors]
    for err in sorted(candidates, key=lambda e: 0 if e.severity == "fatal" else 1):
        if _condition_holds(err, obs, state):
            return err
    return None


# ---------------------------------------------------------------------------
# The Tier 1 entry point
# ---------------------------------------------------------------------------


def evaluate(kb: ExperimentKB, obs: Observation, state: SessionState) -> RuleVerdict:
    """Decide what, if anything, to say about this interaction.

    Order of precedence, from most to least urgent:
      1. An authored error pattern matched          -> WARN
      2. The interaction completed a milestone step -> CONCEPT
      3. The student appears stuck on a step        -> HINT
      4. Everything else                            -> NO_ACTION (the default)
    """
    err = match_error(kb, obs, state)
    if err:
        return RuleVerdict(
            kind="WARN",
            severity=err.severity,
            title="Heads up" if err.severity == "recoverable" else "This will affect your result",
            message=err.message,
            concept=err.concept,
            correction_step_id=err.correction_step,
            error_id=err.id,
            confidence=err.confidence,
        )

    step = match_step(kb, obs, state)
    if step:
        # Concept reinforcement follows an observation, not an arrival. A
        # milestone satisfied merely by navigating to a page means the student
        # has opened it, not read it -- volunteering the explanation there
        # gives away the very thing the page is meant to teach.
        arrived_only = (step.detect or {}).get("action") == "navigate"
        if step.milestone and not arrived_only and step.id not in state.shown_concepts:
            concept = step.concept
            if not concept and step.concept_ref:
                concept = (kb.concepts.get(step.concept_ref) or {}).get("summary")
            if concept:
                return RuleVerdict(
                    kind="CONCEPT",
                    severity="info",
                    title="Why did that happen?",
                    message=concept,
                    step_id=step.id,
                    confidence=1.0,
                )
        return RuleVerdict(kind="NO_ACTION", step_id=step.id)

    # Nothing matched. Offer a hint only when the student is demonstrably
    # stuck on the step they are supposed to be on -- not merely because we
    # failed to recognise what they did.
    pending = next_step(kb, state, task=obs.task or state.current_task)
    if pending and state.idle_seconds >= pending.stuck_after_seconds:
        level = state.hint_levels.get(pending.id, 0) + 1
        text, interactive = pending.hint_for_level(level)
        if text:
            return RuleVerdict(
                kind="HINT",
                severity="info",
                title=pending.title,
                message=text,
                step_id=pending.id,
                hint_level=level,
                highlight_selector=(interactive or {}).get("highlight"),
                highlight_frame=(interactive or {}).get("frame", "host"),
                confidence=0.8,
            )

    return RuleVerdict(kind="NO_ACTION")


def next_step(kb: ExperimentKB, state: SessionState, task: str | None = None) -> Step | None:
    """The earliest incomplete step whose prerequisites are met.

    When the student's current page is known, steps on that page win. A student
    who skipped straight to the simulator should be nudged about the simulator
    control in front of them, not told to go back and read the Aim -- the
    global-order answer is technically correct and practically useless.
    """

    def candidates(steps: list[Step]) -> Step | None:
        for step in steps:
            if step.id in state.completed_steps or step.optional:
                continue
            if all(r in state.completed_steps for r in step.requires):
                return step
        return None

    if task:
        on_page = candidates([s for s in kb.steps if s.task == task])
        if on_page:
            return on_page
    return candidates(kb.steps)


def progress_percent(kb: ExperimentKB, state: SessionState) -> int:
    required = kb.required_step_ids
    if not required:
        return 0
    done = sum(1 for s in required if s in state.completed_steps)
    return round(done * 100 / len(required))


def precision_score(kb: ExperimentKB, state: SessionState) -> int:
    """Percentage of completed steps that were right on the first attempt.

    Reported as 100 for a session with no completed steps rather than 0: a
    student who opened an experiment and left has not been imprecise, and
    scoring them zero would poison the class average.
    """
    completed = [s for s in kb.required_step_ids if s in state.completed_steps]
    if not completed:
        return 100
    clean = sum(1 for s in completed if s in state.first_try_steps)
    return round(clean * 100 / len(completed))
