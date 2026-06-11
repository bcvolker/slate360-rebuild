-- =====================================================
-- SLATEDROP HIERARCHY MIGRATION
-- Adds scope and tab_tag columns for global vs project folders
-- =====================================================

-- Add scope column to distinguish global vs project folders
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_folders' AND column_name = 'scope') THEN
    ALTER TABLE public.project_folders 
    ADD COLUMN scope TEXT CHECK (scope IN ('global', 'project')) NOT NULL DEFAULT 'project';
  END IF;
END $$;
-- Add tab_tag column for tab-specific folders (design-studio, 360-tours, etc)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_folders' AND column_name = 'tab_tag') THEN
    ALTER TABLE public.project_folders 
    ADD COLUMN tab_tag TEXT;
  END IF;
END $$;
-- Add org_id to project_folders for global folders (not tied to a project)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_folders' AND column_name = 'org_id') THEN
    ALTER TABLE public.project_folders 
    ADD COLUMN org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE;
  END IF;
END $$;
-- Add scope column to project_files as well
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_files' AND column_name = 'scope') THEN
    ALTER TABLE public.project_files 
    ADD COLUMN scope TEXT CHECK (scope IN ('global', 'project')) NOT NULL DEFAULT 'project';
  END IF;
END $$;
-- Add soft delete column to project_files
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'project_files' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.project_files 
    ADD COLUMN deleted_at TIMESTAMPTZ;
  END IF;
END $$;
-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_project_folders_scope ON public.project_folders(scope);
CREATE INDEX IF NOT EXISTS idx_project_folders_tab_tag ON public.project_folders(tab_tag);
CREATE INDEX IF NOT EXISTS idx_project_folders_org_id ON public.project_folders(org_id);
CREATE INDEX IF NOT EXISTS idx_project_files_scope ON public.project_files(scope);
CREATE INDEX IF NOT EXISTS idx_project_files_deleted_at ON public.project_files(deleted_at);
-- Update RLS policies for global folders
-- Drop existing policies first
DROP POLICY IF EXISTS "Global folders visible to org members" ON public.project_folders;
DROP POLICY IF EXISTS "Project folders visible to project members" ON public.project_folders;
DROP POLICY IF EXISTS "Users can manage global folders" ON public.project_folders;
-- Global folders: visible to all org members
CREATE POLICY "Global folders visible to org members" ON public.project_folders
  FOR SELECT USING (
    scope = 'global' AND org_id IN (
      SELECT org_id FROM public.organization_members WHERE user_id = auth.uid()
    )
  );
-- Project folders: visible to project members (via org membership)
CREATE POLICY "Project folders visible to project members" ON public.project_folders
  FOR SELECT USING (
    scope = 'project' AND project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
-- Allow authenticated users to manage folders in their org
CREATE POLICY "Users can manage folders" ON public.project_folders
  FOR ALL USING (
    org_id IN (SELECT org_id FROM public.organization_members WHERE user_id = auth.uid())
    OR project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.organization_members om ON p.org_id = om.org_id
      WHERE om.user_id = auth.uid()
    )
  );
-- =====================================================
-- SUCCESS! Hierarchy columns added.
-- =====================================================;
