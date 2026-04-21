-- PR #27e — Viewer comments for shared deliverables.
-- Allows recipients of a deliverable share link to leave per-item comments
-- and questions. Threaded one level (parent_id references same table).
-- Note: site_walk_deliverables.share_token already exists from migration
-- 20260412000006 — we do NOT recreate it here.

CREATE TABLE IF NOT EXISTS public.viewer_comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deliverable_id  uuid NOT NULL REFERENCES public.site_walk_deliverables(id) ON DELETE CASCADE,
  item_id         text NOT NULL,
  parent_id       uuid REFERENCES public.viewer_comments(id) ON DELETE CASCADE,
  author_user_id  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_name     text NOT NULL CHECK (length(author_name) > 0 AND length(author_name) <= 120),
  author_email    text,
  body            text NOT NULL CHECK (length(body) > 0 AND length(body) <= 2000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_viewer_comments_deliverable
  ON public.viewer_comments(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_viewer_comments_item
  ON public.viewer_comments(deliverable_id, item_id);

ALTER TABLE public.viewer_comments ENABLE ROW LEVEL SECURITY;

-- All public reads/writes go through service-role API endpoints (token-gated).
-- Only the deliverable creator can DELETE comments via direct client query.
CREATE POLICY "viewer_comments_owner_delete" ON public.viewer_comments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.site_walk_deliverables d
      WHERE d.id = deliverable_id AND d.created_by = auth.uid()
    )
  );

-- Owner can SELECT to see all comments on their deliverables in-app.
CREATE POLICY "viewer_comments_owner_select" ON public.viewer_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.site_walk_deliverables d
      WHERE d.id = deliverable_id AND d.created_by = auth.uid()
    )
  );
