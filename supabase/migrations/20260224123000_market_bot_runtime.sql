create table if not exists public.market_bot_runtime (
  user_id uuid primary key references auth.users(id) on delete cascade,
  status text not null default 'stopped',
  updated_at timestamptz not null default now()
);

alter table public.market_bot_runtime enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'market_bot_runtime'
      and policyname = 'Users manage own runtime'
  ) then
    create policy "Users manage own runtime"
      on public.market_bot_runtime
      for all
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;
end
$$;
