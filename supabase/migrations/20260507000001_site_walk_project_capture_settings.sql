-- Per-project capture settings (trades, future per-project lookups).
-- Phase 6: Site Walk Q2 2026 — replaces hardcoded CAPTURE_TRADES with project-overridable list.

create table if not exists public.site_walk_project_capture_settings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  trade_options jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id),
  updated_by uuid references auth.users(id)
);

create or replace function public.set_site_walk_capture_settings_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  return new;
end;
$$;

drop trigger if exists trg_sw_capture_settings_updated_at on public.site_walk_project_capture_settings;
create trigger trg_sw_capture_settings_updated_at
  before update on public.site_walk_project_capture_settings
  for each row execute function public.set_site_walk_capture_settings_updated_at();

alter table public.site_walk_project_capture_settings enable row level security;

drop policy if exists sw_capture_settings_select on public.site_walk_project_capture_settings;
drop policy if exists sw_capture_settings_insert on public.site_walk_project_capture_settings;
drop policy if exists sw_capture_settings_update on public.site_walk_project_capture_settings;
drop policy if exists sw_capture_settings_delete on public.site_walk_project_capture_settings;

create policy sw_capture_settings_select on public.site_walk_project_capture_settings
  for select to authenticated
  using (public.user_can_access_project(project_id));

create policy sw_capture_settings_insert on public.site_walk_project_capture_settings
  for insert to authenticated
  with check (public.user_can_manage_project(project_id) and created_by = auth.uid());

create policy sw_capture_settings_update on public.site_walk_project_capture_settings
  for update to authenticated
  using (public.user_can_manage_project(project_id))
  with check (public.user_can_manage_project(project_id));

create policy sw_capture_settings_delete on public.site_walk_project_capture_settings
  for delete to authenticated
  using (public.user_can_manage_project(project_id));

comment on table public.site_walk_project_capture_settings is
  'Per-project Site Walk capture settings (currently: trade_options). Falls back to CAPTURE_TRADES when no row exists.';
