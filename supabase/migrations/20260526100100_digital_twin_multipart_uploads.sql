-- Digital Twin multipart upload session tracking (S3/R2 multipart API).

create table if not exists public.digital_twin_multipart_uploads (
  id                  uuid primary key default gen_random_uuid(),
  org_id              uuid not null references public.organizations(id) on delete cascade,
  asset_id            uuid not null references public.digital_twin_capture_assets(id) on delete cascade,
  storage_key         text not null,
  s3_upload_id        text not null,
  content_type        text,
  total_parts         integer not null check (total_parts > 0),
  part_size_bytes     bigint not null check (part_size_bytes > 0),
  completed_parts     integer not null default 0 check (completed_parts >= 0),
  status              text not null default 'initiated'
                        check (status in ('initiated', 'uploading', 'completed', 'aborted', 'failed')),
  expires_at          timestamptz not null,
  completed_at        timestamptz,
  error_text          text,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create table if not exists public.digital_twin_multipart_parts (
  id                  uuid primary key default gen_random_uuid(),
  multipart_id        uuid not null references public.digital_twin_multipart_uploads(id) on delete cascade,
  part_number         integer not null check (part_number > 0),
  etag                text,
  size_bytes          bigint not null default 0 check (size_bytes >= 0),
  status              text not null default 'pending'
                        check (status in ('pending', 'uploaded', 'failed')),
  uploaded_at         timestamptz,
  unique (multipart_id, part_number)
);
create index if not exists idx_dt_multipart_asset on public.digital_twin_multipart_uploads(asset_id);
create index if not exists idx_dt_multipart_status on public.digital_twin_multipart_uploads(status, expires_at);
drop trigger if exists trg_dt_multipart_uploads_updated_at on public.digital_twin_multipart_uploads;
create trigger trg_dt_multipart_uploads_updated_at
  before update on public.digital_twin_multipart_uploads
  for each row execute function public.set_updated_at();
alter table public.digital_twin_multipart_uploads enable row level security;
alter table public.digital_twin_multipart_parts enable row level security;
drop policy if exists dt_multipart_select on public.digital_twin_multipart_uploads;
create policy dt_multipart_select on public.digital_twin_multipart_uploads
  for select to authenticated
  using (public.user_is_org_member(org_id));
drop policy if exists dt_multipart_insert on public.digital_twin_multipart_uploads;
create policy dt_multipart_insert on public.digital_twin_multipart_uploads
  for insert to authenticated
  with check (public.user_is_org_member(org_id));
drop policy if exists dt_multipart_update on public.digital_twin_multipart_uploads;
create policy dt_multipart_update on public.digital_twin_multipart_uploads
  for update to authenticated
  using (public.user_is_org_member(org_id))
  with check (public.user_is_org_member(org_id));
drop policy if exists dt_multipart_parts_select on public.digital_twin_multipart_parts;
create policy dt_multipart_parts_select on public.digital_twin_multipart_parts
  for select to authenticated
  using (
    exists (
      select 1 from public.digital_twin_multipart_uploads m
      where m.id = multipart_id and public.user_is_org_member(m.org_id)
    )
  );
drop policy if exists dt_multipart_parts_write on public.digital_twin_multipart_parts;
create policy dt_multipart_parts_write on public.digital_twin_multipart_parts
  for all to authenticated
  using (
    exists (
      select 1 from public.digital_twin_multipart_uploads m
      where m.id = multipart_id and public.user_is_org_member(m.org_id)
    )
  )
  with check (
    exists (
      select 1 from public.digital_twin_multipart_uploads m
      where m.id = multipart_id and public.user_is_org_member(m.org_id)
    )
  );
revoke all on table public.digital_twin_multipart_uploads from anon;
revoke all on table public.digital_twin_multipart_parts from anon;
