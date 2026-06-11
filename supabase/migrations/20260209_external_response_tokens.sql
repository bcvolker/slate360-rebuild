-- ============================================================================
-- External Response Workflow Tokens + Folder Defaults
-- Migration: 20260209_external_response_tokens.sql
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1) Document workflow response metadata
-- ----------------------------------------------------------------------------
ALTER TABLE public.document_workflows
  ADD COLUMN IF NOT EXISTS artifact_type TEXT,
  ADD COLUMN IF NOT EXISTS artifact_id UUID,
  ADD COLUMN IF NOT EXISTS response_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS response_actions TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS response_folder_id UUID REFERENCES public.project_folders(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS response_token TEXT,
  ADD COLUMN IF NOT EXISTS response_expires_at TIMESTAMPTZ;
CREATE INDEX IF NOT EXISTS idx_dw_artifact ON public.document_workflows(artifact_type, artifact_id);
-- ----------------------------------------------------------------------------
-- 2) External response tokens
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.document_response_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID NOT NULL REFERENCES public.document_workflows(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  artifact_id UUID,
  token TEXT NOT NULL UNIQUE,
  recipient_email TEXT,
  response_actions TEXT[] DEFAULT '{}',
  expires_at TIMESTAMPTZ,
  upload_link_token TEXT,
  response_folder_id UUID REFERENCES public.project_folders(id) ON DELETE SET NULL,
  response_folder_path TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responded_at TIMESTAMPTZ,
  response_payload JSONB DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS idx_drt_token ON public.document_response_tokens(token);
CREATE INDEX IF NOT EXISTS idx_drt_artifact ON public.document_response_tokens(artifact_type, artifact_id);
CREATE INDEX IF NOT EXISTS idx_drt_project ON public.document_response_tokens(project_id);
-- ----------------------------------------------------------------------------
-- 3) Submittals: reviewer email for external workflows
-- ----------------------------------------------------------------------------
ALTER TABLE public.submittals
  ADD COLUMN IF NOT EXISTS reviewer_email TEXT;
-- ----------------------------------------------------------------------------
-- 4) Protect default folders (mark as system)
-- ----------------------------------------------------------------------------
ALTER TABLE public.project_folders
  ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT false;
UPDATE public.project_folders
SET is_system = true
WHERE is_system IS DISTINCT FROM true
  AND (
    folder_type IN (
      'project', 'history', 'submittals', 'rfis', 'change-orders', 'inspections',
      'meetings', 'meeting-notes', 'punch-list', 'closeout', 'contracts', 'records',
      'signed-forms', 'drawings', 'specifications', 'photos', 'daily-reports'
    )
    OR lower(name) IN (
      'projects', 'history', 'submittals', 'rfis', 'change orders', 'inspections',
      'meeting minutes', 'meeting notes', 'punch list', 'closeout documents'
    )
  );
-- If PostgREST schema cache is stale, trigger a reload
SELECT pg_notify('pgrst', 'reload schema');
