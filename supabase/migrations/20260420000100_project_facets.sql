-- Project facets: ensure all per-app deliverable tables have a nullable
-- project_id so they can attach to a unified Slate360 project.
-- NULL = standalone library item, NOT NULL = belongs to a project.
--
-- Note: tours.project_id and design_studio_assets.project_id already exist
-- on live (predates this migration). content_studio tables don't exist yet —
-- when they're created, they MUST include `project_id uuid references projects(id)`.

-- Defensive: re-affirm columns exist (no-op if already present).
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='tours') then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='tours' and column_name='project_id'
    ) then
      alter table public.tours add column project_id uuid references public.projects(id) on delete set null;
    end if;
    create index if not exists idx_tours_project on public.tours (project_id) where project_id is not null;
    create index if not exists idx_tours_standalone on public.tours (org_id, created_at desc) where project_id is null;
  end if;

  if exists (select 1 from information_schema.tables where table_schema='public' and table_name='design_studio_assets') then
    if not exists (
      select 1 from information_schema.columns
      where table_schema='public' and table_name='design_studio_assets' and column_name='project_id'
    ) then
      alter table public.design_studio_assets add column project_id uuid references public.projects(id) on delete set null;
    end if;
    create index if not exists idx_design_assets_project on public.design_studio_assets (project_id) where project_id is not null;
  end if;
end$$;

comment on column public.tours.project_id is 'NULL = standalone library tour; NOT NULL = belongs to a Slate360 project (cross-app).';
comment on column public.design_studio_assets.project_id is 'NULL = standalone design asset; NOT NULL = belongs to a Slate360 project.';
