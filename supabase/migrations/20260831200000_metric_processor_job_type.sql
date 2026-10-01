-- Twin Metric Processor V1: posed-depth TSDF + frozen-camera appearance.
-- Additive. Re-states the current job_type allow-list and adds metric_processor.
-- Does not touch asset_kind (lidar_traj already landed in 20260831120000).

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.digital_twin_processing_jobs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%job_type%'
  loop
    execute format(
      'alter table public.digital_twin_processing_jobs drop constraint %I',
      constraint_row.conname
    );
  end loop;

  alter table public.digital_twin_processing_jobs
    add constraint digital_twin_processing_jobs_job_type_check
    check (job_type in (
      'gaussian_splat', 'photogrammetry_mesh', 'lidar_scan', 'lidar_fusion',
      'thumbnail', 'punchlist_pdf_export', 'metric_processor'
    ));
end $$;
