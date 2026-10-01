-- Client delivery scope is an operations-owner decision.
-- Authenticated project members cannot write the table or call the replace function.
-- The application calls the function as service_role only after canAccessOperationsConsole.

drop policy if exists project_client_capabilities_write on public.project_client_capabilities;

comment on table public.project_client_capabilities is
  'Which client-facing capabilities are part of this project. Authenticated users may read a project they can access. Writes are service_role only, after the operations-owner check in the application.';

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
  -- A signed-in member, manager, or client cannot execute this, even if
  -- execute is later granted. Service role is the only caller, and the
  -- route has already required the operations owner.
  if auth.role() is distinct from 'service_role' then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  actor := p_actor;
  if actor is null then
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

revoke all on function public.replace_project_client_scope(uuid, text[], uuid) from public, anon, authenticated;
grant execute on function public.replace_project_client_scope(uuid, text[], uuid) to service_role;

-- Middleware staff signal. Organization membership is not staff.
-- slate360_staff has no authenticated policies, so the user client cannot select it.
create or replace function public.user_is_slate_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.slate360_staff s
    where s.email = lower(coalesce(auth.jwt() ->> 'email', ''))
      and s.revoked_at is null
  );
$$;

revoke all on function public.user_is_slate_staff() from public;
grant execute on function public.user_is_slate_staff() to authenticated;
