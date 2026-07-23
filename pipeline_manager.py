"""Web-aware pipeline orchestration with SSE events and HITL gating."""

from __future__ import annotations

import json
import threading
import time
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from queue import Empty, Queue
from typing import Any

from agents import run_antigravity_agent
from client import configure_api_key, get_client, is_client_configured
from config import OUTPUT_DIR, WORKSPACE_ROOT
from postprocess import route_and_reformat
from schemas import PipelineResult, PostProcessPayload, ProposedFile, WriteResult
from writer import write_approved_files, write_summary_markdown

CREDITS_FILE = WORKSPACE_ROOT / ".sovereign_credits.json"
DEFAULT_CREDITS = 10


class PipelineStage(str, Enum):
    IDLE = "idle"
    ANTIGRAVITY = "antigravity"
    ROUTING = "routing"
    HITL = "hitl"
    DELIVERABLES = "deliverables"
    COMPLETE = "complete"
    ERROR = "error"
    DENIED = "denied"


@dataclass
class PipelineEvent:
    stage: str
    elapsed_seconds: float
    message: str
    data: dict[str, Any] = field(default_factory=dict)

    def to_sse(self) -> str:
        payload = {
            "stage": self.stage,
            "elapsed_seconds": self.elapsed_seconds,
            "message": self.message,
            **self.data,
        }
        return f"data: {json.dumps(payload)}\n\n"


@dataclass
class PipelineRun:
    run_id: str
    prompt: str
    stage: PipelineStage = PipelineStage.IDLE
    started_at: float = 0.0
    elapsed_seconds: float = 0.0
    postprocess: PostProcessPayload | None = None
    approved: bool | None = None
    written_files: list[WriteResult] = field(default_factory=list)
    deliverables: list[dict[str, Any]] = field(default_factory=list)
    manifest: dict[str, Any] = field(default_factory=dict)
    error: str | None = None
    interaction_id: str | None = None
    events: Queue[PipelineEvent] = field(default_factory=Queue)
    _approval_event: threading.Event = field(default_factory=threading.Event)
    _approval_result: bool | None = None
    _thread: threading.Thread | None = None
    _done: bool = False

    def emit(self, stage: PipelineStage, message: str, **data: Any) -> None:
        self.stage = stage
        if self.started_at:
            self.elapsed_seconds = time.time() - self.started_at
        event = PipelineEvent(
            stage=stage.value,
            elapsed_seconds=self.elapsed_seconds,
            message=message,
            data=data,
        )
        self.events.put(event)

    def wait_for_approval(self, timeout: float = 3600.0) -> bool:
        if not self._approval_event.wait(timeout=timeout):
            return False
        return bool(self._approval_result)

    def resolve_approval(self, approved: bool) -> None:
        self._approval_result = approved
        self._approval_event.set()


class PipelineManager:
    def __init__(self) -> None:
        self._runs: dict[str, PipelineRun] = {}
        self._lock = threading.Lock()
        self._credits = self._load_credits()
        self._vault_configured = is_client_configured()

    def _load_credits(self) -> int:
        if CREDITS_FILE.exists():
            try:
                data = json.loads(CREDITS_FILE.read_text(encoding="utf-8"))
                return int(data.get("credits", DEFAULT_CREDITS))
            except (json.JSONDecodeError, ValueError, TypeError):
                pass
        return DEFAULT_CREDITS

    def _save_credits(self) -> None:
        CREDITS_FILE.write_text(
            json.dumps({"credits": self._credits}),
            encoding="utf-8",
        )

    def get_status(self) -> dict[str, Any]:
        vault_active = is_client_configured()
        return {
            "antigravity_agent": "antigravity-preview-05-2026",
            "routing_model": "gemini-3.5-flash",
            "vault_status": "active" if vault_active else "locked",
            "vault_configured": vault_active,
            "credits": self._credits,
            "output_dir": str(OUTPUT_DIR),
            "active_runs": sum(1 for r in self._runs.values() if not r._done),
        }

    def configure_vault(self, api_key: str) -> dict[str, str]:
        configure_api_key(api_key)
        self._vault_configured = True
        return {"status": "active", "masked_key": _mask_key(api_key)}

    def get_vault_info(self) -> dict[str, Any]:
        from config import get_api_key

        key = get_api_key()
        return {
            "configured": bool(key),
            "masked_key": _mask_key(key) if key else None,
            "status": "active" if key else "locked",
        }

    def start_run(self, prompt: str) -> str:
        if not is_client_configured():
            raise ValueError("BYOK vault is locked. Configure your API key first.")
        if self._credits <= 0:
            raise ValueError("Insufficient credits. Top up before running an analysis.")

        run_id = str(uuid.uuid4())[:8]
        run = PipelineRun(run_id=run_id, prompt=prompt)
        with self._lock:
            self._runs[run_id] = run

        thread = threading.Thread(target=self._execute_run, args=(run,), daemon=True)
        run._thread = thread
        thread.start()
        return run_id

    def get_run(self, run_id: str) -> PipelineRun | None:
        return self._runs.get(run_id)

    def approve(self, run_id: str) -> bool:
        run = self._runs.get(run_id)
        if not run or run.stage != PipelineStage.HITL:
            return False
        run.resolve_approval(True)
        return True

    def deny(self, run_id: str) -> bool:
        run = self._runs.get(run_id)
        if not run or run.stage != PipelineStage.HITL:
            return False
        run.resolve_approval(False)
        return True

    def deduct_credit(self) -> bool:
        if self._credits <= 0:
            return False
        self._credits -= 1
        self._save_credits()
        return True

    def add_credits(self, amount: int) -> int:
        self._credits += amount
        self._save_credits()
        return self._credits

    def _execute_run(self, run: PipelineRun) -> None:
        run.started_at = time.time()
        try:
            client = get_client()

            def on_poll(attempt: int, max_attempts: int, status: str) -> None:
                run.emit(
                    PipelineStage.ANTIGRAVITY,
                    f"Antigravity polling ({attempt}/{max_attempts}) — {status}",
                    poll_attempt=attempt,
                    poll_status=status,
                )

            run.emit(PipelineStage.ANTIGRAVITY, "Starting Antigravity deep analysis…")
            agent_result = run_antigravity_agent(
                run.prompt,
                client=client,
                on_poll=on_poll,
            )
            run.interaction_id = agent_result.interaction_id

            def on_route_poll(attempt: int, max_attempts: int, status: str) -> None:
                run.emit(
                    PipelineStage.ROUTING,
                    f"Gemini Router polling ({attempt}/{max_attempts}) — {status}",
                    poll_attempt=attempt,
                    poll_status=status,
                )

            run.emit(PipelineStage.ROUTING, "Gemini Router structuring output…")
            postprocess = route_and_reformat(
                agent_result.interaction_id,
                client=client,
                on_poll=on_route_poll,
            )
            run.postprocess = postprocess

            proposed = [
                {
                    "filename": f.filename,
                    "description": f.description,
                    "size_bytes": len(f.content.encode("utf-8")),
                    "preview": f.content[:500],
                }
                for f in postprocess.proposed_files
            ]

            run.emit(
                PipelineStage.HITL,
                "Awaiting Human-in-the-Loop approval",
                summary_markdown=postprocess.summary_markdown,
                proposed_files=proposed,
                metadata=postprocess.metadata,
            )

            approved = run.wait_for_approval()
            run.approved = approved

            if not approved:
                run.emit(PipelineStage.DENIED, "Approval denied — no files written.")
                run._done = True
                return

            if not self.deduct_credit():
                run.error = "Insufficient credits at approval time."
                run.emit(PipelineStage.ERROR, run.error)
                run._done = True
                return

            run.emit(PipelineStage.DELIVERABLES, "Writing approved files to ./output/…")
            written = write_approved_files(postprocess.proposed_files)
            if postprocess.summary_markdown:
                written.append(write_summary_markdown(postprocess.summary_markdown))
            run.written_files = written

            deliverables, manifest = _build_deliverables(run, postprocess, written)
            run.deliverables = deliverables
            run.manifest = manifest

            run.emit(
                PipelineStage.COMPLETE,
                "Pipeline complete — deliverables ready",
                deliverables=deliverables,
                manifest=manifest,
                written_files=[
                    {"filename": w.filename, "path": w.path, "bytes_written": w.bytes_written}
                    for w in written
                ],
            )
        except Exception as exc:
            run.error = str(exc)
            run.emit(PipelineStage.ERROR, f"Pipeline failed: {exc}")
        finally:
            run._done = True

    def iter_events(self, run_id: str):
        run = self._runs.get(run_id)
        if not run:
            return
        while not run._done or not run.events.empty():
            try:
                event = run.events.get(timeout=1.0)
                yield event.to_sse()
            except Empty:
                if run._done:
                    break
                yield f": keepalive\n\n"


def _mask_key(key: str | None) -> str | None:
    if not key:
        return None
    if len(key) <= 8:
        return "••••••••"
    return f"{key[:4]}…{key[-4:]}"


def _build_deliverables(
    run: PipelineRun,
    payload: PostProcessPayload,
    written: list[WriteResult],
) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Build INDEX.md, numbered artifacts view, and run_manifest.json."""
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    deliverables: list[dict[str, Any]] = []

    numbered_files = sorted(
        [w for w in written if w.filename != "INDEX.md" and w.filename != "run_manifest.json"],
        key=lambda w: w.filename,
    )

    index_lines = [
        "# SovereignAI Deliverables",
        "",
        f"**Run ID:** `{run.run_id}`",
        f"**Generated:** {datetime.now(timezone.utc).isoformat()}",
        f"**Elapsed:** {run.elapsed_seconds:.1f}s",
        "",
        "## Artifacts",
        "",
    ]

    for i, w in enumerate(numbered_files, start=1):
        numbered_name = f"{i:02d}_{w.filename}"
        src = Path(w.path)
        if src.exists():
            content = src.read_text(encoding="utf-8")
            numbered_path = OUTPUT_DIR / numbered_name
            if not numbered_path.exists():
                numbered_path.write_text(content, encoding="utf-8")
            deliverables.append(
                {
                    "filename": numbered_name,
                    "original": w.filename,
                    "path": str(numbered_path),
                    "size_bytes": w.bytes_written,
                    "description": next(
                        (p.description for p in payload.proposed_files if p.filename == w.filename),
                        "Approved artifact",
                    ),
                }
            )
            index_lines.append(f"{i}. [{numbered_name}](./{numbered_name}) — {w.bytes_written} bytes")

    index_content = "\n".join(index_lines) + "\n"
    index_path = OUTPUT_DIR / "INDEX.md"
    index_path.write_text(index_content, encoding="utf-8")

    manifest = {
        "run_id": run.run_id,
        "prompt": run.prompt,
        "interaction_id": run.interaction_id,
        "approved": True,
        "elapsed_seconds": round(run.elapsed_seconds, 2),
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "artifacts": [
            {"filename": d["filename"], "size_bytes": d["size_bytes"], "description": d["description"]}
            for d in deliverables
        ],
        "metadata": payload.metadata,
    }
    manifest_path = OUTPUT_DIR / "run_manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    deliverables.insert(
        0,
        {
            "filename": "INDEX.md",
            "original": "INDEX.md",
            "path": str(index_path),
            "size_bytes": len(index_content.encode("utf-8")),
            "description": "Deliverables index for board and compliance review",
            "content": index_content,
        },
    )

    return deliverables, manifest


manager = PipelineManager()
