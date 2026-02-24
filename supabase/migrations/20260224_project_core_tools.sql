create table if not exists public.project_rfis (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  subject text not null,
  question text not null,
  status text not null default 'Open',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.project_submittals (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  spec_section text,
  status text not null default 'Pending',
  created_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.project_budgets (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  cost_code text not null,
  description text,
  budget_amount numeric not null default 0,
  spent_amount numeric not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  start_date date,
  end_date date,
  status text not null default 'Not Started',
  created_at timestamptz not null default now()
);

alter table public.project_budgets add column if not exists spent_amount numeric not null default 0;
alter table public.project_tasks alter column status set default 'Not Started';
update public.project_tasks set status = 'Not Started' where status = 'not_started';

alter table public.project_rfis enable row level security;
alter table public.project_submittals enable row level security;
alter table public.project_budgets enable row level security;
alter table public.project_tasks enable row level security;

drop policy if exists project_rfis_select_same_org on public.project_rfis;
create policy project_rfis_select_same_org
on public.project_rfis
for select
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_rfis.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_rfis_insert_same_org on public.project_rfis;
create policy project_rfis_insert_same_org
on public.project_rfis
for insert
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_rfis.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_rfis_update_same_org on public.project_rfis;
create policy project_rfis_update_same_org
on public.project_rfis
for update
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_rfis.project_id
      and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_rfis.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_rfis_delete_same_org on public.project_rfis;
create policy project_rfis_delete_same_org
on public.project_rfis
for delete
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_rfis.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_submittals_select_same_org on public.project_submittals;
create policy project_submittals_select_same_org
on public.project_submittals
for select
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_submittals.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_submittals_insert_same_org on public.project_submittals;
create policy project_submittals_insert_same_org
on public.project_submittals
for insert
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_submittals.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_submittals_update_same_org on public.project_submittals;
create policy project_submittals_update_same_org
on public.project_submittals
for update
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_submittals.project_id
      and om.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_submittals.project_id
      and om.user_id = auth.uid()
  )
);

drop policy if exists project_submittals_delete_same_org on public.project_submittals;
create policy project_submittals_delete_same_org
on public.project_submittals
for delete
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_submittals.project_id
      and om.user_id = auth.uid()
  )
);

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

drop policy if exists project_budgets_delete_same_org on public.project_budgets;
create policy project_budgets_delete_same_org
on public.project_budgets
for delete
using (
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

drop policy if exists project_tasks_delete_same_org on public.project_tasks;
create policy project_tasks_delete_same_org
on public.project_tasks
for delete
using (
  exists (
    select 1
    from public.projects p
    join public.organization_members om on om.org_id = p.org_id
    where p.id = project_tasks.project_id
      and om.user_id = auth.uid()
  )
);

create index if not exists idx_project_rfis_project_id on public.project_rfis(project_id);
create index if not exists idx_project_submittals_project_id on public.project_submittals(project_id);
create index if not exists idx_project_budgets_project_id on public.project_budgets(project_id);
create index if not exists idx_project_tasks_project_id on public.project_tasks(project_id);
