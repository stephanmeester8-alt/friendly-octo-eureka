"""Safe local filesystem writer — ./output/ only, post-approval."""

from __future__ import annotations

from pathlib import Path

from approval import ApprovalGrant
from config import OUTPUT_DIR
from schemas import ProposedFile, WriteResult


def _require_approval(approval: ApprovalGrant) -> None:
    """Reject writes unless a valid HITL grant was issued by approval.py."""
    if not isinstance(approval, ApprovalGrant):
        raise PermissionError(
            "HITL approval grant required before writing to ./output/. "
            "Call request_approval() and pass the returned ApprovalGrant."
        )


def _resolve_safe_path(filename: str) -> Path:
    """Resolve a filename to a path strictly within OUTPUT_DIR."""
    # ProposedFile validator already strips path components; double-check here.
    basename = Path(filename).name
    if not basename or basename in {".", ".."}:
        raise ValueError(f"Invalid filename: {filename!r}")

    target = (OUTPUT_DIR / basename).resolve()
    output_root = OUTPUT_DIR.resolve()

    if not str(target).startswith(str(output_root)):
        raise ValueError(
            f"Path traversal blocked: {filename!r} resolves outside {output_root}"
        )

    return target


def write_approved_files(
    proposed_files: list[ProposedFile],
    *,
    approval: ApprovalGrant,
) -> list[WriteResult]:
    """Write approved files to ./output/. Requires a valid HITL ApprovalGrant."""
    _require_approval(approval)

    if not proposed_files:
        print("[4/4] No files to write.")
        return []

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    results: list[WriteResult] = []

    print(f"[4/4] Writing {len(proposed_files)} file(s) to {OUTPUT_DIR}/...")

    for proposed in proposed_files:
        target = _resolve_safe_path(proposed.filename)
        content_bytes = proposed.content.encode("utf-8")
        target.write_text(proposed.content, encoding="utf-8")

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
    filename: str = "summary.md",
) -> WriteResult:
    """Write the Markdown summary to ./output/ after approval."""
    _require_approval(approval)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    target = _resolve_safe_path(filename)
    target.write_text(summary, encoding="utf-8")
    byte_count = len(summary.encode("utf-8"))
    print(f"  Wrote summary: {target} ({byte_count} bytes)")
    return WriteResult(
        filename=filename,
        path=str(target),
        bytes_written=byte_count,
    )
