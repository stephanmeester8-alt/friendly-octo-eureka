"""Dynamic model routing — post-process agent output via Gemini 3.5 Flash."""

from __future__ import annotations

import sys
from typing import Any

from google import genai

from agents import is_success_status, is_terminal_status, normalize_status, poll_interaction
from client import get_client
from config import (
    POSTPROCESS_FALLBACK_USER_PROMPT,
    POSTPROCESS_SYSTEM_INSTRUCTION,
    POSTPROCESS_USER_PROMPT,
    ROUTING_GENERATION_CONFIG,
    ROUTING_MODEL,
)
from console import print_info, print_interaction_id, print_step
from metadata_resolver import enrich_payload_metadata
from schemas import PostProcessPayload


def _build_response_format() -> dict:
    """Use a compact JSON schema — full Pydantic schema can be too large for routing."""
    return {
        "type": "text",
        "mime_type": "application/json",
        "schema": {
            "type": "object",
            "properties": {
                "summary_markdown": {"type": "string"},
                "proposed_files": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "filename": {"type": "string"},
                            "content": {"type": "string"},
                            "description": {"type": "string"},
                        },
                        "required": ["filename", "content", "description"],
                    },
                },
                "metadata": {
                    "type": "object",
                    "properties": {
                        "company_name": {"type": "string"},
                        "sector": {"type": "string"},
                    },
                },
            },
            "required": ["summary_markdown", "proposed_files"],
        },
    }


def _interaction_error_detail(interaction: Any) -> str:
    error = getattr(interaction, "error", None)
    if error is None:
        return "No error detail available."
    return str(error)


def _execute_routing_interaction(
    client: genai.Client,
    previous_interaction_id: str,
    *,
    user_prompt: str,
    use_schema: bool,
    label: str,
) -> Any:
    """Create a background routing interaction and poll until terminal."""
    print_info(f"{label} (background=True)...")

    kwargs: dict[str, Any] = {
        "model": ROUTING_MODEL,
        "input": user_prompt,
        "previous_interaction_id": previous_interaction_id,
        "system_instruction": POSTPROCESS_SYSTEM_INSTRUCTION,
        "generation_config": ROUTING_GENERATION_CONFIG,
        "background": True,
        "store": True,
    }
    if use_schema:
        kwargs["response_format"] = _build_response_format()

    interaction = client.interactions.create(**kwargs)
    print_interaction_id("Routing interaction", interaction.id)

    if not is_terminal_status(interaction.status):
        interaction = poll_interaction(
            client,
            interaction_id=interaction.id,
            label="Gemini-Router",
        )

    return interaction


def _parse_payload(raw_output: str) -> PostProcessPayload:
    try:
        return PostProcessPayload.model_validate_json(raw_output)
    except Exception:
        cleaned = _extract_json(raw_output)
        return PostProcessPayload.model_validate_json(cleaned)


def route_and_reformat(
    previous_interaction_id: str,
    *,
    client: genai.Client | None = None,
) -> tuple[PostProcessPayload, str]:
    """Route to Gemini 3.5 Flash using server-side context via previous_interaction_id."""
    client = client or get_client()

    print_step(2, f"Gemini 3.5 Flash reformatting ({ROUTING_MODEL})...")
    print_interaction_id("Chaining from", previous_interaction_id)

    interaction = _execute_routing_interaction(
        client,
        previous_interaction_id,
        user_prompt=POSTPROCESS_USER_PROMPT,
        use_schema=True,
        label="Submitting structured routing interaction",
    )
    interaction_id = interaction.id
    status = normalize_status(interaction.status)
    raw_output = interaction.output_text or ""

    if raw_output:
        try:
            payload = enrich_payload_metadata(_parse_payload(raw_output))
            if is_success_status(interaction.status):
                print_step(2, "Routing completed. Parsing structured JSON output...")
                print_info(f"Summary length: {len(payload.summary_markdown)} chars")
                print_info(f"Proposed files: {len(payload.proposed_files)}")
                print_info(f"Company: {payload.metadata.get('company_name', '—')}")
                return payload, interaction_id
            print_info(
                f"Routing status was {status}, but JSON output parsed — continuing."
            )
            print_info(f"Summary length: {len(payload.summary_markdown)} chars")
            print_info(f"Proposed files: {len(payload.proposed_files)}")
            print_info(f"Company: {payload.metadata.get('company_name', '—')}")
            return payload, interaction_id
        except Exception:
            if is_success_status(interaction.status):
                print("[ERROR] Failed to parse post-process JSON output.", file=sys.stderr)
                print(f"  Raw output preview: {raw_output[:500]}", file=sys.stderr)
                raise ValueError("Post-process output is not valid JSON.") from None

    if is_success_status(interaction.status):
        print("[ERROR] Routing completed without output text.", file=sys.stderr)
        raise RuntimeError("Post-processing returned no output text.")

    print_info(
        f"Structured routing finished with status: {status} — retrying fallback."
    )
    print_info(f"Detail: {_interaction_error_detail(interaction)}")

    fallback = _execute_routing_interaction(
        client,
        previous_interaction_id,
        user_prompt=POSTPROCESS_FALLBACK_USER_PROMPT,
        use_schema=False,
        label="Retrying fallback routing interaction",
    )
    interaction_id = fallback.id
    fallback_status = normalize_status(fallback.status)
    fallback_output = fallback.output_text or ""

    if fallback_output:
        try:
            payload = enrich_payload_metadata(_parse_payload(fallback_output))
            print_step(2, "Fallback routing completed. Parsing JSON output...")
            print_info(f"Summary length: {len(payload.summary_markdown)} chars")
            print_info(f"Proposed files: {len(payload.proposed_files)}")
            return payload, interaction_id
        except Exception as exc:
            print("[ERROR] Failed to parse fallback JSON output.", file=sys.stderr)
            print(f"  Raw output preview: {fallback_output[:500]}", file=sys.stderr)
            raise ValueError("Fallback post-process output is not valid JSON.") from exc

    print(
        f"[ERROR] Routing model finished with status: {fallback_status}",
        file=sys.stderr,
    )
    print(f"  Detail: {_interaction_error_detail(fallback)}", file=sys.stderr)
    raise RuntimeError(f"Post-processing failed with status: {fallback_status}")


def _extract_json(text: str) -> str:
    stripped = text.strip()
    if stripped.startswith("```"):
        lines = stripped.splitlines()
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
