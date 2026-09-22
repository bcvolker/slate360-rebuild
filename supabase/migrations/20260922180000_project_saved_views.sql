-- Representation-neutral saved evidence views.
-- digital_twin_viewpoints stays a twin-only schema (space, left/right cameras,
-- orbit/book/section/compare). It is not the store for Plan, 360, or Thermal.
-- A camera path remains digital_twin_models.camera_path, one blob for that model.

create table if not exists public.project_saved_views (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  representation text not null,
  source_id text not null,
  visit_id text,
  occurred_at timestamptz,
  item_id uuid,
  plan_sheet_id uuid,
  view_state jsonb not null default '{}'::jsonb,
  aspect text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_saved_views_title_check check (char_length(btrim(title)) between 1 and 120),
  constraint project_saved_views_representation_check check (
    representation in ('reality', 'geometry', '360', 'plan', 'thermal')
  ),
  constraint project_saved_views_aspect_check check (
    aspect is null or aspect in ('16:9', '9:16', '1:1')
  )
);

comment on table public.project_saved_views is
  'Project-shared evidence views. A row remembers representation, exact source, and optional visit, item, and view state. Visibility is not deletion.';

create index if not exists project_saved_views_project_created_idx
  on public.project_saved_views (project_id, created_at desc);

drop trigger if exists trg_project_saved_views_updated_at on public.project_saved_views;
create trigger trg_project_saved_views_updated_at
  before update on public.project_saved_views
  for each row execute function public.set_updated_at();

alter table public.project_saved_views enable row level security;

create policy project_saved_views_select
  on public.project_saved_views
  for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_saved_views.project_id
        and public.user_can_access_org_or_project(p.org_id, p.id)
    )
  );

create policy project_saved_views_write
  on public.project_saved_views
  for all
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_saved_views.project_id
        and public.user_can_manage_org_or_project(p.org_id, p.id)
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_saved_views.project_id
        and public.user_can_manage_org_or_project(p.org_id, p.id)
    )
  );
