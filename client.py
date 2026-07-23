"""Centralized Google GenAI SDK client setup."""

from __future__ import annotations

import sys
from importlib.metadata import PackageNotFoundError, version
from pathlib import Path

from google import genai

from config import WORKSPACE_ROOT, load_config

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


def _project_venv_python() -> Path | None:
    """Return the project-local venv interpreter path when it exists."""
    if sys.platform == "win32":
        candidate = WORKSPACE_ROOT / ".venv" / "Scripts" / "python.exe"
    else:
        candidate = WORKSPACE_ROOT / ".venv" / "bin" / "python"
    return candidate if candidate.is_file() else None


def _runtime_diagnostics() -> str:
    """Build a diagnostic block for SDK / interpreter mismatch errors."""
    lines = [f"  Python executable: {sys.executable}"]

    venv_python = _project_venv_python()
    if venv_python is not None:
        lines.append(f"  Project venv:    {venv_python}")
        try:
            using_venv = Path(sys.executable).resolve() == venv_python.resolve()
        except OSError:
            using_venv = False
        if not using_venv:
            lines.append(
                "  Interpreter mismatch: the active shell may be using a different "
                "Python than the project .venv."
            )

    try:
        genai_path = Path(genai.__file__).resolve()
        lines.append(f"  google.genai path: {genai_path}")
    except (AttributeError, TypeError, OSError):
        pass

    if sys.platform == "win32":
        lines.extend(
            [
                "  Windows tip: after Activate.ps1, run `python main.py` — not `py main.py`.",
                "  The `py` launcher can ignore the activated venv and load an older SDK.",
                "  Or run explicitly: .\\.venv\\Scripts\\python.exe main.py",
            ]
        )
    else:
        lines.append("  Tip: use the project venv interpreter: .venv/bin/python main.py")

    return "\n".join(lines)


def _sdk_upgrade_hint() -> str:
    min_ver = ".".join(str(n) for n in MIN_SDK_VERSION)
    return (
        f"  Fix (same interpreter as above):\n"
        f"    python -m pip install -U \"google-genai>={min_ver}\"\n"
        f"    python main.py \"your prompt\""
    )


def validate_sdk() -> str:
    """Ensure google-genai is new enough for managed agents + environment."""
    try:
        installed = version("google-genai")
    except PackageNotFoundError as exc:
        print(
            "[ERROR] google-genai is not installed.\n"
            f"{_runtime_diagnostics()}\n"
            "  Fix: python -m pip install -r requirements.txt",
            file=sys.stderr,
        )
        raise SystemExit(1) from exc

    # Runtime guard against legacy InteractionsResource routing.
    probe = genai.Client(api_key="probe")
    interactions_type = type(probe.interactions).__name__
    if interactions_type == "InteractionsResource":
        print(
            "[ERROR] Legacy InteractionsResource detected — managed-agent features "
            "like `environment=` are unavailable.\n"
            f"{_runtime_diagnostics()}\n"
            f"{_sdk_upgrade_hint()}",
            file=sys.stderr,
        )
        raise SystemExit(1)

    if _parse_version(installed) < MIN_SDK_VERSION:
        min_ver = ".".join(str(n) for n in MIN_SDK_VERSION)
        print(
            f"[ERROR] google-genai {installed} is too old for managed agents.\n"
            f"  Required: >= {min_ver}\n"
            f"{_runtime_diagnostics()}\n"
            f"{_sdk_upgrade_hint()}",
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
