import type { SiteWalkSession } from "@/lib/types/site-walk";

/** Active walk session fields loaded by Capture V2 server pages. */
export type CaptureV2Session = Pick<
  SiteWalkSession,
  | "id"
  | "project_id"
  | "title"
  | "status"
  | "started_at"
  | "completed_at"
  | "is_ad_hoc"
  | "client_session_id"
  | "sync_state"
  | "last_synced_at"
> & {
  project_name?: string | null;
};
