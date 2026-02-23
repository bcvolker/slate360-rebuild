-- ============================================================
-- project_folders: canonical folder structure per project.
-- Referenced by provisioning, sandbox, artifacts, audit-export,
-- file explorer, and project delete cascade.
--
-- NOTE: This migration documents the EXISTING production schema.
-- The table was created directly in Supabase before migration tracking.
-- ============================================================

create table if not exists public.project_folders (
  id uuid primary key default uuid_generate_v4(),
  project_id uuid references public.projects(id),
  org_id uuid references public.organizations(id),
  folder_path text not null,
  name text not null,
  color text,
  is_public boolean default false,
  allow_upload boolean default true,
  allow_download boolean default true,
  description text,
  created_by uuid references public.profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  scope text not null default 'project',
  tab_tag text,
  folder_type text default 'general',
  icon text default 'folder',
  sort_order integer default 0,
  parent_id uuid, -- self-referencing for nested folders
  is_system boolean default false,
  metadata jsonb default '{}'::jsonb
);

alter table public.project_folders enable row level security;

-- ALL policy: org members can access their org's project folders
drop policy if exists "Org members can access project folders" on public.project_folders;
create policy "Org members can access project folders"
on public.project_folders
for all
using (
  org_id in (
    select om.org_id
    from public.organization_members om
    where om.user_id = auth.uid()
  )
);

-- Indexes for common query patterns
create index if not exists idx_project_folders_project_id
  on public.project_folders(project_id);

create index if not exists idx_project_folders_org_id
  on public.project_folders(org_id);
