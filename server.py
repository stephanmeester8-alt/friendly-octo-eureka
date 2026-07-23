#!/usr/bin/env python3
"""FastAPI local dashboard for the SovereignAI enterprise pipeline."""

from __future__ import annotations

import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, HTMLResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from config import OUTPUT_DIR, WORKSPACE_ROOT
from pipeline_manager import manager

STATIC_DIR = WORKSPACE_ROOT / "static"

app = FastAPI(
    title="SovereignAI Terminal",
    description="Local enterprise dashboard — Antigravity → Gemini Router → HITL → Safe Writer",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://127.0.0.1:3000",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://localhost:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if STATIC_DIR.exists():
    app.mount("/static", StaticFiles(directory=str(STATIC_DIR)), name="static")


class VaultRequest(BaseModel):
    api_key: str = Field(min_length=8)


class StartPipelineRequest(BaseModel):
    prompt: str = Field(min_length=10)


class CreditsRequest(BaseModel):
    amount: int = Field(ge=1, le=1000)


@app.get("/", response_class=HTMLResponse)
async def dashboard() -> HTMLResponse:
    index_path = STATIC_DIR / "index.html"
    if not index_path.exists():
        raise HTTPException(status_code=500, detail="Dashboard UI not found.")
    return HTMLResponse(index_path.read_text(encoding="utf-8"))


@app.get("/api/status")
async def status():
    return manager.get_status()


@app.get("/api/vault")
async def vault_info():
    return manager.get_vault_info()


@app.post("/api/vault")
async def configure_vault(body: VaultRequest):
    return manager.configure_vault(body.api_key)


@app.post("/api/credits")
async def add_credits(body: CreditsRequest):
    total = manager.add_credits(body.amount)
    return {"credits": total}


@app.post("/api/pipeline/start")
async def start_pipeline(body: StartPipelineRequest):
    try:
        run_id = manager.start_run(body.prompt.strip())
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"run_id": run_id}


@app.get("/api/pipeline/{run_id}")
async def get_run(run_id: str):
    run = manager.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")
    return {
        "run_id": run.run_id,
        "stage": run.stage.value,
        "elapsed_seconds": run.elapsed_seconds,
        "approved": run.approved,
        "error": run.error,
        "interaction_id": run.interaction_id,
        "deliverables": run.deliverables,
        "manifest": run.manifest,
        "done": run._done,
    }


@app.get("/api/pipeline/{run_id}/stream")
async def stream_run(run_id: str):
    run = manager.get_run(run_id)
    if not run:
        raise HTTPException(status_code=404, detail="Run not found.")

    def event_generator():
        yield from manager.iter_events(run_id)
        yield f"data: {json.dumps({'stage': 'stream_end', 'message': 'Stream closed'})}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


@app.post("/api/pipeline/{run_id}/approve")
async def approve_run(run_id: str):
    if not manager.approve(run_id):
        raise HTTPException(status_code=400, detail="Run not awaiting approval.")
    return {"approved": True}


@app.post("/api/pipeline/{run_id}/deny")
async def deny_run(run_id: str):
    if not manager.deny(run_id):
        raise HTTPException(status_code=400, detail="Run not awaiting approval.")
    return {"approved": False}


@app.get("/api/files/{filename}")
async def download_file(filename: str):
    safe_name = Path(filename).name
    if not safe_name or safe_name in {".", ".."}:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    target = (OUTPUT_DIR / safe_name).resolve()
    output_root = OUTPUT_DIR.resolve()
    if not str(target).startswith(str(output_root)) or not target.exists():
        raise HTTPException(status_code=404, detail="File not found.")

    return FileResponse(target, filename=safe_name)


def main() -> None:
    import uvicorn

    uvicorn.run(
        "server:app",
        host="127.0.0.1",
        port=8765,
        reload=False,
        log_level="info",
    )


if __name__ == "__main__":
    main()
