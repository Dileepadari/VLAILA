"""End-to-end API tests: the four scaffold endpoints, chat, summary, quiz,
dashboards, NL query safety and export."""

from __future__ import annotations

import pytest

from app.analytics.nl_query import UnsafeQuery, validate_sql


def start(client, experiment="colour-blindness"):
    r = client.post(
        "/session/start",
        json={
            "experiment": {
                "experiment_id": experiment,
                "origin": "https://pp-iiith.vlabs.ac.in",
            },
            "institution": "IIIT Hyderabad",
            "user_key": "student-001",
        },
    )
    assert r.status_code == 200
    return r.json()


# ---------------------------------------------------------------------------
# Scaffold endpoints
# ---------------------------------------------------------------------------


def test_health_reports_the_knowledge_base(client):
    body = client.get("/health").json()
    assert body["status"] == "ok"
    assert body["knowledge_base_entries"] >= 6
    assert "colour-blindness" in body["experiments"]


def test_session_start_returns_client_rules_for_offline_use(client):
    body = start(client)
    assert body["kb_found"] is True
    assert body["rules"]["steps"], "the widget needs the step list to run Tier 1 offline"
    assert body["rules"]["errors"], "and the error patterns"
    # The quiz answers must never be shipped to the browser at session start.
    assert "quiz_bank" not in body["rules"]
    assert "theory_chunks" not in body["rules"]


def test_unknown_experiment_still_opens_an_observe_only_session(client):
    r = client.post(
        "/session/start",
        json={"experiment": {"experiment_id": "not-authored-yet", "origin": "https://x.vlabs.ac.in"}},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["kb_found"] is False
    # And the agent stays silent rather than guessing.
    ev = client.post(
        "/session/event",
        json={"session_id": body["session_id"], "action": "click", "selector": "#anything"},
    ).json()
    assert ev["verdict"] == "NO_ACTION"


# ---------------------------------------------------------------------------
# Chat
# ---------------------------------------------------------------------------


def test_chat_answers_from_the_experiment_material(client):
    sid = start(client)["session_id"]
    r = client.post(
        "/chat",
        json={"session_id": sid, "message": "What does the tritanopia button do?"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["off_topic"] is False
    assert body["citations"], "an experiment answer must cite the material it came from"
    assert body["text"]


def test_chat_redirects_off_topic_questions(client):
    sid = start(client)["session_id"]
    body = client.post(
        "/chat",
        json={"session_id": sid, "message": "who won the cricket world cup"},
    ).json()
    assert body["off_topic"] is True
    assert not body["citations"]


def test_chat_scrubs_identifying_details_before_storing(client):
    sid = start(client)["session_id"]
    client.post(
        "/chat",
        json={
            "session_id": sid,
            "message": "my email is aarav@example.com, why is protanopia dark?",
        },
    )
    from app.db import ChatTurn, SessionLocal

    with SessionLocal() as db:
        turn = db.query(ChatTurn).first()
        assert "aarav@example.com" not in turn.question
        assert "[email]" in turn.question


def test_chat_streams(client):
    sid = start(client)["session_id"]
    with client.stream(
        "POST", "/chat/stream", json={"session_id": sid, "message": "what is protanopia"}
    ) as r:
        assert r.status_code == 200
        payload = "".join(chunk for chunk in r.iter_text())
    assert "data:" in payload
    assert '"done": true' in payload.lower()


# ---------------------------------------------------------------------------
# Summary and quiz
# ---------------------------------------------------------------------------


def test_summary_and_quiz_round_trip(client):
    sid = start(client)["session_id"]
    for event in [
        {"action": "navigate", "task": "Theory"},
        {"action": "navigate", "task": "Simulation"},
        {"action": "click", "selector": ".image-thumbnail", "frame": "sim", "task": "Simulation"},
        {"action": "click", "selector": "#protonopiaBtn", "frame": "sim", "task": "Simulation"},
    ]:
        event["session_id"] = sid
        client.post("/session/event", json=event)

    summary = client.post("/session/end", json={"session_id": sid, "reason": "completed"}).json()
    assert summary["steps_completed"] >= 3
    assert 0 <= summary["precision_score"] <= 100
    assert summary["narrative"]
    assert len(summary["quiz"]) == 3

    # Answer everything correctly.
    answers = {q["id"]: q["answer_index"] for q in summary["quiz"]}
    result = client.post("/session/quiz", json={"session_id": sid, "answers": answers}).json()
    assert result["score"] == 3
    assert all(result["per_question"].values())

    # And now get one wrong: the feedback must name the right answer.
    q0 = summary["quiz"][0]
    wrong = dict(answers)
    wrong[q0["id"]] = (q0["answer_index"] + 1) % len(q0["options"])
    result = client.post("/session/quiz", json={"session_id": sid, "answers": wrong}).json()
    assert result["score"] == 2
    assert q0["options"][q0["answer_index"]] in result["feedback"][q0["id"]]


# ---------------------------------------------------------------------------
# Intervention feedback
# ---------------------------------------------------------------------------


def test_reporting_a_wrong_hint_shows_up_in_agent_health(client):
    sid = start(client)["session_id"]
    warning = client.post(
        "/session/event",
        json={
            "session_id": sid,
            "action": "click",
            "selector": "#protonopiaBtn",
            "frame": "sim",
            "task": "Simulation",
        },
    ).json()
    assert warning["intervention_id"]

    r = client.post(
        "/session/feedback",
        json={
            "session_id": sid,
            "intervention_id": warning["intervention_id"],
            "outcome": "reported_wrong",
            "note": "I had already picked an image",
        },
    )
    assert r.status_code == 200

    health = client.get("/admin/health").json()
    assert health["reported_wrong"] == 1
    assert health["false_positive_rate"] > 0


# ---------------------------------------------------------------------------
# Dashboards
# ---------------------------------------------------------------------------


def test_instructor_analytics_and_custom_hints(client):
    sid = start(client)["session_id"]
    client.post(
        "/session/event",
        json={"session_id": sid, "action": "navigate", "task": "Posttest"},
    )
    client.post("/session/end", json={"session_id": sid, "reason": "abandoned"})

    analytics = client.get(
        "/instructor/analytics",
        params={"experiment_id": "colour-blindness", "institution": "IIIT Hyderabad"},
    ).json()
    assert analytics["sessions"] == 1
    assert analytics["steps"]

    created = client.post(
        "/instructor/hints",
        json={
            "experiment_id": "colour-blindness",
            "step_id": "select-image",
            "institution": "IIIT Hyderabad",
            "author": "Dr. Sharma",
            "text": "Use the Ishihara plate — it makes the effect unmistakable.",
        },
    )
    assert created.status_code == 200
    hints = client.get(
        "/instructor/hints",
        params={"experiment_id": "colour-blindness", "institution": "IIIT Hyderabad"},
    ).json()
    assert len(hints) == 1


def test_custom_hint_for_an_unknown_step_is_rejected(client):
    r = client.post(
        "/instructor/hints",
        json={
            "experiment_id": "colour-blindness",
            "step_id": "no-such-step",
            "institution": "IIIT Hyderabad",
            "author": "Dr. Sharma",
            "text": "...",
        },
    )
    assert r.status_code == 400


def test_admin_stats_and_nl_query(client):
    sid = start(client)["session_id"]
    client.post("/session/end", json={"session_id": sid, "reason": "completed"})

    stats = client.get("/admin/stats").json()
    assert stats["sessions_all_time"] == 1
    assert len(stats["daily"]) == 14

    answer = client.post(
        "/admin/query", json={"question": "which experiments are most used?"}
    ).json()
    assert answer["sql"].lower().startswith("select")
    assert "colour-blindness" in str(answer["rows"])


def test_export_produces_a_csv_and_a_pdf(client):
    sid = start(client)["session_id"]
    client.post("/session/end", json={"session_id": sid, "reason": "completed"})

    csv_response = client.post(
        "/admin/export", params={"fmt": "csv"}, json={"question": "usage by experiment"}
    )
    assert csv_response.status_code == 200
    assert b"experiment_id" in csv_response.content

    pdf_response = client.post(
        "/admin/export", params={"fmt": "pdf"}, json={"question": "usage by experiment"}
    )
    assert pdf_response.status_code == 200
    assert pdf_response.content.startswith(b"%PDF")


# ---------------------------------------------------------------------------
# NL-to-SQL safety
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "sql",
    [
        "DELETE FROM sessions",
        "SELECT * FROM sessions; DROP TABLE sessions",
        "SELECT user_key FROM sessions",
        "UPDATE sessions SET completed = 1",
        "SELECT * FROM sqlite_master",
        "SELECT * FROM sessions -- comment",
        "PRAGMA table_info(sessions)",
        "",
    ],
)
def test_unsafe_sql_is_refused(sql):
    with pytest.raises(UnsafeQuery):
        validate_sql(sql)


def test_safe_sql_gets_a_limit_added():
    out = validate_sql("SELECT experiment_id FROM sessions")
    assert out.lower().endswith("limit 200")


# ---------------------------------------------------------------------------
# Knowledge base / Author Studio
# ---------------------------------------------------------------------------


def test_kb_listing_and_scenario_simulation(client):
    entries = client.get("/kb").json()
    assert len(entries) >= 6
    assert {e["discipline"] for e in entries} >= {
        "Design Engineering",
        "Computer Science and Engineering",
    }

    result = client.post(
        "/kb/colour-blindness/simulate",
        json={
            "events": [
                {"action": "click", "selector": "#protonopiaBtn", "frame": "sim", "task": "Simulation"}
            ]
        },
    ).json()
    assert result["results"][0]["verdict"] == "WARN"
    assert result["results"][0]["error_id"] == "mode-before-image"


def test_rate_limit_kicks_in(client):
    sid = start(client)["session_id"]
    codes = set()
    for _ in range(70):
        codes.add(
            client.post(
                "/session/event",
                json={"session_id": sid, "action": "click", "selector": "#x"},
            ).status_code
        )
    assert 429 in codes


# ---------------------------------------------------------------------------
# Behaviour
# ---------------------------------------------------------------------------


def test_behaviour_report_is_stored_and_signals_are_bounded(client):
    """The widget's behavioural read must survive to the agent's next turn.

    It is reported on a timer rather than per event, so if it were not
    persisted the agent would only ever see it by luck. The tail bound matters
    too: a long session must not grow this row without limit.
    """
    session = start(client)
    sid = session["session_id"]

    snapshot = {
        "focus": 0.82,
        "struggle": 0.44,
        "confidence": 0.61,
        "coverage": 0.7,
        "metrics": {"clicks": 12, "rage_clicks": 1, "hesitations": 3, "active_seconds": 180},
    }

    # More signals than the tail keeps, sent across two reports.
    for batch in range(2):
        r = client.post(
            "/session/behaviour",
            json={
                "session_id": sid,
                "snapshot": snapshot,
                "signals": [
                    {"kind": "hesitation", "confidence": 0.7} for _ in range(25)
                ],
            },
        )
        assert r.status_code == 200, batch

    from app.db import Session as SessionRow
    from app.db import SessionLocal

    with SessionLocal() as db:
        row = db.get(SessionRow, sid)
        assert row.behaviour["struggle"] == pytest.approx(0.44)
        assert row.behaviour["metrics"]["rage_clicks"] == 1
        # 50 sent, only the last 40 retained.
        assert len(row.behaviour_signals) == 40


def test_behaviour_for_an_unknown_session_is_rejected(client):
    r = client.post(
        "/session/behaviour",
        json={"session_id": "ses_does_not_exist", "snapshot": {}, "signals": []},
    )
    assert r.status_code == 404


def test_class_analytics_rolls_behaviour_up_to_the_cohort(client):
    """Two sessions, one strained, one clean.

    The averages must cover only sessions that actually reported: counting a
    silent session as zero-struggle would report "everything is fine" exactly
    when the widget failed to load.
    """
    strained = start(client)["session_id"]
    client.post(
        "/session/behaviour",
        json={
            "session_id": strained,
            "snapshot": {"focus": 0.6, "struggle": 0.8, "confidence": 0.3},
            # The same kind twice: it must count once per session, not twice.
            "signals": [
                {"kind": "rage_click", "confidence": 0.9},
                {"kind": "rage_click", "confidence": 0.9},
                {"kind": "skimmed", "confidence": 0.8},
            ],
        },
    )

    calm = start(client)["session_id"]
    client.post(
        "/session/behaviour",
        json={
            "session_id": calm,
            "snapshot": {"focus": 1.0, "struggle": 0.0, "confidence": 0.9},
            "signals": [],
        },
    )

    # A third session that never reports must not drag the averages.
    start(client)

    body = client.get(
        "/instructor/analytics",
        params={"experiment_id": "colour-blindness", "institution": "IIIT Hyderabad"},
    ).json()

    b = body["behaviour"]
    assert b["sessions_reporting"] == 2
    assert b["avg_struggle"] == pytest.approx(0.4)
    assert b["strained_sessions"] == 1

    by_kind = {f["kind"]: f for f in b["friction"]}
    assert by_kind["rage_click"]["sessions"] == 1
    assert by_kind["rage_click"]["share"] == 50
    assert by_kind["rage_click"]["label"]
    assert "skimmed" in by_kind


def test_students_are_flagged_from_the_behavioural_read(client):
    sid = start(client)["session_id"]
    client.post(
        "/session/behaviour",
        json={
            "session_id": sid,
            "snapshot": {"focus": 0.5, "struggle": 0.9, "confidence": 0.2},
            "signals": [{"kind": "thrash", "confidence": 0.8}],
        },
    )

    rows = client.get(
        "/instructor/students",
        params={"experiment_id": "colour-blindness", "institution": "IIIT Hyderabad"},
    ).json()

    assert rows, "expected at least one student row"
    assert any(r["strained"] for r in rows)
