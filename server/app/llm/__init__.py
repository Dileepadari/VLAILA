"""LLM router: picks an adapter and degrades rather than fails."""

from __future__ import annotations

import logging

from ..config import get_settings
from .base import LLMClient, LLMUnavailable, scrub
from .offline import OfflineClient

log = logging.getLogger(__name__)

_client: LLMClient | None = None
_fast_client: LLMClient | None = None


def _build(provider: str, model: str) -> LLMClient:
    settings = get_settings()
    if provider == "anthropic":
        from .anthropic_client import AnthropicClient

        return AnthropicClient(settings.anthropic_api_key, model)
    if provider == "openai":
        from .openai_client import OpenAIClient

        return OpenAIClient(settings.openai_api_key, model)
    if provider == "ollama":
        from .ollama_client import OllamaClient

        return OllamaClient(settings.ollama_base_url, model)
    return OfflineClient()


def get_llm() -> LLMClient:
    """Tier 3: the reasoning model."""
    global _client
    if _client is None:
        settings = get_settings()
        try:
            _client = _build(settings.llm_provider, settings.model_reasoning)
        except Exception as exc:
            # A misconfigured provider degrades the assistant; it must never
            # take the API down. Students still get Tier 1 either way.
            log.warning("LLM provider %s unavailable (%s); using offline adapter",
                        settings.llm_provider, exc)
            _client = OfflineClient()
    return _client


def get_fast_llm() -> LLMClient:
    """Tier 2: the small model used for ambiguous step classification.

    Only distinct from Tier 3 in the hybrid configuration. Everywhere else it
    is the same client, which keeps the ladder honest without extra config.
    """
    global _fast_client
    if _fast_client is None:
        settings = get_settings()
        if settings.llm_provider == "ollama":
            _fast_client = _build("ollama", settings.model_fast)
        else:
            _fast_client = get_llm()
    return _fast_client


def reset_llm_cache() -> None:
    """Test hook."""
    global _client, _fast_client
    _client = None
    _fast_client = None


__all__ = [
    "LLMClient",
    "LLMUnavailable",
    "OfflineClient",
    "get_llm",
    "get_fast_llm",
    "reset_llm_cache",
    "scrub",
]
