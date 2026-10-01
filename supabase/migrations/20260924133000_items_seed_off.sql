-- New projects start with Items off. Documents, History, and Compare stay on.
-- Existing project_client_capabilities rows are not updated.

create or replace function public.seed_project_client_capabilities()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_client_capabilities (project_id, capability_id, included)
  select new.id, cap.id, cap.id in ('documents', 'history', 'compare')
  from (
    values
      ('reality'), ('geometry'), ('pano360'), ('plans'), ('thermal'),
      ('items'), ('documents'), ('history'), ('compare')
  ) as cap(id)
  on conflict (project_id, capability_id) do nothing;
  return new;
end;
$$;
