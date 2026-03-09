create table if not exists public.market_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  mode text not null check (mode in ('practice', 'real')),
  budget numeric not null check (budget > 0),
  risk_level text not null check (risk_level in ('conservative', 'balanced', 'aggressive')),
  categories text[] not null default '{}',
  scan_mode text not null check (scan_mode in ('slow', 'balanced', 'fast', 'closing-soon')),
  max_trades_per_day integer not null check (max_trades_per_day > 0),
  max_daily_loss numeric not null check (max_daily_loss > 0),
  max_open_positions integer not null check (max_open_positions > 0),
  max_pct_per_trade numeric not null check (max_pct_per_trade >= 0),
  fee_alert_threshold numeric not null check (fee_alert_threshold >= 0),
  cooldown_after_loss_streak integer not null check (cooldown_after_loss_streak >= 0),
  large_trader_signals boolean not null default false,
  closing_soon_focus boolean not null default false,
  slippage numeric not null check (slippage >= 0),
  minimum_liquidity numeric not null check (minimum_liquidity >= 0),
  maximum_spread numeric not null check (maximum_spread >= 0),
  fill_policy text not null check (fill_policy in ('aggressive', 'conservative', 'limit-only')),
  exit_rules text not null check (exit_rules in ('auto', 'manual', 'trailing-stop')),
  runtime_config jsonb not null default '{}'::jsonb,
  is_default boolean not null default false,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists market_plans_user_updated_idx
  on public.market_plans (user_id, updated_at desc);

create index if not exists market_plans_user_archived_idx
  on public.market_plans (user_id, is_archived, is_default);

create unique index if not exists market_plans_one_default_per_user_idx
  on public.market_plans (user_id)
  where is_default = true and is_archived = false;

create or replace function public.set_market_plans_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_market_plans_updated_at on public.market_plans;

create trigger trg_market_plans_updated_at
before update on public.market_plans
for each row
execute function public.set_market_plans_updated_at();

alter table public.market_plans enable row level security;

drop policy if exists market_plans_select_own on public.market_plans;
create policy market_plans_select_own
  on public.market_plans
  for select
  using (auth.uid() = user_id);

drop policy if exists market_plans_insert_own on public.market_plans;
create policy market_plans_insert_own
  on public.market_plans
  for insert
  with check (auth.uid() = user_id);

drop policy if exists market_plans_update_own on public.market_plans;
create policy market_plans_update_own
  on public.market_plans
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists market_plans_delete_own on public.market_plans;
create policy market_plans_delete_own
  on public.market_plans
  for delete
  using (auth.uid() = user_id);