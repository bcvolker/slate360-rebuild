-- Design Studio (internal CEO tool) — Unreal-streamed, agent-driven design iteration.
-- Mirrors digital_twin_processing_jobs conventions (status enum, progress_pct, worker_run_id,
-- error_text, started_at/completed_at, set_updated_at trigger, org-member RLS).
-- Does NOT touch the legacy (apps)/design-studio project_models/model_files tables.

-- ── 1. Sessions ──────────────────────────────────────────────
-- One working session, optionally sourced from a Digital Twin model. project_id is
-- nullable so the CEO can spin up a scratch session not tied to a project.
create table if not exists public.design_sessions (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizations(id) on delete cascade,
  project_id              uuid references public.projects(id) on delete set null,
  created_by              uuid not null references auth.users(id) on delete set null,
  title                   text not null default 'Untitled session',
  status                  text not null default 'active'
                            check (status in ('active', 'archived')),
  -- Source twin (referenced, not copied — see lib/design-studio/import-twin)
  source_twin_model_id    uuid references public.digital_twin_models(id) on delete set null,
  source_storage_key      text,
  source_format           text,                         -- 'spz' | 'glb' | 'gltf' | 'usdz'
  source_viewer_kind      text,                         -- 'splat' | 'model'
  active_variant_id       uuid,                         -- FK added after design_variants
  settings                jsonb not null default '{}'::jsonb,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists idx_design_sessions_org on public.design_sessions(org_id, created_at desc);
create index if not exists idx_design_sessions_project on public.design_sessions(project_id);
create index if not exists idx_design_sessions_twin on public.design_sessions(source_twin_model_id);

-- ── 2. Variants (iteration tree) ─────────────────────────────
create table if not exists public.design_variants (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizations(id) on delete cascade,
  session_id              uuid not null references public.design_sessions(id) on delete cascade,
  parent_variant_id       uuid references public.design_variants(id) on delete set null,
  prompt_id               uuid,                         -- FK added after design_prompts
  label                   text,
  tier                    text not null default 'preview'
                            check (tier in ('base', 'preview', 'final')),
  status                  text not null default 'queued'
                            check (status in ('queued', 'processing', 'ready', 'failed')),
  model_format            text,
  preview_storage_key     text,
  final_storage_key       text,
  thumbnail_storage_key   text,
  -- Cumulative agent command list = the recipe to rebuild this scene state (save/resume).
  command_list            jsonb not null default '[]'::jsonb,
  structured_actions      jsonb not null default '[]'::jsonb,
  params                  jsonb not null default '{}'::jsonb,
  error_text              text,
  sort_order              integer not null default 0,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists idx_design_variants_session on public.design_variants(session_id, sort_order, created_at desc);
create index if not exists idx_design_variants_parent on public.design_variants(parent_variant_id);

alter table public.design_sessions
  drop constraint if exists design_sessions_active_variant_fk;
alter table public.design_sessions
  add constraint design_sessions_active_variant_fk
  foreign key (active_variant_id) references public.design_variants(id) on delete set null;

-- ── 3. Prompts (audit thread) ────────────────────────────────
create table if not exists public.design_prompts (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizations(id) on delete cascade,
  session_id              uuid not null references public.design_sessions(id) on delete cascade,
  variant_id              uuid references public.design_variants(id) on delete set null,
  parent_variant_id       uuid references public.design_variants(id) on delete set null,
  created_by              uuid references auth.users(id) on delete set null,
  prompt_text             text not null,
  structured_actions      jsonb not null default '[]'::jsonb,
  reference_image_keys    text[] not null default '{}',  -- drag-dropped inspiration images in R2
  model_provider          text,
  model_name              text,
  validation_errors       jsonb,
  created_at              timestamptz not null default now()
);
create index if not exists idx_design_prompts_session on public.design_prompts(session_id, created_at desc);

alter table public.design_variants
  drop constraint if exists design_variants_prompt_fk;
alter table public.design_variants
  add constraint design_variants_prompt_fk
  foreign key (prompt_id) references public.design_prompts(id) on delete set null;

-- ── 4. Generation jobs (Trigger.dev → Modal) ─────────────────
create table if not exists public.design_generation_jobs (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizations(id) on delete cascade,
  session_id              uuid not null references public.design_sessions(id) on delete cascade,
  variant_id              uuid not null references public.design_variants(id) on delete cascade,
  prompt_id               uuid references public.design_prompts(id) on delete set null,
  created_by              uuid references auth.users(id) on delete set null,
  job_type                text not null default 'preview'
                            check (job_type in ('preview', 'image_render', 'image_to_3d', 'text_to_3d', 'final', 'export')),
  status                  text not null default 'queued'
                            check (status in ('queued', 'processing', 'completed', 'failed', 'canceled')),
  progress_pct            integer not null default 0 check (progress_pct between 0 and 100),
  stage                   text,
  input_payload           jsonb not null default '{}'::jsonb,
  output_storage_key      text,
  quality_metrics         jsonb,
  worker_run_id           text,
  error_text              text,
  started_at              timestamptz,
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create index if not exists idx_design_jobs_session on public.design_generation_jobs(session_id, created_at desc);
create index if not exists idx_design_jobs_variant on public.design_generation_jobs(variant_id);
create index if not exists idx_design_jobs_status on public.design_generation_jobs(status, created_at)
  where status in ('queued', 'processing');

-- ── 5. Exports (downloadable artifacts + share links) ────────
create table if not exists public.design_exports (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizations(id) on delete cascade,
  session_id              uuid not null references public.design_sessions(id) on delete cascade,
  variant_id              uuid not null references public.design_variants(id) on delete cascade,
  created_by              uuid references auth.users(id) on delete set null,
  format                  text not null
                            check (format in ('glb', 'gltf', 'usdz', 'fbx', 'usd', 'png', 'mp4', 'share_link')),
  storage_key             text,
  share_token             text unique,
  status                  text not null default 'pending'
                            check (status in ('pending', 'processing', 'ready', 'failed')),
  file_size_bytes         bigint not null default 0,
  created_at              timestamptz not null default now(),
  completed_at            timestamptz
);
create index if not exists idx_design_exports_session on public.design_exports(session_id, created_at desc);

-- ── 6. GPU stream sessions (real-time cost meter + budget cap) ─
-- One row per Unreal Pixel Streaming session. Cost = elapsed * rate_usd_per_hour.
create table if not exists public.design_stream_sessions (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizations(id) on delete cascade,
  session_id              uuid references public.design_sessions(id) on delete set null,
  created_by              uuid references auth.users(id) on delete set null,
  provider                text not null default 'aws'    -- 'aws' | 'eagle3d' | 'vast'
                            check (provider in ('aws', 'eagle3d', 'vast', 'mock')),
  instance_type           text,                          -- e.g. 'g4dn.xlarge'
  rate_usd_per_hour       numeric(10,4) not null default 0,
  status                  text not null default 'starting'
                            check (status in ('starting', 'active', 'idle', 'stopped', 'failed')),
  budget_cap_usd          numeric(10,2),                 -- auto-shutdown when reached
  cost_usd                numeric(10,4) not null default 0,
  stream_url              text,
  signaling_url           text,
  worker_run_id           text,
  error_text              text,
  started_at              timestamptz,
  last_active_at          timestamptz,
  ended_at                timestamptz,
  created_at              timestamptz not null default now()
);
create index if not exists idx_design_stream_org on public.design_stream_sessions(org_id, created_at desc);
create index if not exists idx_design_stream_active on public.design_stream_sessions(status)
  where status in ('starting', 'active', 'idle');

-- ── 7. Scene snapshots (save / resume) ───────────────────────
-- Serialized scene state so a closed session can be rebuilt on a fresh GPU instance
-- by replaying the command list (or loading the snapshot).
create table if not exists public.design_scene_snapshots (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizations(id) on delete cascade,
  session_id              uuid not null references public.design_sessions(id) on delete cascade,
  variant_id              uuid references public.design_variants(id) on delete set null,
  created_by              uuid references auth.users(id) on delete set null,
  label                   text,
  command_list            jsonb not null default '[]'::jsonb,   -- ordered replay recipe
  scene_state             jsonb not null default '{}'::jsonb,   -- optional serialized snapshot
  created_at              timestamptz not null default now()
);
create index if not exists idx_design_snapshots_session on public.design_scene_snapshots(session_id, created_at desc);

-- ── 8. updated_at triggers ───────────────────────────────────
drop trigger if exists trg_design_sessions_updated_at on public.design_sessions;
create trigger trg_design_sessions_updated_at
  before update on public.design_sessions
  for each row execute function public.set_updated_at();

drop trigger if exists trg_design_variants_updated_at on public.design_variants;
create trigger trg_design_variants_updated_at
  before update on public.design_variants
  for each row execute function public.set_updated_at();

drop trigger if exists trg_design_generation_jobs_updated_at on public.design_generation_jobs;
create trigger trg_design_generation_jobs_updated_at
  before update on public.design_generation_jobs
  for each row execute function public.set_updated_at();

-- ── 9. Realtime (mirror twin job pattern) ────────────────────
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'design_generation_jobs'
  ) then
    alter publication supabase_realtime add table public.design_generation_jobs;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'design_variants'
  ) then
    alter publication supabase_realtime add table public.design_variants;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'design_stream_sessions'
  ) then
    alter publication supabase_realtime add table public.design_stream_sessions;
  end if;
end $$;

-- ── 10. RLS — org-member scoped (CEO is an org member; future subscription
--        gating layers on top via entitlements, not RLS) ──────
alter table public.design_sessions enable row level security;
alter table public.design_variants enable row level security;
alter table public.design_prompts enable row level security;
alter table public.design_generation_jobs enable row level security;
alter table public.design_exports enable row level security;
alter table public.design_stream_sessions enable row level security;
alter table public.design_scene_snapshots enable row level security;

-- Parent (sessions): direct org check
drop policy if exists design_sessions_all on public.design_sessions;
create policy design_sessions_all on public.design_sessions
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

-- Children: all carry org_id, so reuse the same direct org check
drop policy if exists design_variants_all on public.design_variants;
create policy design_variants_all on public.design_variants
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

drop policy if exists design_prompts_all on public.design_prompts;
create policy design_prompts_all on public.design_prompts
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

drop policy if exists design_jobs_all on public.design_generation_jobs;
create policy design_jobs_all on public.design_generation_jobs
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

drop policy if exists design_exports_all on public.design_exports;
create policy design_exports_all on public.design_exports
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

drop policy if exists design_stream_all on public.design_stream_sessions;
create policy design_stream_all on public.design_stream_sessions
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

drop policy if exists design_snapshots_all on public.design_scene_snapshots;
create policy design_snapshots_all on public.design_scene_snapshots
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));

-- Lock out anon
revoke all on table public.design_sessions from anon;
revoke all on table public.design_variants from anon;
revoke all on table public.design_prompts from anon;
revoke all on table public.design_generation_jobs from anon;
revoke all on table public.design_exports from anon;
revoke all on table public.design_stream_sessions from anon;
revoke all on table public.design_scene_snapshots from anon;
