import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";

export function buildLocalPhotoItem(sessionId: string, title: string, previewUrl: string, clientItemId: string, clientMutationId: string): CaptureItemRecord {
  const now = new Date().toISOString();
  return {
    id: clientItemId,
    session_id: sessionId,
    client_item_id: clientItemId,
    client_mutation_id: clientMutationId,
    item_type: "photo",
    title,
    description: null,
    category: null,
    priority: "medium",
    item_status: "open",
    assigned_to: null,
    due_date: null,
    capture_mode: "camera",
    sync_state: "pending",
    upload_state: "queued",
    metadata: {},
    photo_attachment_pins: [],
    local_preview_url: previewUrl,
    created_at: now,
    updated_at: now,
  };
}

export function readLastTitle(sessionId: string) {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(`site-walk:current-location:${sessionId}`) ?? sessionStorage.getItem(`site-walk:last-title:${sessionId}`) ?? "";
}

export function statusClasses(kind: string) {
  if (kind === "complete") return "bg-emerald-500/10 text-emerald-300 ring-1 ring-emerald-500/20";
  if (kind === "error") return "bg-rose-500/10 text-rose-300 ring-1 ring-rose-500/20";
  if (kind === "uploading" || kind === "saving") return "bg-[color-mix(in_srgb,var(--graphite-primary)_10%,transparent)] text-[var(--graphite-primary)] ring-1 ring-[color-mix(in_srgb,var(--graphite-primary)_20%,transparent)]";
  return "bg-zinc-900/80 text-zinc-200 ring-1 ring-white/10";
}
