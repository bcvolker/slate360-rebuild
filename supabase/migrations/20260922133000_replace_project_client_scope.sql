-- Replaces a project's client delivery scope in one transaction.
-- Rows are upserted. They are never deleted, so a failure cannot leave the
-- project with zero capability rows.

create or replace function public.replace_project_client_scope(
  p_project_id uuid,
  p_included text[],
  p_actor uuid
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid;
  cap text;
  known text[] := array[
    'reality', 'geometry', 'pano360', 'plans', 'thermal',
    'items', 'documents', 'history', 'compare'
  ];
begin
  -- Service-role callers pass the signed-in user. A direct authenticated call
  -- is checked as that caller, not as a forged actor id.
  if auth.role() = 'service_role' then
    actor := p_actor;
  else
    actor := auth.uid();
  end if;

  if actor is null or not public.user_can_manage_project(p_project_id, actor) then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  foreach cap in array known loop
    insert into public.project_client_capabilities (
      project_id, capability_id, included, updated_by, updated_at
    )
    values (
      p_project_id,
      cap,
      cap = any(coalesce(p_included, array[]::text[])),
      actor,
      now()
    )
    on conflict (project_id, capability_id) do update
      set included = excluded.included,
          updated_by = excluded.updated_by,
          updated_at = now();
  end loop;
end;
$$;

revoke all on function public.replace_project_client_scope(uuid, text[], uuid) from public;
grant execute on function public.replace_project_client_scope(uuid, text[], uuid) to service_role;
