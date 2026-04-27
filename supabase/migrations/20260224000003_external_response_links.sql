create table if not exists public.project_external_links (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  target_type text not null check (target_type in ('RFI', 'Submittal')),
  target_id uuid not null,
  token text not null unique,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.project_external_links enable row level security;

drop policy if exists project_external_links_select_same_org on public.project_external_links;
create policy project_external_links_select_same_org
on public.project_external_links
for select
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_external_links.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_external_links_insert_same_org on public.project_external_links;
create policy project_external_links_insert_same_org
on public.project_external_links
for insert
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_external_links.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_external_links_update_same_org on public.project_external_links;
create policy project_external_links_update_same_org
on public.project_external_links
for update
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_external_links.project_id
      and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_external_links.project_id
      and om.user_id = auth.uid()
  )
);

alter table public.project_rfis add column if not exists response_text text;
alter table public.project_submittals add column if not exists response_text text;

create index if not exists idx_project_external_links_token on public.project_external_links(token);
create index if not exists idx_project_external_links_project_target on public.project_external_links(project_id, target_type, target_id);
