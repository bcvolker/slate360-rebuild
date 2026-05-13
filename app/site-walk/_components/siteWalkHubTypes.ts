export type HubProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
};

export type HubWalk = {
  id: string;
  title: string;
  status: string;
  projectId: string | null;
  projectName: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  itemCount: number;
  syncState: string | null;
  isStarred: boolean;
};

export type HubSummary = {
  openItems: number;
  needsReview: number;
  draftDeliverables: number;
  unsyncedItems: number;
};
