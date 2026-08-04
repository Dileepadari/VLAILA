"""Session memory.

The agent's promise is that it never repeats itself. That is enforced here
rather than in a prompt: an error id in `shown_errors` can never fire a second
time, and a hint level only ever increases. Those are invariants of the data
structure, not behaviours we hope a model exhibits.
"""

from __future__ import annotations

from datetime import datetime, timezone

from ..db import Session as SessionRow
from .rules import SessionState


def state_from_row(row: SessionRow, idle_seconds: float = 0.0) -> SessionState:
    return SessionState(
        completed_steps=set(row.completed_steps or []),
        first_try_steps=set(row.first_try_steps or []),
        hint_levels=dict(row.hint_levels or {}),
        shown_errors=set(row.shown_errors or []),
        shown_concepts=set(row.shown_concepts or []),
        action_counts=dict((row.hint_levels or {}).get("__counts__", {}))
        if isinstance((row.hint_levels or {}).get("__counts__"), dict)
        else {},
        idle_seconds=idle_seconds,
        deviations=row.deviations or 0,
    )


def idle_seconds(row: SessionRow) -> float:
    if not row.last_event_at:
        return 0.0
    last = row.last_event_at
    if last.tzinfo is None:
        last = last.replace(tzinfo=timezone.utc)
    return max(0.0, (datetime.now(timezone.utc) - last).total_seconds())


class MemoryWriter:
    """Applies the outcome of one evaluation back onto the session row.

    Deliberately the only place session counters are mutated, so the
    "no repeated hint" guarantee has exactly one implementation to audit.
    """

    def __init__(self, row: SessionRow) -> None:
        self.row = row

    def touch(self) -> None:
        self.row.last_event_at = datetime.now(timezone.utc)

    def bump_action(self, key: str) -> int:
        levels = dict(self.row.hint_levels or {})
        counts = dict(levels.get("__counts__", {}))
        counts[key] = counts.get(key, 0) + 1
        levels["__counts__"] = counts
        self.row.hint_levels = levels
        return counts[key]

    def action_count(self, key: str) -> int:
        return int((self.row.hint_levels or {}).get("__counts__", {}).get(key, 0))

    def complete_step(self, step_id: str, *, first_try: bool) -> None:
        completed = list(self.row.completed_steps or [])
        if step_id not in completed:
            completed.append(step_id)
            self.row.completed_steps = completed
        if first_try:
            clean = list(self.row.first_try_steps or [])
            if step_id not in clean:
                clean.append(step_id)
                self.row.first_try_steps = clean
        self.row.current_step_id = step_id

    def mark_error_shown(self, error_id: str) -> None:
        shown = list(self.row.shown_errors or [])
        if error_id not in shown:
            shown.append(error_id)
            self.row.shown_errors = shown
        self.row.deviations = (self.row.deviations or 0) + 1

    def mark_recovered(self) -> None:
        self.row.deviations_recovered = (self.row.deviations_recovered or 0) + 1

    def mark_concept_shown(self, step_id: str) -> None:
        shown = list(self.row.shown_concepts or [])
        if step_id not in shown:
            shown.append(step_id)
            self.row.shown_concepts = shown

    def set_hint_level(self, step_id: str, level: int) -> None:
        levels = dict(self.row.hint_levels or {})
        current = levels.get(step_id, 0)
        # Monotonic: a hint never de-escalates, so the student never sees the
        # same nudge twice for the same step.
        levels[step_id] = max(int(current) if isinstance(current, int) else 0, level)
        self.row.hint_levels = levels
        self.row.hints_shown = (self.row.hints_shown or 0) + 1

    def hint_level(self, step_id: str) -> int:
        value = (self.row.hint_levels or {}).get(step_id, 0)
        return int(value) if isinstance(value, int) else 0

    def steps_with_errors(self) -> set[str]:
        return set(self.row.shown_errors or [])
