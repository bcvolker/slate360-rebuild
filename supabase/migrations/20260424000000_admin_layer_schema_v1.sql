-- ============================================================================
-- 20260424000000_admin_layer_schema_v1.sql
-- ----------------------------------------------------------------------------
-- Admin-layer schema patches signed off in BACKEND_AUDIT.md §6 (2026-04-24).
--
-- Phase 1 of "3 Act Play" UX strategy. Locks in first-class columns for
-- Global Settings, Address Book, and Project Creation, plus the user_profiles
-- table and ad-hoc Site Walk session support. Drops the duplicate org_branding
-- table (canonical source is organizations.brand_settings).
--
-- All changes are idempotent (IF EXISTS / IF NOT EXISTS) so this can be
-- replayed safely against environments that have partially applied earlier
-- versions of these patches.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- Patch 1: First-class company identity columns on organizations.
-- brand_settings jsonb remains as overflow for less-structured fields.
-- ----------------------------------------------------------------------------
alter table public.organizations
  add column if not exists address      text,
  add column if not exists website      text,
  add column if not exists phone        text,
  add column if not exists brand_colors text[] not null default array[]::text[];

comment on column public.organizations.address      is 'Primary mailing address for the organization (single-line free text).';
comment on column public.organizations.website      is 'Public website URL for the organization.';
comment on column public.organizations.phone        is 'Primary phone number for the organization.';
comment on column public.organizations.brand_colors is 'Ordered palette: [primary, secondary, accent, ...]. Use brand_settings for finer-grained tokens.';

-- ----------------------------------------------------------------------------
-- Patch 2: First-class project columns. metadata + report_defaults remain
-- for fields that don't warrant their own column.
-- ----------------------------------------------------------------------------
alter table public.projects
  add column if not exists location          text,
  add column if not exists address           text,
  add column if not exists scope             text,
  add column if not exists start_date        date,
  add column if not exists end_date          date,
  add column if not exists budget_total      numeric(14,2),
  add column if not exists client_contact_id uuid references public.org_contacts(id) on delete set null,
  add column if not exists is_archived       boolean not null default false;

comment on column public.projects.location          is 'Human-readable location label (e.g. "Downtown Austin").';
comment on column public.projects.address           is 'Street address used for GPS bounding and deliverable headers.';
comment on column public.projects.scope             is 'Short scope-of-work description (free text).';
comment on column public.projects.start_date        is 'Planned project start date (date-only, no timezone).';
comment on column public.projects.end_date          is 'Planned project completion date.';
comment on column public.projects.budget_total      is 'Top-level budget rollup. Detail rows live in project_budgets.';
comment on column public.projects.client_contact_id is 'Primary client (FK -> org_contacts). NULL when no client contact assigned.';
comment on column public.projects.is_archived       is 'Soft-archive flag. Archived projects are hidden from default lists.';

create index if not exists projects_client_contact_idx on public.projects (client_contact_id);
create index if not exists projects_is_archived_idx    on public.projects (is_archived) where is_archived = false;

-- ----------------------------------------------------------------------------
-- Patch 3: Per-user profile (separate from org branding).
-- ----------------------------------------------------------------------------
create table if not exists public.user_profiles (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  full_name     text,
  title         text,
  phone         text,
  signature_url text,
  avatar_url    text,
  preferences   jsonb       not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

comment on table  public.user_profiles               is 'Per-user profile fields used by deliverables (signature, title) and UI personalization. Distinct from organizations.brand_settings.';
comment on column public.user_profiles.signature_url is 'Presigned S3 URL for the users digital signature image.';
comment on column public.user_profiles.preferences   is 'Free-form jsonb for per-user UI preferences (theme, default tab, etc.).';

alter table public.user_profiles enable row level security;

drop policy if exists user_profiles_select_self on public.user_profiles;
create policy user_profiles_select_self
  on public.user_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists user_profiles_insert_self on public.user_profiles;
create policy user_profiles_insert_self
  on public.user_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists user_profiles_update_self on public.user_profiles;
create policy user_profiles_update_self
  on public.user_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.user_profiles_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists user_profiles_touch_updated_at on public.user_profiles;
create trigger user_profiles_touch_updated_at
  before update on public.user_profiles
  for each row
  execute function public.user_profiles_touch_updated_at();

-- ----------------------------------------------------------------------------
-- Patch 4: Ad-hoc Site Walk sessions (Act 2 "Zero-Friction Walk").
-- project_id becomes nullable; is_ad_hoc flags sessions captured before a
-- project exists. Post-walk attach reassigns project_id and clears the flag.
-- ----------------------------------------------------------------------------
alter table public.site_walk_sessions
  alter column project_id drop not null;

alter table public.site_walk_sessions
  add column if not exists is_ad_hoc boolean not null default false;

comment on column public.site_walk_sessions.project_id is 'Nullable: NULL while session is ad-hoc, populated once attached to a project.';
comment on column public.site_walk_sessions.is_ad_hoc  is 'TRUE when session was started without a project. Cleared once attach-session completes.';

create index if not exists site_walk_sessions_ad_hoc_idx
  on public.site_walk_sessions (is_ad_hoc)
  where is_ad_hoc = true;

-- ----------------------------------------------------------------------------
-- Cleanup: drop the duplicate org_branding table. Canonical source is
-- organizations.brand_settings (jsonb) plus the new first-class columns above.
-- ----------------------------------------------------------------------------
drop table if exists public.org_branding cascade;

commit;
