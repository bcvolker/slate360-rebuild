-- Site Walk audit log, read receipts, status triggers, and realtime coverage.

create table if not exists public.site_walk_activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  session_id uuid references public.site_walk_sessions(id) on delete cascade,
  item_id uuid references public.site_walk_items(id) on delete set null,
  deliverable_id uuid references public.site_walk_deliverables(id) on delete set null,
  assignment_id uuid references public.site_walk_assignments(id) on delete set null,
  comment_id uuid references public.site_walk_comments(id) on delete set null,
  actor_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  before_state jsonb,
  after_state jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.site_walk_activity_log
    drop constraint if exists sw_activity_log_event_type_check;
  alter table public.site_walk_activity_log
    add constraint sw_activity_log_event_type_check
    check (event_type in (
      'session_created', 'session_started', 'session_completed',
      'item_created', 'item_updated', 'item_status_changed', 'item_assigned', 'item_resolved', 'item_verified',
      'pin_created', 'pin_moved', 'comment_created', 'comment_read',
      'assignment_created', 'assignment_acknowledged', 'assignment_completed',
      'deliverable_created', 'deliverable_published', 'deliverable_shared', 'deliverable_viewed',
      'portal_comment_created', 'file_uploaded', 'file_attached', 'share_revoked',
      'sync_conflict', 'offline_mutation_applied'
    ));
end $$;

create index if not exists idx_sw_activity_project_created
  on public.site_walk_activity_log(project_id, created_at desc);
create index if not exists idx_sw_activity_session_created
  on public.site_walk_activity_log(session_id, created_at desc);
create index if not exists idx_sw_activity_item_created
  on public.site_walk_activity_log(item_id, created_at desc)
  where item_id is not null;
create index if not exists idx_sw_activity_deliverable_created
  on public.site_walk_activity_log(deliverable_id, created_at desc)
  where deliverable_id is not null;
create index if not exists idx_sw_activity_actor_created
  on public.site_walk_activity_log(actor_id, created_at desc)
  where actor_id is not null;
create index if not exists idx_sw_activity_event_created
  on public.site_walk_activity_log(event_type, created_at desc);

alter table public.site_walk_activity_log enable row level security;

drop policy if exists sw_activity_log_select on public.site_walk_activity_log;
drop policy if exists sw_activity_log_insert on public.site_walk_activity_log;
drop policy if exists sw_activity_log_update on public.site_walk_activity_log;
drop policy if exists sw_activity_log_delete on public.site_walk_activity_log;

create policy sw_activity_log_select on public.site_walk_activity_log
  for select to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_activity_log_insert on public.site_walk_activity_log
  for insert to authenticated
  with check (public.user_can_access_org_or_project(org_id, project_id));

-- No UPDATE/DELETE client policies: activity rows are append-only from the app.

create table if not exists public.site_walk_read_receipts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  subject_type text not null,
  subject_id uuid not null,
  user_id uuid references auth.users(id) on delete cascade,
  external_recipient text,
  read_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

do $$
begin
  alter table public.site_walk_read_receipts
    drop constraint if exists sw_read_receipts_subject_type_check;
  alter table public.site_walk_read_receipts
    add constraint sw_read_receipts_subject_type_check
    check (subject_type in ('comment', 'assignment', 'deliverable', 'portal', 'thread', 'item'));

  alter table public.site_walk_read_receipts
    drop constraint if exists sw_read_receipts_recipient_check;
  alter table public.site_walk_read_receipts
    add constraint sw_read_receipts_recipient_check
    check (user_id is not null or external_recipient is not null);
end $$;

create unique index if not exists uniq_sw_read_receipts_user
  on public.site_walk_read_receipts(subject_type, subject_id, user_id)
  where user_id is not null;
create unique index if not exists uniq_sw_read_receipts_external
  on public.site_walk_read_receipts(subject_type, subject_id, external_recipient)
  where external_recipient is not null;
create index if not exists idx_sw_read_receipts_project
  on public.site_walk_read_receipts(project_id, read_at desc);

alter table public.site_walk_read_receipts enable row level security;

drop policy if exists sw_read_receipts_select on public.site_walk_read_receipts;
drop policy if exists sw_read_receipts_insert on public.site_walk_read_receipts;
drop policy if exists sw_read_receipts_update on public.site_walk_read_receipts;
drop policy if exists sw_read_receipts_delete on public.site_walk_read_receipts;

create policy sw_read_receipts_select on public.site_walk_read_receipts
  for select to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_read_receipts_insert on public.site_walk_read_receipts
  for insert to authenticated
  with check (
    (user_id = auth.uid() and public.user_can_access_org_or_project(org_id, project_id))
    or public.user_can_manage_org_or_project(org_id, project_id)
  );

create policy sw_read_receipts_update on public.site_walk_read_receipts
  for update to authenticated
  using (user_id = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id))
  with check (user_id = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

-- Trigger helpers. They are intentionally narrow: only status transitions are
-- auto-logged here; richer event logging can be done by API routes.
create or replace function public.trg_site_walk_item_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.item_status is distinct from old.item_status then
    insert into public.site_walk_activity_log (
      org_id,
      project_id,
      session_id,
      item_id,
      actor_id,
      event_type,
      before_state,
      after_state
    ) values (
      new.org_id,
      new.project_id,
      new.session_id,
      new.id,
      auth.uid(),
      'item_status_changed',
      jsonb_build_object('item_status', old.item_status),
      jsonb_build_object('item_status', new.item_status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sw_item_status_changed on public.site_walk_items;
create trigger sw_item_status_changed
  after update on public.site_walk_items
  for each row execute function public.trg_site_walk_item_status_changed();

create or replace function public.trg_site_walk_assignment_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text;
begin
  if new.status is distinct from old.status then
    v_event_type := case
      when new.status = 'acknowledged' then 'assignment_acknowledged'
      when new.status = 'done' then 'assignment_completed'
      else 'assignment_created'
    end;

    insert into public.site_walk_activity_log (
      org_id,
      project_id,
      session_id,
      assignment_id,
      actor_id,
      event_type,
      before_state,
      after_state
    ) values (
      new.org_id,
      new.project_id,
      new.session_id,
      new.id,
      auth.uid(),
      v_event_type,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sw_assignment_status_changed on public.site_walk_assignments;
create trigger sw_assignment_status_changed
  after update on public.site_walk_assignments
  for each row execute function public.trg_site_walk_assignment_status_changed();

create or replace function public.trg_site_walk_deliverable_status_changed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_type text;
begin
  if new.status is distinct from old.status then
    v_event_type := case
      when new.status = 'published' then 'deliverable_published'
      when new.status = 'shared' then 'deliverable_shared'
      when new.status = 'revoked' then 'share_revoked'
      else 'deliverable_created'
    end;

    insert into public.site_walk_activity_log (
      org_id,
      project_id,
      session_id,
      deliverable_id,
      actor_id,
      event_type,
      before_state,
      after_state
    ) values (
      new.org_id,
      new.project_id,
      new.session_id,
      new.id,
      auth.uid(),
      v_event_type,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status)
    );
  end if;

  return new;
end;
$$;

drop trigger if exists sw_deliverable_status_changed on public.site_walk_deliverables;
create trigger sw_deliverable_status_changed
  after update on public.site_walk_deliverables
  for each row execute function public.trg_site_walk_deliverable_status_changed();

-- Realtime publication. Supabase creates supabase_realtime in hosted projects;
-- local/test databases may not have it, so this block is duplicate-safe and
-- missing-publication-safe.
do $$
declare
  v_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array array[
      'site_walk_sessions',
      'site_walk_items',
      'site_walk_pins',
      'site_walk_comments',
      'site_walk_assignments',
      'site_walk_deliverables',
      'site_walk_deliverable_blocks',
      'site_walk_activity_log',
      'site_walk_offline_mutations',
      'site_walk_session_plan_sheets',
      'site_walk_plan_sheets'
    ] loop
      if to_regclass('public.' || v_table) is not null then
        begin
          execute format('alter publication supabase_realtime add table public.%I', v_table);
        exception when duplicate_object then
          null;
        end;
      end if;
    end loop;
  end if;

  foreach v_table in array array[
    'site_walk_sessions',
    'site_walk_items',
    'site_walk_pins',
    'site_walk_comments',
    'site_walk_assignments',
    'site_walk_deliverables',
    'site_walk_deliverable_blocks',
    'site_walk_activity_log',
    'site_walk_offline_mutations',
    'site_walk_session_plan_sheets'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('alter table public.%I replica identity full', v_table);
    end if;
  end loop;
end $$;

comment on table public.site_walk_activity_log is
  'Append-only Site Walk event ledger for status changes, deliverable activity, portal activity, and sync conflicts.';
comment on table public.site_walk_read_receipts is
  'Generic read receipts for Site Walk comments, assignments, deliverables, portals, threads, and items.';
