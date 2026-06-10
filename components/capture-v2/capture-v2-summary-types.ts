import type { ItemPriority, ItemStatus } from "@/lib/types/site-walk-core";
import type { SiteWalkItemType, SiteWalkSyncState, SiteWalkUploadState } from "@/lib/types/site-walk";

export type CaptureV2SummarySession = {
  id: string;
  title: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  isAdHoc: boolean;
  lastSyncedAt: string | null;
  completedAt: string | null;
  startedAt: string | null;
  worksiteLabel: string | null;
};

export type CaptureV2SummaryItem = {
  id: string;
  itemType: SiteWalkItemType;
  title: string;
  description: string | null;
  itemStatus: ItemStatus;
  priority: ItemPriority;
  classification: string | null;
  trade: string | null;
  syncState: SiteWalkSyncState;
  uploadState: SiteWalkUploadState;
  createdAt: string;
  updatedAt: string;
  locationLabel: string | null;
  beforeItemId: string | null;
  metadata: Record<string, unknown> | null;
};

export type CaptureV2SummaryStats = {
  totalItems: number;
  savedItems: number;
  pendingItems: number;
  itemsNeedingDetails: number;
  itemsWithMedia: number;
  lastUpdatedAt: string | null;
};
