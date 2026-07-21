"""Project-scoped output directory helpers."""

from __future__ import annotations

import re
from datetime import datetime

from config import OUTPUT_DIR

_MAX_SLUG_LENGTH = 80


def sanitize_slug(value: str) -> str:
    """Normalize a user-supplied project slug to a safe directory name."""
    slug = value.strip().lower()
    slug = re.sub(r"[^\w\-]+", "_", slug, flags=re.UNICODE)
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug[:_MAX_SLUG_LENGTH] or "project"


def derive_project_slug(prompt: str, *, explicit: str | None = None) -> str:
    """Build a stable subdirectory name from --project or the task prompt."""
    if explicit:
        return sanitize_slug(explicit)

    words = re.findall(r"[\w]+", prompt.lower(), flags=re.UNICODE)
    meaningful = [word for word in words if len(word) > 2][:5]
    base = "_".join(meaningful) or "run"
    date_suffix = datetime.now().strftime("%Y%m%d")
    return sanitize_slug(f"{base}_{date_suffix}")


def resolve_run_output_dir(
    prompt: str,
    *,
    project: str | None = None,
) -> tuple[str, str]:
    """Return (slug, absolute output path) under ./output/."""
    slug = derive_project_slug(prompt, explicit=project)
    run_dir = (OUTPUT_DIR / slug).resolve()
    output_root = OUTPUT_DIR.resolve()

    if not str(run_dir).startswith(str(output_root)):
        raise ValueError(f"Unsafe project slug: {slug!r}")

    return slug, str(run_dir)
