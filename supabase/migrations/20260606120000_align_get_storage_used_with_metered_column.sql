-- Align quota enforcement with metered writes: organizations.org_storage_used_bytes
-- increment_org_storage updates this column; get_storage_used must read the same source.

create or replace function public.get_storage_used(p_org_id uuid)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  metered_bytes bigint;
begin
  select coalesce(org_storage_used_bytes, 0)
    into metered_bytes
  from public.organizations
  where id = p_org_id;

  return coalesce(metered_bytes, 0);
end;
$$;

comment on function public.get_storage_used(uuid) is
  'Returns organizations.org_storage_used_bytes — same source updated by increment_org_storage.';
