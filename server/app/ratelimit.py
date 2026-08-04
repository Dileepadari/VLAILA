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
    def __init__(self, limit: int, window_seconds: float = 60.0) -> None:
        self.limit = limit
        self.window = window_seconds
        self._hits: defaultdict[str, deque[float]] = defaultdict(deque)

    def allow(self, key: str) -> bool:
        now = time.monotonic()
        hits = self._hits[key]
        cutoff = now - self.window
        while hits and hits[0] < cutoff:
            hits.popleft()
        if len(hits) >= self.limit:
            return False
        hits.append(now)
        return True

    def retry_after(self, key: str) -> int:
        hits = self._hits.get(key)
        if not hits:
            return 1
        return max(1, int(self.window - (time.monotonic() - hits[0])) + 1)
