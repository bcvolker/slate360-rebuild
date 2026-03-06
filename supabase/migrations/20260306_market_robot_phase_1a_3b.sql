-- Market Robot phased hardening (1A–3B safe rollout)

-- Directive-level risk and automation controls
alter table public.market_directives
  add column if not exists daily_loss_cap numeric not null default 40,
  add column if not exists moonshot_mode boolean not null default false,
  add column if not exists total_loss_cap numeric not null default 200,
  add column if not exists auto_pause_losing_days integer not null default 3,
  add column if not exists target_profit_monthly numeric,
  add column if not exists take_profit_pct numeric not null default 20,
  add column if not exists stop_loss_pct numeric not null default 10;

-- Trade-level exit controls and annotations
alter table public.market_trades
  add column if not exists take_profit_pct numeric,
  add column if not exists stop_loss_pct numeric,
  add column if not exists entry_mode text;

create index if not exists market_trades_user_status_idx
  on public.market_trades (user_id, status, created_at desc);

-- Activity log for plain-English bot actions
create table if not exists public.market_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  level text not null default 'info',
  message text not null,
  context jsonb,
  created_at timestamptz not null default now()
);

create index if not exists market_activity_log_user_created_idx
  on public.market_activity_log (user_id, created_at desc);

alter table public.market_activity_log enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'market_activity_log'
      and policyname = 'Users manage own market activity log'
  ) then
    create policy "Users manage own market activity log"
      on public.market_activity_log
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;

-- Scheduler global lock to avoid overlapping cron ticks
create table if not exists public.market_scheduler_lock (
  lock_key text primary key,
  locked_until timestamptz not null default 'epoch'::timestamptz,
  locked_by text,
  updated_at timestamptz not null default now()
);

insert into public.market_scheduler_lock (lock_key, locked_until, locked_by)
values ('global', 'epoch'::timestamptz, null)
on conflict (lock_key) do nothing;
