import type { ItemPriority, ItemStatus, SiteWalkCaptureMode, SiteWalkItemType, SiteWalkSyncState, SiteWalkUploadState } from "./site-walk";

export type CaptureClassification = "Issue" | "Observation" | "Safety" | "Progress" | "Question" | "Other";

export type CaptureAssignee = {
  id: string;
  label: string;
  subtitle: string;
  assignable: boolean;
  source: "project_member" | "stakeholder";
};

export type CaptureItemRecord = {
  id: string;
  session_id: string;
  client_item_id: string | null;
  client_mutation_id: string | null;
  item_type: SiteWalkItemType;
  title: string;
  description: string | null;
  category: string | null;
  priority: ItemPriority;
  item_status: ItemStatus;
  assigned_to: string | null;
  due_date: string | null;
  capture_mode: SiteWalkCaptureMode;
  sync_state: SiteWalkSyncState;
  upload_state: SiteWalkUploadState;
  local_preview_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type CaptureItemDraft = {
  title: string;
  classification: CaptureClassification;
  priority: ItemPriority;
  status: ItemStatus;
  assignedTo: string;
  dueDate: string;
  notes: string;
};

export const CAPTURE_CLASSIFICATIONS: CaptureClassification[] = [
  "Issue",
  "Observation",
  "Safety",
  "Progress",
  "Question",
  "Other",
];

export const CAPTURE_PRIORITIES: ItemPriority[] = ["low", "medium", "high", "critical"];
export const CAPTURE_ITEM_STATUSES: ItemStatus[] = ["open", "in_progress", "resolved", "verified"];

export function captureItemToDraft(item: CaptureItemRecord): CaptureItemDraft {
  const classification = CAPTURE_CLASSIFICATIONS.includes(item.category as CaptureClassification)
    ? (item.category as CaptureClassification)
    : "Observation";
  return {
    title: item.title,
    classification,
    priority: item.priority,
    status: item.item_status,
    assignedTo: item.assigned_to ?? "",
    dueDate: item.due_date ?? "",
    notes: item.description ?? "",
  };
}
