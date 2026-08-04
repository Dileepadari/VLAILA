"""Student-facing endpoints: session lifecycle, agent turns, summary, quiz."""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session as DbSession

from ..agent import quiz as quiz_mod
from ..agent import rules
from ..agent.core import AgentCore, build_summary_payload
from ..agent.memory import state_from_row
from ..agent import prompts
from ..config import get_settings
from ..db import Intervention
from ..db import Session as SessionRow
from ..db import get_db
from ..kb import get_kb
from ..llm import LLMUnavailable, get_llm
from ..llm.offline import OfflineClient
from ..ratelimit import SlidingWindow
from ..schemas import (
    AgentResponse,
    BehaviourReport,
    InterventionFeedback,
    QuizResult,
    QuizSubmission,
    SessionEndRequest,
    SessionProgress,
    SessionStartRequest,
    SessionStartResponse,
    StepEvent,
    SummaryResponse,
    Verdict,
)

router = APIRouter(tags=["session"])
_settings = get_settings()
_event_limiter = SlidingWindow(_settings.rate_limit_events_per_minute)


def _load(db: DbSession, session_id: str) -> SessionRow:
    row = db.get(SessionRow, session_id)
    if row is None:
        raise HTTPException(status_code=404, detail="unknown session")
    return row


@router.post("/session/start", response_model=SessionStartResponse)
def start_session(req: SessionStartRequest, db: DbSession = Depends(get_db)):
    kb = get_kb().resolve(req.experiment.experiment_id, req.experiment.origin)

    row = SessionRow(
        experiment_id=req.experiment.experiment_id,
        lab_id=req.experiment.lab_id or (kb.lab_id if kb else None),
        origin=req.experiment.origin,
        discipline=req.experiment.discipline or (kb.discipline if kb else None),
        institute=req.experiment.institute or (kb.institute if kb else None),
        institution=req.institution,
        role=req.role.value,
        user_key=req.user_key,
        locale=req.locale,
        last_event_at=datetime.now(timezone.utc),
    )
    db.add(row)
    db.commit()

    # An experiment with no knowledge base entry still gets a session. The
    # widget then runs in observe-only mode: it logs usage for the dashboards
    # and stays silent rather than guessing at guidance it cannot ground.
    return SessionStartResponse(
        session_id=row.id,
        experiment_id=row.experiment_id,
        kb_found=kb is not None,
        kb_version=kb.kb_version if kb else None,
        title=kb.title if kb else req.experiment.experiment_title,
        tasks=kb.tasks if kb else [],
        total_steps=len(kb.required_step_ids) if kb else 0,
        rules=kb.client_rules() if kb else None,
    )


@router.post("/session/event", response_model=AgentResponse)
def session_event(event: StepEvent, db: DbSession = Depends(get_db)):
    if not _event_limiter.allow(event.session_id):
        raise HTTPException(
            status_code=429,
            detail="too many events",
            headers={"Retry-After": str(_event_limiter.retry_after(event.session_id))},
        )

    row = _load(db, event.session_id)
    kb = get_kb().resolve(row.experiment_id, row.origin)
    if kb is None:
        return AgentResponse(verdict=Verdict.NO_ACTION, tier="none")

    return AgentCore(db, kb, row).handle(event)


@router.post("/session/behaviour")
def session_behaviour(report: BehaviourReport, db: DbSession = Depends(get_db)):
    """Record the widget's behavioural read on the session.

    Deliberately not an agent turn. The widget's Coach has already decided
    whether any of this was worth saying to the student, and it decided in the
    browser where it costs nothing and cannot be late. What the server does
    with it is remember it: the next real step event carries this context into
    the agent's prompt, and the instructor dashboards aggregate it into the
    step-level struggle heatmap the proposal asks for.

    Rate-limited with the same window as events so a misbehaving page cannot
    turn a once-a-minute report into a flood.
    """
    if not _event_limiter.allow(report.session_id):
        raise HTTPException(status_code=429, detail="too many reports")

    row = _load(db, report.session_id)
    row.behaviour = report.snapshot.model_dump()

    # Keep a bounded tail rather than every signal: the last handful is what
    # explains the current state, and the counts already carry the history.
    if report.signals:
        existing = list(row.behaviour_signals or [])
        existing.extend(s.model_dump() for s in report.signals)
        row.behaviour_signals = existing[-40:]

    db.commit()
    return {"ok": True}


@router.get("/session/{session_id}/progress", response_model=SessionProgress)
def progress(session_id: str, db: DbSession = Depends(get_db)):
    row = _load(db, session_id)
    kb = get_kb().resolve(row.experiment_id, row.origin)
    if kb is None:
        return SessionProgress()
    state = state_from_row(row)
    pending = rules.next_step(kb, state)
    return SessionProgress(
        completed_steps=sorted(state.completed_steps),
        current_step_id=pending.id if pending else None,
        total_steps=len(kb.required_step_ids),
        percent=rules.progress_percent(kb, state),
        deviations=row.deviations or 0,
        hints_shown=row.hints_shown or 0,
    )


@router.post("/session/feedback")
def intervention_feedback(req: InterventionFeedback, db: DbSession = Depends(get_db)):
    row = db.get(Intervention, req.intervention_id)
    if row is None or row.session_id != req.session_id:
        raise HTTPException(status_code=404, detail="unknown intervention")
    row.outcome = req.outcome
    row.outcome_note = req.note

    # "Report incorrect hint" is the human check on the knowledge base. It
    # counts against the false-positive rate immediately and feeds the flag
    # queue in the Agent Health Monitor.
    db.commit()
    return {"ok": True}


@router.post("/session/end", response_model=SummaryResponse)
def end_session(req: SessionEndRequest, db: DbSession = Depends(get_db)):
    row = _load(db, req.session_id)
    kb = get_kb().resolve(row.experiment_id, row.origin)
    if kb is None:
        raise HTTPException(status_code=404, detail="no knowledge base entry for this experiment")

    if row.ended_at is None:
        row.ended_at = datetime.now(timezone.utc)
    row.end_reason = req.reason

    state = state_from_row(row)
    required = kb.required_step_ids
    completed = [s for s in required if s in state.completed_steps]
    # "Completed" means the student actually got through the procedure, not
    # merely that they closed the tab on the last page.
    row.completed = req.reason == "completed" and len(completed) >= max(1, len(required) - 1)

    payload = build_summary_payload(kb, row)
    try:
        narrative = get_llm().complete_text(
            prompts.SUMMARY_SYSTEM,
            prompts.context_block(payload),
            max_tokens=400,
            effort="medium",
            timeout=_settings.chat_timeout_seconds,
        )
    except (LLMUnavailable, Exception):  # noqa: BLE001
        narrative = OfflineClient().complete_text(
            prompts.SUMMARY_SYSTEM, prompts.context_block(payload)
        )

    questions = quiz_mod.build_quiz(kb, row)
    row.quiz = [q.model_dump() for q in questions]
    db.commit()

    started = row.started_at.replace(tzinfo=timezone.utc) if row.started_at.tzinfo is None else row.started_at
    ended = row.ended_at.replace(tzinfo=timezone.utc) if row.ended_at.tzinfo is None else row.ended_at

    return SummaryResponse(
        session_id=row.id,
        experiment_title=kb.title,
        duration_seconds=int((ended - started).total_seconds()),
        steps_completed=len(completed),
        steps_total=len(required),
        precision_score=rules.precision_score(kb, state),
        hints_used=row.hints_shown or 0,
        deviations=row.deviations or 0,
        deviations_recovered=row.deviations_recovered or 0,
        narrative=narrative,
        concepts_to_review=[c["name"] for c in payload.get("concepts", [])],
        quiz=questions,
    )


@router.post("/session/quiz", response_model=QuizResult)
def submit_quiz(req: QuizSubmission, db: DbSession = Depends(get_db)):
    row = _load(db, req.session_id)
    if not row.quiz:
        raise HTTPException(status_code=400, detail="no quiz has been generated for this session")

    score, per_question, feedback = quiz_mod.grade(row.quiz, req.answers)
    row.quiz_score = score
    db.commit()
    return QuizResult(
        score=score, total=len(row.quiz), per_question=per_question, feedback=feedback
    )


@router.post("/session/rate")
def rate_session(session_id: str, rating: int, db: DbSession = Depends(get_db)):
    row = _load(db, session_id)
    row.rating = max(1, min(5, rating))
    db.commit()
    return {"ok": True}
