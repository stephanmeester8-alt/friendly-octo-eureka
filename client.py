"""Centralized Google GenAI SDK client setup."""

from __future__ import annotations

from google import genai

from config import load_config

_client: genai.Client | None = None


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
