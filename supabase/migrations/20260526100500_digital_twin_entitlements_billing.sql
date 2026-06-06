-- Digital Twin standalone entitlements, modular subscriptions, SKU enum, seats, usage metering.

alter table public.org_feature_flags
  add column if not exists standalone_digital_twin boolean not null default false;
alter table public.org_feature_flags
  add column if not exists digital_twin_seat_limit integer not null default 1;
alter table public.org_feature_flags
  add column if not exists digital_twin_seats_used integer not null default 0;
do $$
begin
  alter table public.org_feature_flags
    drop constraint if exists digital_twin_seats_valid;
  alter table public.org_feature_flags
    add constraint digital_twin_seats_valid
    check (digital_twin_seats_used >= 0 and digital_twin_seats_used <= digital_twin_seat_limit);
exception when others then null;
end $$;
alter table public.org_app_subscriptions
  add column if not exists digital_twin text not null default 'none';
do $$
begin
  alter table public.org_app_subscriptions
    drop constraint if exists org_app_subscriptions_digital_twin_check;
  alter table public.org_app_subscriptions
    add constraint org_app_subscriptions_digital_twin_check
    check (digital_twin in ('none', 'basic', 'pro'));
exception when others then null;
end $$;
do $$
begin
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'subscription_sku_kind' and e.enumlabel = 'digital_twin_std'
  ) then
    alter type public.subscription_sku_kind add value 'digital_twin_std';
  end if;
  if not exists (
    select 1 from pg_enum e
    join pg_type t on t.oid = e.enumtypid
    where t.typname = 'subscription_sku_kind' and e.enumlabel = 'digital_twin_pro'
  ) then
    alter type public.subscription_sku_kind add value 'digital_twin_pro';
  end if;
end $$;
alter table public.org_member_app_access
  drop constraint if exists org_member_app_access_app_key_check;
alter table public.org_member_app_access
  add constraint org_member_app_access_app_key_check
  check (app_key in (
    'site_walk', 'tours', 'design_studio', 'content_studio', 'digital_twin'
  ));
create or replace function public.increment_app_seat(
  p_org_id  uuid,
  p_app_id  text,
  p_delta   integer default 1
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_current_used  integer;
  v_limit         integer;
  v_new_used      integer;
  v_col_used      text;
  v_col_limit     text;
begin
  if p_app_id = 'tour_builder' then
    v_col_used  := 'tour_builder_seats_used';
    v_col_limit := 'tour_builder_seat_limit';
  elsif p_app_id = 'digital_twin' then
    v_col_used  := 'digital_twin_seats_used';
    v_col_limit := 'digital_twin_seat_limit';
  else
    raise exception 'Unknown app_id: %', p_app_id using errcode = 'invalid_parameter_value';
  end if;

  execute format(
    'select %I, %I from org_feature_flags where org_id = $1 for update',
    v_col_used, v_col_limit
  )
  into v_current_used, v_limit
  using p_org_id;

  if v_current_used is null then
    raise exception 'No feature-flag row for org %', p_org_id using errcode = 'no_data_found';
  end if;

  v_new_used := v_current_used + p_delta;

  if v_new_used < 0 then
    raise exception 'Cannot release more seats than currently used (current: %, delta: %)',
      v_current_used, p_delta using errcode = 'check_violation';
  end if;

  if v_new_used > v_limit then
    raise exception 'Seat limit exceeded (limit: %, current: %, requested delta: %)',
      v_limit, v_current_used, p_delta using errcode = 'check_violation';
  end if;

  execute format(
    'update org_feature_flags set %I = $1 where org_id = $2',
    v_col_used
  )
  using v_new_used, p_org_id;

  return v_new_used;
end;
$$;
create table if not exists public.digital_twin_usage_events (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete cascade,
  space_id        uuid references public.digital_twin_spaces(id) on delete set null,
  capture_id      uuid references public.digital_twin_captures(id) on delete set null,
  user_id         uuid references auth.users(id) on delete set null,
  event_type      text not null,
  quantity        numeric(18, 4) not null default 1 check (quantity >= 0),
  unit            text not null default 'count',
  source_table    text,
  source_id       uuid,
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);
do $$
begin
  alter table public.digital_twin_usage_events
    drop constraint if exists dt_usage_event_type_check;
  alter table public.digital_twin_usage_events
    add constraint dt_usage_event_type_check
    check (event_type in (
      'storage_bytes_uploaded',
      'storage_bytes_deleted',
      'processing_credits_used',
      'gaussian_splat_job',
      'lidar_fusion_job',
      'punchlist_pdf_export',
      'share_view',
      'share_download',
      'realtime_minutes'
    ));

  alter table public.digital_twin_usage_events
    drop constraint if exists dt_usage_unit_check;
  alter table public.digital_twin_usage_events
    add constraint dt_usage_unit_check
    check (unit in ('count', 'bytes', 'credits', 'minutes', 'jobs'));
end $$;
create index if not exists idx_dt_usage_org_created
  on public.digital_twin_usage_events(org_id, created_at desc);
create index if not exists idx_dt_usage_space_created
  on public.digital_twin_usage_events(space_id, created_at desc)
  where space_id is not null;
alter table public.digital_twin_usage_events enable row level security;
drop policy if exists dt_usage_select on public.digital_twin_usage_events;
create policy dt_usage_select on public.digital_twin_usage_events
  for select to authenticated
  using (public.user_can_manage_org_or_project(org_id, project_id));
drop policy if exists dt_usage_insert on public.digital_twin_usage_events;
create policy dt_usage_insert on public.digital_twin_usage_events
  for insert to authenticated
  with check (public.user_can_access_org_or_project(org_id, project_id));
revoke all on table public.digital_twin_usage_events from anon;
