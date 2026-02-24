create extension if not exists pgcrypto;

create table if not exists public.market_trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  market_id text,
  question text,
  side text,
  shares double precision,
  price numeric,
  total numeric,
  status text default 'open',
  pnl numeric,
  paper_trade boolean default true,
  reason text,
  created_at timestamptz default now(),
  closed_at timestamptz
);

create index if not exists market_trades_user_created_idx
  on public.market_trades (user_id, created_at desc);

alter table public.market_trades enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'market_trades'
      and policyname = 'Users see own trades'
  ) then
    create policy "Users see own trades"
    on public.market_trades
    for all
    using (auth.uid() = user_id);
  end if;
end
$$;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'market_trades'
      and policyname = 'users_own_trades'
  ) then
    create policy users_own_trades
    on public.market_trades
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end
$$;
