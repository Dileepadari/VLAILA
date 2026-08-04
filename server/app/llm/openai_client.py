"""OpenAI adapter (Option A of the proposal's stack table).

Kept deliberately thin: it exists so an institution that has already procured
OpenAI capacity can switch providers with an environment variable rather than a
rewrite. Uses raw HTTP because the project does not otherwise depend on the
OpenAI SDK.
"""

from __future__ import annotations

import json
from collections.abc import Iterator
from typing import Any

import httpx

from .base import LLMUnavailable

API_URL = "https://api.openai.com/v1/chat/completions"


class OpenAIClient:
    name = "openai"

    def __init__(self, api_key: str | None, model: str = "gpt-4o") -> None:
        if not api_key:
            raise LLMUnavailable("no OpenAI API key configured")
        self.api_key = api_key
        self.model = model

    def _post(self, body: dict[str, Any], timeout: float) -> dict[str, Any]:
        try:
            response = httpx.post(
                API_URL,
                headers={"Authorization": f"Bearer {self.api_key}"},
                json=body,
                timeout=timeout,
            )
            response.raise_for_status()
        except httpx.HTTPError as exc:
            raise LLMUnavailable(str(exc)) from exc
        return response.json()

    def complete_text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        effort: str = "medium",
        timeout: float = 20.0,
    ) -> str:
        data = self._post(
            {
                "model": self.model,
                "max_tokens": max_tokens,
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout,
        )
        return data["choices"][0]["message"]["content"].strip()

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
        data = self._post(
            {
                "model": self.model,
                "max_tokens": max_tokens,
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {"name": "verdict", "schema": schema, "strict": True},
                },
                "messages": [
                    {"role": "system", "content": system},
                    {"role": "user", "content": user},
                ],
            },
            timeout,
        )
        raw = data["choices"][0]["message"]["content"]
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
        yield self.complete_text(
            system, user, max_tokens=max_tokens, effort=effort, timeout=timeout
        )
