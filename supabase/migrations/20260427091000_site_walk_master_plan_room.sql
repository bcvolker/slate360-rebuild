-- Site Walk Master Plan Room.
--
-- Adds project-level plan assets before/independent of walk sessions while
-- keeping the legacy session-scoped site_walk_plans table for compatibility.

create table if not exists public.site_walk_plan_sets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  source_file_id uuid references public.slatedrop_uploads(id) on delete set null,
  source_unified_file_id uuid references public.unified_files(id) on delete set null,
  source_s3_key text,
  original_file_name text,
  mime_type text,
  file_size bigint not null default 0,
  page_count integer not null default 0,
  processing_status text not null default 'pending',
  processing_error text,
  uploaded_by uuid references auth.users(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.site_walk_plan_sets
    drop constraint if exists sw_plan_sets_processing_status_check;

  alter table public.site_walk_plan_sets
    add constraint sw_plan_sets_processing_status_check
    check (processing_status in ('pending', 'processing', 'ready', 'failed', 'archived'));
end $$;

create index if not exists idx_sw_plan_sets_project_status
  on public.site_walk_plan_sets(project_id, processing_status);
create index if not exists idx_sw_plan_sets_org
  on public.site_walk_plan_sets(org_id);
create index if not exists idx_sw_plan_sets_uploaded_by
  on public.site_walk_plan_sets(uploaded_by);

create table if not exists public.site_walk_plan_sheets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  plan_set_id uuid not null references public.site_walk_plan_sets(id) on delete cascade,
  sheet_number integer not null,
  sheet_name text,
  image_s3_key text,
  thumbnail_s3_key text,
  tile_manifest jsonb not null default '{}'::jsonb,
  width integer not null default 0,
  height integer not null default 0,
  rotation integer not null default 0,
  scale_label text,
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_sw_plan_sheets_project_sort
  on public.site_walk_plan_sheets(project_id, sort_order);
create index if not exists idx_sw_plan_sheets_plan_set
  on public.site_walk_plan_sheets(plan_set_id, sheet_number);
create unique index if not exists uniq_sw_plan_sheets_plan_set_sheet_number
  on public.site_walk_plan_sheets(plan_set_id, sheet_number);

create table if not exists public.site_walk_session_plan_sheets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  session_id uuid not null references public.site_walk_sessions(id) on delete cascade,
  plan_sheet_id uuid not null references public.site_walk_plan_sheets(id) on delete cascade,
  is_primary boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index if not exists uniq_sw_session_plan_sheets_session_sheet
  on public.site_walk_session_plan_sheets(session_id, plan_sheet_id);
create unique index if not exists uniq_sw_session_plan_sheets_primary
  on public.site_walk_session_plan_sheets(session_id)
  where is_primary = true;
create index if not exists idx_sw_session_plan_sheets_project
  on public.site_walk_session_plan_sheets(project_id);
create index if not exists idx_sw_session_plan_sheets_sheet
  on public.site_walk_session_plan_sheets(plan_sheet_id);

-- Legacy table compatibility for existing PlanViewer and session-plan flows.
alter table public.site_walk_plans
  add column if not exists plan_set_id uuid references public.site_walk_plan_sets(id) on delete set null,
  add column if not exists plan_sheet_id uuid references public.site_walk_plan_sheets(id) on delete set null,
  add column if not exists sheet_number integer,
  add column if not exists tile_manifest jsonb not null default '{}'::jsonb,
  add column if not exists thumbnail_s3_key text,
  add column if not exists processing_status text not null default 'ready';

do $$
begin
  alter table public.site_walk_plans
    drop constraint if exists sw_plans_processing_status_check;

  alter table public.site_walk_plans
    add constraint sw_plans_processing_status_check
    check (processing_status in ('pending', 'processing', 'ready', 'failed', 'archived'));
end $$;

create index if not exists idx_site_walk_plans_plan_set_id
  on public.site_walk_plans(plan_set_id)
  where plan_set_id is not null;
create index if not exists idx_site_walk_plans_plan_sheet_id
  on public.site_walk_plans(plan_sheet_id)
  where plan_sheet_id is not null;

-- Updated-at helper for new plan room tables.
create or replace function public.set_site_walk_plan_room_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sw_plan_sets_updated_at on public.site_walk_plan_sets;
create trigger trg_sw_plan_sets_updated_at
  before update on public.site_walk_plan_sets
  for each row execute function public.set_site_walk_plan_room_updated_at();

drop trigger if exists trg_sw_plan_sheets_updated_at on public.site_walk_plan_sheets;
create trigger trg_sw_plan_sheets_updated_at
  before update on public.site_walk_plan_sheets
  for each row execute function public.set_site_walk_plan_room_updated_at();

-- RLS.
alter table public.site_walk_plan_sets enable row level security;
alter table public.site_walk_plan_sheets enable row level security;
alter table public.site_walk_session_plan_sheets enable row level security;

drop policy if exists sw_plan_sets_select on public.site_walk_plan_sets;
drop policy if exists sw_plan_sets_insert on public.site_walk_plan_sets;
drop policy if exists sw_plan_sets_update on public.site_walk_plan_sets;
drop policy if exists sw_plan_sets_delete on public.site_walk_plan_sets;

create policy sw_plan_sets_select on public.site_walk_plan_sets
  for select to authenticated
  using (public.user_can_access_project(project_id));
create policy sw_plan_sets_insert on public.site_walk_plan_sets
  for insert to authenticated
  with check (public.user_can_manage_project(project_id));
create policy sw_plan_sets_update on public.site_walk_plan_sets
  for update to authenticated
  using (public.user_can_manage_project(project_id))
  with check (public.user_can_manage_project(project_id));
create policy sw_plan_sets_delete on public.site_walk_plan_sets
  for delete to authenticated
  using (public.user_can_manage_project(project_id));

drop policy if exists sw_plan_sheets_select on public.site_walk_plan_sheets;
drop policy if exists sw_plan_sheets_insert on public.site_walk_plan_sheets;
drop policy if exists sw_plan_sheets_update on public.site_walk_plan_sheets;
drop policy if exists sw_plan_sheets_delete on public.site_walk_plan_sheets;

create policy sw_plan_sheets_select on public.site_walk_plan_sheets
  for select to authenticated
  using (public.user_can_access_project(project_id));
create policy sw_plan_sheets_insert on public.site_walk_plan_sheets
  for insert to authenticated
  with check (public.user_can_manage_project(project_id));
create policy sw_plan_sheets_update on public.site_walk_plan_sheets
  for update to authenticated
  using (public.user_can_manage_project(project_id))
  with check (public.user_can_manage_project(project_id));
create policy sw_plan_sheets_delete on public.site_walk_plan_sheets
  for delete to authenticated
  using (public.user_can_manage_project(project_id));

drop policy if exists sw_session_plan_sheets_select on public.site_walk_session_plan_sheets;
drop policy if exists sw_session_plan_sheets_insert on public.site_walk_session_plan_sheets;
drop policy if exists sw_session_plan_sheets_update on public.site_walk_session_plan_sheets;
drop policy if exists sw_session_plan_sheets_delete on public.site_walk_session_plan_sheets;

create policy sw_session_plan_sheets_select on public.site_walk_session_plan_sheets
  for select to authenticated
  using (public.user_can_access_project(project_id));
create policy sw_session_plan_sheets_insert on public.site_walk_session_plan_sheets
  for insert to authenticated
  with check (created_by = auth.uid() and public.user_can_manage_project(project_id));
create policy sw_session_plan_sheets_update on public.site_walk_session_plan_sheets
  for update to authenticated
  using (public.user_can_manage_project(project_id))
  with check (public.user_can_manage_project(project_id));
create policy sw_session_plan_sheets_delete on public.site_walk_session_plan_sheets
  for delete to authenticated
  using (public.user_can_manage_project(project_id));

comment on table public.site_walk_plan_sets is
  'Project-level uploaded plan documents for the Site Walk Master Plan Room.';
comment on table public.site_walk_plan_sheets is
  'Rendered pages/sheets and tile manifests derived from Site Walk plan sets.';
comment on table public.site_walk_session_plan_sheets is
  'Selected plan sheets attached to an individual Site Walk session.';
