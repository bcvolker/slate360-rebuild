-- Per-app access grants for org members. Lets an org admin pick which
-- members get into which workspace apps (Site Walk, Tours, Design Studio,
-- Content Studio). Subscription/seat purchase still gates the org-level
-- entitlement; this table simply assigns purchased seats to specific people.

create table if not exists public.org_member_app_access (
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  app_key text not null
    check (app_key in ('site_walk', 'tours', 'design_studio', 'content_studio')),
  granted_by uuid references auth.users(id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (org_id, user_id, app_key)
);

create index if not exists idx_omaa_user on public.org_member_app_access(user_id);
create index if not exists idx_omaa_org_app on public.org_member_app_access(org_id, app_key);

alter table public.org_member_app_access enable row level security;

drop policy if exists omaa_select_same_org on public.org_member_app_access;
create policy omaa_select_same_org
on public.org_member_app_access
for select
to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.organization_members om
    where om.org_id = org_member_app_access.org_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists omaa_admin_write on public.org_member_app_access;
create policy omaa_admin_write
on public.org_member_app_access
for all
to authenticated
using (
  exists (
    select 1
    from public.organization_members om
    where om.org_id = org_member_app_access.org_id
      and om.user_id = auth.uid()
      and coalesce(lower(om.role), '') in ('owner', 'admin')
  )
)
with check (
  exists (
    select 1
    from public.organization_members om
    where om.org_id = org_member_app_access.org_id
      and om.user_id = auth.uid()
      and coalesce(lower(om.role), '') in ('owner', 'admin')
  )
);

revoke all on table public.org_member_app_access from anon;

comment on table public.org_member_app_access is
  'Org-admin assignment of purchased app seats to specific members.';
