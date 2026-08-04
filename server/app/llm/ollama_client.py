"""Ollama adapter -- the privacy-first path (Option B) and Tier 2 of the ladder.

Set VLAILA_LLM_PROVIDER=ollama and no byte of session data leaves the
consortium network. The same adapter also backs Tier 2 in the hybrid
configuration, where a small local model handles ambiguous step classification
and only conceptual questions reach a frontier model.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any

import httpx

from .base import LLMUnavailable


class OllamaClient:
    name = "ollama"

    def __init__(self, base_url: str, model: str) -> None:
        self.base_url = base_url.rstrip("/")
        self.model = model

    def _generate(
        self, system: str, user: str, timeout: float, fmt: dict[str, Any] | None = None
    ) -> str:
        body: dict[str, Any] = {
            "model": self.model,
            "system": system,
            "prompt": user,
            "stream": False,
        }
        if fmt:
            # Ollama accepts a JSON schema in `format` to constrain output.
            body["format"] = fmt
        try:
            response = httpx.post(f"{self.base_url}/api/generate", json=body, timeout=timeout)
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMUnavailable(str(exc)) from exc
        return response.json().get("response", "").strip()

    def complete_text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        effort: str = "medium",
        timeout: float = 20.0,
    ) -> str:
        return self._generate(system, user, timeout)

    def complete_json(
        self,
        system: str,
        user: str,
        schema: dict[str, Any],
        *,
        max_tokens: int = 1024,
        effort: str = "low",
        timeout: float = 10.0,
    ) -> dict[str, Any]:
        raw = self._generate(system, user, timeout, fmt=schema)
        try:
            return json.loads(raw)
        except json.JSONDecodeError as exc:
            raise LLMUnavailable("model returned non-JSON output") from exc

    def stream_text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        effort: str = "medium",
        timeout: float = 30.0,
    ) -> Iterator[str]:
        yield self.complete_text(system, user, timeout=timeout)
