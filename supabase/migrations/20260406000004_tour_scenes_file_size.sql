-- Add exact file tracking to tour_scenes to prevent quota drift
ALTER TABLE public.tour_scenes
  ADD COLUMN IF NOT EXISTS file_size_bytes BIGINT NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.tour_scenes.file_size_bytes IS 'Exact byte size of the panorama file, used to accurately refund storage quota on deletion.';
