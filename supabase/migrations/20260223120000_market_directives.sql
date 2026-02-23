create extension if not exists pgcrypto;

create table if not exists public.market_directives (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  amount numeric not null,
  timeframe text not null,
  buys_per_day integer not null,
  risk_mix text not null,
  whale_follow boolean not null default false,
  focus_areas text[] not null default '{}',
  profit_strategy text not null,
  paper_mode boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_directives_user_created_idx
  on public.market_directives (user_id, created_at desc);

alter table public.market_directives enable row level security;

drop policy if exists market_directives_select_own on public.market_directives;
create policy market_directives_select_own
on public.market_directives
for select
using (auth.uid() = user_id);

drop policy if exists market_directives_insert_own on public.market_directives;
create policy market_directives_insert_own
on public.market_directives
for insert
with check (auth.uid() = user_id);

drop policy if exists market_directives_update_own on public.market_directives;
create policy market_directives_update_own
on public.market_directives
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists market_directives_delete_own on public.market_directives;
create policy market_directives_delete_own
on public.market_directives
for delete
using (auth.uid() = user_id);