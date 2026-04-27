import type {
  SITE_WALK_DELIVERABLE_STATUSES,
  SITE_WALK_DELIVERABLE_TYPES,
  SITE_WALK_OUTPUT_MODES,
} from "./site-walk-constants";

export type SiteWalkDeliverableType = typeof SITE_WALK_DELIVERABLE_TYPES[number];
export type SiteWalkDeliverableStatus = typeof SITE_WALK_DELIVERABLE_STATUSES[number];
export type SiteWalkOutputMode = typeof SITE_WALK_OUTPUT_MODES[number];

export type SiteWalkDeliverable = {
  id: string;
  session_id: string;
  org_id: string;
  project_id: string | null;
  created_by: string;
  title: string;
  deliverable_type: SiteWalkDeliverableType;
  status: SiteWalkDeliverableStatus;
  content: unknown[];
  share_token: string | null;
  shared_at: string | null;
  export_s3_key: string | null;
  share_expires_at: string | null;
  share_max_views: number | null;
  share_view_count: number;
  share_password_hash: string | null;
  share_revoked: boolean;
  output_mode: SiteWalkOutputMode;
  brand_snapshot: Record<string, unknown>;
  portal_config: Record<string, unknown>;
  presentation_config: Record<string, unknown>;
  kanban_config: Record<string, unknown>;
  export_config: Record<string, unknown>;
  summary_stats: Record<string, unknown>;
  last_published_at: string | null;
  published_by: string | null;
  viewer_config: Record<string, unknown>;
  response_config: Record<string, unknown>;
  navigation_config: Record<string, unknown>;
  thumbnail_s3_key: string | null;
  preview_image_s3_key: string | null;
  email_snapshot_s3_key: string | null;
  allow_viewer_responses: boolean;
  allow_viewer_download: boolean;
  created_at: string;
  updated_at: string;
};

export type CreateDeliverablePayload = {
  session_id: string;
  title?: string;
  deliverable_type: SiteWalkDeliverableType;
  content?: unknown[];
  output_mode?: SiteWalkOutputMode;
  portal_config?: Record<string, unknown>;
  presentation_config?: Record<string, unknown>;
  kanban_config?: Record<string, unknown>;
  export_config?: Record<string, unknown>;
  viewer_config?: Record<string, unknown>;
  response_config?: Record<string, unknown>;
  navigation_config?: Record<string, unknown>;
};

export type UpdateDeliverablePayload = {
  title?: string;
  status?: SiteWalkDeliverableStatus;
  content?: unknown[];
  output_mode?: SiteWalkOutputMode;
  portal_config?: Record<string, unknown>;
  presentation_config?: Record<string, unknown>;
  kanban_config?: Record<string, unknown>;
  export_config?: Record<string, unknown>;
  viewer_config?: Record<string, unknown>;
  response_config?: Record<string, unknown>;
  navigation_config?: Record<string, unknown>;
  allow_viewer_responses?: boolean;
  allow_viewer_download?: boolean;
};
