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

_CHAINING_ERROR_MARKERS = (
    "thought_signature",
    "tool call part",
    "invalid_request",
)


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


def _is_chaining_error(exc: BaseException) -> bool:
    """Detect API errors when chaining tool-heavy Antigravity context."""
    message = str(exc).lower()
    return any(marker in message for marker in _CHAINING_ERROR_MARKERS)


def _build_client_context_prompt(base_prompt: str, agent_output_text: str) -> str:
    """Embed Antigravity output directly when server-side chaining is unavailable."""
    output = agent_output_text.strip()
    return (
        f"{base_prompt}\n\n"
        "--- ANTIGRAVITY AGENT OUTPUT (source context) ---\n"
        f"{output}\n"
        "--- END ANTIGRAVITY OUTPUT ---"
    )


def _execute_routing_interaction(
    client: genai.Client,
    *,
    user_prompt: str,
    use_schema: bool,
    label: str,
    previous_interaction_id: str | None = None,
) -> Any:
    """Create a background routing interaction and poll until terminal."""
    print_info(f"{label} (background=True)...")

    kwargs: dict[str, Any] = {
        "model": ROUTING_MODEL,
        "input": user_prompt,
        "system_instruction": POSTPROCESS_SYSTEM_INSTRUCTION,
        "generation_config": ROUTING_GENERATION_CONFIG,
        "background": True,
        "store": True,
    }
    if previous_interaction_id:
        kwargs["previous_interaction_id"] = previous_interaction_id
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


def _start_routing_interaction(
    client: genai.Client,
    *,
    user_prompt: str,
    use_schema: bool,
    label: str,
    previous_interaction_id: str | None,
    agent_output_text: str,
    prefer_chain: bool,
) -> Any:
    """Start routing via server-side chain, falling back to client-side context."""
    if prefer_chain and previous_interaction_id:
        try:
            return _execute_routing_interaction(
                client,
                user_prompt=user_prompt,
                use_schema=use_schema,
                label=label,
                previous_interaction_id=previous_interaction_id,
            )
        except Exception as exc:
            if not _is_chaining_error(exc) or not agent_output_text.strip():
                raise
            print_info(
                "Server-side chaining unavailable (tool-call context) — "
                "using client-side Antigravity output."
            )

    if not agent_output_text.strip():
        raise RuntimeError(
            "Cannot route post-process output: chaining failed and no Antigravity "
            "output text is available for client-side fallback."
        )

    return _execute_routing_interaction(
        client,
        user_prompt=_build_client_context_prompt(user_prompt, agent_output_text),
        use_schema=use_schema,
        label="Submitting client-side routing interaction",
    )


def _parse_payload(raw_output: str) -> PostProcessPayload:
    try:
        return PostProcessPayload.model_validate_json(raw_output)
    except Exception:
        cleaned = _extract_json(raw_output)
        return PostProcessPayload.model_validate_json(cleaned)


def _finalize_routing(
    interaction: Any,
    *,
    success_message: str,
) -> tuple[PostProcessPayload, str] | None:
    interaction_id = interaction.id
    status = normalize_status(interaction.status)
    raw_output = interaction.output_text or ""

    if raw_output:
        try:
            payload = enrich_payload_metadata(_parse_payload(raw_output))
            print_step(2, success_message)
            print_info(f"Summary length: {len(payload.summary_markdown)} chars")
            print_info(f"Proposed files: {len(payload.proposed_files)}")
            print_info(f"Company: {payload.metadata.get('company_name', '—')}")
            if not is_success_status(interaction.status):
                print_info(f"Routing status was {status}, but JSON output parsed — continuing.")
            return payload, interaction_id
        except Exception:
            if is_success_status(interaction.status):
                print("[ERROR] Failed to parse post-process JSON output.", file=sys.stderr)
                print(f"  Raw output preview: {raw_output[:500]}", file=sys.stderr)
                raise ValueError("Post-process output is not valid JSON.") from None

    if is_success_status(interaction.status):
        print("[ERROR] Routing completed without output text.", file=sys.stderr)
        raise RuntimeError("Post-processing returned no output text.")

    return None


def route_and_reformat(
    previous_interaction_id: str,
    *,
    agent_output_text: str,
    client: genai.Client | None = None,
) -> tuple[PostProcessPayload, str]:
    """Route Antigravity output to Gemini 3.5 Flash for structured JSON handoff."""
    client = client or get_client()

    print_step(2, f"Gemini 3.5 Flash reformatting ({ROUTING_MODEL})...")
    print_interaction_id("Chaining from", previous_interaction_id)

    interaction = _start_routing_interaction(
        client,
        user_prompt=POSTPROCESS_USER_PROMPT,
        use_schema=True,
        label="Submitting structured routing interaction",
        previous_interaction_id=previous_interaction_id,
        agent_output_text=agent_output_text,
        prefer_chain=True,
    )

    result = _finalize_routing(
        interaction,
        success_message="Routing completed. Parsing structured JSON output...",
    )
    if result[0] is not None:
        return result

    status = normalize_status(interaction.status)
    print_info(f"Structured routing finished with status: {status} — retrying fallback.")
    print_info(f"Detail: {_interaction_error_detail(interaction)}")

    fallback = _start_routing_interaction(
        client,
        user_prompt=POSTPROCESS_FALLBACK_USER_PROMPT,
        use_schema=False,
        label="Retrying fallback routing interaction",
        previous_interaction_id=None,
        agent_output_text=agent_output_text,
        prefer_chain=False,
    )

    result = _finalize_routing(
        fallback,
        success_message="Fallback routing completed. Parsing JSON output...",
    )
    if result[0] is not None:
        return result

    fallback_status = normalize_status(fallback.status)
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
