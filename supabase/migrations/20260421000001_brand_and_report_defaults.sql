-- Phase 7b: Branding + project report defaults
-- Org-level brand settings shared across ALL apps. Project-level
-- report defaults auto-fill into Site Walk deliverables (and
-- future apps' reports).

-- ─── Organization brand settings (shared globally) ──────────────────────────
-- Stores logo URL, colors, header/footer text, signature image, contact info
-- once per org so users don't re-enter for each deliverable.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS brand_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.organizations.brand_settings IS
  'Shared brand assets used across all apps. Shape: {
    logo_url?: string, signature_url?: string, primary_color?: string,
    header_html?: string, footer_html?: string,
    contact_name?: string, contact_email?: string, contact_phone?: string,
    address?: string, website?: string
  }';

-- ─── Project report defaults (auto-fill per project) ────────────────────────
-- Captured once per project. Pulled into every new deliverable for that
-- project so users don't re-enter project info.

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS report_defaults jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.projects.report_defaults IS
  'Per-project info auto-filled into deliverables. Shape: {
    project_name?: string, client_name?: string, client_email?: string,
    project_address?: string, project_number?: string,
    inspector_name?: string, inspector_license?: string,
    scope_of_work?: string, default_deliverable_type?: string,
    custom_fields?: Record<string, string>
  }';
