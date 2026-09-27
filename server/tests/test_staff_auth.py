"""The credential gate on the instructor and admin surfaces.

Every route in this API was open. `/instructor/students` returns per-student
rows keyed by `user_key` with a behavioural "strained" flag on each,
`/admin/query` runs natural-language queries over the session store, and
`/admin/export` dumps it. CORS was the only thing in front of them, and CORS is
a browser policy - it does nothing about curl.
"""

from __future__ import annotations

import importlib

import pytest
from fastapi.testclient import TestClient

STAFF_ROUTES = [
    ("GET", "/instructor/analytics?experiment_id=colour-blindness"),
    ("GET", "/instructor/students?experiment_id=colour-blindness"),
    ("GET", "/instructor/suggestion?experiment_id=colour-blindness"),
    ("GET", "/instructor/hints?experiment_id=colour-blindness&institution=iiit"),
    ("GET", "/admin/stats"),
    ("GET", "/admin/health"),
    ("POST", "/kb/reload"),
]


def _client(monkeypatch, tmp_path, **env):
    """A TestClient with the settings cache cleared and env applied."""
    monkeypatch.setenv("VLAILA_DATABASE_URL", f"sqlite:///{tmp_path / 'auth.db'}")
    for key, value in env.items():
        if value is None:
            monkeypatch.delenv(key, raising=False)
        else:
            monkeypatch.setenv(key, value)

    from app.config import get_settings

    get_settings.cache_clear()
    from app import db as db_module

    importlib.reload(db_module)
    from app import main as main_module

    importlib.reload(main_module)
    return TestClient(main_module.app)


@pytest.fixture()
def gated(monkeypatch, tmp_path):
    """Staff routes protected by a key, as a real deployment would be."""
    with _client(
        monkeypatch,
        tmp_path,
        VLAILA_ALLOW_UNAUTHENTICATED_STAFF="false",
        VLAILA_STAFF_API_KEY="test-staff-key",
    ) as c:
        yield c
    from app.config import get_settings

    get_settings.cache_clear()


@pytest.mark.parametrize("method,path", STAFF_ROUTES)
def test_staff_routes_refuse_an_anonymous_caller(gated, method, path):
    res = gated.request(method, path)
    assert res.status_code == 401, f"{method} {path} returned {res.status_code}"


@pytest.mark.parametrize("method,path", STAFF_ROUTES)
def test_staff_routes_accept_the_key(gated, method, path):
    res = gated.request(method, path, headers={"X-API-Key": "test-staff-key"})
    assert res.status_code != 401, f"{method} {path} returned 401 with a valid key"


def test_a_wrong_key_is_refused(gated):
    res = gated.get(
        "/instructor/students?experiment_id=colour-blindness",
        headers={"X-API-Key": "not-the-key"},
    )
    assert res.status_code == 401


def test_the_export_and_query_endpoints_are_gated(gated):
    assert gated.post("/admin/query", json={"question": "how many sessions?"}).status_code == 401
    assert gated.post("/admin/export", params={"fmt": "csv"}, json={"question": "x"}).status_code == 401


def test_student_facing_routes_stay_open(gated):
    """The widget is embedded in ~200 lab pages with no identity to present."""
    assert gated.get("/health").status_code == 200
    assert gated.get("/kb").status_code == 200

    started = gated.post(
        "/session/start",
        json={"experiment": {"experiment_id": "colour-blindness"}},
    )
    assert started.status_code == 200
    session_id = started.json()["session_id"]
    assert gated.get(f"/session/{session_id}/progress").status_code == 200


def test_with_no_key_configured_the_staff_routes_refuse_everyone(monkeypatch, tmp_path):
    """Fails closed. Defaulting open is how this was wrong in the first place."""
    with _client(
        monkeypatch,
        tmp_path,
        VLAILA_ALLOW_UNAUTHENTICATED_STAFF="false",
        VLAILA_STAFF_API_KEY=None,
    ) as c:
        res = c.get("/instructor/students?experiment_id=colour-blindness")
        assert res.status_code == 503
        assert "VLAILA_STAFF_API_KEY" in res.json()["detail"]
    from app.config import get_settings

    get_settings.cache_clear()


def test_the_development_escape_hatch_works(monkeypatch, tmp_path):
    with _client(
        monkeypatch,
        tmp_path,
        VLAILA_ALLOW_UNAUTHENTICATED_STAFF="true",
        VLAILA_STAFF_API_KEY=None,
    ) as c:
        assert c.get("/admin/health").status_code == 200
    from app.config import get_settings

    get_settings.cache_clear()
