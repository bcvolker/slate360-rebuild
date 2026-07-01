-- Digital Twin processing jobs: add a coarse `stage` marker so the submit-status
-- UI can render a staged checklist instead of a frozen progress ring.
--
-- The Modal worker POSTs stage transitions (upload → align → train → optimize →
-- export) to /api/twin/jobs/[id]/progress as it runs; before this column, the only
-- progress signal was a single progress_pct=5 write at dispatch that never advanced.
-- Additive-only: nullable text, unconstrained values kept forward-compatible.

alter table public.digital_twin_processing_jobs
  add column if not exists stage text;

comment on column public.digital_twin_processing_jobs.stage is
  'Coarse pipeline stage reported by the GPU worker (upload|align|train|optimize|export). NULL until the worker posts its first transition; UI falls back to a time-based estimate.';
