create table if not exists public.market_bot_runtime_state (
  user_id uuid primary key references auth.users(id) on delete cascade,
  day_bucket date not null default ((now() at time zone 'utc')::date),
  runs_today integer not null default 0,
  trades_today integer not null default 0,
  last_run_at timestamptz,
  last_scan_at timestamptz,
  last_error text,
  last_error_at timestamptz,
  updated_at timestamptz not null default now()
);

alter table public.market_bot_runtime_state enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'market_bot_runtime_state'
      and policyname = 'Users manage own runtime state'
  ) then
    create policy "Users manage own runtime state"
      on public.market_bot_runtime_state
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
