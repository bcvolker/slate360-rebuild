-- Audit remediation Batch 1 (docs/design/THERMAL_V2_AUDIT_REMEDIATION_LOCKED.md
-- §2): the V2 shell needs to learn about a new thermal_captures row (upload
-- finalize, or a panorama-stitch callback landing asynchronously with no
-- other client-side signal) without a manual browser refresh. Mirrors the
-- existing thermal_processing_jobs realtime-enable pattern in
-- 20260613120000_thermal_analysis_foundation.sql. Additive, idempotent.
do $$
begin
  if exists (
    select 1 from pg_publication where pubname = 'supabase_realtime'
  ) then
    alter publication supabase_realtime add table public.thermal_captures;
  end if;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
