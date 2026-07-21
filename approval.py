"""CLI-based Human-in-the-Loop (HITL) security approval gate."""

from __future__ import annotations

import sys

from console import format_bytes, is_compact, metadata_value, truncate_text
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


def display_approval_summary_compact(
    payload: PostProcessPayload,
    *,
    project_slug: str,
    run_id: str,
    output_dir: str,
) -> None:
    """Render a compact, sales-friendly HITL review table."""
    metadata = payload.metadata
    company = metadata_value(metadata, "company_name", "client_name", "organization")
    sector = metadata_value(metadata, "sector", "industry")
    total_bytes = sum(len(item.content.encode("utf-8")) for item in payload.proposed_files)

    print("\n" + "┌─ HITL REVIEW " + "─" * 57)
    print(f"│ Bedrijf:   {company[:54]}")
    print(f"│ Sector:    {sector[:54]}")
    print(
        f"│ Bestanden: {len(payload.proposed_files)} | "
        f"Totaal: {format_bytes(total_bytes)}"
    )
    print("├" + "─" * 71)
    print("│  #  Bestand                         Grootte   Beschrijving")
    print("├" + "─" * 71)

    if not payload.proposed_files:
        print("│  (geen bestanden voorgesteld)")
    else:
        for index, proposed in enumerate(payload.proposed_files, start=1):
            size = format_bytes(len(proposed.content.encode("utf-8")))
            name = proposed.filename[:28]
            description = truncate_text(proposed.description, 28)
            print(
                f"│ {index:>2}  {name:<28} {size:>7}   {description}"
            )

    print("├" + "─" * 71)
    print(f"│ Output: .\\output\\{project_slug}\\{run_id}\\")
    print(f"│         {output_dir}")
    print("└" + "─" * 71)


def display_output_target(project_slug: str, run_id: str, output_dir: str) -> None:
    """Show where approved files will be written."""
    print(f"\n[INFO] Approved files will be written to:")
    print(f"       .\\output\\{project_slug}\\{run_id}\\artifacts\\")
    print(f"       {output_dir}")


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
    run_id: str,
    output_dir: str,
) -> ApprovalGrant | None:
    """Display output and prompt for explicit Y/N permission before disk writes."""
    print("[3/4] Awaiting Human-in-the-Loop approval...")

    if is_compact():
        display_approval_summary_compact(
            payload,
            project_slug=project_slug,
            run_id=run_id,
            output_dir=output_dir,
        )
    else:
        display_approval_summary(payload)
        display_output_target(project_slug, run_id, output_dir)

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
