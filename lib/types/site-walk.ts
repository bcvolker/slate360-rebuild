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
  created_at: string;
  updated_at: string;
};

/* ─── Deliverable ──────────────────────────────────────────── */

export type SiteWalkDeliverableType =
  | "report"
  | "punchlist"
  | "photo_log"
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
};

export type UpdateItemPayload = {
  title?: string;
  description?: string;
  sort_order?: number;
  location_label?: string;
  metadata?: Record<string, unknown>;
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
