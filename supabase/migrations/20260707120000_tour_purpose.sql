-- 360 Tours: purpose classification (marketing / aerial / wayfinding / construction).
-- Additive tag that drives UI defaults (branding, plan requirement, evidentiary
-- hash) per docs/design/TOUR_BUILDER_PLAN.md §9.3 — not a fork of the engine.

alter table public.project_tours
  add column if not exists purpose text
    check (purpose in ('marketing', 'aerial', 'wayfinding', 'construction'));

comment on column public.project_tours.purpose is
  'Tour purpose tag — drives default branding/plan/evidentiary-hash behavior. See TOUR_BUILDER_PLAN.md §9.3.';
