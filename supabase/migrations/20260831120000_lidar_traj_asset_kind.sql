-- Add lidar_traj so native high-rate ARKit trajectory can register as its own
-- master stream (distinct from keyframe lidar_poses and the preview PLY).
-- Idempotent: drops and re-adds the unnamed/named asset_kind check constraint.

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
      'ply_lidar', 'lidar_poses', 'lidar_traj', 'lidar_scan', 'lidar_depth', 'lidar_mesh',
      'geospatial_kml', 'geospatial_gpx', 'geospatial_geojson',
      'imu_log', 'other'
    ));
end $$;
