#!/usr/bin/env python3
"""CLI entry point — orchestrates the enterprise AI pipeline with HITL gating."""

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from agents import run_antigravity_agent
from approval import request_approval
from client import get_client
from postprocess import route_and_reformat
from project_paths import resolve_run_output_dir
from schemas import PipelineResult
from writer import open_output_folder, write_approved_files, write_summary_markdown


DEFAULT_PROMPT = (
    "Analyze the current Python workspace and produce a concise project overview. "
    "Include recommended next steps and any code artifacts that would be useful "
    "to save locally."
)

DEMO_INFRA_PROMPT = (
    "Voer een integrale tender- en risico-analyse uit voor een grootschalig GWW-project "
    "(aanleg riolering, grondverzet en herbestrating in stedelijk gebied). "
    "Onderdeel A: Analyseer alle RAW-bestekseisen, boeteclausules en stikstofnormen. "
    "Onderdeel B: Schrijf een winnend EMVI-plan van aanpak gericht op CO2-reductie "
    "door emissieloos materieel. "
    "Onderdeel C: Stel een V&G-plan op voor werkzaamheden in vervuilde grond "
    "(PFAS/bodemsanering). "
    "Onderdeel D: Bereken de TCO en terugverdientijd van de overstap naar een volledige "
    "elektrische vloot inclusief MIA/Vamil-subsidies."
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
        "--project",
        metavar="SLUG",
        help=(
            "Project subdirectory under ./output/ (e.g. nota_infra_emvi_2026). "
            "Auto-derived from the prompt when omitted."
        ),
    )
    parser.add_argument(
        "--demo-infra",
        action="store_true",
        help="Use the built-in GWW/EMVI enterprise demo prompt for sales presentations.",
    )
    parser.add_argument(
        "--write-summary",
        action="store_true",
        default=True,
        help="Write the Markdown summary to the project folder after approval (default: True).",
    )
    parser.add_argument(
        "--no-write-summary",
        action="store_false",
        dest="write_summary",
        help="Skip writing the Markdown summary file.",
    )
    parser.add_argument(
        "--open-output",
        action="store_true",
        help="Open the project output folder in the OS file manager after approval.",
    )
    return parser


def run_pipeline(
    prompt: str,
    *,
    project: str | None = None,
    write_summary: bool = True,
    open_output: bool = False,
) -> PipelineResult:
    """Execute the full four-step pipeline."""
    project_slug, output_dir_str = resolve_run_output_dir(prompt, project=project)
    output_dir = Path(output_dir_str)

    print("=" * 72)
    print("  Enterprise AI Workspace Pipeline")
    print("  Antigravity → Gemini Router → HITL Gate → Safe Writer")
    print("=" * 72)
    print(f"\nTask: {prompt}\n")
    print(f"Project output: .\\output\\{project_slug}\\")

    client = get_client()

    # Step 1: Antigravity agent (background + poll)
    agent_result = run_antigravity_agent(prompt, client=client)

    # Step 2: Dynamic model routing via previous_interaction_id
    postprocess_payload = route_and_reformat(
        agent_result.interaction_id,
        client=client,
    )

    # Step 3: Human-in-the-Loop approval gate
    approval = request_approval(
        postprocess_payload,
        project_slug=project_slug,
        output_dir=output_dir_str,
    )
    approved = approval is not None

    written_files = []
    if approval is not None:
        written_files = write_approved_files(
            postprocess_payload.proposed_files,
            approval=approval,
            output_dir=output_dir,
        )
        if write_summary and postprocess_payload.summary_markdown:
            written_files.append(
                write_summary_markdown(
                    postprocess_payload.summary_markdown,
                    approval=approval,
                    output_dir=output_dir,
                )
            )
        if open_output:
            open_output_folder(output_dir)
    else:
        print("[4/4] Skipped — no files written (approval denied).")

    result = PipelineResult(
        agent_result=agent_result,
        postprocess=postprocess_payload,
        approved=approved,
        project_slug=project_slug,
        output_dir=output_dir_str,
        written_files=written_files,
    )

    print("\n" + "=" * 72)
    print("  Pipeline Complete")
    print(f"  Project: {project_slug}")
    print(f"  Approved: {approved}")
    print(f"  Files written: {len(written_files)}")
    if approved:
        print(f"  Output folder: {output_dir_str}")
    print("=" * 72)

    return result


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    prompt = DEMO_INFRA_PROMPT if args.demo_infra else args.prompt

    try:
        run_pipeline(
            prompt,
            project=args.project,
            write_summary=args.write_summary,
            open_output=args.open_output,
        )
    except KeyboardInterrupt:
        print("\n[INFO] Pipeline interrupted.", file=sys.stderr)
        sys.exit(130)
    except Exception as exc:
        print(f"\n[FATAL] Pipeline failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
