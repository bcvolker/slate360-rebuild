-- Phase 7: Deliverable sharing enhancements — access tracking, expiry, history snapshots

-- ─── Deliverable share access tracking ──────────────────────────────────────

ALTER TABLE site_walk_deliverables
  ADD COLUMN IF NOT EXISTS share_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS share_max_views integer,
  ADD COLUMN IF NOT EXISTS share_view_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS share_password_hash text,
  ADD COLUMN IF NOT EXISTS share_revoked boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_deliverables_share_token
  ON site_walk_deliverables (share_token) WHERE share_token IS NOT NULL;

-- ─── Deliverable view log ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS site_walk_deliverable_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid NOT NULL REFERENCES site_walk_deliverables(id) ON DELETE CASCADE,
  viewer_ip text,
  viewer_ua text,
  viewed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_deliverable_views_deliverable
  ON site_walk_deliverable_views (deliverable_id);

-- No RLS needed — written only by server, read only by org members via API

-- ─── Deliverable history snapshots (immutable copies) ───────────────────────

CREATE TABLE IF NOT EXISTS site_walk_deliverable_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id uuid NOT NULL REFERENCES site_walk_deliverables(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  snapshot_title text NOT NULL,
  snapshot_content jsonb NOT NULL DEFAULT '[]'::jsonb,
  snapshot_status text NOT NULL,
  snapshot_type text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_snapshots_deliverable
  ON site_walk_deliverable_snapshots (deliverable_id);

ALTER TABLE site_walk_deliverable_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Snapshots: org members can view"
  ON site_walk_deliverable_snapshots FOR SELECT
  USING (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

CREATE POLICY "Snapshots: org members can insert"
  ON site_walk_deliverable_snapshots FOR INSERT
  WITH CHECK (org_id IN (SELECT om.org_id FROM public.organization_members om WHERE om.user_id = auth.uid()));

-- ─── Org branding for deliverables ──────────────────────────────────────────
-- (check if org_branding already has logo_s3_key)

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'organizations' AND column_name = 'deliverable_logo_s3_key'
  ) THEN
    ALTER TABLE organizations ADD COLUMN deliverable_logo_s3_key text;
  END IF;
END $$;
