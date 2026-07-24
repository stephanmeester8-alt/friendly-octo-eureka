# SnapTask MVP notes

## Schema

- `profiles` — wallet balance (EUR) keyed to `auth.users`
- `tasks` — marketplace jobs with escrowed `budget`, statuses `open | in_progress | completed | disputed`

## Demo vs live

`isDemoMode()` is true when `NEXT_PUBLIC_DEMO_MODE=true` or Supabase env vars are placeholders. Demo uses `src/lib/demo-store.ts` (process memory). Live paths use Supabase clients in `src/lib/supabase/`.

## Next increments

- Real file upload to Supabase Storage (`task-files` bucket)
- Stripe / Mollie wallet top-up
- Auth UI (Google OAuth + magic link)
- Escrow release on task completion
- AI worker adapter claiming eligible tasks
