-- PR #29 — Status report deliverables + viewer comment intent flags
-- Adds the 'status_report' deliverable_type for auto-generated weekly project
-- updates, and adds is_field / is_escalation flags + a comment_intent column
-- to viewer_comments so recipients can mark Approve / Needs change / Question.

-- 1. Extend deliverable_type CHECK to include 'status_report'
ALTER TABLE public.site_walk_deliverables
  DROP CONSTRAINT IF EXISTS site_walk_deliverables_deliverable_type_check;

ALTER TABLE public.site_walk_deliverables
  ADD CONSTRAINT site_walk_deliverables_deliverable_type_check
  CHECK (deliverable_type IN (
    'report',
    'punchlist',
    'photo_log',
    'rfi',
    'estimate',
    'status_report',
    'custom'
  ));

-- 2. Viewer comment intent flags
ALTER TABLE public.viewer_comments
  ADD COLUMN IF NOT EXISTS is_field boolean NOT NULL DEFAULT false;

ALTER TABLE public.viewer_comments
  ADD COLUMN IF NOT EXISTS is_escalation boolean NOT NULL DEFAULT false;

-- comment_intent is the explicit reviewer action, if any.
ALTER TABLE public.viewer_comments
  ADD COLUMN IF NOT EXISTS comment_intent text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.constraint_column_usage
    WHERE constraint_name = 'viewer_comments_intent_check'
  ) THEN
    ALTER TABLE public.viewer_comments
      ADD CONSTRAINT viewer_comments_intent_check
      CHECK (comment_intent IS NULL OR comment_intent IN ('approve','needs_change','question','comment'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_viewer_comments_intent
  ON public.viewer_comments(deliverable_id, comment_intent);
