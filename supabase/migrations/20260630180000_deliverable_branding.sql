-- Deliverable branding — per-deliverable overrides + normalized logo-overlay transform (additive).
-- Design: docs/design/DELIVERABLE_BRANDING_LOCKED.md (9+ AI panel consensus).
-- Works for BOTH Site Walk deliverables and Twin spaces via (deliverable_type, deliverable_id).
-- Resolution order at render time: Slate360 default -> org brand_settings -> project -> this override,
-- then tier-gated (white-label stripped for non-enterprise) SERVER-SIDE. Never trust the client.

create table if not exists public.deliverable_branding (
  id                uuid primary key default gen_random_uuid(),
  org_id            uuid not null references public.organizations(id) on delete cascade,
  deliverable_type  text not null check (deliverable_type in ('site_walk', 'twin')),
  deliverable_id    uuid not null,
  project_id        uuid references public.projects(id) on delete set null,
  use_org_branding  boolean not null default true,
  -- normalized logo overlay: { enabled, logoUrl, transform:{x,y,scale,opacity}, textLines:[...] }
  logo_overlay      jsonb,
  accent_color      text,
  header_title      text,
  header_subtitle   text,
  footer_text       text,
  contact_block     jsonb,
  -- enterprise-only intent; the resolver forces false for non-white-label tiers
  hide_slate360_mark boolean not null default false,
  updated_by        uuid references auth.users(id) on delete set null,
  updated_at        timestamptz not null default now(),
  created_at        timestamptz not null default now(),
  unique (deliverable_type, deliverable_id)
);
create index if not exists deliverable_branding_org_idx on public.deliverable_branding(org_id);
create index if not exists deliverable_branding_project_idx on public.deliverable_branding(project_id) where project_id is not null;

alter table public.deliverable_branding enable row level security;

-- Org members read/write branding for their org; public viewers NEVER read this table directly —
-- they get resolved branding through a token-gated service-role endpoint.
drop policy if exists deliverable_branding_select on public.deliverable_branding;
create policy deliverable_branding_select on public.deliverable_branding
  for select using (
    org_id in (select org_id from public.organization_members where user_id = auth.uid())
  );
drop policy if exists deliverable_branding_write on public.deliverable_branding;
create policy deliverable_branding_write on public.deliverable_branding
  for all using (
    org_id in (select org_id from public.organization_members where user_id = auth.uid())
  ) with check (
    org_id in (select org_id from public.organization_members where user_id = auth.uid())
  );

-- Project-level branding defaults live on projects.settings.branding (jsonb, no migration needed);
-- org defaults live on the existing organizations brand settings.
