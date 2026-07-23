# SovereignAI Workspace — Web Application

Enterprise B2B SaaS frontend for the Sovereign & Cost-Optimization AI Engine.

## Stack

- React 19 + TypeScript
- Tailwind CSS v4
- React Router
- Zustand (state)
- Supabase Auth (optional — falls back to local demo mode)

## Quick Start

```bash
cd web
npm install
npm run dev
```

Open http://localhost:5173

## Features

- **Landing page** — Hero, features grid, pricing tiers, security section
- **Auth** — Email/password signup & login (Supabase or local demo)
- **Dashboard** — 4-stage AI pipeline simulation with live timer
- **HITL Gate** — Approve/deny proposed file writes
- **Deliverables** — INDEX.md, numbered artifacts, run_manifest.json downloads
- **Billing** — Credit top-up modal with Stripe test-mode UI
- **Pilot** — €3.500 pilot request form

## Environment Variables

Copy `.env.example` to `.env` and add Supabase credentials for production auth:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Without Supabase, the app runs in **demo mode** using localStorage.

## Build

```bash
npm run build
npm run preview
```
