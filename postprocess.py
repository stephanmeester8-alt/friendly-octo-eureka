"""Dynamic model routing — post-process agent output via Gemini 3.5 Flash."""

from __future__ import annotations

import json
import sys

from google import genai

from agents import is_success_status, normalize_status, poll_interaction
from client import get_client
from config import (
    POSTPROCESS_SYSTEM_INSTRUCTION,
    POSTPROCESS_USER_PROMPT,
    ROUTING_MODEL,
)
from schemas import PostProcessPayload


def _build_response_format() -> dict:
    """Build the interaction response_format from the Pydantic schema."""
    schema = PostProcessPayload.model_json_schema()
    return {
        "type": "text",
        "mime_type": "application/json",
        "schema": schema,
    }


def route_and_reformat(
    previous_interaction_id: str,
    *,
    client: genai.Client | None = None,
) -> PostProcessPayload:
    """Route to Gemini 3.5 Flash using server-side context via previous_interaction_id."""
    client = client or get_client()

    print(f"[2/4] Gemini 3.5 Flash reformatting ({ROUTING_MODEL})...")
    print(f"  Chaining from interaction: {previous_interaction_id}")

    # system_instruction and generation_config are interaction-scoped and must be
    # re-supplied on every call even when using previous_interaction_id.
    interaction = client.interactions.create(
        model=ROUTING_MODEL,
        input=POSTPROCESS_USER_PROMPT,
        previous_interaction_id=previous_interaction_id,
        system_instruction=POSTPROCESS_SYSTEM_INSTRUCTION,
        response_format=_build_response_format(),
        generation_config={"temperature": 0.1},
        store=True,
    )

    interaction_id = interaction.id
    status = normalize_status(interaction.status)

    # Foreground interactions may complete immediately; poll if still in progress.
    if not is_success_status(interaction.status) and status == "in_progress":
        print(f"  Waiting for routing interaction {interaction_id}...")
        interaction = poll_interaction(
            client,
            interaction_id,
            label="Gemini-Router",
        )
        status = normalize_status(interaction.status)

    if not is_success_status(interaction.status):
        print(
            f"[ERROR] Routing model finished with status: {status}",
            file=sys.stderr,
        )
        raise RuntimeError(f"Post-processing failed with status: {status}")

    raw_output = interaction.output_text or ""
    print(f"[2/4] Routing completed. Parsing structured JSON output...")

    try:
        payload = PostProcessPayload.model_validate_json(raw_output)
    except Exception:
        # Fallback: attempt to extract JSON from markdown fences.
        cleaned = _extract_json(raw_output)
        try:
            payload = PostProcessPayload.model_validate_json(cleaned)
        except Exception as exc:
            print(f"[ERROR] Failed to parse post-process JSON output.", file=sys.stderr)
            print(f"  Raw output preview: {raw_output[:500]}", file=sys.stderr)
            raise ValueError("Post-process output is not valid JSON.") from exc

    print(f"  Summary length: {len(payload.summary_markdown)} chars")
    print(f"  Proposed files: {len(payload.proposed_files)}")

    return payload


def _extract_json(text: str) -> str:
    """Extract JSON from a response that may be wrapped in markdown fences."""
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
        # Drop opening fence (```json or ```) and closing fence.
        inner_lines = []
        in_block = False
        for line in lines:
            if line.strip().startswith("```") and not in_block:
                in_block = True
                continue
            if line.strip() == "```" and in_block:
                break
            if in_block:
                inner_lines.append(line)
        return "\n".join(inner_lines).strip()
    return stripped
