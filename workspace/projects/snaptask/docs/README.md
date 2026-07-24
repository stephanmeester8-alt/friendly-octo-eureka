# SnapTask Phase 1 notes

## Taak 1.1 — Supabase koppelen

1. Maak een project in [Supabase](https://supabase.com/dashboard).
2. Kopieer **Project URL** en **anon public** key uit Settings → API.
3. `cp env.example .env.local` en vul in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_DEMO_MODE=false
```

4. Herstart `npm run dev`.

## Taak 1.2 — SQL migratie

Voer uit in Supabase SQL Editor:

`supabase/migrations/001_initial_schema.sql`

Dit maakt:

| Tabel | Kernvelden |
|-------|------------|
| `profiles` | `username`, `avatar_url`, `balance` (BIGINT cents) |
| `tasks` | `client_id`, `maker_id`, `budget` (BIGINT cents), `status` enum |

Statussen: `open` · `in_progress` · `completed` · `cancelled`

Bedragen: altijd integers in **centen** (50 = €0,50). UI converteert via `eurosToCents` / `formatEurFromCents`.

RLS + `handle_new_user` trigger: bij Auth-signup verschijnt automatisch een profiel met `balance = 0`.

## Taak 1.3 — Google Auth login

### Supabase dashboard
1. Authentication → Providers → **Google** inschakelen (Client ID + Secret van Google Cloud Console).
2. Authentication → URL Configuration:
   - Site URL: `http://localhost:3000` (prod later: `https://usesnaptask.com`)
   - Redirect URLs: `http://localhost:3000/auth/callback`

### App routes
| Route | Rol |
|-------|-----|
| `/login` | Google OAuth knop (`AuthForm`) |
| `/auth/callback` | Wisselt `?code=` om voor session cookies |
| Header | Toont Inloggen / gebruikersnaam + Uitloggen |

Bij succesvolle login maakt de SQL-trigger uit 1.2 automatisch een `profiles`-rij met lege wallet.

## Volgende: Fase 2

Wallet top-up via Stripe (virtuele credits, bijv. €5,00).
