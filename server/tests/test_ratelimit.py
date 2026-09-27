"""The sliding-window limiter, including the growth it used to have."""

from __future__ import annotations

import time

from app.ratelimit import SlidingWindow


def test_allows_up_to_the_limit_then_refuses():
    w = SlidingWindow(limit=3, window_seconds=60)
    assert [w.allow("s1") for _ in range(4)] == [True, True, True, False]


def test_each_key_has_its_own_window():
    w = SlidingWindow(limit=1, window_seconds=60)
    assert w.allow("a") is True
    assert w.allow("b") is True
    assert w.allow("a") is False


def test_the_window_slides():
    w = SlidingWindow(limit=1, window_seconds=0.05)
    assert w.allow("s1") is True
    assert w.allow("s1") is False
    time.sleep(0.06)
    assert w.allow("s1") is True


def test_retry_after_is_at_least_one_second():
    w = SlidingWindow(limit=1, window_seconds=60)
    w.allow("s1")
    assert w.retry_after("s1") >= 1
    # An unknown key must not raise.
    assert w.retry_after("never-seen") == 1


def test_the_map_does_not_grow_with_every_session_ever_seen():
    # It used to: one deque per key, kept forever, so the limiter's memory
    # tracked total sessions rather than concurrent ones.
    w = SlidingWindow(limit=5, window_seconds=0.05)
    for i in range(500):
        w.allow(f"session-{i}")
    assert w.tracked_keys() == 500

    time.sleep(0.06)
    w.sweep_now()
    assert w.tracked_keys() == 0


def test_a_sweep_keeps_windows_that_are_still_active():
    w = SlidingWindow(limit=5, window_seconds=60)
    w.allow("busy")
    for i in range(50):
        w.allow(f"old-{i}")
    w.sweep_now()
    # Nothing is stale yet at a 60s window, so everything survives.
    assert w.tracked_keys() == 51
    assert w.allow("busy") is True
