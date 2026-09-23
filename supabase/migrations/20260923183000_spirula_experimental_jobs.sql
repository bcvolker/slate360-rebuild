-- Internal Spirula experiment ledger. Not applied by this change.
-- Service role only: RLS is on and there are no customer policies.
-- Does not alter digital_twin_processing_jobs or published models.

create table if not exists public.spirula_experimental_jobs (
  id uuid primary key default gen_random_uuid(),
  experiment_id text not null unique,
  project_id uuid,
  capture_id text,
  status text not null default 'queued',
  trainer text not null default 'spirula',
  trainer_sha text not null,
  config jsonb not null default '{}'::jsonb,
  metrics jsonb,
  artifact_prefix text,
  modal_call_id text,
  error_text text,
  cost jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spirula_experimental_jobs_status_check check (
    status in (
      'queued',
      'preparing',
      'validating',
      'training',
      'exporting',
      'evaluating',
      'completed',
      'failed',
      'cancelled'
    )
  )
);

create index if not exists spirula_experimental_jobs_capture_idx
  on public.spirula_experimental_jobs (capture_id);

alter table public.spirula_experimental_jobs enable row level security;

revoke all on table public.spirula_experimental_jobs from anon, authenticated;
