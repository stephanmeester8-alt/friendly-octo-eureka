"""Safe local filesystem writer — ./output/<project>/<run_id>/artifacts/ only."""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

from approval import ApprovalGrant
from config import OUTPUT_DIR
from console import format_bytes, print_info, print_step
from sanitize import sanitize_markdown
from schemas import ProposedFile, WriteResult


def _require_approval(approval: ApprovalGrant) -> None:
    """Reject writes unless a valid HITL grant was issued by approval.py."""
    if not isinstance(approval, ApprovalGrant):
        raise PermissionError(
            "HITL approval grant required before writing to ./output/. "
            "Call request_approval() and pass the returned ApprovalGrant."
        )


def _numbered_filename(order: int, filename: str) -> str:
    """Prefix artifact filenames with a stable order for presentation."""
    basename = Path(filename).name
    if re.match(r"^\d{2}_", basename):
        return basename
    return f"{order:02d}_{basename}"


def _resolve_safe_path(filename: str, artifacts_dir: Path) -> Path:
    """Resolve a filename to a path strictly within the run artifacts directory."""
    basename = Path(filename).name
    if not basename or basename in {".", ".."}:
        raise ValueError(f"Invalid filename: {filename!r}")

    target = (artifacts_dir / basename).resolve()
    output_root = OUTPUT_DIR.resolve()

    if not str(target).startswith(str(output_root)):
        raise ValueError(
            f"Path traversal blocked: {filename!r} resolves outside {output_root}"
        )

    return target


def _sanitize_content(filename: str, content: str) -> str:
    if filename.lower().endswith(".md"):
        return sanitize_markdown(content)
    return content.replace("\x00", "").replace("\r\n", "\n").replace("\r", "\n")


def write_approved_files(
    proposed_files: list[ProposedFile],
    *,
    approval: ApprovalGrant,
    artifacts_dir: Path,
) -> list[WriteResult]:
    """Write approved files to the run artifacts directory."""
    _require_approval(approval)

    if not proposed_files:
        print_step(4, "No files to write.")
        return []

    artifacts_dir.mkdir(parents=True, exist_ok=True)
    results: list[WriteResult] = []

    print_step(4, f"Writing {len(proposed_files)} file(s) to artifacts/...")

    for order, proposed in enumerate(proposed_files, start=1):
        numbered_name = _numbered_filename(order, proposed.filename)
        target = _resolve_safe_path(numbered_name, artifacts_dir)
        content = _sanitize_content(proposed.filename, proposed.content)
        content_bytes = content.encode("utf-8")
        target.write_text(content, encoding="utf-8")

        result = WriteResult(
            filename=numbered_name,
            path=str(target),
            bytes_written=len(content_bytes),
        )
        results.append(result)
        print_info(f"Wrote artifacts/{numbered_name} ({format_bytes(len(content_bytes))})")

    print_step(4, f"Successfully wrote {len(results)} artifact(s).")
    return results


def write_summary_markdown(
    summary: str,
    *,
    approval: ApprovalGrant,
    artifacts_dir: Path,
    filename: str = "summary.md",
) -> WriteResult:
    """Write the Markdown summary to the artifacts directory after approval."""
    _require_approval(approval)

    artifacts_dir.mkdir(parents=True, exist_ok=True)
    target = _resolve_safe_path(filename, artifacts_dir)
    content = sanitize_markdown(summary)
    target.write_text(content, encoding="utf-8")
    byte_count = len(content.encode("utf-8"))
    print_info(f"Wrote artifacts/{filename} ({format_bytes(byte_count)})")
    return WriteResult(
        filename=filename,
        path=str(target),
        bytes_written=byte_count,
    )


def open_output_folder(run_dir: Path) -> None:
    """Open the run output folder in the OS file manager (optional post-approval)."""
    if not run_dir.is_dir():
        print(f"[INFO] Output folder does not exist yet: {run_dir}", file=sys.stderr)
        return

    resolved = run_dir.resolve()
    print_step(4, f"Opening output folder: {resolved}")

    try:
        if sys.platform == "win32":
            subprocess.run(["explorer", str(resolved)], check=False)
        elif sys.platform == "darwin":
            subprocess.run(["open", str(resolved)], check=False)
        else:
            subprocess.run(["xdg-open", str(resolved)], check=False)
    except OSError as exc:
        print(f"[WARN] Could not open output folder automatically: {exc}", file=sys.stderr)
