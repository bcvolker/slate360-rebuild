import { queueOfflineItemPatch } from "@/lib/site-walk/offline-capture";
import type { UpdateItemPayload } from "@/lib/types/site-walk";
import type { CaptureItemDraft, CaptureItemRecord } from "@/lib/types/site-walk-capture";

export function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

/**
 * PATCH a Site Walk item, falling back to the offline queue when offline, when the
 * id is a temporary client id, or on any network failure. Shared by the markup,
 * photo-pin, and raw-note-provenance save paths (was duplicated three times).
 */
export async function patchItemOrQueue(
  sessionId: string,
  item: CaptureItemRecord,
  payload: UpdateItemPayload,
): Promise<void> {
  try {
    if (isOffline() || item.id.startsWith("item-")) {
      await queueOfflineItemPatch(sessionId, item, payload);
      return;
    }
    const response = await fetch(`/api/site-walk/items/${encodeURIComponent(item.id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!response.ok) throw new Error("Item patch failed");
  } catch {
    await queueOfflineItemPatch(sessionId, item, payload);
  }
}

export function normalizePriority(value: string | undefined): CaptureItemDraft["priority"] {
  const normalized = value?.toLowerCase();
  if (normalized === "low" || normalized === "medium" || normalized === "high" || normalized === "critical") {
    return normalized;
  }
  return "medium";
}

export function mergeTags(current: string[], suggested: string | undefined) {
  const next = suggested?.trim();
  return next ? Array.from(new Set([...current, next])) : current;
}
