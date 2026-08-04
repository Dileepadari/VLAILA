"""Experiment-scoped chat, with a streaming variant for the widget."""

from __future__ import annotations

import json

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session as DbSession

from ..agent import chat as chat_agent
from ..agent import prompts, rules
from ..agent.memory import state_from_row
from ..agent.rag import get_index
from ..config import get_settings
from ..db import ChatTurn
from ..db import Session as SessionRow
from ..db import get_db
from ..kb import get_kb
from ..llm import LLMUnavailable, get_llm, scrub
from ..llm.offline import OfflineClient
from ..ratelimit import SlidingWindow
from ..schemas import ChatRequest, ChatResponse

router = APIRouter(tags=["chat"])
_settings = get_settings()
_limiter = SlidingWindow(_settings.rate_limit_chat_per_minute)


def _context(db: DbSession, session_id: str):
    row = db.get(SessionRow, session_id)
    if row is None:
        raise HTTPException(status_code=404, detail="unknown session")
    kb = get_kb().resolve(row.experiment_id, row.origin)
    if kb is None:
        raise HTTPException(status_code=404, detail="no knowledge base entry for this experiment")
    return row, kb


def _progress_note(kb, row) -> str | None:
    """Tell the model where the student is, so answers land in context."""
    state = state_from_row(row)
    pending = rules.next_step(kb, state)
    if not pending:
        return None
    return f"The student is on step '{pending.title}' ({pending.task} page)."


@router.post("/chat", response_model=ChatResponse)
def chat(req: ChatRequest, db: DbSession = Depends(get_db)):
    if not _limiter.allow(req.session_id):
        raise HTTPException(status_code=429, detail="too many messages")

    row, kb = _context(db, req.session_id)
    result = chat_agent.answer(kb, req.message, req.history, _progress_note(kb, row))

    db.add(
        ChatTurn(
            session_id=row.id,
            experiment_id=row.experiment_id,
            question=scrub(req.message) if _settings.scrub_pii else req.message,
            answer=result.text,
            off_topic=result.off_topic,
            latency_ms=result.latency_ms,
        )
    )
    db.commit()
    return result


@router.post("/chat/stream")
def chat_stream(req: ChatRequest, db: DbSession = Depends(get_db)):
    """Server-sent events, so the panel shows text as it arrives.

    Streaming matters more here than it looks: a two-second wait staring at a
    spinner reads as broken, while the same two seconds with text appearing
    reads as thinking.
    """
    if not _limiter.allow(req.session_id):
        raise HTTPException(status_code=429, detail="too many messages")

    row, kb = _context(db, req.session_id)
    index = get_index(kb)
    cleaned = scrub(req.message) if _settings.scrub_pii else req.message

    if not index.is_on_topic(cleaned):
        text = chat_agent.REDIRECT.format(title=kb.title)

        def redirect_stream():
            yield f"data: {json.dumps({'delta': text})}\n\n"
            yield f"data: {json.dumps({'done': True, 'off_topic': True})}\n\n"

        return StreamingResponse(redirect_stream(), media_type="text/event-stream")

    hits = index.search(cleaned, k=4)
    payload = {
        "task": "chat",
        "experiment": kb.title,
        "aim": kb.aim,
        "question": cleaned,
        "where_the_student_is": _progress_note(kb, row),
        "chunks": [
            {"id": h.chunk.id, "heading": h.chunk.heading, "text": h.chunk.text} for h in hits
        ],
        "recent_turns": [
            {"role": m.role, "text": scrub(m.text) if _settings.scrub_pii else m.text}
            for m in req.history[-6:]
        ],
    }
    session_id, experiment_id = row.id, row.experiment_id

    def event_stream():
        collected: list[str] = []
        try:
            for chunk in get_llm().stream_text(
                prompts.CHAT_SYSTEM,
                prompts.context_block(payload),
                max_tokens=700,
                effort="medium",
                timeout=_settings.chat_timeout_seconds,
            ):
                collected.append(chunk)
                yield f"data: {json.dumps({'delta': chunk})}\n\n"
        except (LLMUnavailable, Exception):  # noqa: BLE001
            fallback = OfflineClient().complete_text(
                prompts.CHAT_SYSTEM, prompts.context_block(payload)
            )
            collected = [fallback]
            yield f"data: {json.dumps({'delta': fallback})}\n\n"

        citations = [
            {"chunk_id": h.chunk.id, "heading": h.chunk.heading, "source": h.chunk.source}
            for h in hits
        ]
        yield f"data: {json.dumps({'done': True, 'citations': citations})}\n\n"

        # Persist on its own session: the request-scoped one is closed by the
        # time a streaming body finishes.
        from ..db import SessionLocal

        with SessionLocal() as write_db:
            write_db.add(
                ChatTurn(
                    session_id=session_id,
                    experiment_id=experiment_id,
                    question=cleaned,
                    answer="".join(collected),
                )
            )
            write_db.commit()

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
