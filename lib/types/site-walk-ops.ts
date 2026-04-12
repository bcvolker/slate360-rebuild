/**
 * Site Walk extended types — plans, pins, templates.
 *
 * Import from "@/lib/types/site-walk-ops" or via re-export from "@/lib/types/site-walk".
 */

import type { SiteWalkItemType, WorkflowType } from "./site-walk";

/* ─── Plan ─────────────────────────────────────────────────── */

export type SiteWalkPlan = {
  id: string;
  session_id: string;
  org_id: string;
  title: string;
  s3_key: string;
  file_id: string | null;
  width: number;
  height: number;
  sort_order: number;
  created_at: string;
  updated_at: string;
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

export type PinColor = "blue" | "green" | "amber" | "red" | "gray" | "purple";

export type SiteWalkPin = {
  id: string;
  plan_id: string;
  item_id: string;
  org_id: string;
  x_pct: number;
  y_pct: number;
  pin_number: number | null;
  pin_color: PinColor;
  created_at: string;
};

export type CreatePinPayload = {
  plan_id: string;
  item_id: string;
  x_pct: number;
  y_pct: number;
  pin_number?: number;
  pin_color?: PinColor;
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
