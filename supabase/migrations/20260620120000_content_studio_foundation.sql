-- Content Studio (internal CEO tool) — cloud-rendered video / 360 / photo editor.
-- Mirrors design_generation_jobs conventions (status enum, progress_pct, stage,
-- worker_run_id, error_text, started_at/completed_at, set_updated_at trigger,
-- realtime publication, org-member RLS, anon lockout).
-- Does NOT touch the legacy (apps)/content-studio media_assets / media_collections.
-- Authoritative plan: docs/design/CONTENT_STUDIO_BUILD_PLAN.md

-- ── 1. Edit projects (one editable timeline) ─────────────────
-- timeline_json = SlateContentEditSpec (the render contract).
-- ui_state_json = dockview layout + chrome (NEVER sent to a worker).
create table if not exists public.content_edit_projects (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  project_id      uuid references public.projects(id) on delete set null,
  created_by      uuid references auth.users(id) on delete set null,
  title           text not null default 'Untitled edit',
  mode            text not null default 'video'
                    check (mode in ('video', '360', 'photo')),
  status          text not null default 'draft'
                    check (status in ('draft', 'rendering', 'ready', 'archived')),
  timeline_json   jsonb not null default '{}'::jsonb,   -- SlateContentEditSpec
  ui_state_json   jsonb not null default '{}'::jsonb,   -- { layout, inspectorTab, mode, chrome }
  spec_version    integer not null default 1,
  last_render_job_id uuid,
  last_rendered_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_content_edit_projects_org on public.content_edit_projects(org_id, updated_at desc);
create index if not exists idx_content_edit_projects_project on public.content_edit_projects(project_id);

-- ── 2. Render / ingest / enhance / multicam jobs (Trigger → Modal) ─
create table if not exists public.content_render_jobs (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  edit_project_id     uuid references public.content_edit_projects(id) on delete cascade,
  created_by          uuid references auth.users(id) on delete set null,
  job_type            text not null default 'render'
                        check (job_type in ('ingest','render','enhance','multicam_sync','caption','preview_snapshot')),
  status              text not null default 'queued'
                        check (status in ('queued','processing','completed','failed','cancelled')),
  progress_pct        integer not null default 0 check (progress_pct between 0 and 100),
  stage               text,
  -- Frozen spec snapshot pointer (R2) + content hash — NOT the live inline spec.
  spec_snapshot_key   text,
  content_hash        text,
  idempotency_key     text,
  input_payload       jsonb not null default '{}'::jsonb,
  output_storage_key  text,
  outputs             jsonb,                              -- [{ kind, storageKey, ... }]
  estimated_credits   numeric(10,4) not null default 0,
  actual_credits      numeric(10,4) not null default 0,
  worker_run_id       text,
  error_text          text,
  started_at          timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_content_jobs_project on public.content_render_jobs(edit_project_id, created_at desc);
create index if not exists idx_content_jobs_active on public.content_render_jobs(status, created_at)
  where status in ('queued','processing');
create unique index if not exists uq_content_jobs_idem on public.content_render_jobs(idempotency_key)
  where idempotency_key is not null;

-- ── 3. Enhancement jobs (separate GPU lane — derivative assets) ─
create table if not exists public.content_enhancement_jobs (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  edit_project_id     uuid references public.content_edit_projects(id) on delete set null,
  source_asset_id     uuid,                               -- references media_assets(id) (loose; no hard FK)
  created_by          uuid references auth.users(id) on delete set null,
  status              text not null default 'queued'
                        check (status in ('queued','processing','completed','failed','cancelled')),
  progress_pct        integer not null default 0 check (progress_pct between 0 and 100),
  stage               text,
  enhance_spec_json   jsonb not null default '{}'::jsonb, -- SlateEnhancementSpec
  content_hash        text,
  output_storage_key  text,
  estimated_credits   numeric(10,4) not null default 0,
  actual_credits      numeric(10,4) not null default 0,
  worker_run_id       text,
  error_text          text,
  started_at          timestamptz,
  completed_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index if not exists idx_content_enhance_project on public.content_enhancement_jobs(edit_project_id, created_at desc);
create index if not exists idx_content_enhance_active on public.content_enhancement_jobs(status, created_at)
  where status in ('queued','processing');

-- ── 4. Reusable Asset Library (org-level — persists across all projects) ─
create table if not exists public.content_library_assets (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  created_by      uuid references auth.users(id) on delete set null,
  asset_type      text not null
                    check (asset_type in ('transition','music','sfx','title_template','logo','look','preset')),
  name            text not null,
  storage_key     text,                                   -- R2 key for media-backed items
  thumbnail_key   text,                                   -- swatch / preview thumb
  metadata        jsonb not null default '{}'::jsonb,     -- duration, category, tags, etc.
  look_json       jsonb,                                  -- ColorLook payload (when asset_type='look')
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_content_library_org on public.content_library_assets(org_id, asset_type, created_at desc);

-- ── 5. updated_at triggers ───────────────────────────────────
drop trigger if exists trg_content_edit_projects_updated_at on public.content_edit_projects;
create trigger trg_content_edit_projects_updated_at
  before update on public.content_edit_projects
  for each row execute function public.set_updated_at();

drop trigger if exists trg_content_render_jobs_updated_at on public.content_render_jobs;
create trigger trg_content_render_jobs_updated_at
  before update on public.content_render_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists trg_content_enhancement_jobs_updated_at on public.content_enhancement_jobs;
create trigger trg_content_enhancement_jobs_updated_at
  before update on public.content_enhancement_jobs
  for each row execute function public.set_updated_at();

drop trigger if exists trg_content_library_assets_updated_at on public.content_library_assets;
create trigger trg_content_library_assets_updated_at
  before update on public.content_library_assets
  for each row execute function public.set_updated_at();

-- ── 6. Realtime (status chip + queue drawer subscribe to job tables) ─
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'content_render_jobs'
  ) then
    alter publication supabase_realtime add table public.content_render_jobs;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'content_enhancement_jobs'
  ) then
    alter publication supabase_realtime add table public.content_enhancement_jobs;
  end if;
end $$;

-- ── 7. RLS — org-member scoped (CEO is an org member) ─────────
alter table public.content_edit_projects enable row level security;
alter table public.content_render_jobs enable row level security;
alter table public.content_enhancement_jobs enable row level security;
alter table public.content_library_assets enable row level security;

drop policy if exists content_edit_projects_all on public.content_edit_projects;
create policy content_edit_projects_all on public.content_edit_projects
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

drop policy if exists content_render_jobs_all on public.content_render_jobs;
create policy content_render_jobs_all on public.content_render_jobs
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

drop policy if exists content_enhancement_jobs_all on public.content_enhancement_jobs;
create policy content_enhancement_jobs_all on public.content_enhancement_jobs
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

drop policy if exists content_library_assets_all on public.content_library_assets;
create policy content_library_assets_all on public.content_library_assets
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

-- Lock out anon
revoke all on table public.content_edit_projects from anon;
revoke all on table public.content_render_jobs from anon;
revoke all on table public.content_enhancement_jobs from anon;
revoke all on table public.content_library_assets from anon;
