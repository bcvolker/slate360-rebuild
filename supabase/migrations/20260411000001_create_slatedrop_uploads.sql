-- Backfill migration: slatedrop_uploads
-- This table has existed in production since early builds but was never tracked.
-- Migration is idempotent — uses IF NOT EXISTS throughout.

CREATE TABLE IF NOT EXISTS slatedrop_uploads (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_name   TEXT        NOT NULL,
  file_size   BIGINT      NOT NULL DEFAULT 0,
  file_type   TEXT,
  s3_key      TEXT        NOT NULL,
  org_id      UUID        REFERENCES organizations(id) ON DELETE SET NULL,
  uploaded_by UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status      TEXT        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'active', 'deleted')),
  folder_id   UUID        REFERENCES project_folders(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for the most common query patterns
CREATE INDEX IF NOT EXISTS idx_slatedrop_uploads_org_status
  ON slatedrop_uploads (org_id, status);

CREATE INDEX IF NOT EXISTS idx_slatedrop_uploads_uploaded_by
  ON slatedrop_uploads (uploaded_by);

CREATE INDEX IF NOT EXISTS idx_slatedrop_uploads_s3_key_prefix
  ON slatedrop_uploads USING btree (s3_key text_pattern_ops);

CREATE INDEX IF NOT EXISTS idx_slatedrop_uploads_folder_id
  ON slatedrop_uploads (folder_id) WHERE folder_id IS NOT NULL;

-- RLS
ALTER TABLE slatedrop_uploads ENABLE ROW LEVEL SECURITY;

-- Policy: org members can read their org's uploads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'slatedrop_uploads' AND policyname = 'org_members_read'
  ) THEN
    CREATE POLICY org_members_read ON slatedrop_uploads
      FOR SELECT
      USING (
        org_id IN (
          SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy: uploaders can read their own uploads (solo users without org)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'slatedrop_uploads' AND policyname = 'uploader_read_own'
  ) THEN
    CREATE POLICY uploader_read_own ON slatedrop_uploads
      FOR SELECT
      USING (uploaded_by = auth.uid());
  END IF;
END $$;

-- Policy: uploaders can insert their own rows (org_id must be their own org or NULL)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'slatedrop_uploads' AND policyname = 'uploader_insert'
  ) THEN
    CREATE POLICY uploader_insert ON slatedrop_uploads
      FOR INSERT
      WITH CHECK (
        uploaded_by = auth.uid()
        AND (
          org_id IS NULL
          OR org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
        )
      );
  END IF;
END $$;

-- Policy: uploaders can update their own rows (rename, move, soft-delete)
-- USING checks they own the row; WITH CHECK prevents reassigning org_id to a foreign org
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'slatedrop_uploads' AND policyname = 'uploader_update_own'
  ) THEN
    CREATE POLICY uploader_update_own ON slatedrop_uploads
      FOR UPDATE
      USING (uploaded_by = auth.uid())
      WITH CHECK (
        uploaded_by = auth.uid()
        AND (
          org_id IS NULL
          OR org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
        )
      );
  END IF;
END $$;
