-- Project collaborator invites — outside contributors (electrician, plumber,
-- HVAC, etc.) invited by a subscribing project owner. Tracks the delivery
-- channel so we can display "email · sms" status badges and resend over the
-- right channel.
--
-- Wraps invitation_tokens (which carries the redeemable token + expiry).
-- After redemption, lib/server/invites.ts inserts the user into
-- project_members with role='collaborator' and updates the corresponding
-- row here to status='accepted'.

create table if not exists public.project_collaborator_invites (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,
  email text,
  phone text,
  role text not null default 'collaborator'
    check (role in ('collaborator', 'viewer')),
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'revoked', 'expired')),
  channel text not null
    check (channel in ('email', 'sms', 'both', 'link')),
  invitation_token uuid references public.invitation_tokens(token) on delete set null,
  message text,
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  revoked_at timestamptz,
  last_sent_at timestamptz,
  send_count integer not null default 1 check (send_count >= 0),
  constraint project_collaborator_invites_email_or_phone_required
    check (email is not null or phone is not null or channel = 'link')
);

create index if not exists idx_pci_project on public.project_collaborator_invites(project_id);
create index if not exists idx_pci_invited_by on public.project_collaborator_invites(invited_by);
create index if not exists idx_pci_status on public.project_collaborator_invites(status);
create index if not exists idx_pci_token on public.project_collaborator_invites(invitation_token);

-- Only one pending invite per (project, email) — prevents accidental dupes.
create unique index if not exists uniq_pci_pending_email
  on public.project_collaborator_invites (project_id, lower(email))
  where email is not null and status = 'pending';

-- Only one pending invite per (project, phone) — same reason.
create unique index if not exists uniq_pci_pending_phone
  on public.project_collaborator_invites (project_id, phone)
  where phone is not null and status = 'pending';

alter table public.project_collaborator_invites enable row level security;

-- SELECT: anyone in the project's org can see the invite list (so the People
-- tab works for the whole project team), and the inviter can always see it.
drop policy if exists pci_select_same_org on public.project_collaborator_invites;
create policy pci_select_same_org
on public.project_collaborator_invites
for select
to authenticated
using (
  invited_by = auth.uid()
  or exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_collaborator_invites.project_id
      and om.user_id = auth.uid()
  )
);

-- INSERT: only org members on the project's org can create invites, and the
-- invited_by column must be the caller. Seat-limit enforcement is done in
-- the API layer (assertCanInviteCollaborator) — RLS only protects the table.
drop policy if exists pci_insert_same_org on public.project_collaborator_invites;
create policy pci_insert_same_org
on public.project_collaborator_invites
for insert
to authenticated
with check (
  invited_by = auth.uid()
  and exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_collaborator_invites.project_id
      and om.user_id = auth.uid()
      and coalesce(lower(om.role), '') in ('owner', 'admin', 'member')
  )
);

-- UPDATE: same scope as SELECT (resend / revoke / accept).
drop policy if exists pci_update_same_org on public.project_collaborator_invites;
create policy pci_update_same_org
on public.project_collaborator_invites
for update
to authenticated
using (
  invited_by = auth.uid()
  or exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_collaborator_invites.project_id
      and om.user_id = auth.uid()
      and coalesce(lower(om.role), '') in ('owner', 'admin')
  )
)
with check (
  invited_by = auth.uid()
  or exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_collaborator_invites.project_id
      and om.user_id = auth.uid()
      and coalesce(lower(om.role), '') in ('owner', 'admin')
  )
);

revoke all on table public.project_collaborator_invites from anon;

comment on table public.project_collaborator_invites is
  'Project-scoped invites for outside contributors. See slate360-context/ORG_ROLES_AND_PERMISSIONS.md for the full design.';
