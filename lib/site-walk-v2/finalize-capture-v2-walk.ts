import {
  CAPTURE_V2_STOP_DRAFTS_KEY,
  type CaptureV2StopDraftStore,
} from "./capture-stop-drafts";
import { promoteCaptureV2StopDrafts } from "./promote-capture-v2-drafts";

export type FinalizeCaptureV2WalkResult = {
  promotedCount: number;
  metadata: Record<string, unknown>;
};

/** Promote stop drafts, clear draft metadata, and mark the session completed. */
export async function finalizeCaptureV2Walk(params: {
  sessionId: string;
  store: CaptureV2StopDraftStore;
  metadata: Record<string, unknown>;
  stopLabels: Record<string, string>;
}): Promise<FinalizeCaptureV2WalkResult> {
  const { sessionId, store, metadata, stopLabels } = params;

  const { promotedCount } = await promoteCaptureV2StopDrafts(sessionId, store, stopLabels, {
    finishingWalk: true,
  });

  const nextMetadata = { ...metadata };
  delete nextMetadata[CAPTURE_V2_STOP_DRAFTS_KEY];

  const response = await fetch(`/api/site-walk/sessions/${encodeURIComponent(sessionId)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      status: "completed",
      sync_state: "synced",
      last_synced_at: new Date().toISOString(),
      metadata: nextMetadata,
    }),
  });
  const data = (await response.json().catch(() => null)) as { error?: string } | null;
  if (!response.ok) {
    throw new Error(data?.error ?? "Could not mark walk complete");
  }

  return { promotedCount, metadata: nextMetadata };
}
