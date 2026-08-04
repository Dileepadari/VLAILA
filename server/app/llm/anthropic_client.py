"""Anthropic adapter, built on the official SDK.

Two deliberate choices worth calling out:

* Effort, not thinking config. Step classification is latency-critical -- the
  student is mid-interaction -- so it runs at `effort: "low"`. Conceptual
  answers and summaries run at `medium`. We never disable thinking: on Claude
  Opus 5 it is on by default, and turning it off is the more expensive lever in
  every sense.
* Structured outputs for the verdict. The agent must return exactly one of
  NO_ACTION / WARN / HINT / CONCEPT, so we constrain the response with a JSON
  schema rather than parsing prose and hoping.
"""

from __future__ import annotations

import json
import logging
from collections.abc import Iterator
from typing import Any

from .base import LLMUnavailable

log = logging.getLogger(__name__)


class AnthropicClient:
    name = "anthropic"

    def __init__(self, api_key: str | None, model: str) -> None:
        try:
            import anthropic
        except ImportError as exc:  # pragma: no cover - dependency guard
            raise LLMUnavailable("anthropic SDK is not installed") from exc

        self._anthropic = anthropic
        # A bare constructor also resolves an `ant auth login` profile, so an
        # unset key does not necessarily mean no credentials.
        self._client = anthropic.Anthropic(api_key=api_key) if api_key else anthropic.Anthropic()
        self.model = model

    # -- helpers ------------------------------------------------------------

    def _text_from(self, response: Any) -> str:
        if getattr(response, "stop_reason", None) == "refusal":
            raise LLMUnavailable("model declined the request")
        parts = [b.text for b in response.content if getattr(b, "type", None) == "text"]
        return "".join(parts).strip()

    # -- interface ----------------------------------------------------------

    def complete_text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        effort: str = "medium",
        timeout: float = 20.0,
    ) -> str:
        try:
            response = self._client.with_options(timeout=timeout).messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                output_config={"effort": effort},
                messages=[{"role": "user", "content": user}],
            )
        except self._anthropic.APIError as exc:
            raise LLMUnavailable(str(exc)) from exc
        return self._text_from(response)

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
        try:
            response = self._client.with_options(timeout=timeout).messages.create(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                output_config={
                    "effort": effort,
                    "format": {"type": "json_schema", "schema": schema},
                },
                messages=[{"role": "user", "content": user}],
            )
        except self._anthropic.APIError as exc:
            raise LLMUnavailable(str(exc)) from exc

        text = self._text_from(response)
        try:
            return json.loads(text)
        except json.JSONDecodeError as exc:
            raise LLMUnavailable(f"model returned non-JSON output: {text[:200]}") from exc

    def stream_text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        effort: str = "medium",
        timeout: float = 30.0,
    ) -> Iterator[str]:
        try:
            with self._client.with_options(timeout=timeout).messages.stream(
                model=self.model,
                max_tokens=max_tokens,
                system=system,
                output_config={"effort": effort},
                messages=[{"role": "user", "content": user}],
            ) as stream:
                for chunk in stream.text_stream:
                    yield chunk
        except self._anthropic.APIError as exc:
            raise LLMUnavailable(str(exc)) from exc
