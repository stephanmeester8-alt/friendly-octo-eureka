"""Pydantic schemas for structured outputs and handoff payloads."""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field, field_validator


class ProposedFile(BaseModel):
    """A file proposed for local persistence after HITL approval."""

    filename: str = Field(
        description="Filename relative to the output directory (no path separators)."
    )
    content: str = Field(description="Plain-text file content.")
    description: str = Field(description="Human-readable description of the file.")

    @field_validator("filename")
    @classmethod
    def validate_filename(cls, value: str) -> str:
        cleaned = value.strip().replace("\\", "/")
        if not cleaned or cleaned.startswith("/") or ".." in cleaned.split("/"):
            raise ValueError(f"Unsafe filename: {value!r}")
        # Flatten to basename only — no subdirectories allowed for safety.
        return cleaned.split("/")[-1]


class PostProcessPayload(BaseModel):
    """Structured output from the Gemini routing / post-processing step."""

    summary_markdown: str = Field(
        description="Clean Markdown summary of the agent's work."
    )
    proposed_files: list[ProposedFile] = Field(
        default_factory=list,
        description="Files proposed for local disk persistence.",
    )
    metadata: dict[str, Any] = Field(
        default_factory=dict,
        description="Additional metadata about the handoff.",
    )


class AgentRunResult(BaseModel):
    """Result of a completed Antigravity agent interaction."""

    interaction_id: str
    environment_id: str | None = None
    output_text: str
    status: str


class WriteResult(BaseModel):
    """Result of a safe file write operation."""

    filename: str
    path: str
    bytes_written: int


class PipelineResult(BaseModel):
    """End-to-end pipeline outcome."""

    agent_result: AgentRunResult
    postprocess: PostProcessPayload
    approved: bool
    project_slug: str = ""
    output_dir: str = ""
    written_files: list[WriteResult] = Field(default_factory=list)
