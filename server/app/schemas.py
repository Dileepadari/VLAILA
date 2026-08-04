"""Wire contracts between the browser widget and the API."""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Literal

from pydantic import BaseModel, Field


class Verdict(str, Enum):
    """The four outputs the Agentic Core is allowed to produce.

    Constraining the agent to a closed set is what makes it conservative: there
    is no "say something helpful" escape hatch, so silence (NO_ACTION) is the
    natural default rather than a special case.
    """

    NO_ACTION = "NO_ACTION"
    WARN = "WARN"
    HINT = "HINT"
    CONCEPT = "CONCEPT"


class Severity(str, Enum):
    FATAL = "fatal"
    RECOVERABLE = "recoverable"
    INFO = "info"


class Role(str, Enum):
    STUDENT = "student"
    INSTRUCTOR = "instructor"
    ADMIN = "admin"
    AUTHOR = "author"
    GUEST = "guest"


# --------------------------------------------------------------------------
# Session lifecycle
# --------------------------------------------------------------------------


class ExperimentRef(BaseModel):
    """What the widget's detector reads off the page, with no configuration."""

    experiment_id: str
    lab_id: str | None = None
    origin: str | None = None
    discipline: str | None = None
    institute: str | None = None
    experiment_title: str | None = None


class SessionStartRequest(BaseModel):
    experiment: ExperimentRef
    role: Role = Role.STUDENT
    # Pseudonymous. Only bound to a real student record when an institution has
    # explicitly enrolled, which is what keeps the default anonymous.
    user_key: str | None = None
    institution: str | None = None
    locale: str = "en"
    client_version: str | None = None


class SessionStartResponse(BaseModel):
    session_id: str
    experiment_id: str
    kb_found: bool
    kb_version: str | None = None
    title: str | None = None
    tasks: list[str] = Field(default_factory=list)
    total_steps: int = 0
    # The widget mirrors these locally so Tier 1 keeps working with no network.
    rules: dict[str, Any] | None = None


class StepEvent(BaseModel):
    """One observed interaction, normalized across host page and simulator."""

    session_id: str
    action: Literal[
        "click", "input", "change", "select", "upload", "navigate", "dwell", "submit", "canvas"
    ]
    task: str | None = None
    selector: str | None = None
    frame: str = "host"
    # For clicks this carries the element's accessible label, which lets a KB
    # author target a button by its text when it has no stable id.
    value: str | None = None
    numeric_value: float | None = None
    elapsed_ms: int | None = None
    client_ts: datetime | None = None
    meta: dict[str, Any] = Field(default_factory=dict)


class BehaviourMetrics(BaseModel):
    """Counts behind the scores, so a judgement can be audited."""

    active_seconds: int = 0
    idle_seconds: int = 0
    away_seconds: int = 0
    clicks: int = 0
    rage_clicks: int = 0
    hesitations: int = 0
    corrections: int = 0
    scroll_depth: float = 0.0
    pointer_distance: float = 0.0
    tasks_visited: int = 0


class BehaviourSnapshot(BaseModel):
    """How the session is going, as opposed to what was clicked.

    Every field is a derived score or a count. Nothing the student typed,
    selected or copied is represented here, which is what makes it safe to
    persist and to put in a prompt.
    """

    focus: float = 1.0
    struggle: float = 0.0
    confidence: float = 1.0
    coverage: float = 0.0
    metrics: BehaviourMetrics = Field(default_factory=BehaviourMetrics)


class BehaviourSignal(BaseModel):
    kind: str
    confidence: float = 0.0
    selector: str | None = None
    detail: str | None = None
    at: int | None = None


class BehaviourReport(BaseModel):
    session_id: str
    snapshot: BehaviourSnapshot
    signals: list[BehaviourSignal] = Field(default_factory=list)


class AgentAction(BaseModel):
    label: str
    kind: Literal["show_me", "acknowledge", "explain", "dismiss", "open_chat"]


class AgentResponse(BaseModel):
    verdict: Verdict
    severity: Severity = Severity.INFO
    title: str | None = None
    message: str | None = None
    concept: str | None = None
    step_id: str | None = None
    correction_step_id: str | None = None
    highlight_selector: str | None = None
    highlight_frame: str | None = None
    hint_level: int = 0
    confidence: float = 1.0
    intervention_id: str | None = None
    actions: list[AgentAction] = Field(default_factory=list)
    # Which rung of the reasoning ladder answered. Surfaced in the Agent Health
    # Monitor so we can see how much traffic actually needs the frontier model.
    tier: Literal["rules", "small", "frontier", "none"] = "none"
    latency_ms: int = 0
    progress: "SessionProgress | None" = None


class SessionProgress(BaseModel):
    completed_steps: list[str] = Field(default_factory=list)
    current_step_id: str | None = None
    total_steps: int = 0
    percent: int = 0
    deviations: int = 0
    hints_shown: int = 0


class InterventionFeedback(BaseModel):
    session_id: str
    intervention_id: str
    outcome: Literal["accepted", "dismissed", "reported_wrong", "auto_resolved"]
    note: str | None = None


# --------------------------------------------------------------------------
# Chat
# --------------------------------------------------------------------------


class ChatMessage(BaseModel):
    role: Literal["user", "agent"]
    text: str


class ChatRequest(BaseModel):
    session_id: str
    message: str
    history: list[ChatMessage] = Field(default_factory=list)
    locale: str = "en"


class Citation(BaseModel):
    chunk_id: str
    heading: str
    source: str | None = None


class ChatResponse(BaseModel):
    text: str
    citations: list[Citation] = Field(default_factory=list)
    off_topic: bool = False
    tier: str = "frontier"
    latency_ms: int = 0


# --------------------------------------------------------------------------
# Completion, summary, quiz
# --------------------------------------------------------------------------


class SessionEndRequest(BaseModel):
    session_id: str
    reason: Literal["completed", "abandoned", "navigated_away"] = "completed"


class QuizQuestion(BaseModel):
    id: str
    question: str
    options: list[str]
    answer_index: int
    explanation: str
    concept_ref: str | None = None


class SummaryResponse(BaseModel):
    session_id: str
    experiment_title: str
    duration_seconds: int
    steps_completed: int
    steps_total: int
    precision_score: int
    hints_used: int
    deviations: int
    deviations_recovered: int
    narrative: str
    concepts_to_review: list[str] = Field(default_factory=list)
    quiz: list[QuizQuestion] = Field(default_factory=list)


class QuizSubmission(BaseModel):
    session_id: str
    answers: dict[str, int]


class QuizResult(BaseModel):
    score: int
    total: int
    per_question: dict[str, bool]
    feedback: dict[str, str]


# --------------------------------------------------------------------------
# Instructor / admin
# --------------------------------------------------------------------------


class StepHeatCell(BaseModel):
    step_id: str
    title: str
    order: int
    attempts: int
    confusion: int
    dropoff: int
    avg_seconds: int


class FrictionCount(BaseModel):
    """How many sessions in the cohort showed a given behavioural signal."""

    kind: str
    label: str
    sessions: int
    share: int


class BehaviourAggregate(BaseModel):
    """The cohort's behavioural read.

    Session-scoped rather than step-scoped, and deliberately so: the widget
    derives struggle from pointer movement, retries and time away across a
    whole visit, so attributing it to one step would be inventing precision the
    measurement does not have. The step heatmap stays event-driven; this sits
    beside it and answers a different question -- not "which step goes wrong"
    but "how did the class find it".
    """

    sessions_reporting: int = 0
    avg_struggle: float = 0.0
    avg_focus: float = 0.0
    avg_confidence: float = 0.0
    # Sessions whose struggle score cleared the attention threshold.
    strained_sessions: int = 0
    friction: list[FrictionCount] = Field(default_factory=list)
    # Pseudonymous keys, so an instructor can follow up without the platform
    # holding a name against a behavioural judgement.
    students_to_check: list[str] = Field(default_factory=list)


class ClassAnalytics(BaseModel):
    experiment_id: str
    experiment_title: str
    sessions: int
    completion_rate: int
    avg_duration_seconds: int
    steps: list[StepHeatCell]
    worst_step: str | None = None
    behaviour: BehaviourAggregate | None = None


class CustomHint(BaseModel):
    id: str | None = None
    experiment_id: str
    step_id: str
    institution: str
    author: str
    text: str
    level: Literal["nudge", "specific"] = "nudge"


class OrgStats(BaseModel):
    active_sessions_30d: int
    sessions_all_time: int
    sessions_this_month: int
    avg_session_minutes: float
    daily: list[dict[str, Any]]
    by_discipline: list[dict[str, Any]]
    trending: list[dict[str, Any]]
    struggling: list[dict[str, Any]]


class AgentHealth(BaseModel):
    interventions: int
    accepted: int
    dismissed: int
    reported_wrong: int
    acceptance_rate: float
    false_positive_rate: float
    p50_latency_ms: int
    p95_latency_ms: int
    tier_mix: dict[str, int]
    flagged_experiments: list[dict[str, Any]]


class NLQueryRequest(BaseModel):
    question: str
    institution: str | None = None


class NLQueryResponse(BaseModel):
    answer: str
    sql: str | None = None
    columns: list[str] = Field(default_factory=list)
    rows: list[list[Any]] = Field(default_factory=list)
    chart: dict[str, Any] | None = None


AgentResponse.model_rebuild()
