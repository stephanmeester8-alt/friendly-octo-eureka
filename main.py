#!/usr/bin/env python3
"""CLI entry point — orchestrates the enterprise AI pipeline with HITL gating."""

from __future__ import annotations

import argparse
import sys

from agents import run_antigravity_agent
from approval import request_approval
from client import get_client
from postprocess import route_and_reformat
from schemas import PipelineResult
from writer import write_approved_files, write_summary_markdown


DEFAULT_PROMPT = (
    "Analyze the current Python workspace and produce a concise project overview. "
    "Include recommended next steps and any code artifacts that would be useful "
    "to save locally."
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Enterprise AI workspace pipeline using Google Interactions API. "
            "Runs Antigravity agent → Gemini routing → HITL approval → safe file write."
        ),
    )
    parser.add_argument(
        "prompt",
        nargs="?",
        default=DEFAULT_PROMPT,
        help="Task prompt for the Antigravity agent.",
    )
    parser.add_argument(
        "--write-summary",
        action="store_true",
        default=True,
        help="Write the Markdown summary to ./output/summary.md after approval (default: True).",
    )
    parser.add_argument(
        "--no-write-summary",
        action="store_false",
        dest="write_summary",
        help="Skip writing the Markdown summary file.",
    )
    return parser


def run_pipeline(prompt: str, *, write_summary: bool = True) -> PipelineResult:
    """Execute the full four-step pipeline."""
    print("=" * 72)
    print("  Enterprise AI Workspace Pipeline")
    print("  Antigravity → Gemini Router → HITL Gate → Safe Writer")
    print("=" * 72)
    print(f"\nTask: {prompt}\n")

    client = get_client()

    # Step 1: Antigravity agent (background + poll)
    agent_result = run_antigravity_agent(prompt, client=client)

    # Step 2: Dynamic model routing via previous_interaction_id
    postprocess_payload = route_and_reformat(
        agent_result.interaction_id,
        client=client,
    )

    # Step 3: Human-in-the-Loop approval gate
    approval = request_approval(postprocess_payload)
    approved = approval is not None

    written_files = []
    if approval is not None:
        written_files = write_approved_files(
            postprocess_payload.proposed_files,
            approval=approval,
        )
        if write_summary and postprocess_payload.summary_markdown:
            written_files.append(
                write_summary_markdown(
                    postprocess_payload.summary_markdown,
                    approval=approval,
                )
            )
    else:
        print("[4/4] Skipped — no files written (approval denied).")

    result = PipelineResult(
        agent_result=agent_result,
        postprocess=postprocess_payload,
        approved=approved,
        written_files=written_files,
    )

    print("\n" + "=" * 72)
    print("  Pipeline Complete")
    print(f"  Approved: {approved}")
    print(f"  Files written: {len(written_files)}")
    print("=" * 72)

    return result


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()

    try:
        run_pipeline(args.prompt, write_summary=args.write_summary)
    except KeyboardInterrupt:
        print("\n[INFO] Pipeline interrupted.", file=sys.stderr)
        sys.exit(130)
    except Exception as exc:
        print(f"\n[FATAL] Pipeline failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
