"""Safe local filesystem writer — ./output/<project>/ only, post-approval."""

from __future__ import annotations

import subprocess
import sys
from pathlib import Path

from approval import ApprovalGrant
from config import OUTPUT_DIR
from sanitize import sanitize_markdown
from schemas import ProposedFile, WriteResult


def _require_approval(approval: ApprovalGrant) -> None:
    """Reject writes unless a valid HITL grant was issued by approval.py."""
    if not isinstance(approval, ApprovalGrant):
        raise PermissionError(
            "HITL approval grant required before writing to ./output/. "
            "Call request_approval() and pass the returned ApprovalGrant."
        )


def _resolve_safe_path(filename: str, output_dir: Path) -> Path:
    """Resolve a filename to a path strictly within the run output directory."""
    basename = Path(filename).name
    if not basename or basename in {".", ".."}:
        raise ValueError(f"Invalid filename: {filename!r}")

    target = (output_dir / basename).resolve()
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
    output_dir: Path,
) -> list[WriteResult]:
    """Write approved files to a project-scoped output directory."""
    _require_approval(approval)

    if not proposed_files:
        print("[4/4] No files to write.")
        return []

    output_dir.mkdir(parents=True, exist_ok=True)
    results: list[WriteResult] = []

    print(f"[4/4] Writing {len(proposed_files)} file(s) to {output_dir}/...")

    for proposed in proposed_files:
        target = _resolve_safe_path(proposed.filename, output_dir)
        content = _sanitize_content(proposed.filename, proposed.content)
        content_bytes = content.encode("utf-8")
        target.write_text(content, encoding="utf-8")

        result = WriteResult(
            filename=proposed.filename,
            path=str(target),
            bytes_written=len(content_bytes),
        )
        results.append(result)
        print(f"  Wrote {result.path} ({result.bytes_written} bytes)")

    print(f"[4/4] Successfully wrote {len(results)} file(s).")
    return results


def write_summary_markdown(
    summary: str,
    *,
    approval: ApprovalGrant,
    output_dir: Path,
    filename: str = "summary.md",
) -> WriteResult:
    """Write the Markdown summary to the project output directory after approval."""
    _require_approval(approval)

    output_dir.mkdir(parents=True, exist_ok=True)
    target = _resolve_safe_path(filename, output_dir)
    content = sanitize_markdown(summary)
    target.write_text(content, encoding="utf-8")
    byte_count = len(content.encode("utf-8"))
    print(f"  Wrote summary: {target} ({byte_count} bytes)")
    return WriteResult(
        filename=filename,
        path=str(target),
        bytes_written=byte_count,
    )


def open_output_folder(output_dir: Path) -> None:
    """Open the project output folder in the OS file manager (optional post-approval)."""
    if not output_dir.is_dir():
        print(f"[INFO] Output folder does not exist yet: {output_dir}", file=sys.stderr)
        return

    resolved = output_dir.resolve()
    print(f"[4/4] Opening output folder: {resolved}")

    try:
        if sys.platform == "win32":
            subprocess.run(
                ["explorer", str(resolved)],
                check=False,
            )
        elif sys.platform == "darwin":
            subprocess.run(["open", str(resolved)], check=False)
        else:
            subprocess.run(["xdg-open", str(resolved)], check=False)
    except OSError as exc:
        print(f"[WARN] Could not open output folder automatically: {exc}", file=sys.stderr)
