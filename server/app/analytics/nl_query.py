"""Natural-language admin queries, via constrained NL-to-SQL.

The model proposes SQL; this module decides whether it runs. Generated SQL is
never trusted: it is parsed and validated against an allowlist before execution,
and rejected outright if it touches a write verb, a second statement, or a
column that could identify an individual student. A model that is asked nicely
not to write DELETE will usually comply; a validator that refuses to execute it
always will.
"""

from __future__ import annotations

import logging
import re
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session as DbSession

from ..llm import LLMUnavailable, get_llm
from ..schemas import NLQueryResponse
from ..agent import prompts

log = logging.getLogger(__name__)

# The only tables and columns the generator is allowed to reference.
SCHEMA_DOC = """\
sessions(
  id TEXT, experiment_id TEXT, lab_id TEXT, discipline TEXT, institute TEXT,
  institution TEXT, role TEXT, started_at DATETIME, ended_at DATETIME,
  completed BOOLEAN, deviations INT, deviations_recovered INT,
  hints_shown INT, quiz_score INT, rating INT
)
events(
  id INT, session_id TEXT, experiment_id TEXT, at DATETIME, action TEXT,
  task TEXT, step_id TEXT, elapsed_ms INT
)
interventions(
  id TEXT, session_id TEXT, experiment_id TEXT, at DATETIME, verdict TEXT,
  severity TEXT, step_id TEXT, hint_level INT, tier TEXT,
  latency_ms INT, outcome TEXT
)
"""

ALLOWED_TABLES = {"sessions", "events", "interventions"}
BANNED = re.compile(
    r"\b(insert|update|delete|drop|alter|create|attach|detach|pragma|replace|vacuum|"
    r"reindex|truncate|grant|revoke)\b",
    re.I,
)
# Never expose a column that maps a row back to a person.
BANNED_COLUMNS = re.compile(r"\buser_key\b", re.I)


class UnsafeQuery(ValueError):
    pass


def validate_sql(sql: str) -> str:
    cleaned = sql.strip().rstrip(";").strip()
    if not cleaned:
        raise UnsafeQuery("empty query")
    if ";" in cleaned:
        raise UnsafeQuery("multiple statements are not allowed")
    if not re.match(r"^select\b", cleaned, re.I):
        raise UnsafeQuery("only SELECT statements are allowed")
    if BANNED.search(cleaned):
        raise UnsafeQuery("query contains a write or DDL keyword")
    if BANNED_COLUMNS.search(cleaned):
        raise UnsafeQuery("query references an identifying column")
    if "--" in cleaned or "/*" in cleaned:
        raise UnsafeQuery("comments are not allowed")

    referenced = set(re.findall(r"\b(?:from|join)\s+([a-z_]+)", cleaned, re.I))
    unknown = {t.lower() for t in referenced} - ALLOWED_TABLES
    if unknown:
        raise UnsafeQuery(f"unknown table(s): {', '.join(sorted(unknown))}")

    if not re.search(r"\blimit\s+\d+", cleaned, re.I):
        cleaned += " LIMIT 200"
    return cleaned


def run(db: DbSession, question: str, institution: str | None = None) -> NLQueryResponse:
    payload = {
        "task": "nl_sql",
        "question": question,
        "schema": SCHEMA_DOC,
        "institution_filter": institution,
        "dialect": "sqlite",
    }

    try:
        result = get_llm().complete_json(
            prompts.NL_SQL_SYSTEM,
            prompts.context_block(payload),
            prompts.NL_SQL_SCHEMA,
            effort="medium",
            max_tokens=600,
            timeout=20.0,
        )
        sql = result.get("sql", "")
        explanation = result.get("explanation", "")
    except (LLMUnavailable, Exception) as exc:  # noqa: BLE001
        log.info("NL query model unavailable, using the built-in query set: %s", exc)
        sql, explanation = _fallback_query(question, institution)

    try:
        safe_sql = validate_sql(sql)
    except UnsafeQuery as exc:
        return NLQueryResponse(
            answer=f"I could not run that safely: {exc}. Try rephrasing as a read-only question.",
            sql=sql,
        )

    try:
        rows = db.execute(text(safe_sql)).fetchall()
    except Exception as exc:  # noqa: BLE001 - surface the DB error to the admin
        return NLQueryResponse(answer=f"The query failed: {exc}", sql=safe_sql)

    columns = list(rows[0]._mapping.keys()) if rows else []
    data = [list(r) for r in rows]

    chart = None
    if len(columns) == 2 and data and all(isinstance(r[1], (int, float)) for r in data):
        chart = {
            "type": "bar",
            "x": columns[0],
            "y": columns[1],
            "data": [{columns[0]: r[0], columns[1]: r[1]} for r in data[:20]],
        }

    answer = explanation or f"{len(data)} row(s)."
    if not data:
        answer = f"{explanation} No rows matched." if explanation else "No rows matched."

    return NLQueryResponse(
        answer=answer, sql=safe_sql, columns=columns, rows=data, chart=chart
    )


def _fallback_query(question: str, institution: str | None) -> tuple[str, str]:
    """Keyword-routed queries so the admin console works with no model.

    Covers the questions administrators actually ask, which the proposal lists
    explicitly: usage trends, struggling labs, institution breakdowns.
    """
    q = question.lower()
    where = f" WHERE institution = '{institution}'" if institution else ""

    if "struggl" in q or "abandon" in q or "drop" in q:
        return (
            f"SELECT experiment_id, COUNT(*) AS sessions, "
            f"ROUND(100.0 * SUM(CASE WHEN completed THEN 1 ELSE 0 END) / COUNT(*)) AS completion_pct "
            f"FROM sessions{where} GROUP BY experiment_id ORDER BY completion_pct ASC LIMIT 10",
            "Experiments with the lowest completion rates.",
        )
    if "trend" in q or "popular" in q or "most" in q or "usage" in q:
        return (
            f"SELECT experiment_id, COUNT(*) AS sessions FROM sessions{where} "
            f"GROUP BY experiment_id ORDER BY sessions DESC LIMIT 10",
            "Most-run experiments by session count.",
        )
    if "institut" in q or "college" in q or "iit" in q or "compare" in q:
        return (
            "SELECT COALESCE(institution, institute) AS institution, COUNT(*) AS sessions, "
            "ROUND(100.0 * SUM(CASE WHEN completed THEN 1 ELSE 0 END) / COUNT(*)) AS completion_pct "
            "FROM sessions GROUP BY 1 ORDER BY sessions DESC LIMIT 20",
            "Sessions and completion rate by institution.",
        )
    if "hint" in q or "intervent" in q or "agent" in q:
        return (
            "SELECT verdict, COUNT(*) AS n, "
            "SUM(CASE WHEN outcome = 'accepted' THEN 1 ELSE 0 END) AS accepted "
            "FROM interventions GROUP BY verdict ORDER BY n DESC LIMIT 20",
            "Interventions by verdict, with how many were acted on.",
        )
    if "disciplin" in q or "subject" in q or "area" in q:
        return (
            f"SELECT discipline, COUNT(*) AS sessions FROM sessions{where} "
            f"GROUP BY discipline ORDER BY sessions DESC LIMIT 20",
            "Sessions by broad area.",
        )
    return (
        f"SELECT experiment_id, COUNT(*) AS sessions, "
        f"ROUND(AVG(hints_shown), 1) AS avg_hints FROM sessions{where} "
        f"GROUP BY experiment_id ORDER BY sessions DESC LIMIT 20",
        "Overall session counts by experiment.",
    )
