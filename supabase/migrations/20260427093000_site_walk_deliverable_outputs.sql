-- Site Walk non-PDF deliverable outputs.
--
-- Expands report-centric deliverables into hosted outputs, portals, Kanban
-- boards, cinematic presentations, spreadsheets, and reusable block rows.

-- Expand deliverable_type and status CHECK constraints while preserving data.
alter table public.site_walk_deliverables
  drop constraint if exists site_walk_deliverables_deliverable_type_check;
alter table public.site_walk_deliverables
  drop constraint if exists site_walk_deliverables_status_check;
alter table public.site_walk_deliverables
  drop constraint if exists sw_deliverables_deliverable_type_check;
alter table public.site_walk_deliverables
  drop constraint if exists sw_deliverables_status_check;

alter table public.site_walk_deliverables
  add constraint sw_deliverables_deliverable_type_check
  check (deliverable_type in (
    'report',
    'punchlist',
    'photo_log',
    'rfi',
    'estimate',
    'status_report',
    'proposal',
    'field_report',
    'inspection_package',
    'safety_report',
    'proof_of_work',
    'client_portal',
    'kanban_board',
    'cinematic_presentation',
    'spreadsheet_export',
    'custom'
  ));

alter table public.site_walk_deliverables
  add constraint sw_deliverables_status_check
  check (status in ('draft', 'in_review', 'approved', 'submitted', 'shared', 'published', 'archived', 'revoked'));

alter table public.site_walk_deliverables
  add column if not exists output_mode text not null default 'hosted',
  add column if not exists brand_snapshot jsonb not null default '{}'::jsonb,
  add column if not exists portal_config jsonb not null default '{}'::jsonb,
  add column if not exists presentation_config jsonb not null default '{}'::jsonb,
  add column if not exists kanban_config jsonb not null default '{}'::jsonb,
  add column if not exists export_config jsonb not null default '{}'::jsonb,
  add column if not exists summary_stats jsonb not null default '{}'::jsonb,
  add column if not exists last_published_at timestamptz,
  add column if not exists published_by uuid references auth.users(id) on delete set null;

do $$
begin
  alter table public.site_walk_deliverables
    drop constraint if exists sw_deliverables_output_mode_check;
  alter table public.site_walk_deliverables
    add constraint sw_deliverables_output_mode_check
    check (output_mode in ('hosted', 'pdf', 'portal', 'presentation', 'spreadsheet', 'zip', 'email_body'));
end $$;

create index if not exists idx_sw_deliverables_project_type_status
  on public.site_walk_deliverables(project_id, deliverable_type, status);
create index if not exists idx_sw_deliverables_published_by
  on public.site_walk_deliverables(published_by)
  where published_by is not null;

create table if not exists public.site_walk_deliverable_blocks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid references public.projects(id) on delete cascade,
  deliverable_id uuid not null references public.site_walk_deliverables(id) on delete cascade,
  source_item_id uuid references public.site_walk_items(id) on delete set null,
  block_type text not null,
  content jsonb not null default '{}'::jsonb,
  sort_order integer not null default 0,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.site_walk_deliverable_blocks
    drop constraint if exists sw_deliverable_blocks_block_type_check;
  alter table public.site_walk_deliverable_blocks
    add constraint sw_deliverable_blocks_block_type_check
    check (block_type in (
      'cover', 'executive_summary', 'text', 'photo', 'markup', 'plan_map', 'pin_list',
      'punch_table', 'estimate_table', 'status_summary', 'before_after',
      'signature', 'file_attachment', 'comment_thread', 'divider', 'custom'
    ));
end $$;

create index if not exists idx_sw_deliverable_blocks_sort
  on public.site_walk_deliverable_blocks(deliverable_id, sort_order);
create index if not exists idx_sw_deliverable_blocks_source_item
  on public.site_walk_deliverable_blocks(source_item_id)
  where source_item_id is not null;
create index if not exists idx_sw_deliverable_blocks_project
  on public.site_walk_deliverable_blocks(project_id);

create or replace function public.set_site_walk_deliverable_blocks_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sw_deliverable_blocks_updated_at on public.site_walk_deliverable_blocks;
create trigger trg_sw_deliverable_blocks_updated_at
  before update on public.site_walk_deliverable_blocks
  for each row execute function public.set_site_walk_deliverable_blocks_updated_at();

alter table public.site_walk_deliverable_blocks enable row level security;

drop policy if exists sw_deliverable_blocks_select on public.site_walk_deliverable_blocks;
drop policy if exists sw_deliverable_blocks_insert on public.site_walk_deliverable_blocks;
drop policy if exists sw_deliverable_blocks_update on public.site_walk_deliverable_blocks;
drop policy if exists sw_deliverable_blocks_delete on public.site_walk_deliverable_blocks;

create policy sw_deliverable_blocks_select on public.site_walk_deliverable_blocks
  for select to authenticated
  using (public.user_can_access_org_or_project(org_id, project_id));

create policy sw_deliverable_blocks_insert on public.site_walk_deliverable_blocks
  for insert to authenticated
  with check (created_by = auth.uid() and public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_deliverable_blocks_update on public.site_walk_deliverable_blocks
  for update to authenticated
  using (created_by = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id))
  with check (created_by = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

create policy sw_deliverable_blocks_delete on public.site_walk_deliverable_blocks
  for delete to authenticated
  using (created_by = auth.uid() or public.user_can_manage_org_or_project(org_id, project_id));

create table if not exists public.site_walk_portal_boards (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  deliverable_id uuid references public.site_walk_deliverables(id) on delete cascade,
  title text not null,
  board_type text not null default 'kanban',
  columns jsonb not null default '[]'::jsonb,
  filters jsonb not null default '{}'::jsonb,
  is_public boolean not null default false,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

do $$
begin
  alter table public.site_walk_portal_boards
    drop constraint if exists sw_portal_boards_board_type_check;
  alter table public.site_walk_portal_boards
    add constraint sw_portal_boards_board_type_check
    check (board_type in ('kanban', 'plan_review', 'proof_of_work', 'client_review'));
end $$;

create index if not exists idx_sw_portal_boards_project
  on public.site_walk_portal_boards(project_id);
create index if not exists idx_sw_portal_boards_deliverable
  on public.site_walk_portal_boards(deliverable_id)
  where deliverable_id is not null;

create or replace function public.set_site_walk_portal_boards_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_sw_portal_boards_updated_at on public.site_walk_portal_boards;
create trigger trg_sw_portal_boards_updated_at
  before update on public.site_walk_portal_boards
  for each row execute function public.set_site_walk_portal_boards_updated_at();

alter table public.site_walk_portal_boards enable row level security;

drop policy if exists sw_portal_boards_select on public.site_walk_portal_boards;
drop policy if exists sw_portal_boards_insert on public.site_walk_portal_boards;
drop policy if exists sw_portal_boards_update on public.site_walk_portal_boards;
drop policy if exists sw_portal_boards_delete on public.site_walk_portal_boards;

create policy sw_portal_boards_select on public.site_walk_portal_boards
  for select to authenticated
  using (public.user_can_access_project(project_id));

create policy sw_portal_boards_insert on public.site_walk_portal_boards
  for insert to authenticated
  with check (created_by = auth.uid() and public.user_can_manage_project(project_id));

create policy sw_portal_boards_update on public.site_walk_portal_boards
  for update to authenticated
  using (created_by = auth.uid() or public.user_can_manage_project(project_id))
  with check (created_by = auth.uid() or public.user_can_manage_project(project_id));

create policy sw_portal_boards_delete on public.site_walk_portal_boards
  for delete to authenticated
  using (created_by = auth.uid() or public.user_can_manage_project(project_id));

-- Public access token support for Site Walk portals/presentations/responders.
alter table public.deliverable_access_tokens
  drop constraint if exists deliverable_access_tokens_deliverable_type_check;
alter table public.deliverable_access_tokens
  drop constraint if exists deliverable_access_tokens_role_check;
alter table public.deliverable_access_tokens
  drop constraint if exists sw_deliverable_access_tokens_type_check;
alter table public.deliverable_access_tokens
  drop constraint if exists sw_deliverable_access_tokens_role_check;

alter table public.deliverable_access_tokens
  add constraint sw_deliverable_access_tokens_type_check
  check (deliverable_type in ('tour', 'report', 'walk', 'file', 'site_walk_deliverable', 'site_walk_portal', 'site_walk_presentation'));

alter table public.deliverable_access_tokens
  add constraint sw_deliverable_access_tokens_role_check
  check (role in ('view', 'download', 'comment', 'respond', 'approve'));

alter table public.deliverable_access_tokens
  add column if not exists recipient_email text,
  add column if not exists recipient_phone text,
  add column if not exists recipient_name text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

comment on table public.site_walk_deliverable_blocks is
  'Normalized block-editor rows for Site Walk hosted outputs, reports, portals, and presentations.';
comment on table public.site_walk_portal_boards is
  'Interactive Site Walk portal and Kanban board configuration tied to project deliverables.';
