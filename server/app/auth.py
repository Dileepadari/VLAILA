"""Credential gate for the staff surfaces.

Every route in this API was open. That is defensible for the student-facing
ones - the widget is embedded in ~200 independently hosted lab pages and there
is no identity system to authenticate against, which is why those are rate
limited instead. It is not defensible for the instructor and admin surfaces:
`/instructor/students` returns per-student rows keyed by `user_key` with a
behavioural "strained" flag on each, `/admin/query` runs natural-language
queries over the session store, and `/admin/export` dumps it. Anyone who could
reach the host could read all of it.

CORS was the only thing in front of them, and CORS is a browser policy. It does
nothing about curl.

The gate is a single shared secret, because there is no user directory here to
do anything better with. Set VLAILA_STAFF_API_KEY and send it as X-API-Key.
"""

from __future__ import annotations

import hmac

from fastapi import Header, HTTPException

from .config import get_settings


class StaffAuthNotConfigured(RuntimeError):
    pass


def require_staff(x_api_key: str | None = Header(default=None)) -> None:
    """FastAPI dependency. Raises 401 unless the request carries the staff key.

    Fails closed: with no key configured the staff routes refuse everyone
    rather than serve everyone, which is how this was wrong in the first place.
    Local development and the test suite set
    VLAILA_ALLOW_UNAUTHENTICATED_STAFF=true, which is deliberately verbose to
    say out loud.
    """
    settings = get_settings()

    if settings.allow_unauthenticated_staff:
        return

    if not settings.staff_api_key:
        raise HTTPException(
            status_code=503,
            detail=(
                "Staff endpoints are not configured. Set VLAILA_STAFF_API_KEY, or "
                "VLAILA_ALLOW_UNAUTHENTICATED_STAFF=true for local development."
            ),
        )

    # compare_digest, not ==: string comparison returns at the first differing
    # byte, and how long that takes is a measurement of how much of the key the
    # caller has guessed.
    if not x_api_key or not hmac.compare_digest(settings.staff_api_key, x_api_key):
        raise HTTPException(status_code=401, detail="Invalid or missing X-API-Key")
