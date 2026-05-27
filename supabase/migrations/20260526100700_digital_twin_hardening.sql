-- Digital Twin P0 hardening: storage column, soft-delete on jobs/multipart, stale recovery, realtime, R2 cleanup queue.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. organizations.org_storage_used_bytes (required by increment_org_storage)
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.organizations
  add column if not exists org_storage_used_bytes bigint not null default 0;

comment on column public.organizations.org_storage_used_bytes is
  'Metered storage bytes for org quota enforcement (increment_org_storage RPC).';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Soft-delete on processing jobs + multipart sessions
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.digital_twin_processing_jobs
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

create index if not exists idx_dt_jobs_active
  on public.digital_twin_processing_jobs(space_id, created_at desc)
  where deleted_at is null;

alter table public.digital_twin_multipart_uploads
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users(id) on delete set null;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Stale processing job recovery (> 45 minutes in processing)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.recover_stale_digital_twin_processing_jobs(
  p_stale_minutes integer default 45
)
returns integer
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_count integer;
begin
  if p_stale_minutes is null or p_stale_minutes < 1 then
    raise exception 'p_stale_minutes must be >= 1' using errcode = 'invalid_parameter_value';
  end if;

  with stale as (
    update public.digital_twin_processing_jobs j
    set status = 'failed',
        error_text = coalesce(
          j.error_text,
          format('Stale job: processing exceeded %s minutes', p_stale_minutes)
        ),
        completed_at = coalesce(j.completed_at, now()),
        updated_at = now()
    where j.deleted_at is null
      and j.status = 'processing'
      and (
        (j.started_at is not null and j.started_at < now() - make_interval(mins => p_stale_minutes))
        or (
          j.started_at is null
          and j.updated_at < now() - make_interval(mins => p_stale_minutes)
        )
      )
    returning j.capture_id
  ),
  captures as (
    update public.digital_twin_captures c
    set capture_status = 'failed',
        error_text = format('Processing timed out after %s minutes', p_stale_minutes),
        updated_at = now()
    where c.id in (select capture_id from stale where capture_id is not null)
      and c.capture_status = 'processing'
      and c.deleted_at is null
    returning c.id
  )
  select count(*)::integer into v_count from stale;

  return coalesce(v_count, 0);
end;
$$;

comment on function public.recover_stale_digital_twin_processing_jobs(integer) is
  'Marks processing jobs stuck longer than p_stale_minutes as failed; syncs capture status.';

revoke all on function public.recover_stale_digital_twin_processing_jobs(integer) from public;
grant execute on function public.recover_stale_digital_twin_processing_jobs(integer) to service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Realtime publication (spaces + models; idempotent with 100600)
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'digital_twin_spaces'
  ) then
    alter publication supabase_realtime add table public.digital_twin_spaces;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'digital_twin_models'
  ) then
    alter publication supabase_realtime add table public.digital_twin_models;
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Deferred R2 object cleanup queue (soft-delete hook target)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.digital_twin_r2_cleanup_queue (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  storage_key     text not null,
  bytes_freed     bigint not null default 0 check (bytes_freed >= 0),
  source_table    text not null,
  source_id       uuid,
  status          text not null default 'pending'
                    check (status in ('pending', 'processing', 'completed', 'failed')),
  attempts        integer not null default 0 check (attempts >= 0),
  error_text      text,
  created_at      timestamptz not null default now(),
  processed_at    timestamptz
);

create index if not exists idx_dt_r2_cleanup_pending
  on public.digital_twin_r2_cleanup_queue(status, created_at)
  where status = 'pending';

comment on table public.digital_twin_r2_cleanup_queue is
  'Deferred R2 deletes after Digital Twin soft-delete; processed by app/worker hook.';

alter table public.digital_twin_r2_cleanup_queue enable row level security;
revoke all on table public.digital_twin_r2_cleanup_queue from anon, authenticated;

create or replace function public.enqueue_digital_twin_r2_cleanup(
  p_org_id uuid,
  p_storage_key text,
  p_bytes_freed bigint default 0,
  p_source_table text default 'digital_twin_capture_assets',
  p_source_id uuid default null
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if p_storage_key is null or length(trim(p_storage_key)) = 0 then
    return null;
  end if;

  insert into public.digital_twin_r2_cleanup_queue (
    org_id, storage_key, bytes_freed, source_table, source_id
  )
  values (
    p_org_id,
    trim(p_storage_key),
    greatest(0, coalesce(p_bytes_freed, 0)),
    coalesce(nullif(trim(p_source_table), ''), 'digital_twin_capture_assets'),
    p_source_id
  )
  returning id into v_id;

  return v_id;
end;
$$;

comment on function public.enqueue_digital_twin_r2_cleanup is
  'Queues an R2 object for deferred deletion after soft-delete.';

revoke all on function public.enqueue_digital_twin_r2_cleanup(uuid, text, bigint, text, uuid) from public;
grant execute on function public.enqueue_digital_twin_r2_cleanup(uuid, text, bigint, text, uuid) to service_role;
