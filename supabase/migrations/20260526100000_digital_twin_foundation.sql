-- Digital Twin foundation: project spaces, capture sessions, mixed assets, published models.
-- Idempotent. Safe to re-run.

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. CEO-gated initial access flag on profiles
-- ─────────────────────────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from information_schema.tables
    where table_schema = 'public' and table_name = 'profiles'
  ) then
    alter table public.profiles
      add column if not exists is_digital_twin_approved boolean not null default false;
    comment on column public.profiles.is_digital_twin_approved is
      'CEO-granted access to Digital Twin before public GA. Fail-closed in app layer.';
  end if;
end $$;
-- ─────────────────────────────────────────────────────────────────────────────
-- 2. digital_twin_spaces
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.digital_twin_spaces (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  created_by          uuid not null references auth.users(id) on delete set null,
  title               text not null,
  description         text,
  status              text not null default 'draft'
                        check (status in ('draft', 'capturing', 'processing', 'ready', 'archived')),
  georef              jsonb not null default '{}'::jsonb,
  settings            jsonb not null default '{}'::jsonb,
  published_model_id  uuid,
  deleted_at          timestamptz,
  deleted_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_dt_spaces_org on public.digital_twin_spaces(org_id);
create index if not exists idx_dt_spaces_project on public.digital_twin_spaces(project_id);
create index if not exists idx_dt_spaces_status on public.digital_twin_spaces(org_id, status);
create index if not exists idx_dt_spaces_active on public.digital_twin_spaces(project_id)
  where deleted_at is null;
-- ─────────────────────────────────────────────────────────────────────────────
-- 3. digital_twin_captures
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.digital_twin_captures (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.digital_twin_spaces(id) on delete cascade,
  project_id          uuid not null references public.projects(id) on delete cascade,
  created_by          uuid not null references auth.users(id) on delete set null,
  title               text,
  device_class        text not null default 'phone'
                        check (device_class in ('phone', 'tablet', 'drone', 'desktop', 'other')),
  has_lidar           boolean not null default false,
  capture_status      text not null default 'draft'
                        check (capture_status in (
                          'draft', 'capturing', 'review', 'queued_upload',
                          'uploading', 'uploaded', 'processing', 'ready', 'failed', 'archived'
                        )),
  review_status       text not null default 'pending'
                        check (review_status in ('pending', 'approved', 'rejected')),
  upload_tier         text not null default 'standard'
                        check (upload_tier in ('preview', 'standard', 'full')),
  asset_counts        jsonb not null default '{}'::jsonb,
  capture_metadata    jsonb not null default '{}'::jsonb,
  reviewed_at         timestamptz,
  reviewed_by         uuid references auth.users(id) on delete set null,
  uploaded_at         timestamptz,
  error_text          text,
  deleted_at          timestamptz,
  deleted_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_dt_captures_space on public.digital_twin_captures(space_id, created_at desc);
create index if not exists idx_dt_captures_org_status on public.digital_twin_captures(org_id, capture_status);
create index if not exists idx_dt_captures_project on public.digital_twin_captures(project_id);
create index if not exists idx_dt_captures_active on public.digital_twin_captures(space_id)
  where deleted_at is null;
-- ─────────────────────────────────────────────────────────────────────────────
-- 4. digital_twin_capture_assets
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.digital_twin_capture_assets (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.digital_twin_spaces(id) on delete cascade,
  capture_id          uuid not null references public.digital_twin_captures(id) on delete cascade,
  unified_file_id     uuid references public.unified_files(id) on delete set null,
  asset_kind          text not null
                        check (asset_kind in (
                          'photo', 'video', 'panorama_360',
                          'drone_photo', 'drone_video',
                          'ply_lidar', 'lidar_depth', 'lidar_mesh',
                          'geospatial_kml', 'geospatial_gpx', 'geospatial_geojson',
                          'imu_log', 'other'
                        )),
  upload_tier         text not null default 'standard'
                        check (upload_tier in ('preview', 'standard', 'full')),
  storage_key         text,
  content_type        text,
  file_size_bytes     bigint not null default 0 check (file_size_bytes >= 0),
  checksum_sha256     text,
  sort_order          integer not null default 0,
  duration_secs       real,
  width               integer,
  height              integer,
  pose_metadata       jsonb not null default '{}'::jsonb,
  geospatial_metadata jsonb not null default '{}'::jsonb,
  status              text not null default 'pending'
                        check (status in ('pending', 'uploading', 'ready', 'failed', 'archived')),
  processing_progress integer not null default 0 check (processing_progress between 0 and 100),
  error_text          text,
  deleted_at          timestamptz,
  deleted_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_dt_assets_capture on public.digital_twin_capture_assets(capture_id, sort_order);
create index if not exists idx_dt_assets_unified on public.digital_twin_capture_assets(unified_file_id)
  where unified_file_id is not null;
create index if not exists idx_dt_assets_kind on public.digital_twin_capture_assets(capture_id, asset_kind);
create index if not exists idx_dt_assets_active on public.digital_twin_capture_assets(capture_id)
  where deleted_at is null;
-- ─────────────────────────────────────────────────────────────────────────────
-- 5. digital_twin_models
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.digital_twin_models (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  space_id            uuid not null references public.digital_twin_spaces(id) on delete cascade,
  capture_id          uuid references public.digital_twin_captures(id) on delete set null,
  processing_job_id   uuid,
  title               text not null,
  model_format        text not null default 'spz'
                        check (model_format in ('spz', 'ply', 'splat_ply', 'glb', 'usdz')),
  storage_key         text not null,
  preview_storage_key text,
  lidar_prior_key     text,
  file_size_bytes     bigint not null default 0,
  bounds              jsonb not null default '{}'::jsonb,
  georef              jsonb not null default '{}'::jsonb,
  quality_metrics     jsonb not null default '{}'::jsonb,
  is_primary          boolean not null default false,
  status              text not null default 'ready'
                        check (status in ('processing', 'ready', 'failed', 'archived')),
  deleted_at          timestamptz,
  deleted_by          uuid references auth.users(id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_dt_models_space on public.digital_twin_models(space_id, is_primary);
create unique index if not exists idx_dt_models_one_primary
  on public.digital_twin_models(space_id)
  where is_primary = true and deleted_at is null;
create index if not exists idx_dt_models_active on public.digital_twin_models(space_id)
  where deleted_at is null;
do $$
begin
  if not exists (
    select 1 from information_schema.table_constraints
    where constraint_name = 'digital_twin_spaces_published_model_fk'
  ) then
    alter table public.digital_twin_spaces
      add constraint digital_twin_spaces_published_model_fk
      foreign key (published_model_id) references public.digital_twin_models(id) on delete set null;
  end if;
end $$;
-- ─────────────────────────────────────────────────────────────────────────────
-- 6. updated_at triggers
-- ─────────────────────────────────────────────────────────────────────────────
drop trigger if exists trg_digital_twin_spaces_updated_at on public.digital_twin_spaces;
create trigger trg_digital_twin_spaces_updated_at
  before update on public.digital_twin_spaces
  for each row execute function public.set_updated_at();
drop trigger if exists trg_digital_twin_captures_updated_at on public.digital_twin_captures;
create trigger trg_digital_twin_captures_updated_at
  before update on public.digital_twin_captures
  for each row execute function public.set_updated_at();
drop trigger if exists trg_digital_twin_capture_assets_updated_at on public.digital_twin_capture_assets;
create trigger trg_digital_twin_capture_assets_updated_at
  before update on public.digital_twin_capture_assets
  for each row execute function public.set_updated_at();
drop trigger if exists trg_digital_twin_models_updated_at on public.digital_twin_models;
create trigger trg_digital_twin_models_updated_at
  before update on public.digital_twin_models
  for each row execute function public.set_updated_at();
-- ─────────────────────────────────────────────────────────────────────────────
-- 7. RLS
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.digital_twin_spaces enable row level security;
alter table public.digital_twin_captures enable row level security;
alter table public.digital_twin_capture_assets enable row level security;
alter table public.digital_twin_models enable row level security;
drop policy if exists dt_spaces_select on public.digital_twin_spaces;
create policy dt_spaces_select on public.digital_twin_spaces
  for select to authenticated
  using (
    deleted_at is null
    and public.user_can_access_project(project_id)
  );
drop policy if exists dt_spaces_insert on public.digital_twin_spaces;
create policy dt_spaces_insert on public.digital_twin_spaces
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.user_can_access_project(project_id)
    and public.user_is_org_member(org_id)
  );
drop policy if exists dt_spaces_update on public.digital_twin_spaces;
create policy dt_spaces_update on public.digital_twin_spaces
  for update to authenticated
  using (public.user_can_access_project(project_id))
  with check (public.user_can_access_project(project_id));
drop policy if exists dt_spaces_delete on public.digital_twin_spaces;
create policy dt_spaces_delete on public.digital_twin_spaces
  for delete to authenticated
  using (public.user_can_access_project(project_id));
drop policy if exists dt_captures_select on public.digital_twin_captures;
create policy dt_captures_select on public.digital_twin_captures
  for select to authenticated
  using (
    deleted_at is null
    and public.user_can_access_project(project_id)
  );
drop policy if exists dt_captures_insert on public.digital_twin_captures;
create policy dt_captures_insert on public.digital_twin_captures
  for insert to authenticated
  with check (
    created_by = auth.uid()
    and public.user_can_access_project(project_id)
    and public.user_is_org_member(org_id)
  );
drop policy if exists dt_captures_update on public.digital_twin_captures;
create policy dt_captures_update on public.digital_twin_captures
  for update to authenticated
  using (public.user_can_access_project(project_id))
  with check (public.user_can_access_project(project_id));
drop policy if exists dt_captures_delete on public.digital_twin_captures;
create policy dt_captures_delete on public.digital_twin_captures
  for delete to authenticated
  using (public.user_can_access_project(project_id));
drop policy if exists dt_assets_select on public.digital_twin_capture_assets;
create policy dt_assets_select on public.digital_twin_capture_assets
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.digital_twin_captures c
      where c.id = capture_id
        and c.deleted_at is null
        and public.user_can_access_project(c.project_id)
    )
  );
drop policy if exists dt_assets_insert on public.digital_twin_capture_assets;
create policy dt_assets_insert on public.digital_twin_capture_assets
  for insert to authenticated
  with check (
    exists (
      select 1 from public.digital_twin_captures c
      where c.id = capture_id
        and public.user_can_access_project(c.project_id)
        and public.user_is_org_member(org_id)
    )
  );
drop policy if exists dt_assets_update on public.digital_twin_capture_assets;
create policy dt_assets_update on public.digital_twin_capture_assets
  for update to authenticated
  using (
    exists (
      select 1 from public.digital_twin_captures c
      where c.id = capture_id and public.user_can_access_project(c.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_captures c
      where c.id = capture_id and public.user_can_access_project(c.project_id)
    )
  );
drop policy if exists dt_models_select on public.digital_twin_models;
create policy dt_models_select on public.digital_twin_models
  for select to authenticated
  using (
    deleted_at is null
    and exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id
        and s.deleted_at is null
        and public.user_can_access_project(s.project_id)
    )
  );
drop policy if exists dt_models_insert on public.digital_twin_models;
create policy dt_models_insert on public.digital_twin_models
  for insert to authenticated
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id
        and public.user_can_access_project(s.project_id)
        and public.user_is_org_member(org_id)
    )
  );
drop policy if exists dt_models_update on public.digital_twin_models;
create policy dt_models_update on public.digital_twin_models
  for update to authenticated
  using (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  );
revoke all on table public.digital_twin_spaces from anon;
revoke all on table public.digital_twin_captures from anon;
revoke all on table public.digital_twin_capture_assets from anon;
revoke all on table public.digital_twin_models from anon;
