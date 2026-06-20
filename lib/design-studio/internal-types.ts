/** Types for the internal (CEO) Design Studio — distinct from the legacy
 *  project_models scaffold. Mirrors the design_* tables in
 *  supabase/migrations/20260619140000_design_studio_internal.sql. */

export type DesignSessionStatus = "active" | "archived";

export interface DesignSession {
  id: string;
  org_id: string;
  project_id: string | null;
  created_by: string | null;
  title: string;
  status: DesignSessionStatus;
  source_twin_model_id: string | null;
  source_storage_key: string | null;
  source_format: string | null;
  source_viewer_kind: string | null;
  active_variant_id: string | null;
  settings: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export type DesignVariantTier = "base" | "preview" | "final";
export type DesignVariantStatus = "queued" | "processing" | "ready" | "failed";

export interface DesignVariant {
  id: string;
  org_id: string;
  session_id: string;
  parent_variant_id: string | null;
  prompt_id: string | null;
  label: string | null;
  tier: DesignVariantTier;
  status: DesignVariantStatus;
  model_format: string | null;
  preview_storage_key: string | null;
  final_storage_key: string | null;
  thumbnail_storage_key: string | null;
  command_list: unknown[];
  structured_actions: unknown[];
  params: Record<string, unknown>;
  error_text: string | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type DesignStreamProvider = "aws" | "eagle3d" | "vast" | "mock";
export type DesignStreamStatus = "starting" | "active" | "idle" | "stopped" | "failed";

export interface DesignStreamSession {
  id: string;
  org_id: string;
  session_id: string | null;
  provider: DesignStreamProvider;
  instance_type: string | null;
  rate_usd_per_hour: number;
  status: DesignStreamStatus;
  budget_cap_usd: number | null;
  cost_usd: number;
  stream_url: string | null;
  signaling_url: string | null;
  started_at: string | null;
  last_active_at: string | null;
  ended_at: string | null;
  created_at: string;
}
