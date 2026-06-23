-- Add lidar_poses to the digital_twin_capture_assets asset_kind enum.
-- Idempotent: drops and re-adds the unnamed check constraint.

do $$
declare
  v_constraint text;
begin
  -- Find the auto-generated check constraint name for asset_kind.
  select conname into v_constraint
  from pg_constraint
  where conrelid = 'public.digital_twin_capture_assets'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) like '%asset_kind%'
  limit 1;

  if v_constraint is not null then
    execute format('alter table public.digital_twin_capture_assets drop constraint %I', v_constraint);
  end if;
end $$;

alter table public.digital_twin_capture_assets
  add constraint digital_twin_capture_assets_asset_kind_check
  check (asset_kind in (
    'photo', 'video', 'panorama_360',
    'drone_photo', 'drone_video',
    'ply_lidar', 'lidar_depth', 'lidar_mesh', 'lidar_poses',
    'geospatial_kml', 'geospatial_gpx', 'geospatial_geojson',
    'imu_log', 'other'
  ));
