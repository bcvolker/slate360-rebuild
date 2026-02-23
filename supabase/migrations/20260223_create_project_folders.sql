-- ============================================================
-- project_folders: canonical folder structure per project.
-- Referenced by provisioning, sandbox, artifacts, audit-export,
-- file explorer, and project delete cascade.
-- ============================================================

create table if not exists public.project_folders (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  folder_path text,
  parent_id uuid not null references public.projects(id) on delete cascade,
  is_system boolean not null default false,
  folder_type text,
  is_public boolean not null default false,
  allow_upload boolean not null default true,
  org_id uuid,
  created_by uuid not null,
  created_at timestamptz not null default now()
);

alter table public.project_folders enable row level security;

-- SELECT: org members can read folders for their org's projects
drop policy if exists project_folders_select_same_org on public.project_folders;
create policy project_folders_select_same_org
on public.project_folders
for select
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_folders.parent_id
      and om.user_id = auth.uid()
  )
);

-- INSERT: org members can create folders in their org's projects
drop policy if exists project_folders_insert_same_org on public.project_folders;
create policy project_folders_insert_same_org
on public.project_folders
for insert
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_folders.parent_id
      and om.user_id = auth.uid()
  )
);

-- UPDATE: org members can update folders in their org's projects
drop policy if exists project_folders_update_same_org on public.project_folders;
create policy project_folders_update_same_org
on public.project_folders
for update
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_folders.parent_id
      and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_folders.parent_id
      and om.user_id = auth.uid()
  )
);

-- DELETE: org members can delete folders in their org's projects
drop policy if exists project_folders_delete_same_org on public.project_folders;
create policy project_folders_delete_same_org
on public.project_folders
for delete
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_folders.parent_id
      and om.user_id = auth.uid()
  )
);

-- Indexes for common query patterns
create index if not exists idx_project_folders_parent_id
  on public.project_folders(parent_id);

create index if not exists idx_project_folders_org_id
  on public.project_folders(org_id);
