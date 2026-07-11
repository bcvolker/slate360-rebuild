-- R1 reliability pack (Thermal Studio V2, Addendum H2/G1): additive columns +
-- constraint update so jobs can be deduped, partially failed, and reconciled
-- when stuck. No destructive changes; every column has a safe default.

alter table public.thermal_processing_jobs
  add column if not exists dedupe_key text,
  add column if not exists partial boolean not null default false,
  add column if not exists failed_capture_ids uuid[] not null default '{}',
  add column if not exists failure_reason text;

-- Only one active (queued/processing) job may exist per dedupe key — lets the
-- jobs route return the existing job instead of creating a duplicate on a
-- double-click or a retried client request.
create unique index if not exists idx_thermal_jobs_dedupe_active
  on public.thermal_processing_jobs (dedupe_key)
  where dedupe_key is not null and status in ('queued', 'processing');

-- 'interpret' joins the job_type set so the AI scene-check dispatch (previously
-- fire-and-forget per src/trigger/thermal-interpret.ts) gets a real job row and
-- Realtime progress like every other job type.
alter table public.thermal_processing_jobs
  drop constraint if exists thermal_processing_jobs_job_type_check;

alter table public.thermal_processing_jobs
  add constraint thermal_processing_jobs_job_type_check
  check (job_type in (
    'extract', 'align', 'analyze', 'stitch', 'report', 'extract_analyze',
    'full_pipeline', 'interpret'
  ));

comment on column public.thermal_processing_jobs.dedupe_key is
  'sha256(org_id + session_id + job_type + sorted(capture_ids) + params) — one active job per key.';
comment on column public.thermal_processing_jobs.partial is
  'true when some but not all input_capture_ids produced a result at completion.';
comment on column public.thermal_processing_jobs.failed_capture_ids is
  'Captures from input_capture_ids that did not produce a result — drives "Retry failed".';
comment on column public.thermal_processing_jobs.failure_reason is
  'Human-readable reason set by the stuck-job reconciler or a dispatch failure.';
