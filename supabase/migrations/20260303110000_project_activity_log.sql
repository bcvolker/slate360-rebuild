create table if not exists public.project_activity_log (
  id uuid primary key default gen_random_uuid(),
  org_id uuid,
  project_id uuid not null references public.projects(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.project_activity_log enable row level security;

drop policy if exists project_activity_log_service_role_all on public.project_activity_log;
create policy project_activity_log_service_role_all
on public.project_activity_log
for all
to service_role
using (true)
with check (true);

create index if not exists idx_project_activity_log_project_created
  on public.project_activity_log(project_id, created_at desc);

create index if not exists idx_project_activity_log_org_created
  on public.project_activity_log(org_id, created_at desc);
