-- SnapTask Phase 1 — profiles + tasks (amounts in cents / BIGINT)
-- Run in Supabase SQL Editor (Dashboard → SQL → New query)

-- 1. Custom status type for marketplace tasks
do $$ begin
  create type public.task_status as enum ('open', 'in_progress', 'completed', 'cancelled');
exception
  when duplicate_object then null;
end $$;

-- 2. Profiles (linked to Supabase Auth users) — wallet balance in cents
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text unique,
  avatar_url text,
  -- Integer cents avoids float rounding; TigerBeetle-ready later
  balance bigint not null default 0 check (balance >= 0),
  created_at timestamptz not null default now()
);

-- 3. Tasks marketplace feed — budget in cents (e.g. 50 = €0.50)
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  maker_id uuid references public.profiles (id) on delete set null,
  title text not null,
  description text not null,
  budget bigint not null default 0 check (budget >= 0),
  status public.task_status not null default 'open',
  file_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_client_id_idx on public.tasks (client_id);
create index if not exists tasks_maker_id_idx on public.tasks (maker_id);
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

-- Keep updated_at fresh on row changes
create or replace function public.set_tasks_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_tasks_updated_at();

-- 4. Row Level Security
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

-- 5. RLS — profiles
drop policy if exists "Profielen zijn publiek zichtbaar" on public.profiles;
drop policy if exists "Gebruikers kunnen eigen profiel updaten" on public.profiles;
drop policy if exists "Profiles are viewable by authenticated users" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;

create policy "Profielen zijn publiek zichtbaar"
  on public.profiles for select
  using (true);

create policy "Gebruikers kunnen eigen profiel updaten"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- 6. RLS — tasks
drop policy if exists "Taken zijn publiek zichtbaar" on public.tasks;
drop policy if exists "Klanten kunnen taken plaatsen" on public.tasks;
drop policy if exists "Klanten en makers kunnen taken updaten" on public.tasks;
drop policy if exists "Authenticated users can view tasks" on public.tasks;
drop policy if exists "Clients can create tasks" on public.tasks;
drop policy if exists "Clients and workers can update relevant tasks" on public.tasks;

create policy "Taken zijn publiek zichtbaar"
  on public.tasks for select
  using (true);

create policy "Klanten kunnen taken plaatsen"
  on public.tasks for insert
  with check (auth.uid() = client_id);

create policy "Klanten en makers kunnen taken updaten"
  on public.tasks for update
  using (auth.uid() = client_id or auth.uid() = maker_id)
  with check (auth.uid() = client_id or auth.uid() = maker_id);

-- 7. Auto-create profile (+ empty wallet) on Auth signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_url, balance)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'user_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url',
    0
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
