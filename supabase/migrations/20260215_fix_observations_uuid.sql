-- Fix observations table UUID default.
-- The original migration used uuid_generate_v4() which requires the uuid-ossp extension.
-- Other tables in the schema use gen_random_uuid() (built-in pgcrypto, always available).
-- This migration switches observations to gen_random_uuid() for consistency
-- and to avoid failures if uuid-ossp is not enabled.

ALTER TABLE IF EXISTS public.project_observations
  ALTER COLUMN id SET DEFAULT gen_random_uuid();
