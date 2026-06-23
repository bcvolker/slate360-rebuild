import type { ViewerItemType } from "@/lib/site-walk/viewer-types";

/**
 * Map a captured Site Walk item to the viewer media type it should render as in a
 * deliverable — or null when it has no displayable media (render as a note then).
 *
 * Centralised so every generator (status report, quick deliverables, before/after)
 * renders videos as videos and 360 photos as 360 — not as broken <img> or as text.
 */
export function viewerMediaType(
  itemType: string,
  s3Key: string | null | undefined,
): ViewerItemType | null {
  if (!s3Key) return null;
  if (itemType === "video") return "video";
  if (itemType === "photo_360") return "photo_360";
  if (itemType === "photo") return "photo";
  return null;
}
