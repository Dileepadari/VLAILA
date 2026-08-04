"""Database engine, session factory and ORM models.

SQLite by default so the project runs from a fresh clone; Postgres in
production via VLAILA_DATABASE_URL. The schema is deliberately narrow -- five
tables that between them answer every question the instructor and admin
dashboards ask.
"""

from __future__ import annotations

import uuid
from collections.abc import Iterator
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    create_engine,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, sessionmaker

from .config import get_settings


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _uid(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:20]}"


class Base(DeclarativeBase):
    pass


class Session(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: _uid("ses"))
    experiment_id: Mapped[str] = mapped_column(String(120), index=True)
    lab_id: Mapped[str | None] = mapped_column(String(120), nullable=True)
    origin: Mapped[str | None] = mapped_column(String(200), nullable=True)
    discipline: Mapped[str | None] = mapped_column(String(120), index=True, nullable=True)
    institute: Mapped[str | None] = mapped_column(String(80), nullable=True)
    institution: Mapped[str | None] = mapped_column(String(160), index=True, nullable=True)
    role: Mapped[str] = mapped_column(String(20), default="student")
    # Pseudonymous by default. Only an enrolled institution ever maps this back
    # to a real student, and it never appears in a model prompt.
    user_key: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    locale: Mapped[str] = mapped_column(String(10), default="en")

    started_at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    end_reason: Mapped[str | None] = mapped_column(String(30), nullable=True)
    completed: Mapped[bool] = mapped_column(Boolean, default=False)

    # Denormalised session state. Keeping it on the row means resuming a
    # session is a single read, and the analytics queries never have to replay
    # the event log.
    completed_steps: Mapped[list] = mapped_column(JSON, default=list)
    first_try_steps: Mapped[list] = mapped_column(JSON, default=list)
    hint_levels: Mapped[dict] = mapped_column(JSON, default=dict)
    shown_errors: Mapped[list] = mapped_column(JSON, default=list)
    shown_concepts: Mapped[list] = mapped_column(JSON, default=list)
    deviations: Mapped[int] = mapped_column(Integer, default=0)
    deviations_recovered: Mapped[int] = mapped_column(Integer, default=0)
    hints_shown: Mapped[int] = mapped_column(Integer, default=0)
    last_event_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    current_step_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    # The latest behavioural read from the widget: focus/struggle/confidence
    # scores plus counts. Shapes only -- no field values, no keystrokes -- so
    # this stays safe to hold against a pseudonymous session.
    behaviour: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    behaviour_signals: Mapped[list] = mapped_column(JSON, default=list)
    quiz: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    quiz_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    rating: Mapped[int | None] = mapped_column(Integer, nullable=True)


class Event(Base):
    __tablename__ = "events"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(40), ForeignKey("sessions.id"), index=True)
    experiment_id: Mapped[str] = mapped_column(String(120), index=True)
    at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)
    action: Mapped[str] = mapped_column(String(20))
    task: Mapped[str | None] = mapped_column(String(60), nullable=True)
    selector: Mapped[str | None] = mapped_column(String(300), nullable=True)
    frame: Mapped[str] = mapped_column(String(60), default="host")
    value: Mapped[str | None] = mapped_column(String(300), nullable=True)
    numeric_value: Mapped[float | None] = mapped_column(Float, nullable=True)
    step_id: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    elapsed_ms: Mapped[int | None] = mapped_column(Integer, nullable=True)


Index("ix_events_session_step", Event.session_id, Event.step_id)


class Intervention(Base):
    __tablename__ = "interventions"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: _uid("iv"))
    session_id: Mapped[str] = mapped_column(String(40), ForeignKey("sessions.id"), index=True)
    experiment_id: Mapped[str] = mapped_column(String(120), index=True)
    at: Mapped[datetime] = mapped_column(DateTime, default=_now, index=True)
    verdict: Mapped[str] = mapped_column(String(20), index=True)
    severity: Mapped[str] = mapped_column(String(20), default="info")
    step_id: Mapped[str | None] = mapped_column(String(80), index=True, nullable=True)
    error_id: Mapped[str | None] = mapped_column(String(80), nullable=True)
    hint_level: Mapped[int] = mapped_column(Integer, default=0)
    tier: Mapped[str] = mapped_column(String(20), default="rules")
    confidence: Mapped[float] = mapped_column(Float, default=1.0)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(20), index=True, nullable=True)
    outcome_note: Mapped[str | None] = mapped_column(Text, nullable=True)


class ChatTurn(Base):
    __tablename__ = "chat_turns"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    session_id: Mapped[str] = mapped_column(String(40), ForeignKey("sessions.id"), index=True)
    experiment_id: Mapped[str] = mapped_column(String(120), index=True)
    at: Mapped[datetime] = mapped_column(DateTime, default=_now)
    question: Mapped[str] = mapped_column(Text)
    answer: Mapped[str] = mapped_column(Text)
    off_topic: Mapped[bool] = mapped_column(Boolean, default=False)
    latency_ms: Mapped[int] = mapped_column(Integer, default=0)


class CustomHintRow(Base):
    """Instructor-authored hints, served ahead of the KB defaults.

    Scoped to (experiment, step, institution) so one college's phrasing never
    leaks into another's students.
    """

    __tablename__ = "custom_hints"

    id: Mapped[str] = mapped_column(String(40), primary_key=True, default=lambda: _uid("hint"))
    experiment_id: Mapped[str] = mapped_column(String(120), index=True)
    step_id: Mapped[str] = mapped_column(String(80), index=True)
    institution: Mapped[str] = mapped_column(String(160), index=True)
    author: Mapped[str] = mapped_column(String(160))
    text: Mapped[str] = mapped_column(Text)
    level: Mapped[str] = mapped_column(String(20), default="nudge")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=_now)


_settings = get_settings()
_connect_args = {"check_same_thread": False} if _settings.database_url.startswith("sqlite") else {}
engine = create_engine(_settings.database_url, connect_args=_connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False, future=True)


def init_db() -> None:
    Base.metadata.create_all(engine)


def get_db() -> Iterator["SessionLocal"]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
