-- ============================================================
-- Migration: project management tables
-- Date: 2026-02-27
-- ============================================================

-- ── project_stakeholders ──────────────────────────────────────
create table if not exists public.project_stakeholders (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  name          text not null,
  role          text not null,           -- Owner, Architect, GC, Subcontractor, Engineer, Inspector, Other
  company       text,
  email         text,
  phone         text,
  address       text,
  license_no    text,
  notes         text,
  status        text not null default 'Active', -- Active, Inactive
  created_at    timestamptz not null default now(),
  updated_at    timestamptz
);

create index if not exists idx_project_stakeholders_project
  on public.project_stakeholders(project_id);

alter table public.project_stakeholders enable row level security;

drop policy if exists "project_stakeholders_owner" on public.project_stakeholders;
create policy "project_stakeholders_owner"
  on public.project_stakeholders
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_stakeholders.project_id
        and pm.user_id    = auth.uid()
    )
  );

-- ── project_contracts ─────────────────────────────────────────
create table if not exists public.project_contracts (
  id              uuid primary key default gen_random_uuid(),
  project_id      uuid not null references public.projects(id) on delete cascade,
  title           text not null,
  contract_type   text,    -- AIA A101, Subcontract, Lump Sum, GMP, T&M, Other
  parties         text,    -- comma-separated party names
  executed_date   date,
  contract_value  numeric(14,2),
  status          text not null default 'Draft',  -- Draft, Executed, Expired, Terminated
  summary         text,    -- AI-generated plain-english summary
  key_requirements text,   -- AI-extracted requirements (JSON array as text)
  file_url        text,    -- S3 URL
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create index if not exists idx_project_contracts_project
  on public.project_contracts(project_id);

alter table public.project_contracts enable row level security;

drop policy if exists "project_contracts_owner" on public.project_contracts;
create policy "project_contracts_owner"
  on public.project_contracts
  using (
    exists (
      select 1 from public.project_members pm
      where pm.project_id = project_contracts.project_id
        and pm.user_id    = auth.uid()
    )
  );
