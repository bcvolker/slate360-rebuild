import type {
  SITE_WALK_CAPTURE_MODES,
  SITE_WALK_ITEM_PRIORITIES,
  SITE_WALK_ITEM_RELATIONSHIPS,
  SITE_WALK_ITEM_STATUSES,
  SITE_WALK_ITEM_TYPES,
  SITE_WALK_SESSION_STATUSES,
  SITE_WALK_SESSION_TYPES,
  SITE_WALK_SYNC_STATES,
  SITE_WALK_UPLOAD_STATES,
  SITE_WALK_WORKFLOW_TYPES,
} from "./site-walk-constants";

export type SiteWalkSessionStatus = typeof SITE_WALK_SESSION_STATUSES[number];
export type SiteWalkSessionType = typeof SITE_WALK_SESSION_TYPES[number];
export type SiteWalkSyncState = typeof SITE_WALK_SYNC_STATES[number];
export type SiteWalkItemType = typeof SITE_WALK_ITEM_TYPES[number];
export type SiteWalkCaptureMode = typeof SITE_WALK_CAPTURE_MODES[number];
export type SiteWalkUploadState = typeof SITE_WALK_UPLOAD_STATES[number];
export type WorkflowType = typeof SITE_WALK_WORKFLOW_TYPES[number];
export type ItemStatus = typeof SITE_WALK_ITEM_STATUSES[number];
export type ItemPriority = typeof SITE_WALK_ITEM_PRIORITIES[number];
export type ItemRelationship = typeof SITE_WALK_ITEM_RELATIONSHIPS[number];

export type SiteWalkSession = {
  id: string;
  org_id: string;
  project_id: string | null;
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
  is_ad_hoc: boolean;
  client_session_id: string | null;
  session_type: SiteWalkSessionType;
  sync_state: SiteWalkSyncState;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SiteWalkItem = {
  id: string;
  session_id: string;
  org_id: string;
  project_id: string | null;
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
  client_item_id: string | null;
  client_mutation_id: string | null;
  capture_mode: SiteWalkCaptureMode;
  sync_state: SiteWalkSyncState;
  local_created_at: string | null;
  local_updated_at: string | null;
  device_id: string | null;
  upload_state: SiteWalkUploadState;
  upload_progress: number;
  vector_history: unknown[];
  markup_revision: number;
  tags: string[];
  trade: string | null;
  category: string | null;
  created_at: string;
  updated_at: string;
};

export type CreateSessionPayload = {
  project_id?: string | null;
  title?: string;
  metadata?: Record<string, unknown>;
  is_ad_hoc?: boolean;
  client_session_id?: string | null;
  session_type?: SiteWalkSessionType;
  sync_state?: SiteWalkSyncState;
};

export type UpdateSessionPayload = {
  project_id?: string | null;
  title?: string;
  status?: SiteWalkSessionStatus;
  metadata?: Record<string, unknown>;
  is_ad_hoc?: boolean;
  client_session_id?: string | null;
  session_type?: SiteWalkSessionType;
  sync_state?: SiteWalkSyncState;
  last_synced_at?: string | null;
};

export type CreateItemPayload = {
  session_id: string;
  item_type: SiteWalkItemType;
  title?: string;
  description?: string;
  file_id?: string | null;
  s3_key?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_label?: string | null;
  weather?: Record<string, unknown> | null;
  metadata?: Record<string, unknown>;
  before_item_id?: string | null;
  item_relationship?: ItemRelationship;
  client_item_id?: string | null;
  client_mutation_id?: string | null;
  capture_mode?: SiteWalkCaptureMode;
  sync_state?: SiteWalkSyncState;
  local_created_at?: string | null;
  local_updated_at?: string | null;
  device_id?: string | null;
  upload_state?: SiteWalkUploadState;
  upload_progress?: number;
  vector_history?: unknown[];
  tags?: string[];
  trade?: string | null;
  category?: string | null;
};

export type UpdateItemPayload = Partial<
  Pick<
    SiteWalkItem,
    | "title"
    | "description"
    | "sort_order"
    | "location_label"
    | "metadata"
    | "workflow_type"
    | "item_status"
    | "priority"
    | "assigned_to"
    | "due_date"
    | "cost_estimate"
    | "manpower_hours"
    | "before_item_id"
    | "capture_mode"
    | "sync_state"
    | "upload_state"
    | "upload_progress"
    | "vector_history"
    | "markup_revision"
    | "tags"
    | "trade"
    | "category"
  >
>;
