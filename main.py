#!/usr/bin/env python3
"""CLI entry point — orchestrates the enterprise AI pipeline with HITL gating."""

from __future__ import annotations

import argparse
import sys
from datetime import datetime, timezone
from pathlib import Path

from agents import run_antigravity_agent
from approval import request_approval
from client import get_client
from console import print_banner, print_completion, print_run_paths, print_task, set_compact
from manifest import (
    build_index_markdown,
    build_run_manifest,
    write_index_markdown,
    write_run_manifest,
)
from postprocess import route_and_reformat
from project_paths import resolve_run_paths
from schemas import PipelineResult
from writer import open_output_folder, write_approved_files, write_summary_markdown


DEFAULT_PROMPT = (
    "Analyze the current Python workspace and produce a concise project overview. "
    "Include recommended next steps and any code artifacts that would be useful "
    "to save locally."
)

DEMO_ENTERPRISE_PROMPT = (
    "Voer een integrale bedrijfsanalyse uit voor een middelgroot bedrijf in een willekeurige sector. "
    "Onderdeel A: Identificeer operationele risico's, compliance-vereisten en knelpunten in kernprocessen. "
    "Onderdeel B: Stel een concreet verbeterplan op met prioriteiten, KPI's en verwachte bedrijfsimpact. "
    "Onderdeel C: Schrijf een implementatiestrategie inclusief change management en stakeholdercommunicatie. "
    "Onderdeel D: Geef een ROI-inschatting en aanbevelingen voor verantwoorde AI-adoptie met menselijke controle."
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
            "Project subdirectory under ./output/ (e.g. acme_compliance_review_2026). "
            "Auto-derived from the prompt when omitted."
        ),
    )
    parser.add_argument(
        "--compact",
        action="store_true",
        help="Sales-friendly compact terminal output and HITL review table.",
    )
    parser.add_argument(
        "--demo",
        action="store_true",
        help=(
            "Use the built-in cross-sector enterprise demo prompt for sales presentations."
        ),
    )
    parser.add_argument(
        "--demo-infra",
        action="store_true",
        dest="demo",
        help=argparse.SUPPRESS,
    )
    parser.add_argument(
        "--write-summary",
        action="store_true",
        default=True,
        help="Write the Markdown summary to artifacts/ after approval (default: True).",
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
        help="Open the run output folder in the OS file manager after approval.",
    )
    return parser


def run_pipeline(
    prompt: str,
    *,
    project: str | None = None,
    write_summary: bool = True,
    open_output: bool = False,
    compact: bool = False,
) -> PipelineResult:
    """Execute the full four-step pipeline."""
    set_compact(compact)
    created_at = datetime.now(timezone.utc).isoformat()
    paths = resolve_run_paths(prompt, project=project)

    print_banner()
    print_task(prompt)
    print_run_paths(paths.project_slug, paths.run_id, paths.run_dir_str)
    paths.run_dir.mkdir(parents=True, exist_ok=True)

    client = get_client()

    agent_result = run_antigravity_agent(prompt, client=client)

    postprocess_payload, routing_interaction_id = route_and_reformat(
        agent_result.interaction_id,
        agent_output_text=agent_result.output_text,
        client=client,
    )

    approval = request_approval(
        postprocess_payload,
        project_slug=paths.project_slug,
        run_id=paths.run_id,
        output_dir=paths.run_dir_str,
    )
    approved = approval is not None

    written_files = []
    if approval is not None:
        written_files = write_approved_files(
            postprocess_payload.proposed_files,
            approval=approval,
            artifacts_dir=paths.artifacts_dir,
        )
        if write_summary and postprocess_payload.summary_markdown:
            written_files.append(
                write_summary_markdown(
                    postprocess_payload.summary_markdown,
                    approval=approval,
                    artifacts_dir=paths.artifacts_dir,
                )
            )

        completed_at = datetime.now(timezone.utc).isoformat()
        index_content = build_index_markdown(
            run_id=paths.run_id,
            project_slug=paths.project_slug,
            created_at=created_at,
            approved=approved,
            postprocess=postprocess_payload,
            written_files=written_files,
        )
        write_index_markdown(paths.run_dir, index_content)
        manifest = build_run_manifest(
            run_id=paths.run_id,
            project_slug=paths.project_slug,
            prompt=prompt,
            created_at=created_at,
            completed_at=completed_at,
            approved=approved,
            agent_result=agent_result,
            postprocess=postprocess_payload,
            routing_interaction_id=routing_interaction_id,
            written_files=written_files,
        )
        write_run_manifest(paths.run_dir, manifest)

        if open_output:
            open_output_folder(paths.run_dir)
    else:
        print("[4/4] Skipped — no files written (approval denied).")

    result = PipelineResult(
        agent_result=agent_result,
        postprocess=postprocess_payload,
        approved=approved,
        project_slug=paths.project_slug,
        run_id=paths.run_id,
        output_dir=paths.run_dir_str,
        written_files=written_files,
    )

    print_completion(
        project_slug=paths.project_slug,
        run_id=paths.run_id,
        approved=approved,
        files_written=len(written_files),
        output_dir=paths.run_dir_str if approved else None,
    )

    return result


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    prompt = DEMO_ENTERPRISE_PROMPT if args.demo else args.prompt

    try:
        run_pipeline(
            prompt,
            project=args.project,
            write_summary=args.write_summary,
            open_output=args.open_output,
            compact=args.compact,
        )
    except KeyboardInterrupt:
        print("\n[INFO] Pipeline interrupted.", file=sys.stderr)
        sys.exit(130)
    except Exception as exc:
        print(f"\n[FATAL] Pipeline failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
