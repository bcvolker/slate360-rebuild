-- Phase 1 Beta Access Foundation
-- Adds is_beta_approved flag to profiles table.
-- The Operations Console will manage this flag to grant/revoke beta access.
-- Default: false — new users must be explicitly approved.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_beta_approved boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.is_beta_approved
  IS 'Phase 1 beta gate. Only approved users can access the dashboard shell. Managed via Operations Console.';
