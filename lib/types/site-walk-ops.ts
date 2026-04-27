/**
 * Site Walk extended types — plans, pins, templates.
 *
 * Import from "@/lib/types/site-walk-ops" or via re-export from "@/lib/types/site-walk".
 */

import type { MarkupData } from "@/lib/site-walk/markup-types";
import type { SITE_WALK_PIN_COLORS, SITE_WALK_PIN_STATUSES } from "./site-walk-constants";
import type { SiteWalkItemType, WorkflowType } from "./site-walk-core";

/* ─── Plan ─────────────────────────────────────────────────── */

export type SiteWalkPlan = {
  id: string;
  session_id: string;
  org_id: string;
  project_id: string | null;
  title: string;
  s3_key: string;
  file_id: string | null;
  width: number;
  height: number;
  sort_order: number;
  plan_set_id: string | null;
  plan_sheet_id: string | null;
  sheet_number: number | null;
  tile_manifest: Record<string, unknown>;
  thumbnail_s3_key: string | null;
  processing_status: PlanProcessingStatus;
  created_at: string;
  updated_at: string;
};

export type PlanProcessingStatus =
  | "pending"
  | "processing"
  | "ready"
  | "failed"
  | "archived";

export type SiteWalkPlanSet = {
  id: string;
  org_id: string;
  project_id: string;
  title: string;
  description: string | null;
  source_file_id: string | null;
  source_unified_file_id: string | null;
  source_s3_key: string | null;
  original_file_name: string | null;
  mime_type: string | null;
  file_size: number;
  page_count: number;
  processing_status: PlanProcessingStatus;
  processing_error: string | null;
  uploaded_by: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SiteWalkPlanSheet = {
  id: string;
  org_id: string;
  project_id: string;
  plan_set_id: string;
  sheet_number: number;
  sheet_name: string | null;
  image_s3_key: string | null;
  thumbnail_s3_key: string | null;
  tile_manifest: Record<string, unknown>;
  width: number;
  height: number;
  rotation: number;
  scale_label: string | null;
  sort_order: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type SiteWalkSessionPlanSheet = {
  id: string;
  org_id: string;
  project_id: string;
  session_id: string;
  plan_sheet_id: string;
  is_primary: boolean;
  created_by: string | null;
  created_at: string;
};

export type CreatePlanPayload = {
  session_id: string;
  title: string;
  s3_key: string;
  file_id?: string;
  width?: number;
  height?: number;
};

/* ─── Pin ──────────────────────────────────────────────────── */

export type PinColor = typeof SITE_WALK_PIN_COLORS[number];
export type PinStatus = typeof SITE_WALK_PIN_STATUSES[number];

export type SiteWalkPin = {
  id: string;
  plan_id: string | null;
  plan_sheet_id: string | null;
  item_id: string | null;
  org_id: string;
  project_id: string | null;
  session_id: string | null;
  x_pct: number;
  y_pct: number;
  pin_number: number | null;
  pin_color: PinColor;
  client_pin_id: string | null;
  pin_status: PinStatus;
  label: string | null;
  created_by: string | null;
  /** Vector primitives layered alongside this pin (rotation, sticker, etc.). */
  markup_data: MarkupData | Record<string, never>;
  created_at: string;
  updated_at: string;
};

export type CreatePinPayload = {
  plan_id?: string | null;
  plan_sheet_id?: string | null;
  item_id?: string | null;
  session_id?: string | null;
  project_id?: string | null;
  x_pct: number;
  y_pct: number;
  pin_number?: number;
  pin_color?: PinColor;
  client_pin_id?: string | null;
  pin_status?: PinStatus;
  label?: string | null;
  markup_data?: MarkupData;
};

export type UpdatePinPayload = {
  x_pct?: number;
  y_pct?: number;
  pin_number?: number | null;
  pin_color?: PinColor;
  item_id?: string | null;
  pin_status?: PinStatus;
  label?: string | null;
  markup_data?: MarkupData;
};

/* ─── Template ─────────────────────────────────────────────── */

export type TemplateType = "checklist" | "inspection" | "punch" | "proposal";

export type ChecklistEntry = {
  label: string;
  required: boolean;
  item_type?: SiteWalkItemType;
  workflow_type?: WorkflowType;
};

export type SiteWalkTemplate = {
  id: string;
  org_id: string;
  title: string;
  description: string | null;
  template_type: TemplateType;
  checklist_items: ChecklistEntry[];
  is_default: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
};

export type CreateTemplatePayload = {
  title: string;
  description?: string;
  template_type?: TemplateType;
  checklist_items: ChecklistEntry[];
  is_default?: boolean;
};

export type UpdateTemplatePayload = {
  title?: string;
  description?: string;
  template_type?: TemplateType;
  checklist_items?: ChecklistEntry[];
  is_default?: boolean;
};
