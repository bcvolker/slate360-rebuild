/**
 * Before/After (progression) deliverable generator.
 *
 * Site Walk captures before/after links via `site_walk_items.before_item_id` +
 * `item_relationship` ('after' | 'progress'), set during Ghost-mode capture
 * (the prior photo can live in a DIFFERENT walk months earlier). This builds a
 * click-through "Before → After" deck the existing hosted viewer renders with no
 * viewer changes: each pair becomes a Before slide followed by an After slide.
 *
 * A richer side-by-side / slider comparison is a later iteration; this v1 makes
 * the Ghost-mode data immediately shareable.
 */
import type { ViewerItem } from "@/lib/site-walk/viewer-types";

export type BeforeAfterItem = {
  id: string;
  title: string | null;
  description: string | null;
  s3_key: string | null;
  item_type: string;
  created_at: string;
  location_label: string | null;
};

export type BeforeAfterPair = {
  before: BeforeAfterItem;
  after: BeforeAfterItem;
  /** 'after' (single before→after) or 'progress' (step in a sequence). */
  relationship: string;
};

function isPhoto(it: BeforeAfterItem): boolean {
  return (
    (it.item_type === "photo" || it.item_type === "video" || it.item_type === "photo_360") &&
    !!it.s3_key
  );
}

function truncate(text: string | null, n = 200): string {
  if (!text) return "";
  return text.length <= n ? text : `${text.slice(0, n - 1).trimEnd()}…`;
}

function slide(it: BeforeAfterItem, label: string, suffix: string): ViewerItem {
  const photo = isPhoto(it);
  const dateLabel = it.created_at ? new Date(it.created_at).toLocaleDateString() : "";
  const meta = [it.location_label, dateLabel].filter(Boolean).join(" · ");
  return {
    id: `${it.id}-${suffix}`,
    type: photo ? "photo" : "note",
    title: `${label} — ${it.title || it.location_label || "Item"}`,
    mediaItemId: photo ? it.id : undefined,
    notes: [meta, truncate(it.description)].filter(Boolean).join("\n"),
  };
}

export function buildBeforeAfterContent(
  sessionTitle: string,
  pairs: BeforeAfterPair[],
): ViewerItem[] {
  const cover: ViewerItem = {
    id: "cover",
    type: "note",
    title: `Before / after — ${sessionTitle || "Site Walk"}`,
    notes: [
      `${pairs.length} comparison${pairs.length === 1 ? "" : "s"}`,
      `Generated ${new Date().toLocaleDateString()}`,
    ].join("\n"),
  };

  const blocks = pairs.flatMap((pair) => [
    slide(pair.before, "Before", "before"),
    slide(pair.after, "After", "after"),
  ]);

  return [cover, ...blocks];
}
