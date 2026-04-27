-- Site Walk usage and margin metering.

create table if not exists public.site_walk_usage_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  session_id uuid references public.site_walk_sessions(id) on delete set null,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  quantity numeric(18, 4) not null default 1,
  unit text not null default 'count',
  source_table text,
  source_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.site_walk_usage_events
    drop constraint if exists sw_usage_events_event_type_check;
  alter table public.site_walk_usage_events
    add constraint sw_usage_events_event_type_check
    check (event_type in (
      'storage_bytes_uploaded',
      'storage_bytes_deleted',
      'ai_credits_used',
      'pdf_export',
      'spreadsheet_export',
      'portal_view',
      'presentation_view',
      'sms_sent',
      'email_sent',
      'realtime_minutes',
      'media_transcode',
      'plan_page_processed'
    ));

  alter table public.site_walk_usage_events
    drop constraint if exists sw_usage_events_unit_check;
  alter table public.site_walk_usage_events
    add constraint sw_usage_events_unit_check
    check (unit in ('count', 'bytes', 'credits', 'minutes', 'pages', 'messages'));

  alter table public.site_walk_usage_events
    drop constraint if exists sw_usage_events_quantity_check;
  alter table public.site_walk_usage_events
    add constraint sw_usage_events_quantity_check
    check (quantity >= 0);
end $$;

create index if not exists idx_sw_usage_org_created
  on public.site_walk_usage_events(org_id, created_at desc);
create index if not exists idx_sw_usage_project_created
  on public.site_walk_usage_events(project_id, created_at desc);
create index if not exists idx_sw_usage_user_created
  on public.site_walk_usage_events(user_id, created_at desc);
create index if not exists idx_sw_usage_event_created
  on public.site_walk_usage_events(event_type, created_at desc);

alter table public.site_walk_usage_events enable row level security;

drop policy if exists sw_usage_events_select on public.site_walk_usage_events;
drop policy if exists sw_usage_events_insert on public.site_walk_usage_events;
drop policy if exists sw_usage_events_update on public.site_walk_usage_events;
drop policy if exists sw_usage_events_delete on public.site_walk_usage_events;

create policy sw_usage_events_select on public.site_walk_usage_events
  for select to authenticated
  using (public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_usage_events_insert on public.site_walk_usage_events
  for insert to authenticated
  with check (public.user_can_access_org_or_project(org_id, project_id));

-- No client UPDATE/DELETE policies: usage rows are append-only.

create or replace view public.site_walk_usage_monthly as
select
  org_id,
  project_id,
  date_trunc('month', created_at)::date as month,
  event_type,
  unit,
  sum(quantity) as total_quantity,
  count(*)::bigint as event_count
from public.site_walk_usage_events
group by org_id, project_id, date_trunc('month', created_at)::date, event_type, unit;

create or replace function public.record_site_walk_usage(
  p_org_id uuid,
  p_project_id uuid,
  p_session_id uuid,
  p_event_type text,
  p_quantity numeric,
  p_unit text,
  p_source_table text default null,
  p_source_id uuid default null,
  p_metadata jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_inserted_id uuid;
begin
  if p_project_id is not null then
    if not public.user_can_access_project(p_project_id, auth.uid()) then
      raise exception 'User does not have access to project %', p_project_id
        using errcode = '42501';
    end if;
  elsif not public.user_is_org_member(p_org_id, auth.uid()) then
    raise exception 'User does not have access to organization %', p_org_id
      using errcode = '42501';
  end if;

  insert into public.site_walk_usage_events (
    org_id,
    project_id,
    session_id,
    user_id,
    event_type,
    quantity,
    unit,
    source_table,
    source_id,
    metadata
  ) values (
    p_org_id,
    p_project_id,
    p_session_id,
    auth.uid(),
    p_event_type,
    coalesce(p_quantity, 1),
    coalesce(p_unit, 'count'),
    p_source_table,
    p_source_id,
    coalesce(p_metadata, '{}'::jsonb)
  ) returning id into v_inserted_id;

  return v_inserted_id;
end;
$$;

revoke all on function public.record_site_walk_usage(uuid, uuid, uuid, text, numeric, text, text, uuid, jsonb) from public;
grant execute on function public.record_site_walk_usage(uuid, uuid, uuid, text, numeric, text, text, uuid, jsonb) to authenticated, service_role;

grant select on public.site_walk_usage_monthly to authenticated, service_role;

comment on table public.site_walk_usage_events is
  'Append-only Site Walk usage metering for storage, AI, exports, messaging, realtime, and plan processing.';
comment on view public.site_walk_usage_monthly is
  'Monthly rollup view of Site Walk usage quantities by organization, project, event type, and unit.';
