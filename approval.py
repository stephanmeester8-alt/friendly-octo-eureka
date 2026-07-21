"""CLI-based Human-in-the-Loop (HITL) security approval gate."""

from __future__ import annotations

import sys

from schemas import PostProcessPayload, ProposedFile


class ApprovalGrant:
    """Opaque token issued only after explicit human approval.

    Instances are not constructible outside this module; writer.py requires a
    valid grant before persisting any payload to ./output/.
    """

    __slots__ = ()

    def __repr__(self) -> str:
        return "ApprovalGrant(granted=True)"


_APPROVAL_GRANT = ApprovalGrant()

_APPROVE_RESPONSES = frozenset({"Y", "YES", "J", "JA"})
_DENY_RESPONSES = frozenset({"N", "NO", "NEE"})


def _truncate(text: str, max_len: int = 1200) -> str:
    if len(text) <= max_len:
        return text
    return text[:max_len] + f"\n... [{len(text) - max_len} more characters truncated]"


def display_approval_summary(payload: PostProcessPayload) -> None:
    """Render the post-process payload for human review."""
    print("\n" + "=" * 72)
    print("  HUMAN-IN-THE-LOOP SECURITY REVIEW")
    print("=" * 72)
    print("\n--- Markdown Summary ---\n")
    print(_truncate(payload.summary_markdown))
    print("\n--- Proposed Files ---\n")

    if not payload.proposed_files:
        print("  (No files proposed for local disk write.)")
    else:
        for idx, proposed in enumerate(payload.proposed_files, start=1):
            _display_proposed_file(idx, proposed)

    if payload.metadata:
        print("\n--- Metadata ---\n")
        for key, value in payload.metadata.items():
            print(f"  {key}: {value}")

    print("\n" + "=" * 72)


def display_output_target(project_slug: str, output_dir: str) -> None:
    """Show where approved files will be written."""
    print(f"\n[INFO] Approved files will be written to: .\\output\\{project_slug}\\")
    print(f"       Full path: {output_dir}")


def _display_proposed_file(index: int, proposed: ProposedFile) -> None:
    print(f"  [{index}] {proposed.filename}")
    print(f"      Description: {proposed.description}")
    print(f"      Content preview ({len(proposed.content)} chars):")
    preview = proposed.content.replace("\n", "\n      ")
    print(f"      {_truncate(preview, max_len=400)}")


def request_approval(
    payload: PostProcessPayload,
    *,
    project_slug: str,
    output_dir: str,
) -> ApprovalGrant | None:
    """Display output and prompt for explicit Y/N permission before disk writes.

    Returns an :class:`ApprovalGrant` when approved; ``None`` when denied.
    """
    print("[3/4] Awaiting Human-in-the-Loop approval...")
    display_approval_summary(payload)
    display_output_target(project_slug, output_dir)

    if not payload.proposed_files:
        print(
            "\n[INFO] No files to write. Approval gate still requires confirmation "
            "to finalize the pipeline."
        )

    while True:
        try:
            response = input(
                "\nApprove writing proposed files to ./output/? [Y/N or J/N]: "
            ).strip().upper()
        except (EOFError, KeyboardInterrupt):
            print("\n[INFO] Approval cancelled by user.", file=sys.stderr)
            return None

        if not response:
            print("  No input received. Type Y (yes) or N (no), then press Enter.")
            continue

        if response in _APPROVE_RESPONSES:
            print("[3/4] Approval GRANTED.")
            return _APPROVAL_GRANT
        if response in _DENY_RESPONSES:
            print("[3/4] Approval DENIED. No files will be written.")
            return None

        print("  Invalid input. Type Y/J (approve) or N (deny), then press Enter.")
