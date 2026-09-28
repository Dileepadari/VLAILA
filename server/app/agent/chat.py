"""Experiment-scoped chat, grounded in the knowledge base."""

from __future__ import annotations

import logging
import time

from ..config import get_settings
from ..kb import ExperimentKB
from ..llm import LLMUnavailable, get_llm, scrub
from ..schemas import ChatMessage, ChatResponse, Citation
from . import prompts
from .rag import get_index

log = logging.getLogger(__name__)

REDIRECT = (
    "That one is outside what I know about this experiment. I can help with the "
    "procedure, the controls in the simulator, or the theory behind **{title}** - "
    "what would be most useful?"
)


def answer(
    kb: ExperimentKB,
    question: str,
    history: list[ChatMessage] | None = None,
    progress_note: str | None = None,
) -> ChatResponse:
    started = time.perf_counter()
    settings = get_settings()
    index = get_index(kb)

    cleaned = scrub(question) if settings.scrub_pii else question

    if not index.is_on_topic(cleaned):
        return ChatResponse(
            text=REDIRECT.format(title=kb.title),
            off_topic=True,
            tier="rules",
            latency_ms=int((time.perf_counter() - started) * 1000),
        )

    hits = index.search(cleaned, k=4)
    payload = {
        "task": "chat",
        "experiment": kb.title,
        "aim": kb.aim,
        "question": cleaned,
        "where_the_student_is": progress_note,
        "chunks": [
            {"id": h.chunk.id, "heading": h.chunk.heading, "text": h.chunk.text}
            for h in hits
        ],
        "recent_turns": [
            {"role": m.role, "text": scrub(m.text) if settings.scrub_pii else m.text}
            for m in (history or [])[-6:]
        ],
    }

    try:
        text = get_llm().complete_text(
            prompts.CHAT_SYSTEM,
            prompts.context_block(payload),
            max_tokens=700,
            effort="medium",
            timeout=settings.chat_timeout_seconds,
        )
        tier = get_llm().name
    except (LLMUnavailable, Exception) as exc:  # noqa: BLE001
        log.warning("Chat model unavailable, answering from knowledge base: %s", exc)
        from ..llm.offline import OfflineClient

        text = OfflineClient().complete_text(
            prompts.CHAT_SYSTEM, prompts.context_block(payload)
        )
        tier = "offline"

    return ChatResponse(
        text=text,
        citations=[
            Citation(chunk_id=h.chunk.id, heading=h.chunk.heading, source=h.chunk.source)
            for h in hits
        ],
        tier=tier,
        latency_ms=int((time.perf_counter() - started) * 1000),
    )
