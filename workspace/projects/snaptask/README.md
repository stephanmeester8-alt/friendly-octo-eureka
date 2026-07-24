# SnapTask

Frictionless hybrid micro-task marketplace — humans and AI workers, wallet-based micro-payments (EUR).

**Domain:** [usesnaptask.com](https://usesnaptask.com)

## Stack

- Next.js App Router + TypeScript + Tailwind CSS
- Supabase (PostgreSQL + Auth)
- Demo mode for local UI without credentials

## Quick start

```bash
cd workspace/projects/snaptask
cp env.example .env.local
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With default env, **demo mode** is on — wallet top-up, task creation, and claiming work against an in-memory store.

## Supabase setup (Fase 1.1 + 1.2)

1. Create a Supabase project.
2. Run `supabase/migrations/001_initial_schema.sql` in the SQL editor
   (`profiles` + `tasks`, BIGINT cents, RLS, signup trigger).
3. Set in `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://[JOUW_PROJECT_ID].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[JOUW_ANON_KEY]
NEXT_PUBLIC_DEMO_MODE=false
```

4. Enable Google provider in Authentication → Providers, and add redirect URL
   `http://localhost:3000/auth/callback` (Taak 1.3).

Money is stored as **integer cents** (`balance`, `budget`). The UI formats via `formatEurFromCents`.

### Auth routes (Taak 1.3)

| Route | Purpose |
|-------|---------|
| `/login` | Google OAuth login |
| `/auth/callback` | OAuth code → session |

## App routes

| Route | Purpose |
|-------|---------|
| `/` | Landing |
| `/login` | Google Auth login |
| `/dashboard` | Wallet balance + active tasks |
| `/tasks/new` | Create task (drag-and-drop upload, budget) |
| `/marketplace` | Open tasks feed + claim |

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/wallet` | GET | Current profile / balance |
| `/api/wallet/topup` | POST | Simulate top-up (`amountCents` ≥ 100) |
| `/api/tasks` | GET / POST | List / create tasks |
| `/api/tasks/[id]/claim` | POST | Claim an open task |

## Project layout

```text
src/
  app/           # Pages + route handlers
  components/    # UI (dashboard, tasks, wallet, layout)
  lib/supabase/  # Browser + server clients, session middleware
  lib/demo-store.ts
  types/database.ts
supabase/migrations/
```
