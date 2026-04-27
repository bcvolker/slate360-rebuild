create table if not exists public.project_notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.project_notifications enable row level security;

drop policy if exists project_notifications_select_own on public.project_notifications;
create policy project_notifications_select_own
on public.project_notifications
for select
using (auth.uid() = user_id);

drop policy if exists project_notifications_insert_own on public.project_notifications;
create policy project_notifications_insert_own
on public.project_notifications
for insert
with check (auth.uid() = user_id);

drop policy if exists project_notifications_update_own on public.project_notifications;
create policy project_notifications_update_own
on public.project_notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists project_notifications_delete_own on public.project_notifications;
create policy project_notifications_delete_own
on public.project_notifications
for delete
using (auth.uid() = user_id);

create index if not exists idx_project_notifications_user_read_created
  on public.project_notifications(user_id, is_read, created_at desc);
