-- Add deleted_at timestamp to slatedrop_uploads for soft-delete recovery window.
-- Files with status='deleted' retain their S3 object for 30 days.

ALTER TABLE public.slatedrop_uploads
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_slatedrop_uploads_deleted_at
  ON public.slatedrop_uploads(deleted_at)
  WHERE deleted_at IS NOT NULL;
