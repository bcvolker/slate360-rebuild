import type { SiteWalkSession, SiteWalkSyncState } from "@/lib/types/site-walk";

export type ActiveWalkSession = Pick<
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

export type SafeExitTarget = "dashboard" | "walks";

export type SessionShellContextValue = {
  session: ActiveWalkSession;
  syncState: SiteWalkSyncState;
  isOnline: boolean;
  isEnding: boolean;
  setSyncState: (state: SiteWalkSyncState) => void;
  exitWalk: (target?: SafeExitTarget) => void;
  endWalk: () => Promise<void>;
};
