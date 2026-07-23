"""Content sanitization helpers for safe local file writes."""

from __future__ import annotations

import re

_SCRIPT_TAG_RE = re.compile(
    r"<script\b[^>]*>.*?</script>",
    flags=re.IGNORECASE | re.DOTALL,
)


def sanitize_markdown(content: str) -> str:
    """Normalize and lightly sanitize Markdown/plain-text payloads."""
    cleaned = content.replace("\x00", "")
    cleaned = cleaned.replace("\r\n", "\n").replace("\r", "\n")
    cleaned = _SCRIPT_TAG_RE.sub("", cleaned)

    lines = [line.rstrip() for line in cleaned.split("\n")]
    cleaned = "\n".join(lines).strip()
    if cleaned:
        cleaned += "\n"
    return cleaned
