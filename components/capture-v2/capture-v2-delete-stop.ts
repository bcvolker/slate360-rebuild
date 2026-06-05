import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

type DeleteResult = { ok: true } | { ok: false; error: string };

function isOfflineClientItem(item: CaptureItemRecord): boolean {
  return item.id.startsWith("item-") || item.sync_state === "pending";
}

/** Soft-delete a persisted stop via existing Site Walk items API. */
export async function deleteCaptureV2Stop(item: CaptureItemRecord): Promise<DeleteResult> {
  if (isOfflineClientItem(item)) {
    return { ok: true };
  }

  const response = await fetch(`/api/site-walk/items/${encodeURIComponent(item.id)}`, {
    method: "DELETE",
  });
  const body = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    return { ok: false, error: body?.error ?? "Could not delete this stop." };
  }
  return { ok: true };
}
