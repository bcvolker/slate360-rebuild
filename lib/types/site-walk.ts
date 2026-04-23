/**
 * Site Walk shared types — sessions, items, deliverables.
 *
 * Import from "@/lib/types/site-walk" in components and API routes.
 */

/* ─── Session ──────────────────────────────────────────────── */

export type SiteWalkSessionStatus =
  | "draft"
  | "in_progress"
  | "completed"
  | "archived";

export type SiteWalkSession = {
  id: string;
  org_id: string;
  project_id: string;
  created_by: string;
  title: string;
  status: SiteWalkSessionStatus;
  started_at: string | null;
  completed_at: string | null;
  metadata: Record<string, unknown>;
  client_signature_s3_key: string | null;
  inspector_signature_s3_key: string | null;
  signed_at: string | null;
  signed_by: string | null;
  created_at: string;
  updated_at: string;
};

/* ─── Item ─────────────────────────────────────────────────── */

export type SiteWalkItemType =
  | "photo"
  | "video"
  | "text_note"
  | "voice_note"
  | "annotation";

export type WorkflowType = "general" | "punch" | "inspection" | "proposal";
export type ItemStatus = "open" | "in_progress" | "resolved" | "verified" | "closed" | "na";
export type ItemPriority = "low" | "medium" | "high" | "critical";

export type SiteWalkItem = {
  id: string;
  session_id: string;
  org_id: string;
  created_by: string;
  item_type: SiteWalkItemType;
  title: string;
  description: string | null;
  file_id: string | null;
  s3_key: string | null;
  latitude: number | null;
  longitude: number | null;
  location_label: string | null;
  captured_at: string;
  weather: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  sort_order: number;
  workflow_type: WorkflowType;
  item_status: ItemStatus;
  priority: ItemPriority;
  assigned_to: string | null;
  due_date: string | null;
  resolved_by: string | null;
  resolved_at: string | null;
  verified_by: string | null;
  verified_at: string | null;
  cost_estimate: number | null;
  manpower_hours: number | null;
  before_item_id: string | null;
  item_relationship: ItemRelationship;
  audio_s3_key: string | null;
  created_at: string;
  updated_at: string;
};

export type ItemRelationship = "standalone" | "resolution" | "rework";

/* ─── Deliverable ──────────────────────────────────────────── */

export type SiteWalkDeliverableType =
  | "report"
  | "punchlist"
  | "photo_log"
  | "status_report"
  | "custom";

export type SiteWalkDeliverableStatus =
  | "draft"
  | "submitted"
  | "shared"
  | "archived";

export type SiteWalkDeliverable = {
  id: string;
  session_id: string;
  org_id: string;
  created_by: string;
  title: string;
  deliverable_type: SiteWalkDeliverableType;
  status: SiteWalkDeliverableStatus;
  content: unknown[];
  share_token: string | null;
  shared_at: string | null;
  export_s3_key: string | null;
  created_at: string;
  updated_at: string;
};

/* ─── API payloads ─────────────────────────────────────────── */

export type CreateSessionPayload = {
  project_id: string;
  title: string;
  metadata?: Record<string, unknown>;
};

export type UpdateSessionPayload = {
  title?: string;
  status?: SiteWalkSessionStatus;
  metadata?: Record<string, unknown>;
};

export type CreateItemPayload = {
  session_id: string;
  item_type: SiteWalkItemType;
  title?: string;
  description?: string;
  file_id?: string;
  s3_key?: string;
  latitude?: number;
  longitude?: number;
  location_label?: string;
  weather?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  before_item_id?: string;
  item_relationship?: ItemRelationship;
};

export type UpdateItemPayload = {
  title?: string;
  description?: string;
  sort_order?: number;
  location_label?: string;
  metadata?: Record<string, unknown>;
  workflow_type?: WorkflowType;
  item_status?: ItemStatus;
  priority?: ItemPriority;
  assigned_to?: string | null;
  due_date?: string | null;
  cost_estimate?: number | null;
  manpower_hours?: number | null;
  before_item_id?: string | null;
};

export type CreateDeliverablePayload = {
  session_id: string;
  title?: string;
  deliverable_type: SiteWalkDeliverableType;
  content?: unknown[];
};

export type UpdateDeliverablePayload = {
  title?: string;
  status?: SiteWalkDeliverableStatus;
  content?: unknown[];
};

/* ─── Comment ──────────────────────────────────────────────── */

export type SiteWalkComment = {
  id: string;
  org_id: string;
  session_id: string;
  item_id: string | null;
  parent_id: string | null;
  author_id: string;
  body: string;
  is_field: boolean;
  read_by: string[];
  is_escalation: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateCommentPayload = {
  session_id: string;
  item_id?: string;
  parent_id?: string;
  body: string;
  is_field?: boolean;
  is_escalation?: boolean;
};

/* ─── Assignment ───────────────────────────────────────────── */

export type AssignmentPriority = "low" | "medium" | "high" | "critical";
export type AssignmentStatus =
  | "pending"
  | "acknowledged"
  | "in_progress"
  | "done"
  | "rejected";

export type SiteWalkAssignment = {
  id: string;
  org_id: string;
  session_id: string;
  item_id: string | null;
  assigned_by: string;
  assigned_to: string;
  title: string;
  description: string | null;
  priority: AssignmentPriority;
  status: AssignmentStatus;
  due_date: string | null;
  acknowledged_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateAssignmentPayload = {
  session_id: string;
  item_id?: string;
  assigned_to: string;
  title: string;
  description?: string;
  priority?: AssignmentPriority;
  due_date?: string;
};

export type UpdateAssignmentPayload = {
  title?: string;
  description?: string;
  priority?: AssignmentPriority;
  status?: AssignmentStatus;
  due_date?: string;
};

/* ─── Plans, Pins, Templates (extracted to site-walk-ops.ts) ── */
export type {
  SiteWalkPlan,
  CreatePlanPayload,
  PinColor,
  SiteWalkPin,
  CreatePinPayload,
  UpdatePinPayload,
  TemplateType,
  ChecklistEntry,
  SiteWalkTemplate,
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from "./site-walk-ops";
