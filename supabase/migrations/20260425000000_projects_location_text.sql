-- ============================================================================
-- 20260425000000_projects_location_text.sql
-- ----------------------------------------------------------------------------
-- Reconciles projects.location to the type intended by the §6 admin-layer
-- patches. Live DB had it pre-existing as jsonb; the patch authored on
-- 2026-04-24 declared it as text but ADD COLUMN IF NOT EXISTS skipped the
-- conversion. Verified on 2026-04-25 that the live column contains zero
-- rows of data, so the cast-to-NULL is safe.
--
-- Anything that needs a structured location object (lat/lng/etc.) should
-- live in projects.metadata.location_meta or its own column added later.
-- ============================================================================

begin;

alter table public.projects
  alter column location type text using null;

comment on column public.projects.location is
  'Human-readable location label (e.g. "Downtown Austin"). Structured coords belong in metadata.';

commit;
