/**
 * Light-lift ("one-tap") deliverable generators.
 *
 * These mirror `buildStatusReportContent` (lib/site-walk/status-report.ts):
 * each takes the raw items captured in a Site Walk session and returns a
 * `ViewerItem[]` content array that the hosted token viewer already knows how
 * to render (real photos resolve via `/api/view/[token]/media/[mediaItemId]`).
 *
 * Doctrine: these run server-side from already-captured data, produce a small
 * templated block array (no image bytes embedded in-request), and are the only
 * deliverables the mobile app authors. Rich block-editor / interactive
 * deliverables stay desktop-only.
 */

import type { ViewerItem } from "@/lib/site-walk/viewer-types";
import type { StatusReportSourceItem } from "@/lib/site-walk/status-report";

/** Deliverable types the quick-generate endpoint can produce. */
export const QUICK_DELIVERABLE_TYPES = ["punchlist", "photo_log", "field_report", "slideshow"] as const;
export type QuickDeliverableType = (typeof QUICK_DELIVERABLE_TYPES)[number];

export function isQuickDeliverableType(value: unknown): value is QuickDeliverableType {
  return typeof value === "string" && (QUICK_DELIVERABLE_TYPES as readonly string[]).includes(value);
}

/**
 * Maps a quick type to the persisted `deliverable_type` + `output_mode`.
 *
 * "slideshow" is a light, client-facing click-through deck: it persists as
 * `cinematic_presentation` with `output_mode: "presentation"` (the hosted token
 * viewer already renders items as a full-screen, prev/next slideshow), so it
 * needs no heavy rendering — distinct from the parked 3D/video presentations.
 */
export const QUICK_DELIVERABLE_CONFIG: Record<
  QuickDeliverableType,
  { deliverableType: string; outputMode: string }
> = {
  punchlist: { deliverableType: "punchlist", outputMode: "hosted" },
  photo_log: { deliverableType: "photo_log", outputMode: "hosted" },
  field_report: { deliverableType: "field_report", outputMode: "hosted" },
  slideshow: { deliverableType: "cinematic_presentation", outputMode: "presentation" },
};

const PRIORITY_ORDER: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

const STATUS_ORDER: Record<string, number> = {
  open: 0,
  in_progress: 1,
  resolved: 2,
  verified: 3,
  closed: 4,
  na: 5,
};

function truncate(text: string | null | undefined, n = 240): string {
  if (!text) return "";
  return text.length <= n ? text : `${text.slice(0, n - 1).trimEnd()}…`;
}

function isPhoto(it: StatusReportSourceItem): boolean {
  return (it.item_type === "photo" || it.item_type === "video" || it.item_type === "photo_360") && !!it.s3_key;
}

function photoOrNote(it: StatusReportSourceItem, titleLine: string): ViewerItem {
  const photo = isPhoto(it);
  return {
    id: it.id,
    type: photo ? "photo" : "note",
    title: titleLine,
    mediaItemId: photo ? it.id : undefined,
    notes: truncate(it.description),
  };
}

/**
 * Punch list — outstanding work, ordered by priority then status. Resolved /
 * verified items are kept (shown as done) so the GC can track close-out, but the
 * summary emphasises what's still open. `na` items are dropped.
 */
export function buildPunchListContent(
  sessionTitle: string,
  items: StatusReportSourceItem[],
): ViewerItem[] {
  const scoped = items.filter((it) => (it.item_status ?? "open") !== "na");

  const ordered = [...scoped].sort((a, b) => {
    const sa = STATUS_ORDER[a.item_status ?? "open"] ?? 9;
    const sb = STATUS_ORDER[b.item_status ?? "open"] ?? 9;
    if (sa !== sb) return sa - sb;
    const pa = PRIORITY_ORDER[a.priority ?? "medium"] ?? 9;
    const pb = PRIORITY_ORDER[b.priority ?? "medium"] ?? 9;
    if (pa !== pb) return pa - pb;
    return a.created_at.localeCompare(b.created_at);
  });

  const open = ordered.filter((it) => (it.item_status ?? "open") === "open" || it.item_status === "in_progress");
  const byPriority = open.reduce<Record<string, number>>((acc, it) => {
    const p = it.priority ?? "medium";
    acc[p] = (acc[p] ?? 0) + 1;
    return acc;
  }, {});

  const summary: ViewerItem = {
    id: "summary",
    type: "note",
    title: "Punch list summary",
    notes: [
      `Walk: ${sessionTitle || "Untitled"}`,
      `Open items: ${open.length} of ${ordered.length}`,
      `Critical: ${byPriority.critical ?? 0}    High: ${byPriority.high ?? 0}    Medium: ${byPriority.medium ?? 0}    Low: ${byPriority.low ?? 0}`,
      `Generated ${new Date().toLocaleString()}`,
    ].join("\n"),
  };

  const blocks = ordered.map((it) => {
    const status = (it.item_status ?? "open").replace("_", " ");
    const priority = it.priority ? `${it.priority} · ` : "";
    return photoOrNote(it, `[${priority}${status}] ${it.title || `(untitled ${it.item_type})`}`);
  });

  return [summary, ...blocks];
}

/**
 * Photo log — chronological gallery of every captured photo/video. Notes-only
 * items are excluded; this is a visual record.
 */
export function buildPhotoLogContent(
  sessionTitle: string,
  items: StatusReportSourceItem[],
): ViewerItem[] {
  const photos = items
    .filter(isPhoto)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const summary: ViewerItem = {
    id: "summary",
    type: "note",
    title: "Photo log",
    notes: [
      `Walk: ${sessionTitle || "Untitled"}`,
      `Photos: ${photos.length}`,
      photos.length > 0
        ? `Captured ${new Date(photos[0].created_at).toLocaleDateString()} – ${new Date(photos[photos.length - 1].created_at).toLocaleDateString()}`
        : "No photos captured",
      `Generated ${new Date().toLocaleString()}`,
    ].join("\n"),
  };

  const blocks = photos.map((it, idx) => ({
    id: it.id,
    type: "photo" as const,
    title: it.title || `Photo ${idx + 1}`,
    mediaItemId: it.id,
    notes: truncate(it.description),
    metadata: { timestamp: it.created_at },
  }));

  return [summary, ...blocks];
}

/**
 * Field report — full chronological record of the walk (every item, in capture
 * order) with a header summary. Distinct from status_report (status-ordered,
 * actionable-first) and photo_log (photos only).
 */
export function buildFieldReportContent(
  sessionTitle: string,
  items: StatusReportSourceItem[],
): ViewerItem[] {
  const ordered = [...items].sort((a, b) => a.created_at.localeCompare(b.created_at));

  const counts = ordered.reduce(
    (acc, it) => {
      const s = (it.item_status ?? "open") as keyof typeof acc;
      if (s in acc) acc[s] += 1;
      return acc;
    },
    { open: 0, in_progress: 0, resolved: 0, verified: 0, closed: 0, na: 0 },
  );
  const photoCount = ordered.filter(isPhoto).length;

  const summary: ViewerItem = {
    id: "summary",
    type: "note",
    title: "Field report",
    notes: [
      `Walk: ${sessionTitle || "Untitled"}`,
      `Total items: ${ordered.length}    Photos: ${photoCount}`,
      `Open: ${counts.open}    In progress: ${counts.in_progress}    Resolved: ${counts.resolved + counts.verified}    Closed: ${counts.closed}`,
      `Generated ${new Date().toLocaleString()}`,
    ].join("\n"),
  };

  const blocks = ordered.map((it) => {
    const status = (it.item_status ?? "open").replace("_", " ");
    return photoOrNote(it, `[${status}] ${it.title || `(untitled ${it.item_type})`}`);
  });

  return [summary, ...blocks];
}

/**
 * Slideshow — a clean, client-facing click-through deck: a cover slide followed
 * by every captured photo full-bleed (the hosted viewer handles prev/next). Note
 * the cover is a `note` block; the viewer renders it as the opening slide.
 */
export function buildSlideshowContent(
  sessionTitle: string,
  items: StatusReportSourceItem[],
): ViewerItem[] {
  const photos = items
    .filter(isPhoto)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));

  const cover: ViewerItem = {
    id: "cover",
    type: "note",
    title: sessionTitle || "Site Walk",
    notes: [
      `${photos.length} photo${photos.length === 1 ? "" : "s"}`,
      `Generated ${new Date().toLocaleDateString()}`,
    ].join("\n"),
  };

  const slides = photos.map((it, idx) => ({
    id: it.id,
    type: "photo" as const,
    title: it.title || `Slide ${idx + 1}`,
    mediaItemId: it.id,
    notes: truncate(it.description),
  }));

  return [cover, ...slides];
}

/** A voice memo is included only if it has playable audio and/or a transcript. */
function isVoiceMemo(it: StatusReportSourceItem): boolean {
  return it.item_type === "voice_note" && (!!it.audio_s3_key || !!it.transcript);
}

/**
 * Optional "Voice memos" section appended to a deliverable when the subscriber
 * chooses to attach them. Each memo renders in the hosted viewer as an audio
 * player (resolved via mediaItemId → /api/view/[token]/media) plus its
 * transcript. Returns [] when there are no voice memos to include.
 */
export function buildVoiceMemoSection(items: StatusReportSourceItem[]): ViewerItem[] {
  const memos = items
    .filter(isVoiceMemo)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
  if (memos.length === 0) return [];

  const header: ViewerItem = {
    id: "voice-memos",
    type: "note",
    title: "Voice memos",
    notes: `${memos.length} voice memo${memos.length === 1 ? "" : "s"} attached`,
  };

  const blocks = memos.map((it, idx) => ({
    id: it.id,
    type: "voice" as const,
    title: it.title || `Voice memo ${idx + 1}`,
    // Only point at media when there's audio to play; transcript still shows.
    mediaItemId: it.audio_s3_key ? it.id : undefined,
    transcript: it.transcript ?? undefined,
    notes: truncate(it.description),
  }));

  return [header, ...blocks];
}

/** Dispatch by type, optionally appending an attached voice-memo section. */
export function buildQuickDeliverableContent(
  type: QuickDeliverableType,
  sessionTitle: string,
  items: StatusReportSourceItem[],
  options?: { includeVoice?: boolean },
): ViewerItem[] {
  const base = ((): ViewerItem[] => {
    switch (type) {
      case "punchlist":
        return buildPunchListContent(sessionTitle, items);
      case "photo_log":
        return buildPhotoLogContent(sessionTitle, items);
      case "field_report":
        return buildFieldReportContent(sessionTitle, items);
      case "slideshow":
        return buildSlideshowContent(sessionTitle, items);
    }
  })();

  if (options?.includeVoice) {
    const voice = buildVoiceMemoSection(items);
    if (voice.length > 0) return [...base, ...voice];
  }
  return base;
}

/** Human-facing title prefix per type, used when naming the deliverable row. */
export const QUICK_DELIVERABLE_LABELS: Record<QuickDeliverableType, string> = {
  punchlist: "Punch list",
  photo_log: "Photo log",
  field_report: "Field report",
  slideshow: "Slideshow",
};
