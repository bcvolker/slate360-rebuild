-- Phase 6a: Extend site_walk_items with workflow fields + session signatures
-- Adds punch/inspection/proposal workflow support, resolution/verification cycles,
-- cost/manpower estimates, before/after pairing, and session sign-off signatures.

-- ─── Item workflow columns ──────────────────────────────────────────────────

ALTER TABLE site_walk_items
  ADD COLUMN IF NOT EXISTS workflow_type text NOT NULL DEFAULT 'general'
    CHECK (workflow_type IN ('general','punch','inspection','proposal')),
  ADD COLUMN IF NOT EXISTS item_status text NOT NULL DEFAULT 'open'
    CHECK (item_status IN ('open','in_progress','resolved','verified','closed','na')),
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'medium'
    CHECK (priority IN ('low','medium','high','critical')),
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS due_date date,
  ADD COLUMN IF NOT EXISTS resolved_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS cost_estimate numeric(12,2),
  ADD COLUMN IF NOT EXISTS manpower_hours numeric(8,2),
  ADD COLUMN IF NOT EXISTS before_item_id uuid REFERENCES site_walk_items(id) ON DELETE SET NULL;

-- Index for workflow queries
CREATE INDEX IF NOT EXISTS idx_items_workflow_status
  ON site_walk_items (session_id, workflow_type, item_status);

CREATE INDEX IF NOT EXISTS idx_items_assigned
  ON site_walk_items (assigned_to) WHERE assigned_to IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_items_due_date
  ON site_walk_items (due_date) WHERE due_date IS NOT NULL;

-- ─── Session signature columns ──────────────────────────────────────────────

ALTER TABLE site_walk_sessions
  ADD COLUMN IF NOT EXISTS client_signature_s3_key text,
  ADD COLUMN IF NOT EXISTS inspector_signature_s3_key text,
  ADD COLUMN IF NOT EXISTS signed_at timestamptz,
  ADD COLUMN IF NOT EXISTS signed_by uuid REFERENCES auth.users(id);
