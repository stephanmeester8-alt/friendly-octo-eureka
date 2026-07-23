# SovereignAI Terminal — TanStack Start

Premium enterprise dashboard built with **TanStack Start**, **Radix UI**, and **Tailwind v4**, connected to the FastAPI Python pipeline.

## Prerequisites

- Node.js 20+
- Python 3.10+ with FastAPI backend running

## Quick Start

```bash
# 1. Start the Python backend (from repo root)
python server.py

# 2. Start the TanStack frontend (new terminal)
cd terminal
npm install
npm run dev
```

Open **http://127.0.0.1:3000**

## Architecture

```
TanStack Start (port 3000)
    ↕ /api proxy (dev) or VITE_API_URL (prod)
FastAPI server.py (port 8765)
    ↕
pipeline_manager.py → agents.py → postprocess.py → writer.py
```

## Features

- Live status cards (Antigravity, BYOK Vault, Credits)
- 4-stage pipeline visualizer with elapsed timer
- HITL approval dialog (Radix Dialog) — no disk writes without [Y]
- Deliverables panel with download links
- BYOK vault + credit monitor sidebar

## Environment

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | `""` (relative) | FastAPI base URL for production builds |

In development, Vite proxies `/api/*` to `http://127.0.0.1:8765`.

## Build

```bash
npm run build
npm run preview
```
