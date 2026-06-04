/**
 * Site Walk shared types — sessions, items, deliverables, plans, and
 * collaboration contracts. Import from this barrel in components and routes.
 */
export * from "./site-walk-constants";
export type * from "./site-walk-core";
export type * from "./site-walk-deliverables";
export type * from "./site-walk-collaboration";
export type {
  SiteWalkPlan,
  SiteWalkPlanSet,
  SiteWalkPlanSheet,
  SiteWalkSessionPlanSheet,
  PlanProcessingStatus,
  CreatePlanPayload,
  PinColor,
  PinStatus,
  SiteWalkPin,
  CreatePinPayload,
  UpdatePinPayload,
  TemplateType,
  ChecklistEntry,
  SiteWalkTemplate,
  CreateTemplatePayload,
  UpdateTemplatePayload,
} from "./site-walk-ops";

// Hub data types — shared across Home, sub-views, and server loaders
export type HubProject = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  createdAt: string;
  projectType: string;
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
