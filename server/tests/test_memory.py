"""Session memory: the no-repetition guarantee (IS deliverable #7).

The headline test is a simulated 10-step walkthrough that must produce zero
repeated hints and zero repeated warnings while state persists correctly across
every event in the session.
"""

from __future__ import annotations

from collections import Counter


def start(client, experiment="colour-blindness", origin="https://pp-iiith.vlabs.ac.in"):
    r = client.post(
        "/session/start",
        json={"experiment": {"experiment_id": experiment, "origin": origin}},
    )
    assert r.status_code == 200
    return r.json()["session_id"]


def send(client, session_id, **event):
    event["session_id"] = session_id
    r = client.post("/session/event", json=event)
    assert r.status_code == 200
    return r.json()


def test_ten_step_walkthrough_never_repeats_a_hint(client):
    """A full, deliberately messy 10-event session.

    The student makes real mistakes, corrects some of them, and re-clicks
    controls -- the conditions under which a naive agent starts repeating
    itself. Every message it produces must be new.
    """
    sid = start(client)

    walkthrough = [
        # 1. Straight to the simulator, skipping the theory.
        {"action": "navigate", "task": "Simulation"},
        # 2. Filter before choosing an image.
        {"action": "click", "selector": "#protonopiaBtn", "frame": "sim", "task": "Simulation"},
        # 3. Same mistake again -- must not produce the same warning twice.
        {"action": "click", "selector": "#tritanopiaBtn", "frame": "sim", "task": "Simulation"},
        # 4. Correct themselves.
        {"action": "click", "selector": ".image-thumbnail", "frame": "sim", "task": "Simulation"},
        # 5. Look at the unfiltered image.
        {"action": "dwell", "selector": "#imageCanvas", "frame": "sim", "task": "Simulation"},
        # 6. Milestone: apply protanopia.
        {"action": "click", "selector": "#protonopiaBtn", "frame": "sim", "task": "Simulation"},
        # 7. Re-click the same control -- already-completed step, nothing to say.
        {"action": "click", "selector": "#protonopiaBtn", "frame": "sim", "task": "Simulation"},
        # 8. Tritanopia.
        {"action": "click", "selector": "#tritanopiaBtn", "frame": "sim", "task": "Simulation"},
        # 9. Achromatopsia (second milestone).
        {"action": "click", "selector": "#colorblindBtn", "frame": "sim", "task": "Simulation"},
        # 10. Move on to the posttest, now legitimately.
        {"action": "navigate", "task": "Posttest"},
    ]

    responses = [send(client, sid, **event) for event in walkthrough]

    messages = [r["message"] for r in responses if r["message"]]
    duplicates = [m for m, n in Counter(messages).items() if n > 1]
    assert not duplicates, f"VLAILA repeated itself: {duplicates}"

    # State persisted across all ten events.
    progress = responses[-1]["progress"]
    assert "select-image" in progress["completed_steps"]
    assert "apply-protanopia" in progress["completed_steps"]
    assert progress["percent"] > 0

    # The posttest warning must not fire: by step 10 they have simulated.
    assert responses[-1]["verdict"] != "WARN"


def test_hint_levels_escalate_and_never_regress(client):
    sid = start(client)
    send(client, sid, action="navigate", task="Theory")
    send(client, sid, action="navigate", task="Simulation")

    from app.db import SessionLocal, Session as SessionRow

    with SessionLocal() as db:
        row = db.get(SessionRow, sid)
        from app.agent.memory import MemoryWriter

        writer = MemoryWriter(row)
        writer.set_hint_level("select-image", 2)
        writer.set_hint_level("select-image", 1)  # a regression attempt
        db.commit()
        assert writer.hint_level("select-image") == 2


def test_an_error_is_recorded_once_per_session(client):
    sid = start(client)
    first = send(client, sid, action="navigate", task="Posttest")
    second = send(client, sid, action="navigate", task="Posttest")
    assert first["verdict"] == "WARN"
    assert second["message"] != first["message"] or second["verdict"] == "NO_ACTION"


def test_progress_survives_a_reload(client):
    """The widget re-reads progress on page navigation; it must match."""
    sid = start(client)
    send(client, sid, action="navigate", task="Theory")
    send(client, sid, action="navigate", task="Simulation")
    send(client, sid, action="click", selector=".image-thumbnail", frame="sim", task="Simulation")

    r = client.get(f"/session/{sid}/progress")
    assert r.status_code == 200
    assert "select-image" in r.json()["completed_steps"]


def test_unknown_session_is_rejected(client):
    r = client.post("/session/event", json={"session_id": "ses_nope", "action": "click"})
    assert r.status_code == 404
