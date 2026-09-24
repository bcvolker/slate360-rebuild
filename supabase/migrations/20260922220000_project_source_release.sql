-- vNext client release for Reality, Geometry, 360, and Plans.
-- digital_twin_spaces.published_model_id stays the legacy twin-share pointer.
-- It is one model per space, so it cannot publish a splat and a mesh independently.
-- Thermal stays on thermal_analysis_share_tokens.

create table if not exists public.project_source_publications (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  representation text not null,
  source_id uuid not null,
  published_at timestamptz not null default now(),
  published_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  revoked_by uuid references auth.users(id) on delete set null,
  constraint project_source_publications_representation_check check (
    representation in ('reality', 'geometry', 'pano360', 'plans')
  ),
  constraint project_source_publications_source_unique unique (project_id, representation, source_id)
);

comment on table public.project_source_publications is
  'Intentional vNext client release. One active row per project and representation after an operator publish. Reality and Geometry are separate rows.';

create index if not exists project_source_publications_active_idx
  on public.project_source_publications (project_id, representation)
  where revoked_at is null;

create table if not exists public.project_source_reviews (
  project_id uuid not null references public.projects(id) on delete cascade,
  representation text not null,
  source_id uuid not null,
  decision text not null,
  note text,
  needs_recapture boolean not null default false,
  reviewed_at timestamptz not null default now(),
  reviewed_by uuid references auth.users(id) on delete set null,
  primary key (project_id, representation, source_id),
  constraint project_source_reviews_representation_check check (
    representation in ('reality', 'geometry', 'pano360', 'plans', 'thermal')
  ),
  constraint project_source_reviews_decision_check check (decision in ('approved', 'rejected')),
  constraint project_source_reviews_note_check check (note is null or char_length(note) <= 500)
);

comment on table public.project_source_reviews is
  'Operator review of one exact source. Approval does not publish. Rejection does not delete the source.';

alter table public.project_source_publications enable row level security;
alter table public.project_source_reviews enable row level security;

drop policy if exists project_source_publications_select on public.project_source_publications;
create policy project_source_publications_select
  on public.project_source_publications
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_source_publications.project_id
        and public.user_can_access_org_or_project(p.org_id, p.id)
    )
  );

drop policy if exists project_source_reviews_select on public.project_source_reviews;
create policy project_source_reviews_select
  on public.project_source_reviews
  for select to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_source_reviews.project_id
        and public.user_can_access_org_or_project(p.org_id, p.id)
    )
  );

-- Writes go through the service role after the owner route gate. Authenticated
-- clients can read publication state. They cannot publish.

create or replace function public.publish_project_source(
  p_project_id uuid,
  p_representation text,
  p_source_id uuid,
  p_actor uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if p_representation not in ('reality', 'geometry', 'pano360', 'plans') then
    raise exception 'unsupported representation';
  end if;
  update public.project_source_publications
    set revoked_at = now(), revoked_by = p_actor
    where project_id = p_project_id
      and representation = p_representation
      and revoked_at is null
      and source_id <> p_source_id;
  insert into public.project_source_publications (
    project_id, representation, source_id, published_by, published_at, revoked_at, revoked_by
  ) values (
    p_project_id, p_representation, p_source_id, p_actor, now(), null, null
  )
  on conflict (project_id, representation, source_id) do update
    set revoked_at = null,
        revoked_by = null,
        published_at = now(),
        published_by = excluded.published_by;
end;
$$;

create or replace function public.revoke_project_source(
  p_project_id uuid,
  p_representation text,
  p_source_id uuid,
  p_actor uuid
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.project_source_publications
    set revoked_at = now(), revoked_by = p_actor
    where project_id = p_project_id
      and representation = p_representation
      and source_id = p_source_id
      and revoked_at is null;
end;
$$;

revoke all on function public.publish_project_source(uuid, text, uuid, uuid) from public, anon, authenticated;
revoke all on function public.revoke_project_source(uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_project_source(uuid, text, uuid, uuid) to service_role;
grant execute on function public.revoke_project_source(uuid, text, uuid, uuid) to service_role;

-- Backfill only sources the client can already open under the pre-Slice-10 rule.
insert into public.project_source_publications (project_id, representation, source_id)
select s.project_id, 'reality', m.id
from public.digital_twin_models m
join public.digital_twin_spaces s on s.id = m.space_id
where m.deleted_at is null
  and m.status = 'ready'
  and s.deleted_at is null
  and s.status <> 'archived'
  and (lower(m.model_format) = 'spz' or lower(m.storage_key) like '%.spz')
on conflict (project_id, representation, source_id) do nothing;

insert into public.project_source_publications (project_id, representation, source_id)
select s.project_id, 'geometry', m.id
from public.digital_twin_models m
join public.digital_twin_spaces s on s.id = m.space_id
where m.deleted_at is null
  and m.status = 'ready'
  and s.deleted_at is null
  and s.status <> 'archived'
  and (
    lower(m.model_format) in ('glb', 'gltf', 'usdz')
    or lower(m.storage_key) like '%.glb'
    or lower(m.storage_key) like '%.gltf'
  )
on conflict (project_id, representation, source_id) do nothing;

insert into public.project_source_publications (project_id, representation, source_id)
select i.project_id, 'pano360', i.id
from public.site_walk_items i
where i.deleted_at is null
  and i.item_type = 'photo_360'
  and i.project_id is not null
  and i.s3_key is not null
  and length(btrim(i.s3_key)) > 0
on conflict (project_id, representation, source_id) do nothing;

insert into public.project_source_publications (project_id, representation, source_id)
select sh.project_id, 'plans', sh.id
from public.site_walk_plan_sheets sh
where sh.thumbnail_s3_key is not null
   or sh.rasterized_key is not null
   or sh.image_s3_key is not null
on conflict (project_id, representation, source_id) do nothing;
