-- Site Walk offline capture, draft pins, and idempotent mutation replay.

-- Sessions: client-generated IDs and sync status.
alter table public.site_walk_sessions
  add column if not exists client_session_id text,
  add column if not exists session_type text not null default 'general',
  add column if not exists sync_state text not null default 'synced',
  add column if not exists last_synced_at timestamptz;

do $$
begin
  alter table public.site_walk_sessions
    drop constraint if exists sw_sessions_session_type_check;
  alter table public.site_walk_sessions
    add constraint sw_sessions_session_type_check
    check (session_type in ('general', 'progress', 'punch', 'inspection', 'proposal', 'safety', 'proof_of_work'));

  alter table public.site_walk_sessions
    drop constraint if exists sw_sessions_sync_state_check;
  alter table public.site_walk_sessions
    add constraint sw_sessions_sync_state_check
    check (sync_state in ('pending', 'syncing', 'synced', 'failed', 'conflict'));
end $$;

create unique index if not exists uniq_sw_sessions_client_session_id
  on public.site_walk_sessions(org_id, created_by, client_session_id)
  where client_session_id is not null;

-- Items: offline replay IDs, upload progress, vector revision history, and tags.
alter table public.site_walk_items
  add column if not exists client_item_id text,
  add column if not exists client_mutation_id text,
  add column if not exists capture_mode text not null default 'camera',
  add column if not exists sync_state text not null default 'synced',
  add column if not exists local_created_at timestamptz,
  add column if not exists local_updated_at timestamptz,
  add column if not exists device_id text,
  add column if not exists upload_state text not null default 'none',
  add column if not exists upload_progress integer not null default 0,
  add column if not exists vector_history jsonb not null default '[]'::jsonb,
  add column if not exists markup_revision integer not null default 0,
  add column if not exists tags text[] not null default '{}'::text[],
  add column if not exists trade text,
  add column if not exists category text;

do $$
begin
  alter table public.site_walk_items
    drop constraint if exists sw_items_capture_mode_check;
  alter table public.site_walk_items
    add constraint sw_items_capture_mode_check
    check (capture_mode in ('camera', 'upload', 'plan_pin', 'voice', 'text', 'mixed'));

  alter table public.site_walk_items
    drop constraint if exists sw_items_sync_state_check;
  alter table public.site_walk_items
    add constraint sw_items_sync_state_check
    check (sync_state in ('pending', 'syncing', 'synced', 'failed', 'conflict'));

  alter table public.site_walk_items
    drop constraint if exists sw_items_upload_state_check;
  alter table public.site_walk_items
    add constraint sw_items_upload_state_check
    check (upload_state in ('none', 'queued', 'uploading', 'uploaded', 'failed'));

  alter table public.site_walk_items
    drop constraint if exists sw_items_upload_progress_check;
  alter table public.site_walk_items
    add constraint sw_items_upload_progress_check
    check (upload_progress >= 0 and upload_progress <= 100);
end $$;

create unique index if not exists uniq_sw_items_client_item_id
  on public.site_walk_items(org_id, created_by, client_item_id)
  where client_item_id is not null;
create unique index if not exists uniq_sw_items_client_mutation_id
  on public.site_walk_items(org_id, created_by, client_mutation_id)
  where client_mutation_id is not null;
create index if not exists idx_sw_items_sync_state
  on public.site_walk_items(project_id, sync_state);
create index if not exists idx_sw_items_tags
  on public.site_walk_items using gin(tags);

-- Pins: draft pins can exist before an item is attached, and can target either
-- legacy session plans or project-level plan sheets.
alter table public.site_walk_pins
  alter column item_id drop not null,
  alter column plan_id drop not null;

alter table public.site_walk_pins
  add column if not exists client_pin_id text,
  add column if not exists plan_sheet_id uuid references public.site_walk_plan_sheets(id) on delete cascade,
  add column if not exists pin_status text not null default 'draft',
  add column if not exists label text,
  add column if not exists created_by uuid references auth.users(id) on delete set null;

update public.site_walk_pins p
set created_by = i.created_by
from public.site_walk_items i
where p.item_id = i.id
  and p.created_by is null;

do $$
begin
  alter table public.site_walk_pins
    drop constraint if exists sw_pins_pin_status_check;
  alter table public.site_walk_pins
    add constraint sw_pins_pin_status_check
    check (pin_status in ('draft', 'active', 'resolved', 'archived'));

  alter table public.site_walk_pins
    drop constraint if exists sw_pins_plan_reference_check;
  alter table public.site_walk_pins
    add constraint sw_pins_plan_reference_check
    check (plan_id is not null or plan_sheet_id is not null);
end $$;

create unique index if not exists uniq_sw_pins_client_pin_id
  on public.site_walk_pins(org_id, created_by, client_pin_id)
  where client_pin_id is not null;
create index if not exists idx_sw_pins_plan_sheet_id
  on public.site_walk_pins(plan_sheet_id)
  where plan_sheet_id is not null;
create index if not exists idx_sw_pins_status
  on public.site_walk_pins(project_id, pin_status);

-- Server-side idempotency ledger for replayed IndexedDB mutations.
create table if not exists public.site_walk_offline_mutations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  session_id uuid references public.site_walk_sessions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_mutation_id text not null,
  mutation_type text not null,
  target_table text,
  target_id uuid,
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'received',
  error_message text,
  created_at timestamptz not null default now(),
  applied_at timestamptz
);

do $$
begin
  alter table public.site_walk_offline_mutations
    drop constraint if exists sw_offline_mutations_mutation_type_check;
  alter table public.site_walk_offline_mutations
    add constraint sw_offline_mutations_mutation_type_check
    check (mutation_type in (
      'create_session', 'update_session',
      'create_item', 'update_item', 'delete_item',
      'create_pin', 'update_pin', 'delete_pin',
      'create_comment', 'update_assignment',
      'upload_file', 'complete_upload',
      'create_deliverable', 'update_deliverable'
    ));

  alter table public.site_walk_offline_mutations
    drop constraint if exists sw_offline_mutations_status_check;
  alter table public.site_walk_offline_mutations
    add constraint sw_offline_mutations_status_check
    check (status in ('received', 'applied', 'duplicate', 'failed', 'conflict'));
end $$;

create unique index if not exists uniq_sw_offline_mutations_user_client_id
  on public.site_walk_offline_mutations(user_id, client_mutation_id);
create index if not exists idx_sw_offline_mutations_project
  on public.site_walk_offline_mutations(project_id, created_at desc);
create index if not exists idx_sw_offline_mutations_session
  on public.site_walk_offline_mutations(session_id, created_at desc)
  where session_id is not null;
create index if not exists idx_sw_offline_mutations_status
  on public.site_walk_offline_mutations(user_id, status, created_at desc);

alter table public.site_walk_offline_mutations enable row level security;

drop policy if exists sw_offline_mutations_select on public.site_walk_offline_mutations;
drop policy if exists sw_offline_mutations_insert on public.site_walk_offline_mutations;
drop policy if exists sw_offline_mutations_update on public.site_walk_offline_mutations;
drop policy if exists sw_offline_mutations_delete on public.site_walk_offline_mutations;

create policy sw_offline_mutations_select on public.site_walk_offline_mutations
  for select to authenticated
  using (user_id = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_offline_mutations_insert on public.site_walk_offline_mutations
  for insert to authenticated
  with check (user_id = auth.uid() and public.user_can_access_org_or_project(org_id, project_id));

-- The app/API may mark a user's own mutation as applied/failed; managers can
-- resolve conflicts for a project. No client delete policy is created.
create policy sw_offline_mutations_update on public.site_walk_offline_mutations
  for update to authenticated
  using (user_id = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id))
  with check (user_id = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

comment on table public.site_walk_offline_mutations is
  'Idempotency ledger for replayed Site Walk IndexedDB mutations.';
