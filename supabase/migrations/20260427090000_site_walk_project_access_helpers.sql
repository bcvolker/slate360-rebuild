-- Site Walk project access helpers and collaborator-aware RLS.
--
-- The original Site Walk policies were org-member-only. Project collaborators
-- can exist only in public.project_members, so these helpers centralize access
-- checks and avoid policy recursion by running as SECURITY DEFINER.

create extension if not exists pgcrypto;

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper functions
-- ─────────────────────────────────────────────────────────────────────────────

create or replace function public.current_user_org_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select om.org_id
  from public.organization_members om
  where om.user_id = auth.uid();
$$;

create or replace function public.user_is_org_member(
  p_org_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(p_org_id is not null and p_user_id is not null and exists (
    select 1
    from public.organization_members om
    where om.org_id = p_org_id
      and om.user_id = p_user_id
  ), false);
$$;

create or replace function public.user_project_role(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns text
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_org_id uuid;
  v_org_role text;
  v_project_role text;
begin
  if p_project_id is null or p_user_id is null then
    return null;
  end if;

  select p.org_id
    into v_org_id
  from public.projects p
  where p.id = p_project_id;

  if v_org_id is null then
    return null;
  end if;

  select lower(om.role::text)
    into v_org_role
  from public.organization_members om
  where om.org_id = v_org_id
    and om.user_id = p_user_id
  limit 1;

  if v_org_role is not null then
    return v_org_role;
  end if;

  select lower(pm.role::text)
    into v_project_role
  from public.project_members pm
  where pm.project_id = p_project_id
    and pm.user_id = p_user_id
  limit 1;

  return v_project_role;
end;
$$;

create or replace function public.user_can_access_project(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.user_project_role(p_project_id, p_user_id) is not null;
$$;

create or replace function public.user_can_manage_project(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.user_project_role(p_project_id, p_user_id) in ('owner', 'admin', 'member', 'manager');
$$;

create or replace function public.user_can_respond_to_project(
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select public.user_can_access_project(p_project_id, p_user_id);
$$;

-- Site Walk sessions can be ad-hoc in this repo, so policies need an org
-- fallback while project_id is null.
create or replace function public.user_can_access_org_or_project(
  p_org_id uuid,
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p_project_id is not null then public.user_can_access_project(p_project_id, p_user_id)
    else public.user_is_org_member(p_org_id, p_user_id)
  end;
$$;

create or replace function public.user_can_manage_org_or_project(
  p_org_id uuid,
  p_project_id uuid,
  p_user_id uuid default auth.uid()
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select case
    when p_project_id is not null then public.user_can_manage_project(p_project_id, p_user_id)
    else exists (
      select 1
      from public.organization_members om
      where om.org_id = p_org_id
        and om.user_id = p_user_id
        and lower(om.role::text) in ('owner', 'admin', 'member')
    )
  end;
$$;

revoke all on function public.current_user_org_ids() from public;
revoke all on function public.user_is_org_member(uuid, uuid) from public;
revoke all on function public.user_project_role(uuid, uuid) from public;
revoke all on function public.user_can_access_project(uuid, uuid) from public;
revoke all on function public.user_can_manage_project(uuid, uuid) from public;
revoke all on function public.user_can_respond_to_project(uuid, uuid) from public;
revoke all on function public.user_can_access_org_or_project(uuid, uuid, uuid) from public;
revoke all on function public.user_can_manage_org_or_project(uuid, uuid, uuid) from public;

grant execute on function public.current_user_org_ids() to authenticated, service_role;
grant execute on function public.user_is_org_member(uuid, uuid) to authenticated, service_role;
grant execute on function public.user_project_role(uuid, uuid) to authenticated, service_role;
grant execute on function public.user_can_access_project(uuid, uuid) to authenticated, service_role;
grant execute on function public.user_can_manage_project(uuid, uuid) to authenticated, service_role;
grant execute on function public.user_can_respond_to_project(uuid, uuid) to authenticated, service_role;
grant execute on function public.user_can_access_org_or_project(uuid, uuid, uuid) to authenticated, service_role;
grant execute on function public.user_can_manage_org_or_project(uuid, uuid, uuid) to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Project-aware columns and backfills
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.site_walk_items
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

alter table public.site_walk_comments
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

alter table public.site_walk_assignments
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

alter table public.site_walk_deliverables
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

alter table public.site_walk_plans
  add column if not exists project_id uuid references public.projects(id) on delete cascade;

alter table public.site_walk_pins
  add column if not exists project_id uuid references public.projects(id) on delete cascade,
  add column if not exists session_id uuid references public.site_walk_sessions(id) on delete cascade;

update public.site_walk_items i
set project_id = s.project_id
from public.site_walk_sessions s
where i.session_id = s.id
  and i.project_id is null
  and s.project_id is not null;

update public.site_walk_comments c
set project_id = s.project_id
from public.site_walk_sessions s
where c.session_id = s.id
  and c.project_id is null
  and s.project_id is not null;

update public.site_walk_assignments a
set project_id = s.project_id
from public.site_walk_sessions s
where a.session_id = s.id
  and a.project_id is null
  and s.project_id is not null;

update public.site_walk_deliverables d
set project_id = s.project_id
from public.site_walk_sessions s
where d.session_id = s.id
  and d.project_id is null
  and s.project_id is not null;

update public.site_walk_plans p
set project_id = s.project_id
from public.site_walk_sessions s
where p.session_id = s.id
  and p.project_id is null
  and s.project_id is not null;

update public.site_walk_pins p
set project_id = s.project_id,
    session_id = s.id
from public.site_walk_plans pl
join public.site_walk_sessions s on s.id = pl.session_id
where p.plan_id = pl.id
  and (p.project_id is null or p.session_id is null);

create index if not exists idx_site_walk_items_project_id on public.site_walk_items(project_id);
create index if not exists idx_site_walk_comments_project_id on public.site_walk_comments(project_id);
create index if not exists idx_site_walk_assignments_project_id on public.site_walk_assignments(project_id);
create index if not exists idx_site_walk_deliverables_project_id on public.site_walk_deliverables(project_id);
create index if not exists idx_site_walk_plans_project_id on public.site_walk_plans(project_id);
create index if not exists idx_site_walk_pins_project_id on public.site_walk_pins(project_id);
create index if not exists idx_site_walk_pins_session_id on public.site_walk_pins(session_id);

-- Give snapshots project context too, if that optional table is present.
do $$
begin
  if to_regclass('public.site_walk_deliverable_snapshots') is not null then
    alter table public.site_walk_deliverable_snapshots
      add column if not exists project_id uuid references public.projects(id) on delete cascade;

    update public.site_walk_deliverable_snapshots s
    set project_id = d.project_id
    from public.site_walk_deliverables d
    where s.deliverable_id = d.id
      and s.project_id is null
      and d.project_id is not null;

    create index if not exists idx_site_walk_snapshots_project_id
      on public.site_walk_deliverable_snapshots(project_id);
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- RLS replacement
-- ─────────────────────────────────────────────────────────────────────────────

do $$
declare
  r record;
begin
  for r in (
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'site_walk_sessions',
        'site_walk_items',
        'site_walk_plans',
        'site_walk_pins',
        'site_walk_comments',
        'site_walk_assignments',
        'site_walk_deliverables',
        'site_walk_templates',
        'site_walk_deliverable_snapshots'
      )
  ) loop
    execute format('drop policy if exists %I on %I.%I', r.policyname, r.schemaname, r.tablename);
  end loop;
end $$;

alter table public.site_walk_sessions enable row level security;
alter table public.site_walk_items enable row level security;
alter table public.site_walk_plans enable row level security;
alter table public.site_walk_pins enable row level security;
alter table public.site_walk_comments enable row level security;
alter table public.site_walk_assignments enable row level security;
alter table public.site_walk_deliverables enable row level security;

-- Sessions
create policy sw_sessions_select on public.site_walk_sessions
  for select to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_sessions_insert on public.site_walk_sessions
  for insert to authenticated
  with check (created_by = auth.uid() and public.user_can_access_org_or_project(org_id, project_id));

create policy sw_sessions_update on public.site_walk_sessions
  for update to authenticated
  using (created_by = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id))
  with check (created_by = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_sessions_delete on public.site_walk_sessions
  for delete to authenticated
  using (public.user_can_manage_org_or_project(org_id, project_id));

-- Items
create policy sw_items_select on public.site_walk_items
  for select to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_items_insert on public.site_walk_items
  for insert to authenticated
  with check (created_by = auth.uid() and public.user_can_access_org_or_project(org_id, project_id));

create policy sw_items_update on public.site_walk_items
  for update to authenticated
  using (created_by = auth.uid() or assigned_to = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id))
  with check (created_by = auth.uid() or assigned_to = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_items_delete on public.site_walk_items
  for delete to authenticated
  using (public.user_can_manage_org_or_project(org_id, project_id));

-- Plans
create policy sw_plans_select on public.site_walk_plans
  for select to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_plans_insert on public.site_walk_plans
  for insert to authenticated
  with check (public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_plans_update on public.site_walk_plans
  for update to authenticated
  using (public.user_can_manage_org_or_project(org_id, project_id))
  with check (public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_plans_delete on public.site_walk_plans
  for delete to authenticated
  using (public.user_can_manage_org_or_project(org_id, project_id));

-- Pins
create policy sw_pins_select on public.site_walk_pins
  for select to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_pins_insert on public.site_walk_pins
  for insert to authenticated
  with check (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_pins_update on public.site_walk_pins
  for update to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id))
  with check (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_pins_delete on public.site_walk_pins
  for delete to authenticated
  using (public.user_can_manage_org_or_project(org_id, project_id));

-- Comments
create policy sw_comments_select on public.site_walk_comments
  for select to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_comments_insert on public.site_walk_comments
  for insert to authenticated
  with check (author_id = auth.uid() and public.user_can_access_org_or_project(org_id, project_id));

create policy sw_comments_update on public.site_walk_comments
  for update to authenticated
  using (author_id = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id))
  with check (author_id = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_comments_delete on public.site_walk_comments
  for delete to authenticated
  using (author_id = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

-- Assignments
create policy sw_assignments_select on public.site_walk_assignments
  for select to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_assignments_insert on public.site_walk_assignments
  for insert to authenticated
  with check (assigned_by = auth.uid() and public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_assignments_update on public.site_walk_assignments
  for update to authenticated
  using (assigned_to = auth.uid() or assigned_by = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id))
  with check (assigned_to = auth.uid() or assigned_by = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_assignments_delete on public.site_walk_assignments
  for delete to authenticated
  using (public.user_can_manage_org_or_project(org_id, project_id));

-- Deliverables
create policy sw_deliverables_select on public.site_walk_deliverables
  for select to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_deliverables_insert on public.site_walk_deliverables
  for insert to authenticated
  with check (created_by = auth.uid() and public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_deliverables_update on public.site_walk_deliverables
  for update to authenticated
  using (created_by = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id))
  with check (created_by = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_deliverables_delete on public.site_walk_deliverables
  for delete to authenticated
  using (public.user_can_manage_org_or_project(org_id, project_id));

-- Optional legacy tables.
do $$
begin
  if to_regclass('public.site_walk_templates') is not null then
    alter table public.site_walk_templates enable row level security;

    create policy sw_templates_select on public.site_walk_templates
      for select to authenticated
      using (public.user_is_org_member(org_id));

    create policy sw_templates_insert on public.site_walk_templates
      for insert to authenticated
      with check (created_by = auth.uid() and public.user_is_org_member(org_id));

    create policy sw_templates_update on public.site_walk_templates
      for update to authenticated
      using (created_by = auth.uid() or public.user_is_org_member(org_id))
      with check (created_by = auth.uid() or public.user_is_org_member(org_id));

    create policy sw_templates_delete on public.site_walk_templates
      for delete to authenticated
      using (created_by = auth.uid() or public.user_is_org_member(org_id));
  end if;

  if to_regclass('public.site_walk_deliverable_snapshots') is not null then
    alter table public.site_walk_deliverable_snapshots enable row level security;

    create policy sw_snapshots_select on public.site_walk_deliverable_snapshots
      for select to authenticated
      using (public.user_can_access_org_or_project(org_id, project_id));

    create policy sw_snapshots_insert on public.site_walk_deliverable_snapshots
      for insert to authenticated
      with check (created_by = auth.uid() and public.user_can_manage_org_or_project(org_id, project_id));
  end if;
end $$;

comment on function public.user_can_access_project(uuid, uuid) is
  'True when the user is either an organization member for the project org or a project-scoped collaborator in project_members.';

comment on function public.user_can_manage_project(uuid, uuid) is
  'True for org owner/admin/member roles or project owner/admin/manager roles.';
