import type { MarkupData } from "@/lib/site-walk/markup-types";
import type { ItemPriority, ItemStatus, SiteWalkItemType, SiteWalkSyncState, SiteWalkUploadState } from "@/lib/types/site-walk";

export type LiveWalkSummary = {
  id: string;
  title: string;
  projectId: string | null;
  projectName: string | null;
  /** True when the walk's project has an uploaded plan set (worth keeping). */
  hasPlan: boolean;
  walkerName: string;
  startedAt: string | null;
  completedAt: string | null;
  status: "draft" | "in_progress" | "completed" | "archived";
  itemCount: number;
  thumbnailUrl: string | null;
};

export type LiveWalkSession = {
  id: string;
  title: string;
  projectName: string | null;
  walkerName: string;
  startedAt: string | null;
  status: string;
};

export type LiveWalkItem = {
  id: string;
  session_id: string;
  created_by: string;
  item_type: SiteWalkItemType;
  title: string;
  description: string | null;
  file_id: string | null;
  location_label: string | null;
  category: string | null;
  priority: ItemPriority;
  item_status: ItemStatus;
  assigned_to: string | null;
  sync_state: SiteWalkSyncState;
  upload_state: SiteWalkUploadState;
  markup_data: MarkupData | Record<string, never> | null;
  created_at: string;
  updated_at: string;
};

export type LiveItemGroup = {
  location: string;
  items: LiveWalkItem[];
};
