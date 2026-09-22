-- Per-project client delivery scope. This is not a subscription entitlement.
-- A service the client did not include stays invisible even when internal data exists.

create table if not exists public.project_client_capabilities (
  project_id uuid not null references public.projects(id) on delete cascade,
  capability_id text not null,
  included boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid,
  primary key (project_id, capability_id),
  constraint project_client_capabilities_id_check check (
    capability_id in (
      'reality', 'geometry', 'pano360', 'plans', 'thermal',
      'items', 'documents', 'history', 'compare'
    )
  )
);

comment on table public.project_client_capabilities is
  'Which client-facing capabilities are part of this project. Inclusion is separate from publish and from renderability.';

alter table public.project_client_capabilities enable row level security;

create policy project_client_capabilities_select
  on public.project_client_capabilities
  for select
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_client_capabilities.project_id
        and public.user_can_access_org_or_project(p.org_id, p.id)
    )
  );

create policy project_client_capabilities_write
  on public.project_client_capabilities
  for all
  to authenticated
  using (
    exists (
      select 1 from public.projects p
      where p.id = project_client_capabilities.project_id
        and public.user_can_manage_org_or_project(p.org_id, p.id)
    )
  )
  with check (
    exists (
      select 1 from public.projects p
      where p.id = project_client_capabilities.project_id
        and public.user_can_manage_org_or_project(p.org_id, p.id)
    )
  );

-- Existing projects keep portal sections, and keep a service only when a
-- client-visible source already exists. Raw internal data is not enough.
insert into public.project_client_capabilities (project_id, capability_id, included)
select p.id, cap.id,
  case
    when cap.id in ('items', 'documents', 'history', 'compare') then true
    when cap.id = 'reality' then exists (
      select 1
      from public.digital_twin_spaces s
      join public.digital_twin_models m on m.space_id = s.id
      where s.project_id = p.id
        and s.deleted_at is null
        and s.status is distinct from 'archived'
        and m.deleted_at is null
        and m.status = 'ready'
        and (lower(coalesce(m.model_format, '')) = 'spz' or m.storage_key ilike '%.spz')
    )
    when cap.id = 'geometry' then exists (
      select 1
      from public.digital_twin_spaces s
      join public.digital_twin_models m on m.space_id = s.id
      where s.project_id = p.id
        and s.deleted_at is null
        and s.status is distinct from 'archived'
        and m.deleted_at is null
        and m.status = 'ready'
        and (
          lower(coalesce(m.model_format, '')) in ('glb', 'gltf', 'usdz')
          or m.storage_key ilike '%.glb'
          or m.storage_key ilike '%.gltf'
        )
    )
    when cap.id = 'pano360' then exists (
      select 1 from public.site_walk_items i
      where i.project_id = p.id
        and i.deleted_at is null
        and i.item_type = 'photo_360'
        and i.s3_key is not null
    )
    when cap.id = 'plans' then exists (
      select 1 from public.site_walk_plan_sheets sh
      where sh.project_id = p.id
        and (
          sh.thumbnail_s3_key is not null
          or sh.rasterized_key is not null
          or sh.image_s3_key is not null
        )
    )
    when cap.id = 'thermal' then exists (
      select 1
      from public.thermal_analysis_sessions s
      join public.thermal_analysis_share_tokens t on t.session_id = s.id
      join public.thermal_captures c on c.session_id = s.id
      where s.project_id = p.id
        and s.deleted_at is null
        and c.deleted_at is null
        and t.is_revoked = false
        and (t.expires_at is null or t.expires_at > now())
        and (c.preview_path is not null or c.storage_path is not null)
    )
    else false
  end
from public.projects p
cross join (
  values
    ('reality'), ('geometry'), ('pano360'), ('plans'), ('thermal'),
    ('items'), ('documents'), ('history'), ('compare')
) as cap(id)
on conflict (project_id, capability_id) do nothing;

create or replace function public.seed_project_client_capabilities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_client_capabilities (project_id, capability_id, included)
  select new.id, cap.id, cap.id in ('items', 'documents', 'history', 'compare')
  from (
    values
      ('reality'), ('geometry'), ('pano360'), ('plans'), ('thermal'),
      ('items'), ('documents'), ('history'), ('compare')
  ) as cap(id)
  on conflict (project_id, capability_id) do nothing;
  return new;
end;
$$;

drop trigger if exists projects_seed_client_capabilities on public.projects;
create trigger projects_seed_client_capabilities
  after insert on public.projects
  for each row
  execute function public.seed_project_client_capabilities();
