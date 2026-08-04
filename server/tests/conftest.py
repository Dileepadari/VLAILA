from __future__ import annotations

import os
import sys
from pathlib import Path

import pytest

SERVER_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SERVER_ROOT))

# Tests run entirely offline against a throwaway database, so the suite is
# deterministic and needs no API key.
os.environ.setdefault("VLAILA_LLM_PROVIDER", "offline")
os.environ.setdefault("VLAILA_DATABASE_URL", "sqlite:///:memory:")


@pytest.fixture(scope="session")
def kb():
    from app.kb import get_kb

    return get_kb()


@pytest.fixture()
def client(tmp_path, monkeypatch):
    """A TestClient backed by a fresh on-disk SQLite file per test."""
    db_path = tmp_path / "test.db"
    monkeypatch.setenv("VLAILA_DATABASE_URL", f"sqlite:///{db_path}")

    from app.config import get_settings

    get_settings.cache_clear()

    import importlib

    from app import db as db_module

    importlib.reload(db_module)

    from fastapi.testclient import TestClient

    from app import main as main_module

    importlib.reload(main_module)

    with TestClient(main_module.app) as c:
        yield c

    get_settings.cache_clear()
