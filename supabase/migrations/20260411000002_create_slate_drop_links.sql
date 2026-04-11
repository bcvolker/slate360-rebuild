-- Backfill migration: slate_drop_links
-- This table has existed in production since early builds but was never tracked.
-- Migration is idempotent — uses IF NOT EXISTS throughout.

CREATE TABLE IF NOT EXISTS slate_drop_links (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  file_id     UUID        NOT NULL REFERENCES slatedrop_uploads(id) ON DELETE CASCADE,
  token       TEXT        NOT NULL UNIQUE,
  created_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role        TEXT        NOT NULL DEFAULT 'view'
                          CHECK (role IN ('view', 'download')),
  expires_at  TIMESTAMPTZ,
  org_id      UUID        REFERENCES organizations(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for share-link lookups by token (the primary access pattern)
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_token
  ON slate_drop_links (token);

-- Index for listing links by creator
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_created_by
  ON slate_drop_links (created_by);

-- Index for file-based lookups (e.g., "all links for this file")
CREATE INDEX IF NOT EXISTS idx_slate_drop_links_file_id
  ON slate_drop_links (file_id);

-- RLS
ALTER TABLE slate_drop_links ENABLE ROW LEVEL SECURITY;

-- Policy: link creators can read their own links
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'slate_drop_links' AND policyname = 'creator_read_own'
  ) THEN
    CREATE POLICY creator_read_own ON slate_drop_links
      FOR SELECT
      USING (created_by = auth.uid());
  END IF;
END $$;

-- Policy: org members can read links belonging to their org
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'slate_drop_links' AND policyname = 'org_members_read'
  ) THEN
    CREATE POLICY org_members_read ON slate_drop_links
      FOR SELECT
      USING (
        org_id IN (
          SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid()
        )
      );
  END IF;
END $$;

-- Policy: link creators can insert new links
-- Verifies: (1) creator is the authenticated user, (2) org membership if org_id set,
-- (3) user has read access to the file (leverages RLS on slatedrop_uploads)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'slate_drop_links' AND policyname = 'creator_insert'
  ) THEN
    CREATE POLICY creator_insert ON slate_drop_links
      FOR INSERT
      WITH CHECK (
        created_by = auth.uid()
        AND (
          org_id IS NULL
          OR org_id IN (SELECT om.org_id FROM organization_members om WHERE om.user_id = auth.uid())
        )
        AND EXISTS (
          SELECT 1 FROM slatedrop_uploads su WHERE su.id = file_id
          -- RLS on slatedrop_uploads enforces the user can actually see this file
        )
      );
  END IF;
END $$;

-- Policy: link creators can delete their own links
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'slate_drop_links' AND policyname = 'creator_delete_own'
  ) THEN
    CREATE POLICY creator_delete_own ON slate_drop_links
      FOR DELETE
      USING (created_by = auth.uid());
  END IF;
END $$;
