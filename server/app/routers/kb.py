"""Knowledge base endpoints, backing the Author Studio and the catalogue."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, HTTPException

from ..kb import get_kb
from ..agent.rules import Observation, SessionState, evaluate

router = APIRouter(prefix="/kb", tags=["knowledge-base"])


@router.get("")
def list_entries() -> list[dict[str, Any]]:
    return [
        {
            "experiment_id": e.experiment_id,
            "lab_id": e.lab_id,
            "title": e.title,
            "origin": e.origin,
            "discipline": e.discipline,
            "institute": e.institute,
            "steps": len(e.steps),
            "errors": len(e.errors),
            "chunks": len(e.theory_chunks),
            "quiz": len(e.quiz_bank),
            "estimated_minutes": e.estimated_minutes,
            "kb_version": e.kb_version,
        }
        for e in sorted(get_kb().all(), key=lambda e: e.title)
    ]


@router.get("/{experiment_id}")
def get_entry(experiment_id: str) -> dict[str, Any]:
    entry = get_kb().resolve(experiment_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="unknown experiment")
    return entry.raw


@router.post("/reload")
def reload_kb() -> dict[str, Any]:
    """Re-read the entries from disk. Used by the Author Studio after an edit."""
    kb = get_kb()
    kb.load()
    return {"loaded": kb.count}


@router.post("/{experiment_id}/simulate")
def simulate(experiment_id: str, payload: dict[str, Any]) -> dict[str, Any]:
    """Replay a scenario against an entry without creating a session.

    This is the Author Studio's core loop: an author writes an error pattern,
    describes the student behaviour that should trip it, and sees exactly what
    VLAILA would say — before it ships to anybody's students.
    """
    entry = get_kb().resolve(experiment_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="unknown experiment")

    state = SessionState(
        completed_steps=set(payload.get("completed_steps", [])),
        shown_errors=set(payload.get("shown_errors", [])),
        shown_concepts=set(payload.get("shown_concepts", [])),
        hint_levels=payload.get("hint_levels", {}),
        current_task=payload.get("current_task"),
        idle_seconds=float(payload.get("idle_seconds", 0)),
        action_counts=payload.get("action_counts", {}),
    )
    results = []
    for raw in payload.get("events", []):
        obs = Observation(
            action=raw["action"],
            task=raw.get("task"),
            selector=raw.get("selector"),
            frame=raw.get("frame", "host"),
            value=raw.get("value"),
            numeric_value=raw.get("numeric_value"),
        )
        verdict = evaluate(entry, obs, state)
        results.append(
            {
                "event": raw,
                "verdict": verdict.kind,
                "severity": verdict.severity,
                "title": verdict.title,
                "message": verdict.message,
                "step_id": verdict.step_id,
                "error_id": verdict.error_id,
                "hint_level": verdict.hint_level,
            }
        )
        # Apply the same state transitions the live agent would, so a
        # multi-event scenario behaves like a real session.
        if verdict.kind == "NO_ACTION" and verdict.step_id:
            state.completed_steps.add(verdict.step_id)
        if verdict.error_id:
            state.shown_errors.add(verdict.error_id)
        if verdict.kind == "CONCEPT" and verdict.step_id:
            state.shown_concepts.add(verdict.step_id)
            state.completed_steps.add(verdict.step_id)
        if verdict.kind == "HINT" and verdict.step_id:
            state.hint_levels[verdict.step_id] = verdict.hint_level

    return {"results": results, "final_state": {
        "completed_steps": sorted(state.completed_steps),
        "shown_errors": sorted(state.shown_errors),
        "hint_levels": state.hint_levels,
    }}
