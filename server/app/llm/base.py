"""Provider-agnostic LLM interface.

Four adapters implement this: `offline`, `anthropic`, `openai`, `ollama`. The
offline one is a real implementation rather than a stub -- it composes answers
out of the knowledge base -- which is what lets the whole system run, demo and
be tested with no API key and no network.
"""

from __future__ import annotations

import re
from collections.abc import Iterator
from typing import Any, Protocol

# Anything that looks like a way to identify a specific student. Scrubbed from
# free text before it can reach an external model.
_PII_PATTERNS = [
    (re.compile(r"[\w.+-]+@[\w-]+\.[\w.]+"), "[email]"),
    (re.compile(r"\b(?:\+?91[-\s]?)?[6-9]\d{9}\b"), "[phone]"),
    (re.compile(r"\b[A-Z]{2}\d{2}[A-Z]\d{3,4}\b"), "[roll-no]"),
    (re.compile(r"\b\d{12}\b"), "[id]"),
]


def scrub(text: str) -> str:
    for pattern, replacement in _PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


class LLMUnavailable(RuntimeError):
    """Raised when a provider cannot answer. Callers fall back a tier."""


class LLMClient(Protocol):
    name: str

    def complete_text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        effort: str = "medium",
        timeout: float = 20.0,
    ) -> str: ...

    def complete_json(
        self,
        system: str,
        user: str,
        schema: dict[str, Any],
        *,
        max_tokens: int = 1024,
        effort: str = "low",
        timeout: float = 10.0,
    ) -> dict[str, Any]: ...

    def stream_text(
        self,
        system: str,
        user: str,
        *,
        max_tokens: int = 1024,
        effort: str = "medium",
        timeout: float = 30.0,
    ) -> Iterator[str]: ...
