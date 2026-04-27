export const SITE_WALK_SESSION_STATUSES = [
  "draft",
  "in_progress",
  "completed",
  "archived",
] as const;

export const SITE_WALK_SESSION_TYPES = [
  "general",
  "progress",
  "punch",
  "inspection",
  "proposal",
  "safety",
  "proof_of_work",
] as const;

export const SITE_WALK_SYNC_STATES = [
  "pending",
  "syncing",
  "synced",
  "failed",
  "conflict",
] as const;

export const SITE_WALK_ITEM_TYPES = [
  "photo",
  "video",
  "text_note",
  "voice_note",
  "annotation",
] as const;

export const SITE_WALK_CAPTURE_MODES = [
  "camera",
  "upload",
  "plan_pin",
  "voice",
  "text",
  "mixed",
] as const;

export const SITE_WALK_UPLOAD_STATES = [
  "none",
  "queued",
  "uploading",
  "uploaded",
  "failed",
] as const;

export const SITE_WALK_WORKFLOW_TYPES = [
  "general",
  "punch",
  "inspection",
  "proposal",
] as const;

export const SITE_WALK_ITEM_STATUSES = [
  "open",
  "in_progress",
  "resolved",
  "verified",
  "closed",
  "na",
] as const;

export const SITE_WALK_ITEM_PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const;

export const SITE_WALK_ITEM_RELATIONSHIPS = [
  "standalone",
  "resolution",
  "rework",
] as const;

export const SITE_WALK_DELIVERABLE_TYPES = [
  "report",
  "punchlist",
  "photo_log",
  "rfi",
  "estimate",
  "status_report",
  "proposal",
  "field_report",
  "inspection_package",
  "safety_report",
  "proof_of_work",
  "client_portal",
  "kanban_board",
  "cinematic_presentation",
  "spreadsheet_export",
  "virtual_tour",
  "tour_360",
  "model_viewer",
  "media_gallery",
  "client_review",
  "custom",
] as const;

export const SITE_WALK_DELIVERABLE_STATUSES = [
  "draft",
  "in_review",
  "approved",
  "submitted",
  "shared",
  "published",
  "archived",
  "revoked",
] as const;

export const SITE_WALK_OUTPUT_MODES = [
  "hosted",
  "pdf",
  "portal",
  "presentation",
  "spreadsheet",
  "zip",
  "email_body",
  "email_snapshot",
  "interactive_link",
] as const;

export const SITE_WALK_PIN_COLORS = [
  "blue",
  "green",
  "amber",
  "red",
  "gray",
  "purple",
] as const;

export const SITE_WALK_PIN_STATUSES = [
  "draft",
  "active",
  "resolved",
  "archived",
] as const;
