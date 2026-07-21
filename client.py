"""Centralized Google GenAI SDK client setup."""

from __future__ import annotations

import sys
from importlib.metadata import PackageNotFoundError, version

from google import genai

from config import load_config

# Managed-agent `environment=` support requires the GAOS interactions layer
# (GeminiNextGenInteractions). Older releases expose InteractionsResource,
# which does not accept `environment` or full Antigravity agent params.
MIN_SDK_VERSION = (2, 12, 0)

_client: genai.Client | None = None


def _parse_version(raw: str) -> tuple[int, int, int]:
    parts = raw.split(".")
    return (
        int(parts[0]) if len(parts) > 0 else 0,
        int(parts[1]) if len(parts) > 1 else 0,
        int(parts[2]) if len(parts) > 2 else 0,
    )


def validate_sdk() -> str:
    """Ensure google-genai is new enough for managed agents + environment."""
    try:
        installed = version("google-genai")
    except PackageNotFoundError as exc:
        print(
            "[ERROR] google-genai is not installed. Run: pip install -r requirements.txt",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc

    if _parse_version(installed) < MIN_SDK_VERSION:
        min_ver = ".".join(str(n) for n in MIN_SDK_VERSION)
        print(
            f"[ERROR] google-genai {installed} is too old for managed agents.\n"
            f"  Required: >= {min_ver}\n"
            f"  Fix: pip install -U 'google-genai>={min_ver}'",
            file=sys.stderr,
        )
        raise SystemExit(1)

    # Runtime guard against legacy InteractionsResource routing.
    probe = genai.Client(api_key="probe")
    interactions_type = type(probe.interactions).__name__
    if interactions_type == "InteractionsResource":
        print(
            "[ERROR] Legacy InteractionsResource detected — managed-agent features "
            "like `environment=` are unavailable.\n"
            "  Fix: pip install -U 'google-genai>=2.12.0'  (use the project venv)",
            file=sys.stderr,
        )
        raise SystemExit(1)

    return installed


def get_client() -> genai.Client:
    """Return a singleton GenAI client configured with the validated API key."""
    global _client
    if _client is None:
        validate_sdk()
        api_key = load_config()
        _client = genai.Client(api_key=api_key)
    return _client


def reset_client() -> None:
    """Reset the singleton client (useful for testing)."""
    global _client
    _client = None
