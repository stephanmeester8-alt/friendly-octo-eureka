"""Antigravity agent execution and interaction status polling."""

from __future__ import annotations

import enum
import sys
import time
from typing import Any

from google import genai

from client import get_client
from config import (
    AGENT_ENVIRONMENT,
    ANTIGRAVITY_AGENT,
    POLL_INTERVAL_SECONDS,
    POLL_MAX_ATTEMPTS,
)
from console import (
    is_compact,
    print_info,
    print_interaction_id,
    print_poll,
    print_poll_complete,
    print_step,
)
from schemas import AgentRunResult

TERMINAL_STATUSES = frozenset(
    {
        "completed",
        "failed",
        "cancelled",
        "incomplete",
        "budget_exceeded",
    }
)

SUCCESS_STATUSES = frozenset({"completed"})


def normalize_status(status: Any) -> str:
    """Normalize interaction status from Enum, string, or mixed-case values."""
    if status is None:
        return "unknown"

    if isinstance(status, enum.Enum):
        raw = status.value
    else:
        raw = status

    return str(raw).strip().lower()


def is_terminal_status(status: Any) -> bool:
    return normalize_status(status) in TERMINAL_STATUSES


def is_success_status(status: Any) -> bool:
    return normalize_status(status) in SUCCESS_STATUSES


def format_elapsed(seconds: float) -> str:
    total = max(0, int(seconds))
    hours, remainder = divmod(total, 3600)
    minutes, secs = divmod(remainder, 60)
    if hours:
        return f"{hours}h {minutes}m {secs}s"
    if minutes:
        return f"{minutes}m {secs}s"
    return f"{secs}s"


def poll_interaction(
    client: genai.Client,
    interaction_id: str,
    *,
    poll_interval: float = POLL_INTERVAL_SECONDS,
    max_attempts: int = POLL_MAX_ATTEMPTS,
    label: str = "Interaction",
) -> Any:
    """Poll an interaction until it reaches a terminal status."""
    started = time.monotonic()

    for attempt in range(1, max_attempts + 1):
        interaction = client.interactions.get(id=interaction_id)
        status = normalize_status(interaction.status)
        elapsed = format_elapsed(time.monotonic() - started)

        print_poll(label, attempt, max_attempts, status, elapsed)

        if is_terminal_status(interaction.status):
            if is_compact() and attempt > 1 and status != "in_progress":
                print()
            print_poll_complete(label, elapsed)
            return interaction

        time.sleep(poll_interval)

    elapsed = format_elapsed(time.monotonic() - started)
    raise TimeoutError(
        f"{label} {interaction_id!r} did not reach a terminal status "
        f"after {max_attempts} polls ({poll_interval}s interval, {elapsed} elapsed)."
    )


def run_antigravity_agent(
    user_input: str,
    *,
    client: genai.Client | None = None,
) -> AgentRunResult:
    """Start the Antigravity agent in background mode and poll until completion."""
    client = client or get_client()

    print_step(
        1,
        f"Starting Antigravity agent ({ANTIGRAVITY_AGENT})...",
        detail=f"Environment: {AGENT_ENVIRONMENT} | Background: True | Store: True",
    )

    interaction = client.interactions.create(
        agent=ANTIGRAVITY_AGENT,
        input=user_input,
        environment=AGENT_ENVIRONMENT,
        background=True,
        store=True,
    )

    interaction_id = interaction.id
    print_interaction_id("Interaction ID", interaction_id)
    if not is_compact():
        print_info(f"Initial status: {normalize_status(interaction.status)}")

    completed = poll_interaction(
        client,
        interaction_id,
        label="Antigravity",
    )

    status = normalize_status(completed.status)
    output_text = completed.output_text or ""

    if not is_success_status(completed.status):
        error_detail = getattr(completed, "error", None) or "No error detail available."
        print(f"[ERROR] Antigravity agent finished with status: {status}", file=sys.stderr)
        print(f"  Detail: {error_detail}", file=sys.stderr)
        raise RuntimeError(f"Antigravity agent failed with status: {status}")

    print_step(1, "Antigravity completed successfully.")
    if not is_compact():
        print_info(f"Output length: {len(output_text)} characters")

    return AgentRunResult(
        interaction_id=interaction_id,
        environment_id=getattr(completed, "environment_id", None),
        output_text=output_text,
        status=status,
    )
