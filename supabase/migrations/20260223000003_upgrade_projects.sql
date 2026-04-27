alter table public.projects
  add column if not exists metadata jsonb default '{}'::jsonb;

create table if not exists public.project_external_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  folder_id uuid not null,
  token text not null unique,
  created_by uuid not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.project_external_links enable row level security;

drop policy if exists project_external_links_select_org on public.project_external_links;
create policy project_external_links_select_org
on public.project_external_links
for select
to authenticated
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
    where p.id = project_external_links.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_external_links_insert_org on public.project_external_links;
create policy project_external_links_insert_org
on public.project_external_links
for insert
to authenticated
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om
      on om.org_id = p.org_id
    where p.id = project_external_links.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_external_links_select_anon_token on public.project_external_links;
create policy project_external_links_select_anon_token
on public.project_external_links
for select
to anon
using (
  auth.role() = 'anon'
  and (expires_at is null or expires_at > now())
);

create index if not exists idx_project_external_links_project_id
  on public.project_external_links(project_id);

create index if not exists idx_project_external_links_token
  on public.project_external_links(token);
