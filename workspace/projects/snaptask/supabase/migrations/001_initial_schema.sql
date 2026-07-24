-- SnapTask initial schema
-- Run in Supabase SQL editor or via supabase db push

-- Profiles (extends auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  balance numeric(12, 2) not null default 0.00 check (balance >= 0),
  created_at timestamptz not null default now()
);

-- Tasks marketplace
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.profiles (id) on delete cascade,
  title text not null,
  description text not null,
  budget numeric(12, 2) not null default 0 check (budget >= 0),
  status text not null default 'open'
    check (status in ('open', 'in_progress', 'completed', 'disputed')),
  file_url text,
  worker_id uuid references public.profiles (id) on delete set null,
  result_url text,
  created_at timestamptz not null default now()
);

create index if not exists tasks_status_idx on public.tasks (status);
create index if not exists tasks_client_id_idx on public.tasks (client_id);
create index if not exists tasks_worker_id_idx on public.tasks (worker_id);
create index if not exists tasks_created_at_idx on public.tasks (created_at desc);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, balance)
  values (new.id, new.email, 0.00)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;

-- Profiles: users read all (marketplace), update own
create policy "Profiles are viewable by authenticated users"
  on public.profiles for select
  to authenticated
  using (true);

create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Tasks: open tasks public to authenticated; owners manage own
create policy "Authenticated users can view tasks"
  on public.tasks for select
  to authenticated
  using (true);

create policy "Clients can create tasks"
  on public.tasks for insert
  to authenticated
  with check (auth.uid() = client_id);

create policy "Clients and workers can update relevant tasks"
  on public.tasks for update
  to authenticated
  using (auth.uid() = client_id or auth.uid() = worker_id or status = 'open')
  with check (
    auth.uid() = client_id
    or auth.uid() = worker_id
    or (status = 'in_progress' and worker_id = auth.uid())
  );

-- Storage bucket for task assets (create via dashboard or):
-- insert into storage.buckets (id, name, public) values ('task-files', 'task-files', true);
