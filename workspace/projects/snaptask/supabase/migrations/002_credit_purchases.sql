-- SnapTask Phase 2 — credit purchase ledger (Stripe top-ups)
-- Idempotent webhook updates: one row per Stripe Checkout Session

create table if not exists public.credit_purchases (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  stripe_session_id text not null unique,
  amount_cents bigint not null check (amount_cents > 0),
  credits bigint not null check (credits > 0),
  created_at timestamptz not null default now()
);

create index if not exists credit_purchases_profile_id_idx
  on public.credit_purchases (profile_id);

alter table public.credit_purchases enable row level security;

-- Users can read their own purchase history; writes only via service role
drop policy if exists "Gebruikers zien eigen credit purchases" on public.credit_purchases;
create policy "Gebruikers zien eigen credit purchases"
  on public.credit_purchases for select
  using (auth.uid() = profile_id);
