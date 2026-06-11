-- 20260207_artifact_tracking.sql
-- Artifact receipt tracking (email open + link open)

CREATE TABLE IF NOT EXISTS public.artifact_receipts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  artifact_type TEXT NOT NULL,
  artifact_id UUID,
  recipient_email TEXT,
  recipient_contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  token TEXT NOT NULL UNIQUE,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  first_opened_at TIMESTAMPTZ,
  last_opened_at TIMESTAMPTZ,
  opened_count INTEGER NOT NULL DEFAULT 0,
  responded_at TIMESTAMPTZ,
  response_payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_artifact_receipts_artifact ON public.artifact_receipts(artifact_type, artifact_id);
CREATE INDEX IF NOT EXISTS idx_artifact_receipts_token ON public.artifact_receipts(token);
CREATE INDEX IF NOT EXISTS idx_artifact_receipts_recipient ON public.artifact_receipts(recipient_email);
