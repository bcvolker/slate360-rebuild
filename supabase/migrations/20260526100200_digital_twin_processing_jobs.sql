-- Digital Twin cloud processing jobs (Gaussian splat w/ LiDAR depth prior, mesh, exports).

create table if not exists public.digital_twin_processing_jobs (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  space_id              uuid not null references public.digital_twin_spaces(id) on delete cascade,
  capture_id            uuid references public.digital_twin_captures(id) on delete set null,
  created_by            uuid references auth.users(id) on delete set null,
  job_type              text not null
                          check (job_type in (
                            'gaussian_splat', 'photogrammetry_mesh', 'lidar_fusion',
                            'thumbnail', 'punchlist_pdf_export'
                          )),
  status                text not null default 'queued'
                          check (status in ('queued', 'processing', 'completed', 'failed', 'canceled')),
  priority              integer not null default 100,
  attempts              integer not null default 0 check (attempts >= 0),
  max_attempts          integer not null default 3 check (max_attempts > 0),
  input_asset_ids       uuid[] not null default '{}',
  lidar_prior_asset_id  uuid references public.digital_twin_capture_assets(id) on delete set null,
  output_format         text not null default 'spz' check (output_format in ('spz', 'ply', 'glb')),
  output_storage_key    text,
  preview_storage_key   text,
  output_model_id       uuid references public.digital_twin_models(id) on delete set null,
  progress_pct          integer not null default 0 check (progress_pct between 0 and 100),
  credits_charged       integer not null default 0 check (credits_charged >= 0),
  worker_run_id         text,
  error_text            text,
  started_at            timestamptz,
  completed_at          timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists idx_dt_jobs_space on public.digital_twin_processing_jobs(space_id, created_at desc);
create index if not exists idx_dt_jobs_status on public.digital_twin_processing_jobs(status, priority, created_at)
  where status in ('queued', 'processing');
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'digital_twin_models_processing_job_fk'
  ) then
    alter table public.digital_twin_models
      add constraint digital_twin_models_processing_job_fk
      foreign key (processing_job_id) references public.digital_twin_processing_jobs(id) on delete set null;
  end if;
end $$;
drop trigger if exists trg_digital_twin_processing_jobs_updated_at on public.digital_twin_processing_jobs;
create trigger trg_digital_twin_processing_jobs_updated_at
  before update on public.digital_twin_processing_jobs
  for each row execute function public.set_updated_at();
alter table public.digital_twin_processing_jobs enable row level security;
drop policy if exists dt_jobs_select on public.digital_twin_processing_jobs;
create policy dt_jobs_select on public.digital_twin_processing_jobs
  for select to authenticated
  using (public.user_is_org_member(org_id));
drop policy if exists dt_jobs_insert on public.digital_twin_processing_jobs;
create policy dt_jobs_insert on public.digital_twin_processing_jobs
  for insert to authenticated
  with check (public.user_is_org_member(org_id));
drop policy if exists dt_jobs_update_member on public.digital_twin_processing_jobs;
create policy dt_jobs_update_member on public.digital_twin_processing_jobs
  for update to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));
create or replace function public.claim_digital_twin_processing_job(
  p_worker_id text default null
)
returns setof public.digital_twin_processing_jobs
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_job public.digital_twin_processing_jobs%rowtype;
begin
  select *
    into v_job
  from public.digital_twin_processing_jobs
  where status = 'queued'
    and attempts < max_attempts
  order by priority asc, created_at asc
  limit 1
  for update skip locked;

  if not found then
    return;
  end if;

  update public.digital_twin_processing_jobs
  set status = 'processing',
      attempts = attempts + 1,
      started_at = coalesce(started_at, now()),
      worker_run_id = coalesce(p_worker_id, worker_run_id),
      updated_at = now()
  where id = v_job.id
  returning * into v_job;

  return next v_job;
end;
$$;
comment on function public.claim_digital_twin_processing_job is
  'Atomically claims the next queued Digital Twin processing job. Safe for parallel GPU workers.';
revoke all on function public.claim_digital_twin_processing_job(text) from public;
grant execute on function public.claim_digital_twin_processing_job(text) to service_role;
revoke all on table public.digital_twin_processing_jobs from anon;
