-- Additive Spatial Walkthrough RC1 columns. Does not rewrite master objects.

ALTER TABLE public.spatial_clips
  ADD COLUMN IF NOT EXISTS public_proxy_key text,
  ADD COLUMN IF NOT EXISTS capture_meta jsonb NOT NULL DEFAULT '{}'::jsonb;
