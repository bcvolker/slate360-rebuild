-- Thermal processing jobs: allow the 'extract_analyze' job type.
--
-- The Process panel (components/ops/thermal/ThermalProcessPanel.tsx) emits
-- job_type = 'extract_analyze' for its DEFAULT selection (Decode temperatures +
-- Find problems, no report). The original foundation migration
-- (20260613120000_thermal_analysis_foundation.sql) only allowed
-- extract / align / analyze / stitch / report / full_pipeline, so the default
-- "Start processing" click failed the CHECK constraint and silently created no
-- job. This adds the missing value to bring the DB in line with the API
-- (app/api/ops/thermal/jobs/route.ts ALLOWED_JOB_TYPES).

alter table public.thermal_processing_jobs
  drop constraint if exists thermal_processing_jobs_job_type_check;

alter table public.thermal_processing_jobs
  add constraint thermal_processing_jobs_job_type_check
  check (job_type in (
    'extract', 'align', 'analyze', 'stitch', 'report', 'extract_analyze', 'full_pipeline'
  ));
