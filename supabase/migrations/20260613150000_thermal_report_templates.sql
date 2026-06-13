-- Thermal Analysis: user-editable professional report templates (per-org).
-- Seed templates live in code (lib/thermal/report-templates.ts); this table stores
-- the org's saved/customized templates.

create table if not exists public.thermal_report_templates (
  id          uuid primary key default gen_random_uuid(),
  org_id      uuid references public.organizations(id) on delete cascade,
  created_by  uuid references auth.users(id) on delete set null,
  name        text not null,
  discipline  text not null default 'general',
  -- Full template document (sections, standards, methodology, disclaimer, severity, branding).
  config      jsonb not null default '{}'::jsonb,
  is_archived boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists idx_thermal_report_templates_org
  on public.thermal_report_templates(org_id, is_archived, updated_at desc);

comment on table public.thermal_report_templates is
  'Org-scoped, user-editable thermography report templates. Seed templates are in code.';

alter table public.thermal_report_templates enable row level security;

-- Access is mediated by the Operations Console server routes (admin client); RLS is
-- defensive. Members of the owning org may read their templates.
drop policy if exists thermal_report_templates_org_read on public.thermal_report_templates;
create policy thermal_report_templates_org_read
  on public.thermal_report_templates for select
  using (
    org_id in (
      select om.org_id from public.organization_members om
      where om.user_id = auth.uid()
    )
  );
