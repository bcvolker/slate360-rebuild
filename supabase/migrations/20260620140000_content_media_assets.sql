-- Content Studio media assets — uploaded source clips/photos per edit project, with
-- ingest-generated proxy / thumbnail / audio-proxy keys + probed metadata.
-- Separate from the legacy (apps) media_assets DAM and from content_library_assets.

create table if not exists public.content_media_assets (
  id                 uuid primary key default gen_random_uuid(),
  org_id             uuid not null references public.organizations(id) on delete cascade,
  edit_project_id    uuid references public.content_edit_projects(id) on delete cascade,
  created_by         uuid references auth.users(id) on delete set null,
  kind               text not null default 'video'
                       check (kind in ('video','image','audio','equirect_video')),
  original_filename  text,
  storage_key        text not null,                       -- R2 key of the original upload
  proxy_key          text,                                -- 720p scrub proxy
  thumbnail_key      text,                                -- poster frame
  audio_proxy_key    text,                                -- tiny mono audio proxy (multicam sync)
  status             text not null default 'uploaded'
                       check (status in ('uploaded','processing','ready','failed')),
  duration_sec       real,
  width              integer,
  height             integer,
  fps                real,
  has_audio          boolean,
  error_text         text,
  ingest_job_id      uuid,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index if not exists idx_content_media_project on public.content_media_assets(edit_project_id, created_at desc);
create index if not exists idx_content_media_org on public.content_media_assets(org_id, created_at desc);

drop trigger if exists trg_content_media_assets_updated_at on public.content_media_assets;
create trigger trg_content_media_assets_updated_at
  before update on public.content_media_assets
  for each row execute function public.set_updated_at();

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public'
      and tablename = 'content_media_assets'
  ) then
    alter publication supabase_realtime add table public.content_media_assets;
  end if;
end $$;

alter table public.content_media_assets enable row level security;
drop policy if exists content_media_assets_all on public.content_media_assets;
create policy content_media_assets_all on public.content_media_assets
  for all to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));
revoke all on table public.content_media_assets from anon;
