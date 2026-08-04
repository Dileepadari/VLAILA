"""The Agentic Core: orchestrates the four-tier reasoning ladder.

An incoming step event walks down the ladder and stops at the first tier that
can answer confidently:

  Tier 0  detector      (in the browser)
  Tier 1  rules engine  deterministic, <5ms, handles ~80% of interventions
  Tier 2  small model   ambiguous classification only
  Tier 3  frontier      conceptual Q&A, summaries, quizzes

Tier 1 gets first refusal on everything, and the model tiers are consulted only
when it returns NO_ACTION on an event it could not place. That ordering is the
whole cost and latency story: spending a frontier call to discover that a
student clicked Run before setting the voltage is waste, and it puts a second
of latency into the exact moment learning flow matters most.
"""

from __future__ import annotations

import logging
import time
from typing import Any

from sqlalchemy.orm import Session as DbSession

from ..config import get_settings
from ..db import CustomHintRow, Event, Intervention
from ..db import Session as SessionRow
from ..kb import ExperimentKB
from ..llm import LLMUnavailable, get_fast_llm
from ..schemas import (
    AgentAction,
    AgentResponse,
    SessionProgress,
    Severity,
    StepEvent,
    Verdict,
)
from . import prompts, rules
from .memory import MemoryWriter, idle_seconds, state_from_row

log = logging.getLogger(__name__)


ACTIONS_WARN = [
    AgentAction(label="Show me", kind="show_me"),
    AgentAction(label="Got it", kind="acknowledge"),
    AgentAction(label="Why?", kind="explain"),
]
ACTIONS_HINT = [
    AgentAction(label="Show me", kind="show_me"),
    AgentAction(label="I'm fine", kind="dismiss"),
]
ACTIONS_CONCEPT = [
    AgentAction(label="Got it", kind="acknowledge"),
    AgentAction(label="Tell me more", kind="open_chat"),
]


def _custom_hint(
    db: DbSession, experiment_id: str, step_id: str, institution: str | None
) -> CustomHintRow | None:
    """Instructor hints outrank the KB defaults for that instructor's students.

    This is the whole point of the feature: an institution can correct or
    localise guidance without a platform-level change and without waiting on
    the KB authoring queue.
    """
    if not institution:
        return None
    return (
        db.query(CustomHintRow)
        .filter(
            CustomHintRow.experiment_id == experiment_id,
            CustomHintRow.step_id == step_id,
            CustomHintRow.institution == institution,
        )
        .order_by(CustomHintRow.created_at.desc())
        .first()
    )


class AgentCore:
    def __init__(self, db: DbSession, kb: ExperimentKB, row: SessionRow) -> None:
        self.db = db
        self.kb = kb
        self.row = row
        self.memory = MemoryWriter(row)
        self.settings = get_settings()

    # -- public -------------------------------------------------------------

    def handle(self, event: StepEvent) -> AgentResponse:
        started = time.perf_counter()
        idle = idle_seconds(self.row)
        state = state_from_row(self.row, idle_seconds=idle)

        obs = rules.Observation(
            action=event.action,
            task=event.task,
            selector=event.selector,
            frame=event.frame,
            value=event.value,
            numeric_value=event.numeric_value,
            elapsed_ms=event.elapsed_ms,
        )
        if event.task:
            state.current_task = event.task
            self.row.current_step_id = self.row.current_step_id

        # Counting happens before evaluation so repeat_count and detect.count
        # see this occurrence.
        self._count(obs, state)

        verdict = rules.evaluate(self.kb, obs, state)
        tier = "rules"

        # The confidence gate applies to authored patterns too, not just to
        # model output. A KB author who marks a pattern below the threshold is
        # telling us they are not certain, and an uncertain WARN is exactly the
        # false positive that costs the student's trust. Deliver it as a hint:
        # same information, framing that survives being wrong.
        if verdict.kind == "WARN" and verdict.confidence < self.settings.warn_confidence_threshold:
            verdict.kind = "HINT"
            verdict.title = "One thing to consider"
            verdict.step_id = verdict.correction_step_id or verdict.step_id
            verdict.hint_level = state.hint_levels.get(verdict.step_id or "", 0) + 1

        # Tier 2/3 only for events Tier 1 could not place at all. An event that
        # matched a step is understood; there is nothing for a model to add.
        if verdict.kind == "NO_ACTION" and verdict.step_id is None:
            escalated = self._escalate(obs, state)
            if escalated is not None:
                verdict, tier = escalated

        self._persist_event(event, verdict)
        response = self._apply(verdict, tier, state, idle)
        response.latency_ms = int((time.perf_counter() - started) * 1000)

        if response.verdict is not Verdict.NO_ACTION:
            response.intervention_id = self._record_intervention(verdict, tier, response)

        self.memory.touch()
        self.db.commit()
        response.progress = self._progress()
        return response

    # -- ladder -------------------------------------------------------------

    def _count(self, obs: rules.Observation, state: rules.SessionState) -> None:
        """Record occurrence counts used by `detect.count` and `repeat_count`."""
        signature = f"{obs.action}:{obs.frame}:{obs.selector or obs.value or ''}"
        for step in self.kb.steps:
            det = step.detect or {}
            if det.get("count", 1) > 1 and det.get("action") == obs.action:
                if rules.selector_matches(det.get("selector"), obs.selector, obs.value):
                    state.action_counts[step.id] = self.memory.bump_action(step.id)
        for err in self.kb.errors:
            if err.when.get("repeat_count") and err.when.get("action") == obs.action:
                if rules.selector_matches(err.when.get("selector"), obs.selector, obs.value):
                    key = f"err:{err.id}"
                    state.action_counts[key] = self.memory.bump_action(key)
        self.memory.bump_action(signature)

    def _escalate(
        self, obs: rules.Observation, state: rules.SessionState
    ) -> tuple[rules.RuleVerdict, str] | None:
        """Ask a model about an interaction the rules could not classify."""
        pending = rules.next_step(self.kb, state)
        if pending is None:
            return None
        # Don't spend a model call on a student who is simply moving quickly.
        if state.idle_seconds < 15 and len(state.completed_steps) > 0:
            return None

        payload = {
            "experiment": self.kb.title,
            "current_task": obs.task or state.current_task,
            "expected_next_step": {
                "id": pending.id,
                "title": pending.title,
                "description": pending.description,
                "requires": pending.requires,
            },
            "completed_steps": sorted(state.completed_steps),
            "observed": {
                "action": obs.action,
                "selector": obs.selector,
                "frame": obs.frame,
                "value": obs.value,
            },
            "seconds_since_last_interaction": round(state.idle_seconds),
            "hints_already_shown_for_this_step": state.hint_levels.get(pending.id, 0),
        }

        # The behavioural read, when the widget has reported one. It is what
        # lets the model tell a student who paused to think from one who has
        # run out of ideas -- the two look identical in the event stream.
        behaviour = self.row.behaviour
        if behaviour:
            payload["behaviour"] = {
                "struggle": behaviour.get("struggle"),
                "focus": behaviour.get("focus"),
                "confidence": behaviour.get("confidence"),
                "metrics": behaviour.get("metrics"),
                "recent_signals": [
                    s.get("kind") for s in (self.row.behaviour_signals or [])[-6:]
                ],
            }

        try:
            raw = get_fast_llm().complete_json(
                prompts.CLASSIFIER_SYSTEM,
                prompts.context_block(payload),
                prompts.VERDICT_SCHEMA,
                effort="low",
                max_tokens=400,
                timeout=self.settings.agent_timeout_seconds,
            )
        except (LLMUnavailable, Exception) as exc:  # noqa: BLE001 - never fail the request
            log.debug("Tier 2/3 classification unavailable: %s", exc)
            return None

        kind = raw.get("verdict", "NO_ACTION")
        confidence = float(raw.get("confidence", 0.0))

        # The confidence gate. A model-originated WARN is the single most
        # damaging thing this system can get wrong, so it has to clear a high
        # bar; below it we downgrade to a hint rather than staying silent.
        if kind == "WARN" and confidence < self.settings.warn_confidence_threshold:
            kind = "HINT"
        if kind == "NO_ACTION":
            return None

        level = state.hint_levels.get(pending.id, 0) + 1
        message = raw.get("message") or pending.hint_for_level(level)[0]
        return (
            rules.RuleVerdict(
                kind=kind,
                severity=raw.get("severity", "info"),
                title=raw.get("title") or pending.title,
                message=message,
                step_id=raw.get("step_id") or pending.id,
                correction_step_id=raw.get("correction_step_id"),
                hint_level=level if kind == "HINT" else 0,
                confidence=confidence,
            ),
            get_fast_llm().name,
        )

    # -- effects ------------------------------------------------------------

    def _apply(
        self, verdict: rules.RuleVerdict, tier: str, state: rules.SessionState, idle: float
    ) -> AgentResponse:
        tier_name = "rules" if tier == "rules" else ("small" if tier == "ollama" else "frontier")

        if verdict.kind == "NO_ACTION":
            if verdict.step_id:
                # A step completed without ever tripping an error is a
                # first-try success, which is what the precision score counts.
                first_try = verdict.step_id not in self._error_steps()
                self.memory.complete_step(verdict.step_id, first_try=first_try)
                # Correcting yourself unprompted is the behaviour we most want
                # to reinforce, so it retires the deviation rather than
                # leaving it on the record.
                if self.row.deviations and self.row.deviations > (
                    self.row.deviations_recovered or 0
                ):
                    self.memory.mark_recovered()
            # The completed step id travels even on NO_ACTION. The widget uses
            # it to retract an open warning the student has just acted on --
            # noticing the correction and then saying nothing about it is the
            # polite version of being right.
            return AgentResponse(
                verdict=Verdict.NO_ACTION, step_id=verdict.step_id, tier=tier_name
            )

        if verdict.kind == "WARN":
            if verdict.error_id:
                self.memory.mark_error_shown(verdict.error_id)
            return AgentResponse(
                verdict=Verdict.WARN,
                severity=Severity(verdict.severity)
                if verdict.severity in {"fatal", "recoverable"}
                else Severity.RECOVERABLE,
                title=verdict.title,
                message=verdict.message,
                concept=verdict.concept,
                step_id=verdict.step_id,
                correction_step_id=verdict.correction_step_id,
                highlight_selector=self._correction_highlight(verdict.correction_step_id),
                highlight_frame=self._correction_frame(verdict.correction_step_id),
                confidence=verdict.confidence,
                actions=ACTIONS_WARN,
                tier=tier_name,
            )

        if verdict.kind == "HINT":
            step_id = verdict.step_id or ""
            # A hint that came from a downgraded error pattern still retires
            # that pattern, or it would re-fire on the student's next click.
            if verdict.error_id:
                self.memory.mark_error_shown(verdict.error_id)
            override = _custom_hint(self.db, self.kb.experiment_id, step_id, self.row.institution)
            message = override.text if override else verdict.message
            self.memory.set_hint_level(step_id, verdict.hint_level or 1)
            return AgentResponse(
                verdict=Verdict.HINT,
                severity=Severity.INFO,
                title=verdict.title,
                message=message,
                step_id=step_id,
                hint_level=verdict.hint_level,
                highlight_selector=verdict.highlight_selector,
                highlight_frame=verdict.highlight_frame,
                confidence=verdict.confidence,
                actions=ACTIONS_HINT,
                tier=tier_name,
            )

        # CONCEPT
        if verdict.step_id:
            self.memory.mark_concept_shown(verdict.step_id)
            self.memory.complete_step(
                verdict.step_id, first_try=verdict.step_id not in self._error_steps()
            )
        return AgentResponse(
            verdict=Verdict.CONCEPT,
            severity=Severity.INFO,
            title=verdict.title or "Why did that happen?",
            message=verdict.message,
            step_id=verdict.step_id,
            confidence=verdict.confidence,
            actions=ACTIONS_CONCEPT,
            tier=tier_name,
        )

    def _error_steps(self) -> set[str]:
        """Steps a student was warned about, so they don't count as first-try."""
        shown = set(self.row.shown_errors or [])
        return {
            e.correction_step
            for e in self.kb.errors
            if e.id in shown and e.correction_step
        }

    def _correction_highlight(self, step_id: str | None) -> str | None:
        step = self.kb.step(step_id) if step_id else None
        if not step:
            return None
        interactive = step.hints.get("interactive")
        if interactive:
            return interactive.get("highlight")
        return (step.detect or {}).get("selector")

    def _correction_frame(self, step_id: str | None) -> str | None:
        step = self.kb.step(step_id) if step_id else None
        if not step:
            return None
        interactive = step.hints.get("interactive")
        if interactive:
            return interactive.get("frame", "host")
        return (step.detect or {}).get("frame", "host")

    # -- persistence --------------------------------------------------------

    def _persist_event(self, event: StepEvent, verdict: rules.RuleVerdict) -> None:
        self.db.add(
            Event(
                session_id=self.row.id,
                experiment_id=self.kb.experiment_id,
                action=event.action,
                task=event.task,
                selector=(event.selector or "")[:300] or None,
                frame=event.frame,
                value=(event.value or "")[:300] or None,
                numeric_value=event.numeric_value,
                step_id=verdict.step_id,
                elapsed_ms=event.elapsed_ms,
            )
        )

    def _record_intervention(
        self, verdict: rules.RuleVerdict, tier: str, response: AgentResponse
    ) -> str:
        row = Intervention(
            session_id=self.row.id,
            experiment_id=self.kb.experiment_id,
            verdict=response.verdict.value,
            severity=response.severity.value,
            step_id=response.step_id,
            error_id=verdict.error_id,
            hint_level=response.hint_level,
            tier=response.tier,
            confidence=response.confidence,
            latency_ms=response.latency_ms,
            message=response.message,
        )
        self.db.add(row)
        self.db.flush()
        return row.id

    def _progress(self) -> SessionProgress:
        state = state_from_row(self.row)
        pending = rules.next_step(self.kb, state)
        return SessionProgress(
            completed_steps=sorted(state.completed_steps),
            current_step_id=pending.id if pending else None,
            total_steps=len(self.kb.required_step_ids),
            percent=rules.progress_percent(self.kb, state),
            deviations=self.row.deviations or 0,
            hints_shown=self.row.hints_shown or 0,
        )


def build_summary_payload(kb: ExperimentKB, row: SessionRow) -> dict[str, Any]:
    """Inputs for the post-experiment reflection, shared by both LLM tiers."""
    state = state_from_row(row)
    completed = [s for s in kb.required_step_ids if s in state.completed_steps]

    # Concepts to revisit come from the steps that actually went wrong, so the
    # advice is specific to this student rather than a generic reading list.
    concept_ids: list[str] = []
    for err in kb.errors:
        if err.id in state.shown_errors and err.correction_step:
            step = kb.step(err.correction_step)
            if step and step.concept_ref and step.concept_ref not in concept_ids:
                concept_ids.append(step.concept_ref)
    for step_id, level in (row.hint_levels or {}).items():
        if step_id == "__counts__" or not isinstance(level, int) or level < 2:
            continue
        step = kb.step(step_id)
        if step and step.concept_ref and step.concept_ref not in concept_ids:
            concept_ids.append(step.concept_ref)
    if not concept_ids:
        concept_ids = [c for c in list(kb.concepts.keys())[:2]]

    return {
        "task": "summary",
        "experiment": kb.title,
        "steps_completed": len(completed),
        "steps_total": len(kb.required_step_ids),
        "precision_score": rules.precision_score(kb, state),
        "hints_used": row.hints_shown or 0,
        "deviations": row.deviations or 0,
        "deviations_recovered": row.deviations_recovered or 0,
        "stumbled_on": [
            kb.step(s).title
            for s in (row.shown_concepts or [])
            if kb.step(s)
        ][:3],
        "concepts": [kb.concepts[c] for c in concept_ids[:3] if c in kb.concepts],
    }
