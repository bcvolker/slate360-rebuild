-- Thermal Analysis foundation: sessions, captures, processing jobs, ops-only RLS.
-- Idempotent. Adapted for Slate360 public schema + slate360_staff gating.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Ops access helper (SECURITY DEFINER — matches beta_feedback staff pattern)
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.user_can_access_thermal_ops()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.slate360_staff s
    where s.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and s.revoked_at is null
  );
$$;

comment on function public.user_can_access_thermal_ops() is
  'True when authenticated user email is an active slate360_staff member (Operations Console thermal access).';

revoke all on function public.user_can_access_thermal_ops() from public;
grant execute on function public.user_can_access_thermal_ops() to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. thermal_analysis_sessions
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.thermal_analysis_sessions (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid references public.organizations(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null,
  name            text not null,
  description     text,
  status          text not null default 'draft'
                    check (status in ('draft', 'uploading', 'processing', 'complete', 'failed')),
  metadata        jsonb not null default '{}'::jsonb,
  branding_config jsonb not null default '{
    "company_name": "",
    "logo_url": "",
    "primary_color": "#0f172a",
    "show_metrics": true,
    "custom_footer": ""
  }'::jsonb,
  telemetry       jsonb not null default '{}'::jsonb,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_thermal_sessions_org
  on public.thermal_analysis_sessions(org_id, created_at desc);
create index if not exists idx_thermal_sessions_project
  on public.thermal_analysis_sessions(project_id)
  where project_id is not null;
create index if not exists idx_thermal_sessions_status
  on public.thermal_analysis_sessions(status)
  where deleted_at is null;

comment on table public.thermal_analysis_sessions is
  'Parent container for a thermal inspection flight or batch upload (ops console only).';
comment on column public.thermal_analysis_sessions.telemetry is
  'Session-level telemetry: upload counts, processing timings, viewer analytics aggregates.';
comment on column public.thermal_analysis_sessions.metadata is
  'Survey context: capture date, weather, ambient temp, drone profile hints.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. thermal_captures
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.thermal_captures (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.thermal_analysis_sessions(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete cascade,
  storage_path    text not null,
  npz_data_path   text,
  preview_path    text,
  filename        text,
  content_type    text,
  file_size_bytes bigint not null default 0 check (file_size_bytes >= 0),
  sensor_profile  jsonb not null default '{}'::jsonb,
  gps_position    jsonb not null default '{}'::jsonb,
  quality_metrics jsonb not null default '{
    "confidence_score": 0,
    "is_radiometric": false,
    "has_parallax_risk": false
  }'::jsonb,
  anomalies       jsonb not null default '[]'::jsonb,
  telemetry       jsonb not null default '{}'::jsonb,
  deleted_at      timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_thermal_captures_session
  on public.thermal_captures(session_id, created_at);
create index if not exists idx_thermal_captures_org
  on public.thermal_captures(org_id)
  where org_id is not null;

comment on table public.thermal_captures is
  'Individual radiometric frames with R2 storage paths and extracted NPZ temperature arrays.';
comment on column public.thermal_captures.gps_position is
  'GPS fix as jsonb: { lat, lng, alt, accuracy } — avoids PostGIS dependency.';
comment on column public.thermal_captures.telemetry is
  'Per-capture telemetry: extract duration, parser id, worker stage timestamps.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. thermal_processing_jobs (Trigger.dev / Modal state machine)
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.thermal_processing_jobs (
  id              uuid primary key default gen_random_uuid(),
  session_id      uuid not null references public.thermal_analysis_sessions(id) on delete cascade,
  org_id          uuid references public.organizations(id) on delete cascade,
  created_by      uuid references auth.users(id) on delete set null,
  job_type        text not null default 'full_pipeline'
                    check (job_type in (
                      'extract', 'align', 'analyze', 'stitch', 'report', 'full_pipeline'
                    )),
  status          text not null default 'queued'
                    check (status in ('queued', 'processing', 'completed', 'failed', 'canceled')),
  progress_pct    integer not null default 0 check (progress_pct between 0 and 100),
  stage           text,
  worker_id       text,
  worker_run_id   text,
  error_log       text,
  input_capture_ids uuid[] not null default '{}',
  output_storage_keys jsonb not null default '{}'::jsonb,
  quality_metrics jsonb not null default '{}'::jsonb,
  telemetry       jsonb not null default '{}'::jsonb,
  started_at      timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists idx_thermal_jobs_session
  on public.thermal_processing_jobs(session_id, created_at desc);
create index if not exists idx_thermal_jobs_status
  on public.thermal_processing_jobs(status, created_at)
  where status in ('queued', 'processing');

comment on table public.thermal_processing_jobs is
  'Async thermal processing jobs dispatched via Trigger.dev to Modal workers.';
comment on column public.thermal_processing_jobs.telemetry is
  'Job telemetry: modal run id, callback timestamps, stage durations, cost hints.';

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists trg_thermal_analysis_sessions_updated_at on public.thermal_analysis_sessions;
create trigger trg_thermal_analysis_sessions_updated_at
  before update on public.thermal_analysis_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_thermal_captures_updated_at on public.thermal_captures;
create trigger trg_thermal_captures_updated_at
  before update on public.thermal_captures
  for each row execute function public.set_updated_at();

drop trigger if exists trg_thermal_processing_jobs_updated_at on public.thermal_processing_jobs;
create trigger trg_thermal_processing_jobs_updated_at
  before update on public.thermal_processing_jobs
  for each row execute function public.set_updated_at();

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. Row level security — operations console staff only
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.thermal_analysis_sessions enable row level security;
alter table public.thermal_captures enable row level security;
alter table public.thermal_processing_jobs enable row level security;

-- Sessions
drop policy if exists thermal_sessions_ops_all on public.thermal_analysis_sessions;
create policy thermal_sessions_ops_all on public.thermal_analysis_sessions
  for all to authenticated
  using (public.user_can_access_thermal_ops())
  with check (public.user_can_access_thermal_ops());

-- Captures (via session ownership path + direct org scoping when set)
drop policy if exists thermal_captures_ops_all on public.thermal_captures;
create policy thermal_captures_ops_all on public.thermal_captures
  for all to authenticated
  using (
    public.user_can_access_thermal_ops()
    and exists (
      select 1
      from public.thermal_analysis_sessions s
      where s.id = thermal_captures.session_id
        and s.deleted_at is null
    )
  )
  with check (
    public.user_can_access_thermal_ops()
    and exists (
      select 1
      from public.thermal_analysis_sessions s
      where s.id = thermal_captures.session_id
        and s.deleted_at is null
    )
  );

-- Jobs
drop policy if exists thermal_jobs_ops_all on public.thermal_processing_jobs;
create policy thermal_jobs_ops_all on public.thermal_processing_jobs
  for all to authenticated
  using (
    public.user_can_access_thermal_ops()
    and exists (
      select 1
      from public.thermal_analysis_sessions s
      where s.id = thermal_processing_jobs.session_id
        and s.deleted_at is null
    )
  )
  with check (
    public.user_can_access_thermal_ops()
    and exists (
      select 1
      from public.thermal_analysis_sessions s
      where s.id = thermal_processing_jobs.session_id
        and s.deleted_at is null
    )
  );

-- Realtime (optional — mirror digital twin pattern)
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.thermal_processing_jobs;
  end if;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
