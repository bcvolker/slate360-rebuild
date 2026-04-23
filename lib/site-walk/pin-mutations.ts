/**
 * lib/site-walk/pin-mutations.ts
 *
 * Thin wrappers around `PATCH /api/site-walk/pins/[id]` that route through
 * the SiteWalkSessionProvider's offline-aware `submitMutation`. Use these
 * from the upcoming canvas component on `dragEnd` and on markup edits so
 * the user never loses an edit when offline.
 */
import type { MarkupData } from "@/lib/site-walk/markup-types";
import type { UpdatePinPayload } from "@/lib/types/site-walk";
import type {
  SubmitItemResult,
  SubmitMutationPayload,
} from "@/lib/hooks/useSiteWalkOfflineSync";

type SubmitMutation = (
  payload: SubmitMutationPayload,
) => Promise<SubmitItemResult>;

/**
 * Persist a pin position change. Network-first, queued on failure.
 * Call this from the canvas on dragEnd, NOT during the drag itself.
 */
export function patchPinPosition(
  submitMutation: SubmitMutation,
  pinId: string,
  x_pct: number,
  y_pct: number,
): Promise<SubmitItemResult> {
  return submitMutation({
    url: `/api/site-walk/pins/${pinId}`,
    method: "PATCH",
    body: { x_pct, y_pct } satisfies UpdatePinPayload,
  });
}

/**
 * Persist a vector markup edit on a pin. Network-first, queued on failure.
 */
export function patchPinMarkup(
  submitMutation: SubmitMutation,
  pinId: string,
  markup_data: MarkupData,
): Promise<SubmitItemResult> {
  return submitMutation({
    url: `/api/site-walk/pins/${pinId}`,
    method: "PATCH",
    body: { markup_data } satisfies UpdatePinPayload,
  });
}

/**
 * Persist any combination of pin fields. Network-first, queued on failure.
 */
export function patchPin(
  submitMutation: SubmitMutation,
  pinId: string,
  patch: UpdatePinPayload,
): Promise<SubmitItemResult> {
  return submitMutation({
    url: `/api/site-walk/pins/${pinId}`,
    method: "PATCH",
    body: patch as unknown as Record<string, unknown>,
  });
}
