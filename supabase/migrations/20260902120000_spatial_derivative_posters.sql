-- Additive. Client/public posters must never reuse the MASTER extract.
ALTER TABLE public.spatial_clips
  ADD COLUMN IF NOT EXISTS client_poster_key text,
  ADD COLUMN IF NOT EXISTS public_poster_key text,
  ADD COLUMN IF NOT EXISTS poster_meta jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.spatial_clips.client_poster_key IS
  'Poster extracted from the CLIENT baked derivative. Never the MASTER still.';
COMMENT ON COLUMN public.spatial_clips.public_poster_key IS
  'Poster extracted from the PUBLIC baked derivative. Never the MASTER still.';
COMMENT ON COLUMN public.spatial_clips.poster_meta IS
  'Poster selection { t, policy, skipAvoided, operatorClear }.';
