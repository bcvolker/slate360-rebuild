-- P1-P3 (Opus adversarial review): separate the specialized Thermal Studio report share
-- (thermal_analysis_share_tokens — unaffected by this migration, keeps working exactly as before)
-- from client-portal publication. Thermal now participates in project_source_publications the
-- same way reality/geometry/pano360/plans already do, so QA "published" state and client-portal
-- visibility read from the same source of truth. Additive only: widens an existing CHECK
-- constraint, adds no new table, touches no existing row.

alter table public.project_source_publications
  drop constraint if exists project_source_publications_representation_check;

alter table public.project_source_publications
  add constraint project_source_publications_representation_check
  check (representation in ('reality', 'geometry', 'pano360', 'plans', 'thermal'));

-- publish_project_source (redefined by 20260922233000_project_source_release_closeout.sql) still
-- has its own hardcoded representation allowlist independent of the table CHECK constraint above.
-- Reissuing it unchanged except for that one list, so 'thermal' can actually be published through
-- the same RPC every other representation uses.
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
  if p_representation not in ('reality', 'geometry', 'pano360', 'plans', 'thermal') then
    raise exception 'unsupported representation';
  end if;
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

revoke all on function public.publish_project_source(uuid, text, uuid, uuid) from public, anon, authenticated;
grant execute on function public.publish_project_source(uuid, text, uuid, uuid) to service_role;
