"""Per-session sliding-window rate limits.

In-process and deliberately simple. The purpose is not to stop a determined
attacker -- it is to stop one misbehaving simulator's event loop from flooding
the API for everyone, which on a platform of ~200 independently maintained lab
sites is a realistic accident. Swap the store for Redis when the API runs on
more than one process.
"""

from __future__ import annotations

import time
from collections import defaultdict, deque


class SlidingWindow:
    # Every session id ever seen used to get a deque in this map and keep it
    # forever, so the limiter's own memory grew with total sessions rather than
    # with concurrent ones. On a long-running API in front of ~200 labs that is
    # a slow leak. Empty windows are now dropped as they are noticed, and a
    # sweep runs occasionally so ids that simply stop appearing are collected
    # too.
    SWEEP_EVERY = 1000

    def __init__(self, limit: int, window_seconds: float = 60.0) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: defaultdict[str, deque[float]] = defaultdict(deque)
        self._calls_since_sweep = 0

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        self._maybe_sweep(now)

        hits = self._hits[key]
        cutoff = now - self.window
        while hits and hits[0] < cutoff:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True

    def _maybe_sweep(self, now: float) -> None:
        self._calls_since_sweep += 1
        if self._calls_since_sweep < self.SWEEP_EVERY:
            return
        self._calls_since_sweep = 0
        cutoff = now - self.window
        stale = [k for k, hits in self._hits.items() if not hits or hits[-1] < cutoff]
        for k in stale:
            del self._hits[k]

    def tracked_keys(self) -> int:
        """How many windows are being held. Exposed so a test can prove the
        map does not grow without bound."""
        return len(self._hits)

    def sweep_now(self) -> None:
        """Force a sweep. For tests and for a shutdown hook."""
        self._calls_since_sweep = self.SWEEP_EVERY
        self._maybe_sweep(time.monotonic())

    def retry_after(self, key: str) -> int:
        hits = self._hits.get(key)
        if not hits:
            return 1
        return max(1, int(self.window - (time.monotonic() - hits[0])) + 1)
