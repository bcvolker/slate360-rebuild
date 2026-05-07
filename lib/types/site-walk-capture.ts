import type { ItemPriority, ItemStatus, SiteWalkCaptureMode, SiteWalkItemType, SiteWalkSyncState, SiteWalkUploadState } from "./site-walk";
import type { MarkupData } from "@/lib/site-walk/markup-types";
import type { PhotoAttachmentPin } from "@/lib/site-walk/photo-attachments";

export type CaptureClassification = "Safety" | "Quality" | "Schedule" | "RFI" | "Observation" | "Punch List" | "Coordination" | "Progress" | "Other";

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
  location_label?: string | null;
  category: string | null;
  trade?: string | null;
  tags?: string[];
  before_item_id?: string | null;
  cost_estimate?: number | null;
  priority: ItemPriority;
  item_status: ItemStatus;
  assigned_to: string | null;
  due_date: string | null;
  capture_mode: SiteWalkCaptureMode;
  sync_state: SiteWalkSyncState;
  upload_state: SiteWalkUploadState;
  metadata?: Record<string, unknown>;
  markup_data?: MarkupData | Record<string, never> | null;
  photo_attachment_pins?: PhotoAttachmentPin[];
  local_preview_url?: string | null;
  created_at: string;
  updated_at: string;
};

export type CaptureItemDraft = {
  title: string;
  classification: CaptureClassification;
  trade: string;
  tags: string[];
  beforeItemId: string;
  costImpact: string;
  priority: ItemPriority;
  status: ItemStatus;
  assignedTo: string;
  dueDate: string;
  notes: string;
};

export const CAPTURE_PRIORITIES: ItemPriority[] = ["low", "medium", "high", "critical"];
export const CAPTURE_ITEM_STATUSES: ItemStatus[] = ["open", "in_progress", "resolved", "verified", "closed", "na"];
export const CAPTURE_TAG_SUGGESTIONS = ["Safety", "Quality", "Progress", "Defect"] as const;
export const CAPTURE_CLASSIFICATIONS: CaptureClassification[] = ["Safety", "Quality", "Schedule", "RFI", "Observation", "Punch List", "Coordination", "Progress", "Other"];
export const CAPTURE_TRADES = ["General", "Electrical", "Plumbing", "HVAC", "Framing", "Concrete", "Painting", "Flooring", "Drywall", "Roofing", "Fire Protection", "Steel", "Site Work", "Millwork", "Low Voltage", "Other"] as const;

function readTags(item: CaptureItemRecord) {
  const legacyCategory = item.category?.trim();
  const itemTags = Array.isArray(item.tags) ? item.tags : [];
  const baseTags = itemTags.length > 0 ? itemTags : legacyCategory ? [legacyCategory] : [];
  return Array.from(new Set(baseTags.map((tag) => tag.trim()).filter(Boolean)));
}

export function captureItemToDraft(item: CaptureItemRecord): CaptureItemDraft {
  const classification = CAPTURE_CLASSIFICATIONS.includes(item.category as CaptureClassification)
    ? (item.category as CaptureClassification)
    : "Observation";
  return {
    title: item.title,
    classification,
    trade: item.trade ?? "",
    tags: readTags(item),
    beforeItemId: item.before_item_id ?? "",
    costImpact: item.cost_estimate === null ? "" : String(item.cost_estimate),
    priority: item.priority,
    status: item.item_status,
    assignedTo: item.assigned_to ?? "",
    dueDate: item.due_date ?? "",
    notes: item.description ?? "",
  };
}
