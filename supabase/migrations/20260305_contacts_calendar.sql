-- ================================================================
-- Contacts + Calendar Events
-- Migration: 20260305_contacts_calendar.sql
-- ================================================================

-- ----------------------------------------------------------------
-- org_contacts: standalone contacts not tied to auth users
-- ----------------------------------------------------------------
create table if not exists public.org_contacts (
  id            uuid primary key default gen_random_uuid(),
  org_id        uuid not null references public.organizations(id) on delete cascade,
  created_by    uuid not null references auth.users(id) on delete set null,

  -- Core identity
  name          text not null,
  email         text,
  phone         text,
  company       text,
  title         text,       -- job title / role label
  notes         text,

  -- UI helpers
  initials      text generated always as (
    upper(
      case
        when position(' ' in name) > 0
          then substring(name for 1) || substring(name from position(' ' in name) + 1 for 1)
        else substring(name for 2)
      end
    )
  ) stored,
  color         text not null default '#1E3A8A',

  -- Metadata
  tags          text[] default '{}',
  is_archived   boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Project associations (many-to-many)
create table if not exists public.contact_projects (
  contact_id  uuid not null references public.org_contacts(id) on delete cascade,
  project_id  uuid not null references public.projects(id) on delete cascade,
  primary key (contact_id, project_id)
);

-- Files attached to a contact (documentation, contracts, etc.)
create table if not exists public.contact_files (
  id          uuid primary key default gen_random_uuid(),
  contact_id  uuid not null references public.org_contacts(id) on delete cascade,
  org_id      uuid not null references public.organizations(id) on delete cascade,
  file_name   text not null,
  s3_key      text not null,
  mime_type   text,
  size_bytes  bigint,
  uploaded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- calendar_events: per-org persistent events
-- ----------------------------------------------------------------
create table if not exists public.calendar_events (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid not null references public.organizations(id) on delete cascade,
  created_by  uuid not null references auth.users(id) on delete set null,
  project_id  uuid references public.projects(id) on delete set null,

  title       text not null,
  date        date not null,           -- event date (YYYY-MM-DD)
  start_time  time,                    -- optional start time
  end_time    time,                    -- optional end time
  color       text not null default '#FF4D00',
  all_day     boolean not null default true,
  description text,
  location    text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ----------------------------------------------------------------
-- Indexes
-- ----------------------------------------------------------------
create index if not exists org_contacts_org_id_idx      on public.org_contacts(org_id);
create index if not exists org_contacts_email_idx        on public.org_contacts(email);
create index if not exists contact_projects_project_idx  on public.contact_projects(project_id);
create index if not exists contact_files_contact_idx     on public.contact_files(contact_id);
create index if not exists calendar_events_org_date_idx  on public.calendar_events(org_id, date);
create index if not exists calendar_events_project_idx   on public.calendar_events(project_id);

-- ----------------------------------------------------------------
-- updated_at triggers
-- ----------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists set_org_contacts_updated_at on public.org_contacts;
create trigger set_org_contacts_updated_at
  before update on public.org_contacts
  for each row execute function public.set_updated_at();

drop trigger if exists set_calendar_events_updated_at on public.calendar_events;
create trigger set_calendar_events_updated_at
  before update on public.calendar_events
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------
alter table public.org_contacts     enable row level security;
alter table public.contact_projects enable row level security;
alter table public.contact_files    enable row level security;
alter table public.calendar_events  enable row level security;

-- org_contacts: members of the org can read; admins/owners can write
create policy "org_contacts_select" on public.org_contacts
  for select using (
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "org_contacts_insert" on public.org_contacts
  for insert with check (
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "org_contacts_update" on public.org_contacts
  for update using (
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid()
    )
  );

create policy "org_contacts_delete" on public.org_contacts
  for delete using (
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- contact_projects: same org access
create policy "contact_projects_select" on public.contact_projects
  for select using (
    contact_id in (
      select id from public.org_contacts where org_id in (
        select org_id from public.organization_members where user_id = auth.uid()
      )
    )
  );

create policy "contact_projects_write" on public.contact_projects
  for all using (
    contact_id in (
      select id from public.org_contacts where org_id in (
        select org_id from public.organization_members where user_id = auth.uid()
      )
    )
  );

-- contact_files: same org access
create policy "contact_files_select" on public.contact_files
  for select using (
    org_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "contact_files_insert" on public.contact_files
  for insert with check (
    org_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "contact_files_delete" on public.contact_files
  for delete using (
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

-- calendar_events: all org members can read/write own, admins can delete any
create policy "calendar_events_select" on public.calendar_events
  for select using (
    org_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "calendar_events_insert" on public.calendar_events
  for insert with check (
    org_id in (
      select org_id from public.organization_members where user_id = auth.uid()
    )
  );

create policy "calendar_events_update" on public.calendar_events
  for update using (
    created_by = auth.uid() or
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );

create policy "calendar_events_delete" on public.calendar_events
  for delete using (
    created_by = auth.uid() or
    org_id in (
      select org_id from public.organization_members
      where user_id = auth.uid() and role in ('owner','admin')
    )
  );
