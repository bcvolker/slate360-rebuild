-- Directed Tour PR-C1.2: framing-first privacy (additive only).
-- The published view is a forward look cone per clip that never contains the operator.
-- Checkpoint stills are perspective frames inside it; the worker measures blacked-out
-- pixels so a masked still can never be published.
ALTER TABLE public.spatial_clips
  ADD COLUMN IF NOT EXISTS look_cone jsonb;
ALTER TABLE public.spatial_checkpoint_marks
  ADD COLUMN IF NOT EXISTS still_black_fraction real;
