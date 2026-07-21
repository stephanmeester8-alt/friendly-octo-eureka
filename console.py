"""Centralized terminal presentation layer for the enterprise pipeline."""

from __future__ import annotations

import sys
from typing import Any

_compact: bool = False


def set_compact(enabled: bool) -> None:
    """Enable or disable compact presentation mode."""
    global _compact
    _compact = enabled


def is_compact() -> bool:
    return _compact


def truncate_id(value: str, *, head: int = 4, tail: int = 8) -> str:
    """Shorten long interaction IDs for readable terminal output."""
    if len(value) <= head + tail + 3:
        return value
    return f"{value[:head]}...{value[-tail:]}"


def truncate_text(text: str, max_len: int = 120) -> str:
    cleaned = " ".join(text.split())
    if len(cleaned) <= max_len:
        return cleaned
    return cleaned[: max_len - 3] + "..."


def format_bytes(size: int) -> str:
    if size < 1024:
        return f"{size} B"
    return f"{size / 1024:.1f} KB"


def print_banner() -> None:
    print("=" * 72)
    print("  Enterprise AI Workspace Pipeline")
    if _compact:
        print("  Compact mode | Antigravity → Gemini → HITL → Safe Writer")
    else:
        print("  Cross-sector | Antigravity → Gemini Router → HITL Gate → Safe Writer")
    print("=" * 72)


def print_task(prompt: str) -> None:
    if _compact:
        print(f"\nTask: {truncate_text(prompt, 120)}")
    else:
        print(f"\nTask: {prompt}\n")


def print_run_paths(project_slug: str, run_id: str, run_dir: str) -> None:
    if _compact:
        print(f"Run: .\\output\\{project_slug}\\{run_id}\\")
    else:
        print(f"Project: .\\output\\{project_slug}\\")
        print(f"Run:     .\\output\\{project_slug}\\{run_id}\\")
        print(f"         {run_dir}")


def print_step(step: int, message: str, *, detail: str | None = None) -> None:
    line = f"[{step}/4] {message}"
    print(line)
    if detail and not _compact:
        print(f"  {detail}")


def print_info(message: str) -> None:
    print(f"  {message}")


def print_poll(
    label: str,
    attempt: int,
    max_attempts: int,
    status: str,
    elapsed: str,
) -> None:
    if _compact and attempt > 1 and status == "in_progress":
        # Keep compact output readable during long polls.
        print(
            f"  [{label}] Poll {attempt}/{max_attempts} — "
            f"{status} ({elapsed})",
            end="\r",
            file=sys.stdout,
        )
        sys.stdout.flush()
        return

    print(
        f"  [{label}] Poll {attempt}/{max_attempts} — "
        f"status: {status} ({elapsed} elapsed)"
    )


def print_poll_complete(label: str, elapsed: str) -> None:
    if _compact:
        print(f"  [{label}] completed ({elapsed})".ljust(72))


def print_interaction_id(label: str, interaction_id: str) -> None:
    if _compact:
        print_info(f"{label}: {truncate_id(interaction_id)}")
    else:
        print_info(f"{label}: {interaction_id}")


def print_completion(
    *,
    project_slug: str,
    run_id: str,
    approved: bool,
    files_written: int,
    output_dir: str | None,
) -> None:
    print("\n" + "=" * 72)
    print("  Pipeline Complete")
    print(f"  Project: {project_slug}")
    print(f"  Run:     {run_id}")
    print(f"  Approved: {approved}")
    print(f"  Files written: {files_written}")
    if approved and output_dir:
        print(f"  Output:  {output_dir}")
        if _compact:
            print("  Start:   INDEX.md")
    print("=" * 72)


def metadata_value(metadata: dict[str, Any], *keys: str, default: str = "—") -> str:
    for key in keys:
        value = metadata.get(key)
        if value not in (None, ""):
            return str(value)
    return default
