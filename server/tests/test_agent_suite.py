"""The 20-case agent evaluation suite (IS deliverable #6).

Every case is a scripted student trajectory against a real knowledge base entry
with an asserted expected verdict. The suite is split deliberately:

  * Cases 1-8   correct behaviour  -> must produce NO_ACTION or CONCEPT
  * Cases 9-16  procedural errors  -> must produce WARN with the right severity
  * Cases 17-20 stuck / escalation -> must produce HINT at the right level

The first group matters most. It is easy to build an agent that catches every
error and impossible to trust one that also fires on students doing everything
right, so more than a third of the suite exists purely to prove the agent stays
quiet.
"""

from __future__ import annotations

import pytest

from app.agent.rules import Observation, SessionState, evaluate
from app.kb import get_kb

KB = get_kb()


def run(experiment: str, events: list[dict], state: SessionState | None = None):
    """Replay events, threading state forward exactly as the live agent does."""
    entry = KB.resolve(experiment)
    assert entry is not None, f"missing knowledge base entry: {experiment}"
    state = state or SessionState()
    verdicts = []
    for raw in events:
        obs = Observation(
            action=raw["action"],
            task=raw.get("task"),
            selector=raw.get("selector"),
            frame=raw.get("frame", "host"),
            value=raw.get("value"),
            numeric_value=raw.get("numeric_value"),
        )
        state.idle_seconds = raw.get("idle", 0)
        for key, count in raw.get("counts", {}).items():
            state.action_counts[key] = count
        v = evaluate(entry, obs, state)
        verdicts.append(v)
        if v.kind == "NO_ACTION" and v.step_id:
            state.completed_steps.add(v.step_id)
        elif v.kind == "CONCEPT" and v.step_id:
            state.shown_concepts.add(v.step_id)
            state.completed_steps.add(v.step_id)
        elif v.kind == "WARN" and v.error_id:
            state.shown_errors.add(v.error_id)
        elif v.kind == "HINT" and v.step_id:
            state.hint_levels[v.step_id] = v.hint_level
    return verdicts, state


NAV = {"action": "navigate"}


def nav(task: str) -> dict:
    return {"action": "navigate", "task": task}


# ---------------------------------------------------------------------------
# Group A -- correct behaviour must not be interrupted (cases 1-8)
# ---------------------------------------------------------------------------


def test_case_01_reading_aim_is_silent():
    verdicts, _ = run("colour-blindness", [nav("Aim")])
    assert verdicts[0].kind == "NO_ACTION"


def test_case_02_correct_order_through_theory_is_silent():
    verdicts, state = run("colour-blindness", [nav("Aim"), nav("Theory")])
    assert [v.kind for v in verdicts] == ["NO_ACTION", "NO_ACTION"]
    assert {"read-aim", "read-theory"} <= state.completed_steps


def test_case_03_selecting_image_before_filtering_is_silent():
    verdicts, _ = run(
        "colour-blindness",
        [
            nav("Aim"),
            nav("Theory"),
            nav("Simulation"),
            {"action": "click", "selector": ".image-thumbnail", "frame": "sim", "task": "Simulation"},
        ],
    )
    assert all(v.kind == "NO_ACTION" for v in verdicts)


def test_case_04_milestone_offers_a_concept_not_a_warning():
    verdicts, _ = run(
        "colour-blindness",
        [
            nav("Aim"),
            nav("Theory"),
            nav("Simulation"),
            {"action": "click", "selector": ".image-thumbnail", "frame": "sim", "task": "Simulation"},
            {"action": "dwell", "selector": "#imageCanvas", "frame": "sim", "task": "Simulation"},
            {"action": "click", "selector": "#protonopiaBtn", "frame": "sim", "task": "Simulation"},
        ],
    )
    assert verdicts[-1].kind == "CONCEPT"
    assert "L-cone" in (verdicts[-1].message or "")


def test_case_05_adder_supply_then_inputs_is_silent():
    verdicts, _ = run(
        "half-full-adder",
        [
            nav("Theory"),
            {"action": "click", "selector": "a[href*='Simulator']", "frame": "sim", "task": "Simulation"},
            {"action": "click", "selector": "#Supply", "frame": "sim:half_adder", "task": "Simulation"},
            {"action": "click", "selector": "#button", "frame": "sim:half_adder", "task": "Simulation"},
        ],
    )
    assert all(v.kind == "NO_ACTION" for v in verdicts)


def test_case_06_titration_correct_setup_is_silent():
    verdicts, _ = run(
        "acid-base-titration",
        [
            nav("Theory"),
            {"action": "change", "selector": "md-select", "frame": "sim", "task": "Simulation"},
            {"action": "change", "selector": "md-select", "frame": "sim", "task": "Simulation"},
        ],
    )
    assert all(v.kind == "NO_ACTION" for v in verdicts)


def test_case_07_thevenin_entering_values_in_order_is_silent():
    verdicts, _ = run(
        "thevenin-theorem",
        [
            nav("Theory"),
            {"action": "click", "selector": "a[href*='thevenin']", "frame": "sim", "task": "Simulation"},
            {"action": "input", "selector": "#r1", "frame": "sim:thevenin", "numeric_value": 220, "task": "Simulation"},
            {"action": "input", "selector": "#r2", "frame": "sim:thevenin", "numeric_value": 470, "task": "Simulation"},
        ],
    )
    assert all(v.kind == "NO_ACTION" for v in verdicts)


def test_case_08_unrecognised_but_harmless_click_is_silent():
    """An interaction the KB does not model must not produce a guess."""
    verdicts, _ = run(
        "colour-blindness",
        [nav("Aim"), {"action": "click", "selector": "#some-unrelated-thing", "task": "Aim"}],
    )
    assert verdicts[-1].kind == "NO_ACTION"


# ---------------------------------------------------------------------------
# Group B -- real procedural errors must be caught (cases 9-16)
# ---------------------------------------------------------------------------


def test_case_09_filter_before_image_warns_recoverable():
    verdicts, _ = run(
        "colour-blindness",
        [{"action": "click", "selector": "#protonopiaBtn", "frame": "sim", "task": "Simulation"}],
    )
    assert verdicts[0].kind == "WARN"
    assert verdicts[0].severity == "recoverable"
    assert verdicts[0].correction_step_id == "select-image"


def test_case_10_posttest_without_simulating_is_fatal():
    verdicts, _ = run("colour-blindness", [nav("Posttest")])
    assert verdicts[0].kind == "WARN"
    assert verdicts[0].severity == "fatal"


def test_case_11_simulation_before_theory_warns():
    verdicts, _ = run("colour-blindness", [nav("Aim"), nav("Simulation")])
    assert verdicts[-1].kind == "WARN"
    assert verdicts[-1].correction_step_id == "read-theory"


def test_case_12_adder_inputs_before_supply_is_fatal():
    verdicts, _ = run(
        "half-full-adder",
        [
            nav("Theory"),
            {"action": "click", "selector": "a[href*='Simulator']", "frame": "sim", "task": "Simulation"},
            {"action": "click", "selector": "#A", "frame": "sim:half_adder", "task": "Simulation"},
        ],
    )
    assert verdicts[-1].kind == "WARN"
    assert verdicts[-1].severity == "fatal"
    assert verdicts[-1].correction_step_id == "connect-supply"


def test_case_13_titration_without_indicator_is_fatal():
    verdicts, _ = run(
        "acid-base-titration",
        [
            nav("Theory"),
            {"action": "change", "selector": "md-select", "frame": "sim", "task": "Simulation"},
            {"action": "change", "selector": "md-select", "frame": "sim", "task": "Simulation"},
            {"action": "click", "selector": "#startExp", "frame": "sim", "task": "Simulation"},
        ],
    )
    assert verdicts[-1].kind == "WARN"
    assert verdicts[-1].severity == "fatal"
    assert "indicator" in verdicts[-1].message.lower()


def test_case_14_negative_resistance_is_fatal():
    verdicts, _ = run(
        "thevenin-theorem",
        [
            nav("Theory"),
            {"action": "click", "selector": "a[href*='thevenin']", "frame": "sim", "task": "Simulation"},
            {"action": "input", "selector": "#r1", "frame": "sim:thevenin", "numeric_value": -5, "task": "Simulation"},
        ],
    )
    assert verdicts[-1].kind == "WARN"
    assert verdicts[-1].severity == "fatal"


def test_case_15_band_gap_action_before_power_is_fatal():
    verdicts, _ = run(
        "energy-band-gap",
        [nav("Theory"), {"action": "click", "selector": "#battery", "frame": "sim", "task": "Simulation"}],
    )
    assert verdicts[-1].kind == "WARN"
    assert verdicts[-1].severity == "fatal"


def test_case_16_an_error_never_fires_twice():
    """The no-repetition guarantee, at the rules layer."""
    verdicts, _ = run(
        "colour-blindness",
        [
            {"action": "click", "selector": "#protonopiaBtn", "frame": "sim", "task": "Simulation"},
            {"action": "click", "selector": "#tritanopiaBtn", "frame": "sim", "task": "Simulation"},
        ],
    )
    assert verdicts[0].kind == "WARN"
    assert verdicts[0].error_id == "mode-before-image"
    assert verdicts[1].error_id != "mode-before-image"


# ---------------------------------------------------------------------------
# Group C -- stuck detection and hint escalation (cases 17-20)
# ---------------------------------------------------------------------------


def test_case_17_no_hint_before_the_stuck_threshold():
    entry = KB.resolve("colour-blindness")
    state = SessionState(completed_steps={"read-aim", "read-theory", "open-simulator"})
    state.current_task = "Simulation"
    state.idle_seconds = 5
    v = evaluate(entry, Observation(action="dwell", task="Simulation"), state)
    assert v.kind == "NO_ACTION"


def test_case_18_hint_fires_once_stuck():
    entry = KB.resolve("colour-blindness")
    state = SessionState(completed_steps={"read-aim", "read-theory", "open-simulator"})
    state.current_task = "Simulation"
    state.idle_seconds = 60
    v = evaluate(entry, Observation(action="dwell", task="Simulation"), state)
    assert v.kind == "HINT"
    assert v.hint_level == 1
    assert v.step_id == "select-image"


def test_case_19_hints_escalate_and_the_third_points_at_the_element():
    entry = KB.resolve("colour-blindness")
    state = SessionState(completed_steps={"read-aim", "read-theory", "open-simulator"})
    state.current_task = "Simulation"
    state.idle_seconds = 60

    seen = []
    for _ in range(3):
        v = evaluate(entry, Observation(action="dwell", task="Simulation"), state)
        seen.append(v)
        state.hint_levels[v.step_id] = v.hint_level

    assert [v.hint_level for v in seen] == [1, 2, 3]
    assert len({v.message for v in seen}) == 3, "each escalation level must say something new"
    assert seen[2].highlight_selector, "level 3 must point at the real control"


def test_case_20_thrashing_produces_guidance_not_a_hard_warning():
    """Rapid mode-switching is a symptom, not an error. It should read as a
    nudge, and the KB marks it at 0.75 confidence so the gate downgrades it."""
    entry = KB.resolve("colour-blindness")
    state = SessionState(completed_steps={"select-image", "observe-normal"})
    state.action_counts["err:filter-thrashing"] = 5
    v = evaluate(
        entry,
        Observation(action="click", selector="#tritanopiaBtn", frame="sim", task="Simulation"),
        state,
    )
    assert v.kind == "WARN"
    assert v.error_id == "filter-thrashing"
    assert v.confidence < 0.9, "should be gated down to a hint by the core"


# ---------------------------------------------------------------------------
# Aggregate assertion: the false-positive budget
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "experiment,events",
    [
        ("colour-blindness", [nav("Aim"), nav("Theory"), nav("Pretest")]),
        ("bubble-sort", [nav("Basic Concept"), nav("Algorithm")]),
        (
            "half-full-adder",
            [nav("Theory"), {"action": "click", "selector": "a[href*='Simulator']", "frame": "sim", "task": "Simulation"}],
        ),
        ("energy-band-gap", [nav("Theory"), {"action": "click", "selector": "#btn_main", "frame": "sim", "task": "Simulation"}]),
    ],
)
def test_correct_trajectories_never_warn(experiment, events):
    verdicts, _ = run(experiment, events)
    assert not any(v.kind == "WARN" for v in verdicts), (
        f"false positive on a correct trajectory through {experiment}"
    )
