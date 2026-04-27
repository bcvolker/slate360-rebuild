-- Market enhancements: unrealized PnL tracking, watchlist, CLOB token IDs

-- Add token_id column to market_trades (for CLOB order submission)
alter table public.market_trades
  add column if not exists token_id text,
  add column if not exists clob_order_id text;

-- Polymarket watchlist (save markets for quick access)
create table if not exists public.market_watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  market_id   text not null,
  title       text not null,
  category    text,
  yes_price   numeric,
  no_price    numeric,
  probability numeric,
  notes       text,
  created_at  timestamptz default now(),
  unique(user_id, market_id)
);

create index if not exists market_watchlist_user_idx
  on public.market_watchlist (user_id, created_at desc);

alter table public.market_watchlist enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'market_watchlist'
    and policyname = 'Users manage own watchlist'
  ) then
    create policy "Users manage own watchlist"
    on public.market_watchlist
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end
$$;

-- Market tab layout preferences (per-user tab order + visibility)
create table if not exists public.market_tab_prefs (
  user_id   uuid primary key references auth.users(id) on delete cascade,
  tabs      jsonb not null default '[]',  -- [{ id, label, visible }]
  updated_at timestamptz default now()
);

alter table public.market_tab_prefs enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'market_tab_prefs'
    and policyname = 'Users manage own tab prefs'
  ) then
    create policy "Users manage own tab prefs"
    on public.market_tab_prefs
    for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end
$$;
