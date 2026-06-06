-- Digital Twin desktop workstation + collaboration:
-- measurements, pins, pin comments, space/asset comments, viewer states,
-- clip planes, viewpoints, alignments, sun studies, punch annotations.

create table if not exists public.digital_twin_measurements (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.digital_twin_spaces(id) on delete cascade,
  model_id        uuid references public.digital_twin_models(id) on delete cascade,
  created_by      uuid not null references auth.users(id) on delete set null,
  label           text not null,
  start_point     jsonb not null,
  end_point       jsonb not null,
  measured_value  numeric(18, 6),
  unit            text not null default 'm' check (unit in ('m', 'ft', 'in', 'mm')),
  metadata        jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create table if not exists public.digital_twin_pins (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.digital_twin_spaces(id) on delete cascade,
  model_id        uuid references public.digital_twin_models(id) on delete cascade,
  created_by      uuid not null references auth.users(id) on delete set null,
  pin_number      integer,
  title           text not null,
  body            text,
  position        jsonb not null,
  normal          jsonb,
  pin_status      text not null default 'open'
                    check (pin_status in ('open', 'in_progress', 'resolved', 'closed')),
  priority        text check (priority is null or priority in ('low', 'medium', 'high', 'urgent')),
  trade           text,
  color           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create unique index if not exists idx_dt_pins_number
  on public.digital_twin_pins(space_id, pin_number)
  where pin_number is not null;
create table if not exists public.digital_twin_pin_comments (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  pin_id          uuid not null references public.digital_twin_pins(id) on delete cascade,
  author_user_id  uuid references auth.users(id) on delete set null,
  share_token_id  uuid,
  author_display  text,
  body            text not null check (char_length(body) between 1 and 8000),
  parent_id       uuid references public.digital_twin_pin_comments(id) on delete cascade,
  is_escalation   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_dt_pin_comments_pin on public.digital_twin_pin_comments(pin_id, created_at);
-- Threaded discussion on spaces or capture assets (and optionally pins).
create table if not exists public.digital_twin_comments (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.digital_twin_spaces(id) on delete cascade,
  subject_type    text not null
                    check (subject_type in ('space', 'asset', 'capture', 'model', 'pin')),
  subject_id      uuid not null,
  author_user_id  uuid references auth.users(id) on delete set null,
  share_token_id  uuid,
  author_display  text,
  body            text not null check (char_length(body) between 1 and 8000),
  parent_id       uuid references public.digital_twin_comments(id) on delete cascade,
  is_escalation   boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_dt_comments_subject
  on public.digital_twin_comments(subject_type, subject_id, created_at);
create index if not exists idx_dt_comments_space
  on public.digital_twin_comments(space_id, created_at desc);
-- Lightweight persisted viewer UI state (orbit, book spread, clips, sun, BIM align).
create table if not exists public.digital_twin_viewer_states (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.digital_twin_spaces(id) on delete cascade,
  model_id        uuid references public.digital_twin_models(id) on delete cascade,
  created_by      uuid not null references auth.users(id) on delete set null,
  title           text not null,
  state_kind      text not null
                    check (state_kind in (
                      'orbit', 'book_spread', 'clip_plane', 'section',
                      'sun_study', 'bim_alignment', 'compare', 'custom'
                    )),
  payload         jsonb not null default '{}'::jsonb,
  is_default      boolean not null default false,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists idx_dt_viewer_states_space
  on public.digital_twin_viewer_states(space_id, state_kind, sort_order);
create unique index if not exists idx_dt_viewer_states_default
  on public.digital_twin_viewer_states(space_id, state_kind)
  where is_default = true;
create table if not exists public.digital_twin_clip_planes (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.digital_twin_spaces(id) on delete cascade,
  model_id        uuid references public.digital_twin_models(id) on delete cascade,
  created_by      uuid not null references auth.users(id) on delete set null,
  label           text,
  origin          jsonb not null,
  normal          jsonb not null,
  is_active       boolean not null default true,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create table if not exists public.digital_twin_viewpoints (
  id              uuid primary key default gen_random_uuid(),
  org_id          uuid not null references public.organizations(id) on delete cascade,
  space_id        uuid not null references public.digital_twin_spaces(id) on delete cascade,
  model_id        uuid references public.digital_twin_models(id) on delete cascade,
  created_by      uuid not null references auth.users(id) on delete set null,
  title           text not null,
  viewpoint_kind  text not null default 'orbit'
                    check (viewpoint_kind in ('orbit', 'book_spread', 'section', 'compare')),
  left_camera     jsonb not null default '{}'::jsonb,
  right_camera    jsonb not null default '{}'::jsonb,
  book_metadata   jsonb not null default '{}'::jsonb,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create table if not exists public.digital_twin_alignments (
  id                      uuid primary key default gen_random_uuid(),
  org_id                  uuid not null references public.organizations(id) on delete cascade,
  space_id                uuid not null references public.digital_twin_spaces(id) on delete cascade,
  twin_model_id           uuid references public.digital_twin_models(id) on delete cascade,
  reference_model_file_id uuid references public.model_files(id) on delete set null,
  created_by              uuid not null references auth.users(id) on delete set null,
  label                   text not null,
  transform_matrix        jsonb not null,
  is_locked               boolean not null default false,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now()
);
create table if not exists public.digital_twin_sun_studies (
  id               uuid primary key default gen_random_uuid(),
  org_id           uuid not null references public.organizations(id) on delete cascade,
  space_id         uuid not null references public.digital_twin_spaces(id) on delete cascade,
  created_by       uuid not null references auth.users(id) on delete set null,
  title            text not null,
  latitude         double precision not null,
  longitude        double precision not null,
  timezone         text not null default 'UTC',
  study_date       date not null,
  time_start       time not null,
  time_end         time not null,
  interval_minutes integer not null default 60 check (interval_minutes > 0),
  shadow_config    jsonb not null default '{}'::jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create table if not exists public.digital_twin_punch_annotations (
  id                    uuid primary key default gen_random_uuid(),
  org_id                uuid not null references public.organizations(id) on delete cascade,
  space_id              uuid not null references public.digital_twin_spaces(id) on delete cascade,
  pin_id                uuid references public.digital_twin_pins(id) on delete set null,
  project_punch_item_id uuid references public.project_punch_items(id) on delete set null,
  created_by            uuid not null references auth.users(id) on delete set null,
  title                 text not null,
  description           text,
  export_status         text not null default 'pending'
                          check (export_status in ('pending', 'exporting', 'exported', 'failed')),
  last_exported_at      timestamptz,
  pdf_storage_key       text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
drop trigger if exists trg_dt_measurements_updated_at on public.digital_twin_measurements;
create trigger trg_dt_measurements_updated_at
  before update on public.digital_twin_measurements for each row execute function public.set_updated_at();
drop trigger if exists trg_dt_pins_updated_at on public.digital_twin_pins;
create trigger trg_dt_pins_updated_at
  before update on public.digital_twin_pins for each row execute function public.set_updated_at();
drop trigger if exists trg_dt_pin_comments_updated_at on public.digital_twin_pin_comments;
create trigger trg_dt_pin_comments_updated_at
  before update on public.digital_twin_pin_comments for each row execute function public.set_updated_at();
drop trigger if exists trg_dt_comments_updated_at on public.digital_twin_comments;
create trigger trg_dt_comments_updated_at
  before update on public.digital_twin_comments for each row execute function public.set_updated_at();
drop trigger if exists trg_dt_viewer_states_updated_at on public.digital_twin_viewer_states;
create trigger trg_dt_viewer_states_updated_at
  before update on public.digital_twin_viewer_states for each row execute function public.set_updated_at();
drop trigger if exists trg_dt_clip_planes_updated_at on public.digital_twin_clip_planes;
create trigger trg_dt_clip_planes_updated_at
  before update on public.digital_twin_clip_planes for each row execute function public.set_updated_at();
drop trigger if exists trg_dt_viewpoints_updated_at on public.digital_twin_viewpoints;
create trigger trg_dt_viewpoints_updated_at
  before update on public.digital_twin_viewpoints for each row execute function public.set_updated_at();
drop trigger if exists trg_dt_alignments_updated_at on public.digital_twin_alignments;
create trigger trg_dt_alignments_updated_at
  before update on public.digital_twin_alignments for each row execute function public.set_updated_at();
drop trigger if exists trg_dt_sun_studies_updated_at on public.digital_twin_sun_studies;
create trigger trg_dt_sun_studies_updated_at
  before update on public.digital_twin_sun_studies for each row execute function public.set_updated_at();
drop trigger if exists trg_dt_punch_annotations_updated_at on public.digital_twin_punch_annotations;
create trigger trg_dt_punch_annotations_updated_at
  before update on public.digital_twin_punch_annotations for each row execute function public.set_updated_at();
alter table public.digital_twin_measurements enable row level security;
alter table public.digital_twin_pins enable row level security;
alter table public.digital_twin_pin_comments enable row level security;
alter table public.digital_twin_comments enable row level security;
alter table public.digital_twin_viewer_states enable row level security;
alter table public.digital_twin_clip_planes enable row level security;
alter table public.digital_twin_viewpoints enable row level security;
alter table public.digital_twin_alignments enable row level security;
alter table public.digital_twin_sun_studies enable row level security;
alter table public.digital_twin_punch_annotations enable row level security;
drop policy if exists dt_measurements_all on public.digital_twin_measurements;
create policy dt_measurements_all on public.digital_twin_measurements
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  );
drop policy if exists dt_pins_all on public.digital_twin_pins;
create policy dt_pins_all on public.digital_twin_pins
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  );
drop policy if exists dt_pin_comments_all on public.digital_twin_pin_comments;
create policy dt_pin_comments_all on public.digital_twin_pin_comments
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_pins p
      join public.digital_twin_spaces s on s.id = p.space_id
      where p.id = pin_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_pins p
      join public.digital_twin_spaces s on s.id = p.space_id
      where p.id = pin_id and public.user_can_access_project(s.project_id)
    )
  );
drop policy if exists dt_comments_all on public.digital_twin_comments;
create policy dt_comments_all on public.digital_twin_comments
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  );
drop policy if exists dt_viewer_states_all on public.digital_twin_viewer_states;
create policy dt_viewer_states_all on public.digital_twin_viewer_states
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  );
drop policy if exists dt_clip_planes_all on public.digital_twin_clip_planes;
create policy dt_clip_planes_all on public.digital_twin_clip_planes
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  );
drop policy if exists dt_viewpoints_all on public.digital_twin_viewpoints;
create policy dt_viewpoints_all on public.digital_twin_viewpoints
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  );
drop policy if exists dt_alignments_all on public.digital_twin_alignments;
create policy dt_alignments_all on public.digital_twin_alignments
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  );
drop policy if exists dt_sun_studies_all on public.digital_twin_sun_studies;
create policy dt_sun_studies_all on public.digital_twin_sun_studies
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  );
drop policy if exists dt_punch_annotations_all on public.digital_twin_punch_annotations;
create policy dt_punch_annotations_all on public.digital_twin_punch_annotations
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and s.deleted_at is null and public.user_can_access_project(s.project_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_spaces s
      where s.id = space_id and public.user_can_access_project(s.project_id)
    )
  );
revoke all on table public.digital_twin_measurements from anon;
revoke all on table public.digital_twin_pins from anon;
revoke all on table public.digital_twin_pin_comments from anon;
revoke all on table public.digital_twin_comments from anon;
revoke all on table public.digital_twin_viewer_states from anon;
revoke all on table public.digital_twin_clip_planes from anon;
revoke all on table public.digital_twin_viewpoints from anon;
revoke all on table public.digital_twin_alignments from anon;
revoke all on table public.digital_twin_sun_studies from anon;
revoke all on table public.digital_twin_punch_annotations from anon;
