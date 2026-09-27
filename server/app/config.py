"""Runtime configuration.

Every setting has a default that works with no environment file at all, so a
fresh clone runs immediately: SQLite for storage and the offline LLM adapter for
reasoning. Set VLAILA_LLM_PROVIDER=anthropic plus a key to turn on the model
tier; nothing else changes.
"""

from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

REPO_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_prefix="VLAILA_", env_file=".env", extra="ignore"
    )

    # --- storage -----------------------------------------------------------
    database_url: str = f"sqlite:///{REPO_ROOT / 'server' / 'vlaila.db'}"

    # --- knowledge base ----------------------------------------------------
    kb_dir: Path = REPO_ROOT / "kb" / "experiments"

    # --- reasoning ---------------------------------------------------------
    # offline | anthropic | openai | ollama
    llm_provider: str = "offline"
    anthropic_api_key: str | None = None
    openai_api_key: str | None = None
    ollama_base_url: str = "http://localhost:11434"

    # Tier 3 (frontier) model: conceptual Q&A, summaries, quizzes, NL->SQL.
    model_reasoning: str = "claude-opus-5"
    # Tier 2 (small/local) model: ambiguous step classification.
    model_fast: str = "gemma2:9b"

    # Hard ceiling on a single agent turn. Past this we fall back to the
    # knowledge base's static hint rather than make the student wait.
    agent_timeout_seconds: float = 2.0
    chat_timeout_seconds: float = 20.0

    # Minimum confidence before the agent is allowed to emit a WARN. The
    # proposal's target is a <5% false-positive rate; a conservative gate is
    # how we get there.
    warn_confidence_threshold: float = 0.9

    # --- serving -----------------------------------------------------------
    # Every Virtual Labs lab lives on its own subdomain, so the allowlist is a
    # suffix match rather than a fixed origin list.
    allowed_origin_suffixes: list[str] = [
        ".vlabs.ac.in",
        "vlab.co.in",
        "localhost",
        "127.0.0.1",
    ]
    rate_limit_events_per_minute: int = 60
    rate_limit_chat_per_minute: int = 20

    # --- staff access ------------------------------------------------------
    # The instructor and admin surfaces read per-student behavioural data and
    # can rewrite the hints students see, so they need a credential. Sent as
    # X-API-Key. See app/auth.py.
    staff_api_key: str | None = None
    # Escape hatch for local development and the test suite. Named to be
    # awkward to leave on by accident.
    allow_unauthenticated_staff: bool = False

    # --- privacy -----------------------------------------------------------
    # When true, chat text is scrubbed of email/phone/roll-number patterns
    # before it is sent to any external model.
    scrub_pii: bool = True

    @property
    def llm_configured(self) -> bool:
        if self.llm_provider == "anthropic":
            return bool(self.anthropic_api_key)
        if self.llm_provider == "openai":
            return bool(self.openai_api_key)
        return self.llm_provider in {"offline", "ollama"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
