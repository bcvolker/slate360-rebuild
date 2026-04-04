-- Migration: Unify project_external_links schema and add Bundle type
-- Date: 2026-04-04
--
-- Background: Two conflicting CREATE TABLE IF NOT EXISTS migrations existed:
--   1. 20260223_upgrade_projects.sql — created with folder_id (NOT NULL)
--   2. 20260224_external_response_links.sql — attempted to create with target_type/target_id
-- The second was a no-op. Missing columns were added manually on live DB
-- with relaxed (nullable) constraints but diverged from either migration.
--
-- This migration is the canonical reconciliation. It ensures all columns
-- exist with correct constraints, and expands target_type to support Bundle.

-- Step 1: Ensure all columns exist (idempotent — they already do on live DB)
ALTER TABLE public.project_external_links
  ADD COLUMN IF NOT EXISTS folder_id uuid,
  ADD COLUMN IF NOT EXISTS target_type text,
  ADD COLUMN IF NOT EXISTS target_id uuid,
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Step 2: Drop the old CHECK constraint and replace with expanded values
ALTER TABLE public.project_external_links
  DROP CONSTRAINT IF EXISTS project_external_links_target_type_check;

ALTER TABLE public.project_external_links
  ADD CONSTRAINT project_external_links_target_type_check
    CHECK (target_type IN ('RFI', 'Submittal', 'Document', 'Tour', 'SiteWalk', 'Bundle'));

-- Step 3: Add a partial uniqueness safeguard — one active Bundle link per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_external_links_active_bundle
  ON public.project_external_links(project_id)
  WHERE target_type = 'Bundle' AND is_active = true;
