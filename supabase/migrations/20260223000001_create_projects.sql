create extension if not exists pgcrypto;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  name text not null,
  description text,
  status text not null default 'active',
  created_by uuid not null,
  created_at timestamptz not null default now()
);

create table if not exists public.project_members (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null,
  role text not null,
  primary key (project_id, user_id)
);

alter table public.projects enable row level security;
alter table public.project_members enable row level security;

-- Projects RLS: users can access projects in orgs where they are members.
drop policy if exists projects_select_same_org on public.projects;
create policy projects_select_same_org
on public.projects
for select
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.org_id = projects.org_id
  )
);

drop policy if exists projects_insert_same_org on public.projects;
create policy projects_insert_same_org
on public.projects
for insert
with check (
  created_by = auth.uid()
  and exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.org_id = projects.org_id
  )
);

drop policy if exists projects_update_same_org on public.projects;
create policy projects_update_same_org
on public.projects
for update
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.org_id = projects.org_id
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.org_id = projects.org_id
  )
);

drop policy if exists projects_delete_same_org on public.projects;
create policy projects_delete_same_org
on public.projects
for delete
using (
  exists (
    select 1
    from public.organization_members om
    where om.user_id = auth.uid()
      and om.org_id = projects.org_id
  )
);

-- Project members RLS: users can access membership rows for projects in their org.
drop policy if exists project_members_select_same_org on public.project_members;
create policy project_members_select_same_org
on public.project_members
for select
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
    where p.id = project_members.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_members_insert_same_org on public.project_members;
create policy project_members_insert_same_org
on public.project_members
for insert
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
    where p.id = project_members.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_members_update_same_org on public.project_members;
create policy project_members_update_same_org
on public.project_members
for update
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
    where p.id = project_members.project_id
      and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
    where p.id = project_members.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_members_delete_same_org on public.project_members;
create policy project_members_delete_same_org
on public.project_members
for delete
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
    where p.id = project_members.project_id
      and om.user_id = auth.uid()
  )
);
