-- Slice 10 closeout. Does not edit 20260922220000.
-- Publication is per source. Publishing one 360, sheet, or scan does not revoke another.
-- Automatic backfill rows (published_by is null) for a service that is not included are removed.
-- Review notes stay on the service-role path. Authenticated project members cannot read them.

comment on table public.project_source_publications is
  'vNext client release for one exact source. Several sources of the same representation may stay published. Publishing one does not revoke another. Explicit revoke removes that source only.';

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

-- Backfill rows have no actor. Operator publications record published_by.
-- Drop only the automatic rows whose service is not included. Leave actor rows alone.
delete from public.project_source_publications as publication
where publication.published_by is null
  and not exists (
    select 1
    from public.project_client_capabilities as capability
    where capability.project_id = publication.project_id
      and capability.capability_id = publication.representation
      and capability.included is true
  );

drop policy if exists project_source_reviews_select on public.project_source_reviews;

revoke all on table public.project_source_reviews from public, anon, authenticated;
grant select, insert, update, delete on table public.project_source_reviews to service_role;
