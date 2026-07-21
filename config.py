"""Application configuration, environment loading, and model constants."""

from __future__ import annotations

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Model & agent identifiers
# ---------------------------------------------------------------------------
ANTIGRAVITY_AGENT: str = "antigravity-preview-05-2026"
ROUTING_MODEL: str = "gemini-3.5-flash"

# ---------------------------------------------------------------------------
# Interaction defaults
# ---------------------------------------------------------------------------
AGENT_ENVIRONMENT: str = "remote"
POLL_INTERVAL_SECONDS: float = 5.0
POLL_MAX_ATTEMPTS: int = 360  # ~30 minutes at 5 s intervals

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------
WORKSPACE_ROOT: Path = Path(__file__).resolve().parent
OUTPUT_DIR: Path = WORKSPACE_ROOT / "output"

# ---------------------------------------------------------------------------
# Interaction-scoped instructions (must be re-supplied on every interaction)
# ---------------------------------------------------------------------------
POSTPROCESS_SYSTEM_INSTRUCTION: str = (
    "You are an enterprise AI post-processing layer. "
    "Review the prior agent interaction context and produce a strict JSON "
    "response that conforms to the provided schema. "
    "Extract actionable file artifacts and a concise Markdown summary. "
    "Never include executable shell commands or unsafe content in file payloads. "
    "Use only safe, plain-text file contents suitable for local workspace storage."
)

POSTPROCESS_USER_PROMPT: str = (
    "Based on the completed Antigravity agent work in the prior interaction, "
    "produce a structured handoff payload with:\n"
    "1. A clean Markdown summary of what was accomplished.\n"
    "2. A list of proposed local files to persist (filename, content, description).\n"
    "3. Metadata including the source interaction context.\n"
    "Return only valid JSON matching the response schema."
)

# ---------------------------------------------------------------------------
# Environment
# ---------------------------------------------------------------------------
API_KEY_ENV_VAR: str = "GEMINI_API_KEY"


def load_config() -> str:
    """Load environment variables and return a validated API key."""
    load_dotenv(WORKSPACE_ROOT / ".env")

    api_key = os.environ.get(API_KEY_ENV_VAR, "").strip()
    if not api_key:
        print(
            f"[ERROR] Missing API key. Set the {API_KEY_ENV_VAR} environment variable "
            "or add it to a .env file in the project root.",
            file=sys.stderr,
        )
        sys.exit(1)

    return api_key
