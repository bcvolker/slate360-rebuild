import {
  buildDraftPayload,
  patchLocalItem,
} from "@/components/site-walk/capture/capture-draft-save";
import { publishCaptureItemFocus } from "@/components/site-walk/capture/capture-item-events";
import { queueOfflineItemPatch } from "@/lib/site-walk/offline-capture";
import type { CaptureItemDraft, CaptureItemRecord } from "@/lib/types/site-walk-capture";

function isOffline() {
  return typeof navigator !== "undefined" && !navigator.onLine;
}

export function buildCaptureV2SavePayload(draft: CaptureItemDraft, locationLabel: string) {
  return {
    ...buildDraftPayload(draft),
    location_label: locationLabel.trim() || null,
  };
}

/** Persists draft + location via the same online/offline item patch pathway as V1 capture. */
export async function flushCaptureV2Details(args: {
  sessionId: string;
  activeItem: CaptureItemRecord;
  draft: CaptureItemDraft;
  locationLabel: string;
}): Promise<{ ok: true; item: CaptureItemRecord } | { ok: false; error: string }> {
  const { sessionId, activeItem, draft, locationLabel } = args;
  const payload = buildCaptureV2SavePayload(draft, locationLabel);
  const itemId = activeItem.id;

  try {
    if (isOffline() || itemId.startsWith("item-")) {
      await queueOfflineItemPatch(sessionId, activeItem, payload);
      const local = {
        ...patchLocalItem(activeItem, draft),
        location_label: locationLabel.trim() || null,
      };
      publishCaptureItemFocus({ item: local, reason: "selected", focus: false });
      return { ok: true, item: local };
    }

    const response = await fetch(`/api/site-walk/items/${encodeURIComponent(itemId)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as {
      item?: CaptureItemRecord;
      error?: string;
    } | null;

    if (!response.ok || !data?.item) {
      throw new Error(data?.error ?? "Save failed");
    }

    publishCaptureItemFocus({ item: data.item, reason: "selected", focus: false });
    return { ok: true, item: data.item };
  } catch (error) {
    try {
      await queueOfflineItemPatch(sessionId, activeItem, payload);
      const local = {
        ...patchLocalItem(activeItem, draft),
        location_label: locationLabel.trim() || null,
      };
      publishCaptureItemFocus({ item: local, reason: "selected", focus: false });
      return { ok: true, item: local };
    } catch {
      return {
        ok: false,
        error: error instanceof Error ? error.message : "Save failed",
      };
    }
  }
}
