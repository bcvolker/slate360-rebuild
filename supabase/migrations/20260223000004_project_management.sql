create table if not exists public.project_budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  cost_code text not null,
  description text,
  budget_amount numeric not null default 0,
  committed_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  status text not null default 'not_started',
  created_at timestamptz not null default now()
);

alter table public.project_budgets enable row level security;
alter table public.project_tasks enable row level security;

drop policy if exists project_budgets_select_same_org on public.project_budgets;
create policy project_budgets_select_same_org
on public.project_budgets
for select
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_budgets.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_budgets_insert_same_org on public.project_budgets;
create policy project_budgets_insert_same_org
on public.project_budgets
for insert
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_budgets.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_budgets_update_same_org on public.project_budgets;
create policy project_budgets_update_same_org
on public.project_budgets
for update
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_budgets.project_id
      and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_budgets.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_tasks_select_same_org on public.project_tasks;
create policy project_tasks_select_same_org
on public.project_tasks
for select
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_tasks.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_tasks_insert_same_org on public.project_tasks;
create policy project_tasks_insert_same_org
on public.project_tasks
for insert
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_tasks.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_tasks_update_same_org on public.project_tasks;
create policy project_tasks_update_same_org
on public.project_tasks
for update
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_tasks.project_id
      and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_tasks.project_id
      and om.user_id = auth.uid()
  )
);

create index if not exists idx_project_budgets_project_id on public.project_budgets(project_id);
create index if not exists idx_project_tasks_project_id on public.project_tasks(project_id);
