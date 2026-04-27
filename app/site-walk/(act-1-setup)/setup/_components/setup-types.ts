export type BrandSettings = {
  logo_url?: string;
  signature_url?: string;
  primary_color?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  website?: string;
  header_html?: string;
  footer_html?: string;
};

export type SetupProject = {
  id: string;
  name: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  status: string;
  created_at: string;
};

export type SetupContact = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  company: string | null;
  title: string | null;
  initials?: string | null;
  color?: string | null;
};

export type SetupStakeholder = {
  id: string;
  name: string;
  role: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  status: string;
};

export type ReportDefaults = {
  project_name?: string;
  client_name?: string;
  client_email?: string;
  project_address?: string;
  project_number?: string;
  inspector_name?: string;
  inspector_license?: string;
  scope_of_work?: string;
  default_deliverable_type?: string;
};

export type SiteWalkSetupTier = "basic" | "pro" | "business";

export type SubmitState =
  | { kind: "idle" }
  | { kind: "loading"; message: string }
  | { kind: "ok"; message: string }
  | { kind: "error"; message: string };

export type ProjectSavedEvent = {
  project: SetupProject;
  reportDefaults?: ReportDefaults;
};
