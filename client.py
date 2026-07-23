"""Centralized Google GenAI SDK client setup."""

from __future__ import annotations

from google import genai

from config import get_api_key, load_config, set_api_key

_client: genai.Client | None = None


def configure_api_key(api_key: str) -> genai.Client:
    """Configure BYOK vault key and return a fresh client."""
    global _client
    set_api_key(api_key)
    _client = genai.Client(api_key=api_key.strip())
    return _client


def is_client_configured() -> bool:
    """Return True when an API key is available."""
    return bool(get_api_key())


def get_client() -> genai.Client:
    """Return a singleton GenAI client configured with the validated API key."""
    global _client
    if _client is None:
        api_key = load_config()
        _client = genai.Client(api_key=api_key)
    return _client


def reset_client() -> None:
    """Reset the singleton client (useful for testing)."""
    global _client
    _client = None
