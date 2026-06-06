-- Phase 2/3 desktop workspace: non-destructive splat edits + cinematic camera paths.
-- Source .spz remains immutable; edit_list stores SplatEdit SDF ops for re-apply on load.

alter table public.digital_twin_models
  add column if not exists edit_list jsonb not null default '[]'::jsonb;

alter table public.digital_twin_models
  add column if not exists camera_path jsonb not null default '{}'::jsonb;

comment on column public.digital_twin_models.edit_list is
  'Serialized SplatEdit SDF operations applied client-side; source splat file is never mutated.';

comment on column public.digital_twin_models.camera_path is
  'Cinematic camera keyframes (position, lookAt, segment duration, easing) for desktop playback.';
