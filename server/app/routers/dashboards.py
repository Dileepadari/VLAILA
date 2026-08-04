"""Instructor and admin surfaces: analytics, custom hints, NL query, exports."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlalchemy.orm import Session as DbSession

from ..agent import prompts
from ..analytics import aggregates, export, nl_query
from ..db import CustomHintRow, get_db
from ..kb import get_kb
from ..llm import LLMUnavailable, get_llm
from ..llm.offline import OfflineClient
from ..schemas import (
    AgentHealth,
    ClassAnalytics,
    CustomHint,
    NLQueryRequest,
    NLQueryResponse,
    OrgStats,
)

router = APIRouter(tags=["dashboards"])


# ---------------------------------------------------------------------------
# Instructor
# ---------------------------------------------------------------------------


@router.get("/instructor/analytics", response_model=ClassAnalytics)
def class_analytics(
    experiment_id: str,
    institution: str | None = None,
    db: DbSession = Depends(get_db),
):
    return aggregates.class_analytics(db, get_kb(), experiment_id, institution)


@router.get("/instructor/students")
def students(
    experiment_id: str,
    institution: str | None = None,
    db: DbSession = Depends(get_db),
):
    rows = aggregates.student_rows(db, experiment_id, institution)
    # Which students the behavioural read flagged, so the roll-up can mark them
    # rather than making the instructor cross-reference two tables.
    flagged = set(
        aggregates.behaviour_analytics(db, experiment_id, institution).students_to_check
    )
    return [
        {
            "student": r.user_key or "anonymous",
            "sessions": r.sessions,
            "completed": int(r.done or 0),
            "avg_deviations": round(float(r.avg_deviations or 0), 1),
            "avg_hints": round(float(r.avg_hints or 0), 1),
            "strained": r.user_key in flagged,
        }
        for r in rows
    ]


@router.get("/instructor/suggestion")
def teaching_suggestion(
    experiment_id: str,
    institution: str | None = None,
    db: DbSession = Depends(get_db),
):
    analytics = aggregates.class_analytics(db, get_kb(), experiment_id, institution)
    total = max(1, analytics.sessions)
    worst = max(analytics.steps, key=lambda s: s.confusion) if analytics.steps else None

    entry = get_kb().resolve(experiment_id)
    prerequisite = None
    if entry and worst:
        step = entry.step(worst.step_id)
        if step and step.concept_ref:
            prerequisite = entry.concepts.get(step.concept_ref, {}).get("name")

    payload = {
        "task": "teaching_suggestion",
        "experiment": analytics.experiment_title,
        "sessions": analytics.sessions,
        "completion_rate": analytics.completion_rate,
        "worst_step": worst.title if worst else None,
        "worst_step_confusion": round((worst.confusion * 100 / total)) if worst else 0,
        "likely_prerequisite": prerequisite,
        "steps": [
            {"title": s.title, "confusion": s.confusion, "dropoff": s.dropoff}
            for s in analytics.steps
        ],
    }

    # The behavioural read changes the advice, not just the confidence in it:
    # a cohort that skimmed the theory needs a different intervention from one
    # that read it and still could not drive the simulator.
    behaviour = analytics.behaviour
    if behaviour and behaviour.sessions_reporting:
        payload["how_the_class_found_it"] = {
            "avg_struggle": behaviour.avg_struggle,
            "avg_focus": behaviour.avg_focus,
            "sessions_needing_attention": behaviour.strained_sessions,
            "common_friction": [
                {"what": f.label, "share_of_class": f.share} for f in behaviour.friction[:4]
            ],
        }
    try:
        text = get_llm().complete_text(
            prompts.TEACHING_SYSTEM, prompts.context_block(payload),
            max_tokens=400, effort="medium",
        )
    except (LLMUnavailable, Exception):  # noqa: BLE001
        text = OfflineClient().complete_text(
            prompts.TEACHING_SYSTEM, prompts.context_block(payload)
        )
    return {"suggestion": text, "worst_step": worst.title if worst else None}


@router.get("/instructor/hints", response_model=list[CustomHint])
def list_hints(
    experiment_id: str, institution: str, db: DbSession = Depends(get_db)
):
    rows = (
        db.query(CustomHintRow)
        .filter(
            CustomHintRow.experiment_id == experiment_id,
            CustomHintRow.institution == institution,
        )
        .order_by(CustomHintRow.created_at.desc())
        .all()
    )
    return [
        CustomHint(
            id=r.id,
            experiment_id=r.experiment_id,
            step_id=r.step_id,
            institution=r.institution,
            author=r.author,
            text=r.text,
            level=r.level,
        )
        for r in rows
    ]


@router.post("/instructor/hints", response_model=CustomHint)
def create_hint(hint: CustomHint, db: DbSession = Depends(get_db)):
    entry = get_kb().resolve(hint.experiment_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="unknown experiment")
    if entry.step(hint.step_id) is None:
        raise HTTPException(
            status_code=400,
            detail=f"'{hint.step_id}' is not a step of this experiment",
        )
    row = CustomHintRow(
        experiment_id=hint.experiment_id,
        step_id=hint.step_id,
        institution=hint.institution,
        author=hint.author,
        text=hint.text,
        level=hint.level,
    )
    db.add(row)
    db.commit()
    hint.id = row.id
    return hint


@router.delete("/instructor/hints/{hint_id}")
def delete_hint(hint_id: str, db: DbSession = Depends(get_db)):
    row = db.get(CustomHintRow, hint_id)
    if row is None:
        raise HTTPException(status_code=404, detail="unknown hint")
    db.delete(row)
    db.commit()
    return {"ok": True}


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------


@router.get("/admin/stats", response_model=OrgStats)
def org_stats(institution: str | None = None, db: DbSession = Depends(get_db)):
    return aggregates.org_stats(db, institution)


@router.get("/admin/health", response_model=AgentHealth)
def agent_health(db: DbSession = Depends(get_db)):
    return aggregates.agent_health(db)


@router.post("/admin/query", response_model=NLQueryResponse)
def natural_language_query(req: NLQueryRequest, db: DbSession = Depends(get_db)):
    return nl_query.run(db, req.question, req.institution)


@router.post("/admin/export")
def export_report(
    req: NLQueryRequest,
    fmt: str = Query("csv", pattern="^(csv|pdf)$"),
    db: DbSession = Depends(get_db),
):
    """Export any NL query result. Same path as the on-screen answer, so what
    downloads is exactly what was displayed."""
    result = nl_query.run(db, req.question, req.institution)
    if not result.columns:
        raise HTTPException(status_code=400, detail=result.answer)

    if fmt == "csv":
        return Response(
            content=export.to_csv(result.columns, result.rows),
            media_type="text/csv",
            headers={"Content-Disposition": 'attachment; filename="vlaila-report.csv"'},
        )
    return Response(
        content=export.to_pdf(
            "VLAILA report", result.columns, result.rows, note=req.question
        ),
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="vlaila-report.pdf"'},
    )
