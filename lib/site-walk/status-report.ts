/**
 * Builds a status_report deliverable's `content` array from the items
 * captured in a Site Walk session.
 *
 * Output is a curated, leadership-friendly slice of the raw walk:
 *   1. Summary block (open/in-progress/resolved counts + a one-line bullet).
 *   2. Open & in-progress items first (most actionable).
 *   3. Resolved items grouped at the end (proves progress).
 *   4. Notes are kept short — long descriptions are truncated to 240 chars
 *      with an ellipsis to keep the report scannable.
 */

import type { ViewerItem } from "@/lib/site-walk/viewer-types";

export interface StatusReportSourceItem {
  id: string;
  item_type: string;
  title: string | null;
  description: string | null;
  s3_key: string | null;
  item_status: string | null;
  priority: string | null;
  created_at: string;
}

const STATUS_ORDER: Record<string, number> = {
  open: 0,
  in_progress: 1,
  resolved: 2,
  verified: 3,
  closed: 4,
  na: 5,
};

function truncate(text: string | null, n = 240): string {
  if (!text) return "";
  return text.length <= n ? text : `${text.slice(0, n - 1).trimEnd()}…`;
}

export function buildStatusReportContent(
  sessionTitle: string,
  items: StatusReportSourceItem[],
): ViewerItem[] {
  const ordered = [...items].sort((a, b) => {
    const sa = STATUS_ORDER[a.item_status ?? "open"] ?? 9;
    const sb = STATUS_ORDER[b.item_status ?? "open"] ?? 9;
    if (sa !== sb) return sa - sb;
    return a.created_at.localeCompare(b.created_at);
  });

  const counts = ordered.reduce(
    (acc, it) => {
      const s = (it.item_status ?? "open") as keyof typeof acc;
      if (s in acc) acc[s] = (acc[s] ?? 0) + 1;
      else acc.other = (acc.other ?? 0) + 1;
      return acc;
    },
    { open: 0, in_progress: 0, resolved: 0, verified: 0, closed: 0, na: 0, other: 0 } as Record<string, number>,
  );

  const summaryNotes = [
    `Walk: ${sessionTitle || "Untitled"}`,
    `Open: ${counts.open}    In progress: ${counts.in_progress}`,
    `Resolved: ${counts.resolved + counts.verified}    Closed: ${counts.closed}`,
    `Total items: ${ordered.length}`,
    `Generated ${new Date().toLocaleString()}`,
  ].join("\n");

  const summary: ViewerItem = {
    id: "summary",
    type: "note",
    title: "Status summary",
    notes: summaryNotes,
  };

  const itemBlocks: ViewerItem[] = ordered.map((it) => {
    const status = (it.item_status ?? "open").replace("_", " ");
    const priority = it.priority ? ` · priority ${it.priority}` : "";
    const titleLine = `[${status}${priority}] ${it.title || `(untitled ${it.item_type})`}`;
    const isPhoto = it.item_type === "photo" && !!it.s3_key;
    return {
      id: it.id,
      type: isPhoto ? "photo" : "note",
      title: titleLine,
      mediaItemId: isPhoto ? it.id : undefined,
      notes: truncate(it.description),
    };
  });

  return [summary, ...itemBlocks];
}
