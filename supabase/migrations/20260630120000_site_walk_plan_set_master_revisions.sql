-- Site Walk plan-set lifecycle: master/working role + drawing revisions.
-- Additive only. Backs docs/design/PLAN_SET_LIFECYCLE.md (clean-by-default model).
-- A plan set is the pin-free "master" (the key). Revisions supersede prior masters and are
-- retained for history. Pins stay session-scoped (clean per walk); "previous activity" is a
-- read-only query, so NO pin-table change is needed in v1.

alter table public.site_walk_plan_sets
  add column if not exists kind text not null default 'master'
    check (kind in ('master', 'working')),
  add column if not exists master_plan_set_id uuid
    references public.site_walk_plan_sets(id) on delete cascade,
  add column if not exists revision_number integer not null default 1,
  add column if not exists revision_label text,
  add column if not exists supersedes_plan_set_id uuid
    references public.site_walk_plan_sets(id) on delete set null,
  add column if not exists is_current_revision boolean not null default true;

-- Existing rows are masters / current by default (the defaults above already cover them).

-- One CURRENT master per (project, drawing lineage). A lineage is the chain linked by
-- supersedes_plan_set_id; we approximate "lineage head" by project for the common single-package
-- case via a partial index that simply speeds "current revisions for a project" lookups.
create index if not exists idx_sw_plan_sets_project_current
  on public.site_walk_plan_sets(project_id)
  where is_current_revision = true and kind = 'master';

create index if not exists idx_sw_plan_sets_master
  on public.site_walk_plan_sets(master_plan_set_id)
  where master_plan_set_id is not null;

create index if not exists idx_sw_plan_sets_supersedes
  on public.site_walk_plan_sets(supersedes_plan_set_id)
  where supersedes_plan_set_id is not null;

comment on column public.site_walk_plan_sets.kind is
  'master = pin-free source-of-record drawing; working = (future) derived annotation layer.';
comment on column public.site_walk_plan_sets.revision_number is
  'Drawing revision; a new upload into the same project lineage increments this.';
comment on column public.site_walk_plan_sets.is_current_revision is
  'False once a newer revision supersedes this one (kept for as-built history).';
