alter table public.digital_twin_models
  add column if not exists floorplan_storage_key text;
