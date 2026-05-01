import type { UpdateItemPayload } from "@/lib/types/site-walk";
import type { CaptureItemDraft, CaptureItemRecord } from "@/lib/types/site-walk-capture";

export function buildDraftPayload(draft: CaptureItemDraft): UpdateItemPayload {
  return {
    title: draft.title,
    description: draft.notes,
    category: null,
    trade: null,
    tags: draft.tags,
    priority: draft.priority,
    item_status: draft.status,
    assigned_to: draft.assignedTo || null,
    due_date: draft.dueDate || null,
    cost_estimate: parseCostImpact(draft.costImpact),
    sync_state: "synced",
  };
}

export function patchLocalItem(item: CaptureItemRecord, draft: CaptureItemDraft): CaptureItemRecord {
  return {
    ...item,
    title: draft.title,
    description: draft.notes,
    category: null,
    trade: null,
    tags: draft.tags,
    priority: draft.priority,
    item_status: draft.status,
    assigned_to: draft.assignedTo || null,
    due_date: draft.dueDate || null,
    cost_estimate: parseCostImpact(draft.costImpact),
    sync_state: "pending",
    updated_at: new Date().toISOString(),
  };
}

export function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((tag): tag is string => typeof tag === "string")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function parseCostImpact(value: string) {
  if (!value.trim()) return null;
  const parsed = Number(value.replace(/[$,]/g, ""));
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}
