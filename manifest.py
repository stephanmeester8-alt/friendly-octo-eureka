"""Run manifest and INDEX.md generation for audit-ready output packaging."""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from console import metadata_value, truncate_text
from schemas import AgentRunResult, PostProcessPayload, WriteResult


def _utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def build_run_manifest(
    *,
    run_id: str,
    project_slug: str,
    prompt: str,
    created_at: str,
    completed_at: str,
    approved: bool,
    agent_result: AgentRunResult,
    postprocess: PostProcessPayload,
    routing_interaction_id: str | None,
    written_files: list[WriteResult],
) -> dict[str, Any]:
    """Build the audit manifest payload for a completed run."""
    return {
        "version": 1,
        "run_id": run_id,
        "project_slug": project_slug,
        "created_at": created_at,
        "completed_at": completed_at,
        "approved": approved,
        "prompt": prompt,
        "interaction_ids": {
            "antigravity": agent_result.interaction_id,
            "gemini_router": routing_interaction_id,
        },
        "metadata": postprocess.metadata,
        "summary_preview": truncate_text(postprocess.summary_markdown, 500),
        "artifacts": [
            {
                "filename": item.filename,
                "path": item.path,
                "bytes_written": item.bytes_written,
            }
            for item in written_files
        ],
    }


def write_run_manifest(run_dir: Path, manifest: dict[str, Any]) -> Path:
    target = run_dir / "run_manifest.json"
    run_dir.mkdir(parents=True, exist_ok=True)
    target.write_text(
        json.dumps(manifest, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    return target


def build_index_markdown(
    *,
    run_id: str,
    project_slug: str,
    created_at: str,
    approved: bool,
    postprocess: PostProcessPayload,
    written_files: list[WriteResult],
) -> str:
    """Build a prospect-friendly INDEX.md for the run folder."""
    metadata = postprocess.metadata
    company = metadata_value(metadata, "company_name", "client_name", "organization")
    sector = metadata_value(metadata, "sector", "industry")
    summary = postprocess.summary_markdown.strip()

    lines = [
        f"# {company} — Run `{run_id}`",
        "",
        "> **Start hier.** Dit overzicht beschrijft de goedgekeurde output van deze pipeline-run.",
        "",
        "## Samenvatting",
        "",
        summary if summary else "_Geen samenvatting beschikbaar._",
        "",
        "## Artifacts",
        "",
        "| # | Bestand | Grootte | Beschrijving |",
        "|---|---------|---------|--------------|",
    ]

    descriptions = {
        Path(item.filename).name: _artifact_description(item.filename, postprocess)
        for item in written_files
    }

    for index, item in enumerate(written_files, start=1):
        name = Path(item.filename).name
        size = f"{item.bytes_written} B"
        if item.bytes_written >= 1024:
            size = f"{item.bytes_written / 1024:.1f} KB"
        description = descriptions.get(name, "—")
        rel_path = f"artifacts/{name}"
        lines.append(f"| {index} | [{name}]({rel_path}) | {size} | {description} |")

    lines.extend(
        [
            "",
            "## Audit",
            "",
            f"- **Project:** `{project_slug}`",
            f"- **Run ID:** `{run_id}`",
            f"- **Created (UTC):** {created_at}",
            f"- **Approved:** {'Yes' if approved else 'No'}",
            f"- **Sector:** {sector}",
            "",
            "Zie `run_manifest.json` voor volledige technische traceerbaarheid.",
            "",
        ]
    )
    return "\n".join(lines)


def _artifact_description(filename: str, postprocess: PostProcessPayload) -> str:
    if filename == "summary.md":
        return "Executive summary van deze run"

    basename = Path(filename).name
    original = re.sub(r"^\d{2}_", "", basename)
    for proposed in postprocess.proposed_files:
        if Path(proposed.filename).name == original or proposed.filename == original:
            return proposed.description
    return "—"


def write_index_markdown(run_dir: Path, content: str) -> Path:
    target = run_dir / "INDEX.md"
    run_dir.mkdir(parents=True, exist_ok=True)
    target.write_text(content if content.endswith("\n") else content + "\n", encoding="utf-8")
    return target
