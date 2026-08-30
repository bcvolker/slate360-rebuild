-- Spatial Walkthrough time-based authoring.
-- Additive. MASTER object keys stay immutable (existing trigger).

ALTER TABLE public.spatial_clips
  ADD COLUMN IF NOT EXISTS orientation jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.spatial_redactions
  ADD COLUMN IF NOT EXISTS feather double precision,
  ADD COLUMN IF NOT EXISTS style text,
  ADD COLUMN IF NOT EXISTS keyframes jsonb NOT NULL DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.spatial_clips.orientation IS
  'Manual/OEM orientation keyframes { source, bakeable, keyframes[] }. Preview uses PSV sphereCorrection; CLIENT/PUBLIC bake consumes this JSON. Never CSS-rotates ERP.';

COMMENT ON COLUMN public.spatial_redactions.keyframes IS
  'Operator-mask keyframes [{ t, yawCenter, yawWidth, pitchTop, pitchBottom, nadirRadius, feather, style }]. Empty = use legacy static operator_patch.';
