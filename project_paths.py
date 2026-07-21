"""Project-scoped and timestamped run output directory helpers."""

from __future__ import annotations

import re
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path

from config import OUTPUT_DIR

_MAX_SLUG_LENGTH = 80


@dataclass(frozen=True)
class RunPaths:
    """Resolved filesystem paths for a single pipeline run."""

    project_slug: str
    run_id: str
    run_dir: Path
    artifacts_dir: Path

    @property
    def run_dir_str(self) -> str:
        return str(self.run_dir)

    @property
    def artifacts_dir_str(self) -> str:
        return str(self.artifacts_dir)

    @property
    def display_path(self) -> str:
        return f".\\output\\{self.project_slug}\\{self.run_id}\\"


def sanitize_slug(value: str) -> str:
    """Normalize a user-supplied project slug to a safe directory name."""
    slug = value.strip().lower()
    slug = re.sub(r"[^\w\-]+", "_", slug, flags=re.UNICODE)
    slug = re.sub(r"_+", "_", slug).strip("_")
    return slug[:_MAX_SLUG_LENGTH] or "project"


def derive_project_slug(prompt: str, *, explicit: str | None = None) -> str:
    """Build a stable project directory name from --project or the task prompt."""
    if explicit:
        return sanitize_slug(explicit)

    words = re.findall(r"[\w]+", prompt.lower(), flags=re.UNICODE)
    meaningful = [word for word in words if len(word) > 2][:5]
    base = "_".join(meaningful) or "run"
    date_suffix = datetime.now().strftime("%Y%m%d")
    return sanitize_slug(f"{base}_{date_suffix}")


def derive_run_id(when: datetime | None = None) -> str:
    """Build a timestamped run identifier."""
    moment = when or datetime.now()
    return moment.strftime("%Y%m%d_%H%M%S")


def resolve_run_paths(
    prompt: str,
    *,
    project: str | None = None,
    when: datetime | None = None,
) -> RunPaths:
    """Return timestamped run paths under ./output/<project>/<run_id>/."""
    project_slug = derive_project_slug(prompt, explicit=project)
    run_id = derive_run_id(when)
    run_dir = (OUTPUT_DIR / project_slug / run_id).resolve()
    artifacts_dir = (run_dir / "artifacts").resolve()
    output_root = OUTPUT_DIR.resolve()

    if not str(run_dir).startswith(str(output_root)):
        raise ValueError(f"Unsafe project slug: {project_slug!r}")

    return RunPaths(
        project_slug=project_slug,
        run_id=run_id,
        run_dir=run_dir,
        artifacts_dir=artifacts_dir,
    )


def resolve_run_output_dir(
    prompt: str,
    *,
    project: str | None = None,
) -> tuple[str, str]:
    """Backward-compatible helper returning project slug and run directory."""
    paths = resolve_run_paths(prompt, project=project)
    return paths.project_slug, paths.run_dir_str
