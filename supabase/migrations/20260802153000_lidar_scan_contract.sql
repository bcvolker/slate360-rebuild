-- Track L: external terrestrial LiDAR scan input and tiled point-cloud output.
-- This is additive and intentionally leaves ordinary photo captures unchanged:
-- LAS/LAZ/E57 are valid only when the upload explicitly declares lidar_scan.

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.digital_twin_capture_assets'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%asset_kind%'
  loop
    execute format(
      'alter table public.digital_twin_capture_assets drop constraint %I',
      constraint_row.conname
    );
  end loop;

  alter table public.digital_twin_capture_assets
    add constraint digital_twin_capture_assets_asset_kind_check
    check (asset_kind in (
      'photo', 'video', 'panorama_360',
      'drone_photo', 'drone_video',
      'ply_lidar', 'lidar_poses', 'lidar_scan', 'lidar_depth', 'lidar_mesh',
      'geospatial_kml', 'geospatial_gpx', 'geospatial_geojson',
      'imu_log', 'other'
    ));
end $$;

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
      'thumbnail', 'punchlist_pdf_export'
    ));
end $$;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.digital_twin_processing_jobs'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%output_format%'
  loop
    execute format(
      'alter table public.digital_twin_processing_jobs drop constraint %I',
      constraint_row.conname
    );
  end loop;

  alter table public.digital_twin_processing_jobs
    add constraint digital_twin_processing_jobs_output_format_check
    check (output_format in ('spz', 'ply', 'glb', 'lidar_potree'));
end $$;

do $$
declare
  constraint_row record;
begin
  for constraint_row in
    select conname
    from pg_constraint
    where conrelid = 'public.digital_twin_models'::regclass
      and contype = 'c'
      and pg_get_constraintdef(oid) like '%model_format%'
  loop
    execute format(
      'alter table public.digital_twin_models drop constraint %I',
      constraint_row.conname
    );
  end loop;

  alter table public.digital_twin_models
    add constraint digital_twin_models_model_format_check
    check (model_format in ('spz', 'ply', 'splat_ply', 'glb', 'usdz', 'lidar_potree'));
end $$;
