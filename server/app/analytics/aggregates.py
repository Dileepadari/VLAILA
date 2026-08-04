"""Aggregations behind the instructor and admin dashboards.

All queries run over the session/event/intervention tables and are scoped by
institution where the caller supplies one. Nothing here selects `user_key`
except the explicitly per-student drill-down, which an instructor reaches only
for their own enrolled class.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import func
from sqlalchemy.orm import Session as DbSession

from ..db import Event, Intervention
from ..db import Session as SessionRow
from ..kb import KnowledgeBase
from ..schemas import (
    AgentHealth,
    BehaviourAggregate,
    ClassAnalytics,
    FrictionCount,
    OrgStats,
    StepHeatCell,
)


def _now() -> datetime:
    return datetime.now(timezone.utc)


def class_analytics(
    db: DbSession, kb: KnowledgeBase, experiment_id: str, institution: str | None = None
) -> ClassAnalytics:
    entry = kb.resolve(experiment_id)
    title = entry.title if entry else experiment_id

    q = db.query(SessionRow).filter(SessionRow.experiment_id == experiment_id)
    if institution:
        q = q.filter(SessionRow.institution == institution)
    sessions = q.all()

    total = len(sessions)
    completed = sum(1 for s in sessions if s.completed)
    durations = [
        (s.ended_at - s.started_at).total_seconds()
        for s in sessions
        if s.ended_at and s.started_at
    ]
    avg_duration = int(sum(durations) / len(durations)) if durations else 0

    session_ids = [s.id for s in sessions]
    confusion: Counter[str] = Counter()
    attempts: Counter[str] = Counter()
    step_seconds: defaultdict[str, list[float]] = defaultdict(list)

    if session_ids:
        for iv in (
            db.query(Intervention)
            .filter(Intervention.session_id.in_(session_ids))
            .filter(Intervention.verdict.in_(["WARN", "HINT"]))
            .all()
        ):
            key = iv.step_id or "unknown"
            confusion[key] += 1
        for ev in db.query(Event).filter(Event.session_id.in_(session_ids)).all():
            if ev.step_id:
                attempts[ev.step_id] += 1
                if ev.elapsed_ms:
                    step_seconds[ev.step_id].append(ev.elapsed_ms / 1000)

    # Drop-off: a step is where a session ended if it is the furthest step that
    # session ever reached and the session never completed.
    dropoff: Counter[str] = Counter()
    for s in sessions:
        if s.completed:
            continue
        done = list(s.completed_steps or [])
        if entry:
            pending = next(
                (st.id for st in entry.steps if st.id not in done and not st.optional), None
            )
            if pending:
                dropoff[pending] += 1

    steps: list[StepHeatCell] = []
    if entry:
        for step in entry.steps:
            times = step_seconds.get(step.id, [])
            steps.append(
                StepHeatCell(
                    step_id=step.id,
                    title=step.title,
                    order=step.order,
                    attempts=attempts.get(step.id, 0),
                    confusion=confusion.get(step.id, 0),
                    dropoff=dropoff.get(step.id, 0),
                    avg_seconds=int(sum(times) / len(times)) if times else 0,
                )
            )

    worst = max(steps, key=lambda s: s.confusion).title if steps and any(
        s.confusion for s in steps
    ) else None

    return ClassAnalytics(
        experiment_id=experiment_id,
        experiment_title=title,
        sessions=total,
        completion_rate=round(completed * 100 / total) if total else 0,
        avg_duration_seconds=avg_duration,
        steps=steps,
        worst_step=worst,
        behaviour=behaviour_analytics(db, experiment_id, institution),
    )


"""How each behavioural signal reads to an instructor.

The widget's vocabulary is diagnostic; an instructor wants the teaching
implication, so the label is what gets shown and the kind stays as the key.
"""
FRICTION_LABELS: dict[str, str] = {
    "rage_click": "Repeated clicks on an unresponsive control",
    "hesitation": "Hovered without committing",
    "thrash": "Rewrote the same value repeatedly",
    "idle": "Long pause mid-step",
    "backtrack": "Returned to an earlier page",
    "wandering": "Searched the page without acting",
    "skimmed": "Moved past the theory quickly",
    "attention_lost": "Left the page mid-experiment",
}

# Above this, the session is worth an instructor's attention. Set high on
# purpose: a list of "struggling students" that is mostly false positives is
# worse than no list, because it trains instructors to ignore it.
STRAIN_THRESHOLD = 0.5


def behaviour_analytics(
    db: DbSession, experiment_id: str, institution: str | None = None
) -> BehaviourAggregate:
    """Roll the per-session behavioural reads up to the cohort.

    Only sessions that actually reported are averaged. Counting a silent
    session as zero-struggle would drag the cohort average toward "everything
    is fine" exactly when the widget failed to load.
    """
    q = db.query(SessionRow).filter(SessionRow.experiment_id == experiment_id)
    if institution:
        q = q.filter(SessionRow.institution == institution)
    sessions = [s for s in q.all() if s.behaviour]

    if not sessions:
        return BehaviourAggregate()

    n = len(sessions)
    struggle = [float(s.behaviour.get("struggle") or 0) for s in sessions]
    focus = [float(s.behaviour.get("focus") or 0) for s in sessions]
    confidence = [float(s.behaviour.get("confidence") or 0) for s in sessions]

    # A signal counts once per session however often it fired: the question is
    # how many students hit it, not how many times one student did.
    per_kind: Counter[str] = Counter()
    for s in sessions:
        kinds = {sig.get("kind") for sig in (s.behaviour_signals or []) if sig.get("kind")}
        for kind in kinds:
            if kind in FRICTION_LABELS:
                per_kind[kind] += 1

    friction = [
        FrictionCount(
            kind=kind,
            label=FRICTION_LABELS[kind],
            sessions=count,
            share=round(count * 100 / n),
        )
        for kind, count in per_kind.most_common()
    ]

    strained = [s for s in sessions if float(s.behaviour.get("struggle") or 0) >= STRAIN_THRESHOLD]
    to_check = sorted({s.user_key for s in strained if s.user_key})

    return BehaviourAggregate(
        sessions_reporting=n,
        avg_struggle=round(sum(struggle) / n, 2),
        avg_focus=round(sum(focus) / n, 2),
        avg_confidence=round(sum(confidence) / n, 2),
        strained_sessions=len(strained),
        friction=friction,
        students_to_check=to_check[:20],
    )


def org_stats(db: DbSession, institution: str | None = None) -> OrgStats:
    q = db.query(SessionRow)
    if institution:
        q = q.filter(SessionRow.institution == institution)

    now = _now()
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    cutoff_30d = now - timedelta(days=30)

    all_sessions = q.all()
    recent = [s for s in all_sessions if s.started_at and _aware(s.started_at) >= cutoff_30d]
    this_month = [s for s in all_sessions if s.started_at and _aware(s.started_at) >= month_start]

    durations = [
        (s.ended_at - s.started_at).total_seconds()
        for s in all_sessions
        if s.ended_at and s.started_at
    ]
    avg_minutes = round(sum(durations) / len(durations) / 60, 1) if durations else 0.0

    daily_counter: Counter[str] = Counter()
    for s in recent:
        daily_counter[_aware(s.started_at).date().isoformat()] += 1
    daily = [
        {"day": (now - timedelta(days=i)).date().isoformat(),
         "sessions": daily_counter.get((now - timedelta(days=i)).date().isoformat(), 0)}
        for i in range(13, -1, -1)
    ]

    by_discipline_counter: Counter[str] = Counter()
    for s in all_sessions:
        by_discipline_counter[s.discipline or "Unknown"] += 1
    by_discipline = [
        {"name": name, "sessions": count}
        for name, count in by_discipline_counter.most_common()
    ]

    per_experiment: defaultdict[str, list[SessionRow]] = defaultdict(list)
    for s in all_sessions:
        per_experiment[s.experiment_id].append(s)

    trending = sorted(
        (
            {"experiment_id": exp, "sessions": len(rows)}
            for exp, rows in per_experiment.items()
        ),
        key=lambda r: r["sessions"],
        reverse=True,
    )[:10]

    struggling = []
    for exp, rows in per_experiment.items():
        if len(rows) < 1:
            continue
        done = sum(1 for r in rows if r.completed)
        completion = round(done * 100 / len(rows))
        struggling.append(
            {
                "experiment_id": exp,
                "sessions": len(rows),
                "completion": completion,
                "abandon": 100 - completion,
            }
        )
    struggling.sort(key=lambda r: r["completion"])

    return OrgStats(
        active_sessions_30d=len(recent),
        sessions_all_time=len(all_sessions),
        sessions_this_month=len(this_month),
        avg_session_minutes=avg_minutes,
        daily=daily,
        by_discipline=by_discipline,
        trending=trending,
        struggling=struggling[:10],
    )


def agent_health(db: DbSession) -> AgentHealth:
    rows = db.query(Intervention).all()
    total = len(rows)
    accepted = sum(1 for r in rows if r.outcome == "accepted")
    dismissed = sum(1 for r in rows if r.outcome == "dismissed")
    wrong = sum(1 for r in rows if r.outcome == "reported_wrong")
    resolved = accepted + dismissed + wrong

    latencies = sorted(r.latency_ms for r in rows) or [0]
    p50 = latencies[len(latencies) // 2]
    p95 = latencies[min(len(latencies) - 1, int(len(latencies) * 0.95))]

    tier_mix = Counter(r.tier for r in rows)

    # An experiment whose hints get dismissed repeatedly is a content problem,
    # not a student problem. Surfacing it is the feedback loop that keeps the
    # knowledge base honest as the platform's own labs change.
    per_experiment: defaultdict[str, list[Intervention]] = defaultdict(list)
    for r in rows:
        per_experiment[r.experiment_id].append(r)
    flagged = []
    for exp, items in per_experiment.items():
        answered = [i for i in items if i.outcome]
        if len(answered) < 5:
            continue
        bad = sum(1 for i in answered if i.outcome in {"dismissed", "reported_wrong"})
        rate = round(bad * 100 / len(answered))
        if rate >= 30:
            flagged.append(
                {"experiment_id": exp, "interventions": len(items), "dismiss_rate": rate}
            )
    flagged.sort(key=lambda r: r["dismiss_rate"], reverse=True)

    return AgentHealth(
        interventions=total,
        accepted=accepted,
        dismissed=dismissed,
        reported_wrong=wrong,
        acceptance_rate=round(accepted * 100 / resolved, 1) if resolved else 0.0,
        false_positive_rate=round(wrong * 100 / resolved, 1) if resolved else 0.0,
        p50_latency_ms=p50,
        p95_latency_ms=p95,
        tier_mix=dict(tier_mix),
        flagged_experiments=flagged,
    )


def student_rows(db: DbSession, experiment_id: str, institution: str | None):
    """Per-student roll-up for the instructor drill-down."""
    q = db.query(
        SessionRow.user_key,
        func.count(SessionRow.id).label("sessions"),
        func.sum(func.cast(SessionRow.completed, __import__("sqlalchemy").Integer)).label("done"),
        func.avg(SessionRow.deviations).label("avg_deviations"),
        func.avg(SessionRow.hints_shown).label("avg_hints"),
    ).filter(SessionRow.experiment_id == experiment_id)
    if institution:
        q = q.filter(SessionRow.institution == institution)
    return q.group_by(SessionRow.user_key).all()


def _aware(dt: datetime) -> datetime:
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)
