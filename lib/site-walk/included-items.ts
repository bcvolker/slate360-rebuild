import type { ViewerItem } from "./viewer-types";

/**
 * Extract the set of `site_walk_items` IDs referenced by a deliverable's
 * `content` (a `ViewerItem[]`). Each block points at its source item via
 * `mediaItemId` (media) or `id` (note). De-duplicated, order-stable.
 */
export function extractIncludedItemIds(content: unknown): string[] {
  const blocks: ViewerItem[] = Array.isArray(content) ? (content as ViewerItem[]) : [];
  return Array.from(
    new Set(
      blocks
        .map((b) => {
          if (b && typeof b.mediaItemId === "string" && b.mediaItemId) return b.mediaItemId;
          if (b && typeof b.id === "string" && b.id) return b.id;
          return null;
        })
        .filter((v): v is string => typeof v === "string" && v.length > 0),
    ),
  );
}
