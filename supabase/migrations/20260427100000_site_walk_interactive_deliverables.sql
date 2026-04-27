-- Site Walk interactive deliverable hosting foundation.
--
-- Supports hosted/emailed deliverables beyond static PDFs: email snapshots,
-- 360 tours, cinematic slideshows, 3D/model viewers, media galleries,
-- navigable scenes, overlays/hotspots, client questions/responses, and send logs.

-- Expand deliverable type/output checks for richer hosted experiences.
alter table public.site_walk_deliverables
  drop constraint if exists sw_deliverables_deliverable_type_check;
alter table public.site_walk_deliverables
  drop constraint if exists site_walk_deliverables_deliverable_type_check;

alter table public.site_walk_deliverables
  add constraint sw_deliverables_deliverable_type_check
  check (deliverable_type in (
    'report',
    'punchlist',
    'photo_log',
    'rfi',
    'estimate',
    'status_report',
    'proposal',
    'field_report',
    'inspection_package',
    'safety_report',
    'proof_of_work',
    'client_portal',
    'kanban_board',
    'cinematic_presentation',
    'spreadsheet_export',
    'virtual_tour',
    'tour_360',
    'model_viewer',
    'media_gallery',
    'client_review',
    'custom'
  ));

do $$
begin
  alter table public.site_walk_deliverables
    drop constraint if exists sw_deliverables_output_mode_check;
  alter table public.site_walk_deliverables
    add constraint sw_deliverables_output_mode_check
    check (output_mode in (
      'hosted',
      'pdf',
      'portal',
      'presentation',
      'spreadsheet',
      'zip',
      'email_body',
      'email_snapshot',
      'interactive_link'
    ));
end $$;

alter table public.site_walk_deliverables
  add column if not exists viewer_config jsonb not null default '{}'::jsonb,
  add column if not exists response_config jsonb not null default '{}'::jsonb,
  add column if not exists navigation_config jsonb not null default '{}'::jsonb,
  add column if not exists thumbnail_s3_key text,
  add column if not exists preview_image_s3_key text,
  add column if not exists email_snapshot_s3_key text,
  add column if not exists allow_viewer_responses boolean not null default true,
  add column if not exists allow_viewer_download boolean not null default false;

-- Normalized assets that a hosted deliverable can render or email.
create table if not exists public.site_walk_deliverable_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  deliverable_id uuid not null references public.site_walk_deliverables(id) on delete cascade,
  source_item_id uuid references public.site_walk_items(id) on delete set null,
  file_id uuid references public.slatedrop_uploads(id) on delete set null,
  unified_file_id uuid references public.unified_files(id) on delete set null,
  asset_type text not null,
  title text,
  description text,
  s3_key text,
  thumbnail_s3_key text,
  mime_type text,
  file_size bigint not null default 0,
  width integer,
  height integer,
  duration_seconds numeric(12, 3),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.site_walk_deliverable_assets
    drop constraint if exists sw_deliverable_assets_type_check;
  alter table public.site_walk_deliverable_assets
    add constraint sw_deliverable_assets_type_check
    check (asset_type in (
      'photo',
      'video',
      'audio',
      'photo_360',
      'tour_360',
      'model_3d',
      'pdf',
      'spreadsheet',
      'thumbnail',
      'email_snapshot',
      'markup_overlay',
      'document',
      'other'
    ));
end $$;

create index if not exists idx_sw_deliverable_assets_deliverable_sort
  on public.site_walk_deliverable_assets(deliverable_id, sort_order);
create index if not exists idx_sw_deliverable_assets_project
  on public.site_walk_deliverable_assets(project_id);
create index if not exists idx_sw_deliverable_assets_source_item
  on public.site_walk_deliverable_assets(source_item_id)
  where source_item_id is not null;
create index if not exists idx_sw_deliverable_assets_unified_file
  on public.site_walk_deliverable_assets(unified_file_id)
  where unified_file_id is not null;

-- Scenes/slides are the navigable units for cinematic presentations, 360 tours,
-- model review links, and large-stage client viewers with thumbnail strips.
create table if not exists public.site_walk_deliverable_scenes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  deliverable_id uuid not null references public.site_walk_deliverables(id) on delete cascade,
  asset_id uuid references public.site_walk_deliverable_assets(id) on delete set null,
  scene_type text not null,
  title text not null default '',
  description text,
  thumbnail_s3_key text,
  sort_order integer not null default 0,
  initial_view jsonb not null default '{}'::jsonb,
  camera_config jsonb not null default '{}'::jsonb,
  overlay_config jsonb not null default '{}'::jsonb,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.site_walk_deliverable_scenes
    drop constraint if exists sw_deliverable_scenes_type_check;
  alter table public.site_walk_deliverable_scenes
    add constraint sw_deliverable_scenes_type_check
    check (scene_type in (
      'photo',
      'video',
      'photo_360',
      'model_3d',
      'plan_sheet',
      'document',
      'slide',
      'summary',
      'before_after',
      'custom'
    ));
end $$;

create index if not exists idx_sw_deliverable_scenes_deliverable_sort
  on public.site_walk_deliverable_scenes(deliverable_id, sort_order);
create index if not exists idx_sw_deliverable_scenes_project
  on public.site_walk_deliverable_scenes(project_id);
create index if not exists idx_sw_deliverable_scenes_asset
  on public.site_walk_deliverable_scenes(asset_id)
  where asset_id is not null;

-- Hotspots/overlays allow users to click inside 360 photos, models, videos,
-- or slides and navigate, reveal findings, or open a response thread.
create table if not exists public.site_walk_deliverable_hotspots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  deliverable_id uuid not null references public.site_walk_deliverables(id) on delete cascade,
  scene_id uuid references public.site_walk_deliverable_scenes(id) on delete cascade,
  target_scene_id uuid references public.site_walk_deliverable_scenes(id) on delete set null,
  source_item_id uuid references public.site_walk_items(id) on delete set null,
  hotspot_type text not null default 'info',
  label text,
  body text,
  x_pct numeric(7, 4),
  y_pct numeric(7, 4),
  yaw numeric(10, 4),
  pitch numeric(10, 4),
  sort_order integer not null default 0,
  response_enabled boolean not null default true,
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.site_walk_deliverable_hotspots
    drop constraint if exists sw_deliverable_hotspots_type_check;
  alter table public.site_walk_deliverable_hotspots
    add constraint sw_deliverable_hotspots_type_check
    check (hotspot_type in ('info', 'issue', 'navigation', 'media', 'question', 'approval', 'link', 'custom'));

  alter table public.site_walk_deliverable_hotspots
    drop constraint if exists sw_deliverable_hotspots_x_pct_check;
  alter table public.site_walk_deliverable_hotspots
    add constraint sw_deliverable_hotspots_x_pct_check
    check (x_pct is null or (x_pct >= 0 and x_pct <= 100));

  alter table public.site_walk_deliverable_hotspots
    drop constraint if exists sw_deliverable_hotspots_y_pct_check;
  alter table public.site_walk_deliverable_hotspots
    add constraint sw_deliverable_hotspots_y_pct_check
    check (y_pct is null or (y_pct >= 0 and y_pct <= 100));
end $$;

create index if not exists idx_sw_deliverable_hotspots_scene_sort
  on public.site_walk_deliverable_hotspots(scene_id, sort_order);
create index if not exists idx_sw_deliverable_hotspots_deliverable
  on public.site_walk_deliverable_hotspots(deliverable_id);
create index if not exists idx_sw_deliverable_hotspots_project
  on public.site_walk_deliverable_hotspots(project_id);

-- Client-side discussion threads scoped to the deliverable/sidebar, a scene,
-- hotspot, or source item. Public writes should go through token-gated API
-- routes using service role; authenticated owners can read/manage in-app.
create table if not exists public.site_walk_deliverable_threads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  deliverable_id uuid not null references public.site_walk_deliverables(id) on delete cascade,
  scene_id uuid references public.site_walk_deliverable_scenes(id) on delete set null,
  hotspot_id uuid references public.site_walk_deliverable_hotspots(id) on delete set null,
  source_item_id uuid references public.site_walk_items(id) on delete set null,
  subject text not null default '',
  status text not null default 'open',
  metadata jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.site_walk_deliverable_threads
    drop constraint if exists sw_deliverable_threads_status_check;
  alter table public.site_walk_deliverable_threads
    add constraint sw_deliverable_threads_status_check
    check (status in ('open', 'answered', 'resolved', 'archived'));
end $$;

create index if not exists idx_sw_deliverable_threads_deliverable
  on public.site_walk_deliverable_threads(deliverable_id, created_at desc);
create index if not exists idx_sw_deliverable_threads_scene
  on public.site_walk_deliverable_threads(scene_id)
  where scene_id is not null;
create index if not exists idx_sw_deliverable_threads_hotspot
  on public.site_walk_deliverable_threads(hotspot_id)
  where hotspot_id is not null;

create table if not exists public.site_walk_deliverable_responses (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  deliverable_id uuid not null references public.site_walk_deliverables(id) on delete cascade,
  thread_id uuid references public.site_walk_deliverable_threads(id) on delete cascade,
  scene_id uuid references public.site_walk_deliverable_scenes(id) on delete set null,
  hotspot_id uuid references public.site_walk_deliverable_hotspots(id) on delete set null,
  author_user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  author_email text,
  response_intent text not null default 'comment',
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

do $$
begin
  alter table public.site_walk_deliverable_responses
    drop constraint if exists sw_deliverable_responses_intent_check;
  alter table public.site_walk_deliverable_responses
    add constraint sw_deliverable_responses_intent_check
    check (response_intent in ('approve', 'needs_change', 'question', 'comment', 'answer', 'acknowledge'));
end $$;

create index if not exists idx_sw_deliverable_responses_thread_created
  on public.site_walk_deliverable_responses(thread_id, created_at desc)
  where thread_id is not null;
create index if not exists idx_sw_deliverable_responses_deliverable_created
  on public.site_walk_deliverable_responses(deliverable_id, created_at desc);
create index if not exists idx_sw_deliverable_responses_project
  on public.site_walk_deliverable_responses(project_id);

-- Outbound delivery log for link emails, PDF attachments, inline-image emails,
-- and generated immutable email snapshots.
create table if not exists public.site_walk_deliverable_sends (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  deliverable_id uuid not null references public.site_walk_deliverables(id) on delete cascade,
  access_token_id uuid references public.deliverable_access_tokens(id) on delete set null,
  sent_by uuid references auth.users(id) on delete set null,
  recipient_email text,
  recipient_phone text,
  recipient_name text,
  delivery_mode text not null,
  subject text,
  message text,
  status text not null default 'pending',
  provider_message_id text,
  attachment_s3_key text,
  snapshot_s3_key text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz,
  failed_at timestamptz,
  error_message text
);

do $$
begin
  alter table public.site_walk_deliverable_sends
    drop constraint if exists sw_deliverable_sends_delivery_mode_check;
  alter table public.site_walk_deliverable_sends
    add constraint sw_deliverable_sends_delivery_mode_check
    check (delivery_mode in ('link', 'pdf_attachment', 'inline_images', 'email_snapshot', 'zip_attachment'));

  alter table public.site_walk_deliverable_sends
    drop constraint if exists sw_deliverable_sends_status_check;
  alter table public.site_walk_deliverable_sends
    add constraint sw_deliverable_sends_status_check
    check (status in ('pending', 'sent', 'failed', 'bounced', 'opened'));
end $$;

create index if not exists idx_sw_deliverable_sends_deliverable
  on public.site_walk_deliverable_sends(deliverable_id, created_at desc);
create index if not exists idx_sw_deliverable_sends_project
  on public.site_walk_deliverable_sends(project_id, created_at desc);
create index if not exists idx_sw_deliverable_sends_recipient_email
  on public.site_walk_deliverable_sends(lower(recipient_email))
  where recipient_email is not null;

create or replace function public.set_site_walk_interactive_deliverables_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sw_deliverable_assets_updated_at on public.site_walk_deliverable_assets;
create trigger trg_sw_deliverable_assets_updated_at
  before update on public.site_walk_deliverable_assets
  for each row execute function public.set_site_walk_interactive_deliverables_updated_at();

drop trigger if exists trg_sw_deliverable_scenes_updated_at on public.site_walk_deliverable_scenes;
create trigger trg_sw_deliverable_scenes_updated_at
  before update on public.site_walk_deliverable_scenes
  for each row execute function public.set_site_walk_interactive_deliverables_updated_at();

drop trigger if exists trg_sw_deliverable_hotspots_updated_at on public.site_walk_deliverable_hotspots;
create trigger trg_sw_deliverable_hotspots_updated_at
  before update on public.site_walk_deliverable_hotspots
  for each row execute function public.set_site_walk_interactive_deliverables_updated_at();

drop trigger if exists trg_sw_deliverable_threads_updated_at on public.site_walk_deliverable_threads;
create trigger trg_sw_deliverable_threads_updated_at
  before update on public.site_walk_deliverable_threads
  for each row execute function public.set_site_walk_interactive_deliverables_updated_at();

-- RLS: owners/project team manage in-app. External recipients use token-gated
-- API routes backed by service role, never direct anon table access.
alter table public.site_walk_deliverable_assets enable row level security;
alter table public.site_walk_deliverable_scenes enable row level security;
alter table public.site_walk_deliverable_hotspots enable row level security;
alter table public.site_walk_deliverable_threads enable row level security;
alter table public.site_walk_deliverable_responses enable row level security;
alter table public.site_walk_deliverable_sends enable row level security;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'site_walk_deliverable_assets',
    'site_walk_deliverable_scenes',
    'site_walk_deliverable_hotspots',
    'site_walk_deliverable_threads',
    'site_walk_deliverable_responses',
    'site_walk_deliverable_sends'
  ] loop
    execute format('drop policy if exists %I on public.%I', 'sw_interactive_select', v_table);
    execute format('drop policy if exists %I on public.%I', 'sw_interactive_insert', v_table);
    execute format('drop policy if exists %I on public.%I', 'sw_interactive_update', v_table);
    execute format('drop policy if exists %I on public.%I', 'sw_interactive_delete', v_table);

    execute format(
      'create policy sw_interactive_select on public.%I for select to authenticated using (public.user_can_access_org_or_project(org_id, project_id))',
      v_table
    );
    execute format(
      'create policy sw_interactive_insert on public.%I for insert to authenticated with check (public.user_can_manage_org_or_project(org_id, project_id))',
      v_table
    );
    execute format(
      'create policy sw_interactive_update on public.%I for update to authenticated using (public.user_can_manage_org_or_project(org_id, project_id)) with check (public.user_can_manage_org_or_project(org_id, project_id))',
      v_table
    );
    execute format(
      'create policy sw_interactive_delete on public.%I for delete to authenticated using (public.user_can_manage_org_or_project(org_id, project_id))',
      v_table
    );
  end loop;
end $$;

-- Realtime for interactive review sidebars and owner dashboards.
do $$
declare
  v_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array array[
      'site_walk_deliverable_assets',
      'site_walk_deliverable_scenes',
      'site_walk_deliverable_hotspots',
      'site_walk_deliverable_threads',
      'site_walk_deliverable_responses',
      'site_walk_deliverable_sends'
    ] loop
      begin
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      exception when duplicate_object then
        null;
      end;
      execute format('alter table public.%I replica identity full', v_table);
    end loop;
  end if;
end $$;

comment on table public.site_walk_deliverable_assets is
  'Hosted assets for Site Walk deliverables: photos, videos, 360 photos, 3D models, PDFs, snapshots, and thumbnails.';
comment on table public.site_walk_deliverable_scenes is
  'Navigable scenes/slides for hosted Site Walk viewers, 360 tours, model review, and cinematic presentations.';
comment on table public.site_walk_deliverable_hotspots is
  'Clickable overlays/hotspots inside scenes for navigation, issue callouts, media, and response prompts.';
comment on table public.site_walk_deliverable_threads is
  'Discussion threads scoped to a deliverable, scene, hotspot, or source item.';
comment on table public.site_walk_deliverable_responses is
  'Token-gated client responses, questions, approvals, and needs-change comments for interactive deliverables.';
comment on table public.site_walk_deliverable_sends is
  'Outbound send log for link, PDF attachment, inline image, and email snapshot deliverables.';
