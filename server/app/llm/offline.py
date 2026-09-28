"""The offline adapter: a real fallback, not a stub.

Everything it returns is composed from the knowledge base the caller already
passed in the prompt context, so answers stay grounded even with no model
available. This is what makes the "works when nothing else does" principle
true rather than aspirational: no API key, no GPU, no connectivity, and a
student still gets step validation, hints and grounded Q&A.
"""

from __future__ import annotations

import json
import re
from collections.abc import Iterator
from typing import Any

from .base import LLMUnavailable


class OfflineClient:
    name = "offline"

    def complete_text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        effort: str = "medium",
        timeout: float = 20.0,
    ) -> str:
        payload = _parse_context(user)
        task = payload.get("task")

        if task == "chat":
            return _offline_answer(payload)
        if task == "summary":
            return _offline_summary(payload)
        if task == "teaching_suggestion":
            return _offline_teaching(payload)
        return _offline_answer(payload)

    def complete_json(
        self,
        system: str,
        user: str,
        schema: dict[str, Any],
        *,
        max_tokens: int = 1024,
        effort: str = "low",
        timeout: float = 10.0,
    ) -> dict[str, Any]:
        payload = _parse_context(user)
        if payload.get("task") == "nl_sql":
            # Translating arbitrary English into SQL genuinely needs a model.
            # Say so, so the caller falls back to its curated query set rather
            # than acting on an empty statement.
            raise LLMUnavailable("NL-to-SQL requires a model provider")
        # Tier 1 already had its say. With no model available the honest
        # answer for an ambiguous event is silence, which is also the safe one.
        return {"verdict": "NO_ACTION", "confidence": 0.0, "reason": "offline adapter"}

    def stream_text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        effort: str = "medium",
        timeout: float = 30.0,
    ) -> Iterator[str]:
        for word in self.complete_text(system, user).split(" "):
            yield word + " "


# ---------------------------------------------------------------------------


def _parse_context(user: str) -> dict[str, Any]:
    """Prompts carry a fenced JSON context block; pull it back out."""
    match = re.search(r"```json\s*(\{.*?\})\s*```", user, re.S)
    if not match:
        return {"question": user}
    try:
        return json.loads(match.group(1))
    except json.JSONDecodeError:
        return {"question": user}


def _offline_answer(payload: dict[str, Any]) -> str:
    question = (payload.get("question") or "").strip()
    chunks = payload.get("chunks") or []
    if not chunks:
        return (
            "I could not find anything in this experiment's material that answers that. "
            "Try asking about a specific step, a control in the simulator, or a term from "
            "the Theory section."
        )
    lead = chunks[0]
    body = lead.get("text", "")
    # Two sentences is enough to answer without turning into a wall of text.
    sentences = re.split(r"(?<=[.!?])\s+", body)
    excerpt = " ".join(sentences[:3]).strip()
    prefix = f"On **{lead.get('heading', 'this experiment')}** - " if lead.get("heading") else ""
    extra = ""
    if len(chunks) > 1 and chunks[1].get("heading"):
        extra = f"\n\nRelated: _{chunks[1]['heading']}_."
    hint = ""
    if question and "why" in question.lower():
        hint = "\n\nIf you want, ask me to connect this back to the step you are on."
    return f"{prefix}{excerpt}{extra}{hint}"


def _offline_summary(payload: dict[str, Any]) -> str:
    precision = payload.get("precision_score", 0)
    hints = payload.get("hints_used", 0)
    deviations = payload.get("deviations", 0)
    done = payload.get("steps_completed", 0)
    total = payload.get("steps_total", 0)

    if precision >= 90 and deviations == 0:
        opening = f"Clean run - {done} of {total} steps, all correct first time."
    elif precision >= 70:
        opening = f"Solid work: {done} of {total} steps, {precision}% right on the first try."
    else:
        opening = (
            f"You got through {done} of {total} steps. "
            f"{precision}% were right first time, so there is room to tighten up the sequence."
        )

    middle = ""
    if deviations:
        middle = (
            f" You hit {deviations} procedural deviation"
            f"{'s' if deviations != 1 else ''} along the way"
            f"{' and recovered from them' if payload.get('deviations_recovered') else ''}."
        )
    if hints:
        middle += f" You used {hints} hint{'s' if hints != 1 else ''}."

    concepts = payload.get("concepts") or []
    tail = ""
    if concepts:
        names = ", ".join(c.get("name", c.get("id", "")) for c in concepts[:2])
        tail = f" Worth another look before the posttest: {names}."
    return opening + middle + tail


def _offline_teaching(payload: dict[str, Any]) -> str:
    worst = payload.get("worst_step")
    rate = payload.get("worst_step_confusion", 0)
    if not worst:
        return "Not enough session data yet to suggest a teaching adjustment."
    return (
        f"The class is concentrating its errors on **{worst}** ({rate}% of sessions). "
        "Before the next lab, walk through that step on the projector and name the "
        "prerequisite it depends on - most of these errors are the prerequisite not "
        "sticking rather than the step itself being hard."
    )
