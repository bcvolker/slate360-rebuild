"use client";

import { getOfflineQueueSummary, listOfflineMutations, readOfflineBlob, removeOfflineBlob, removeOfflineMutation, SITE_WALK_OFFLINE_EVENT, updateOfflineMutation, type OfflineMutation } from "@/lib/site-walk/offline-db";

type SyncState = "offline" | "syncing" | "synced" | "failed";
type SyncSnapshot = { state: SyncState; pending: number; failed: number; total: number };
type Listener = (snapshot: SyncSnapshot) => void;
type ItemResponse = { item?: { id: string; client_item_id?: string | null }; error?: string };
type UploadResponse = { uploadUrl?: string; s3Key?: string; fileId?: string; error?: string };

const listeners = new Set<Listener>();
const idMap = new Map<string, string>();
let syncing = false;
let started = false;
let timer: number | null = null;

export function startSiteWalkSyncManager() {
  if (started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => void replayOfflineQueue());
  window.addEventListener(SITE_WALK_OFFLINE_EVENT, () => void publishSnapshot());
  timer = window.setInterval(() => {
    if (navigator.onLine) void replayOfflineQueue();
  }, 15_000);
  void publishSnapshot();
  if (navigator.onLine) void replayOfflineQueue();
}

export function subscribeSiteWalkSync(listener: Listener) {
  listeners.add(listener);
  void publishSnapshot();
  return () => listeners.delete(listener);
}

export async function replayOfflineQueue() {
  if (syncing || typeof navigator !== "undefined" && !navigator.onLine) {
    await publishSnapshot();
    return;
  }
  syncing = true;
  await publishSnapshot("syncing");
  try {
    const mutations = await listOfflineMutations();
    for (const mutation of mutations) {
      if (typeof navigator !== "undefined" && !navigator.onLine) break;
      const done = await replayMutation(mutation);
      if (!done) break;
    }
  } finally {
    syncing = false;
    await publishSnapshot();
  }
}

async function replayMutation(mutation: OfflineMutation) {
  await updateOfflineMutation(mutation.id, { status: "syncing", error: undefined });
  try {
    if (mutation.kind === "item_create") await replayItemCreate(mutation);
    else await replayJsonMutation(mutation);
    await removeOfflineMutation(mutation.id);
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    const status = mutation.retries >= 3 ? "failed" : "pending";
    await updateOfflineMutation(mutation.id, { retries: mutation.retries + 1, status, error: message });
    return false;
  }
}

async function replayItemCreate(mutation: OfflineMutation) {
  const body = { ...(mutation.body ?? {}) };
  if (mutation.blobId && mutation.upload) {
    const blob = await readOfflineBlob(mutation.blobId);
    if (!blob) throw new Error("Offline media blob missing");
    const upload = await requestUpload(mutation.sessionId, mutation.upload, blob.blob);
    body.file_id = upload.fileId ?? null;
    body.s3_key = upload.s3Key;
    body.upload_state = "uploaded";
    body.upload_progress = 100;
  }

  const response = await fetch(mutation.url, {
    method: mutation.method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json().catch(() => null)) as ItemResponse | null;
  if (!response.ok || !data?.item?.id) throw new Error(data?.error ?? "Item sync failed");
  if (mutation.localClientItemId) idMap.set(mutation.localClientItemId, data.item.id);
  if (mutation.blobId) await removeOfflineBlob(mutation.blobId);
}

async function replayJsonMutation(mutation: OfflineMutation) {
  const body = replaceLocalRefs(mutation.body ?? {});
  const url = await resolveMutationUrl(mutation);
  const response = await fetch(url, {
    method: mutation.method,
    headers: mutation.method === "DELETE" ? undefined : { "Content-Type": "application/json" },
    body: mutation.method === "DELETE" ? undefined : JSON.stringify(body),
  });
  if (response.ok || response.status === 409) return;
  const text = await response.text().catch(() => "");
  throw new Error(text || `Sync failed (${response.status})`);
}

async function requestUpload(sessionId: string | undefined, upload: NonNullable<OfflineMutation["upload"]>, blob: Blob) {
  if (!sessionId) throw new Error("Session missing for offline upload");
  const presign = await fetch("/api/site-walk/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: upload.filename, contentType: upload.contentType, sessionId, fileSizeBytes: upload.fileSizeBytes }),
  });
  const data = (await presign.json().catch(() => null)) as UploadResponse | null;
  if (!presign.ok || !data?.uploadUrl || !data.s3Key) throw new Error(data?.error ?? "Upload preflight failed");
  const put = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": upload.contentType }, body: blob });
  if (!put.ok) throw new Error("Storage upload failed");
  return data;
}

async function resolveMutationUrl(mutation: OfflineMutation) {
  if (mutation.kind !== "item_patch" || !mutation.localClientItemId) return mutation.url;
  const serverId = idMap.get(mutation.localClientItemId) ?? await lookupServerItemId(mutation.sessionId, mutation.localClientItemId);
  if (!serverId) throw new Error("Waiting for item create before patch sync");
  idMap.set(mutation.localClientItemId, serverId);
  return `/api/site-walk/items/${encodeURIComponent(serverId)}`;
}

async function lookupServerItemId(sessionId: string | undefined, clientItemId: string) {
  if (!sessionId) return null;
  const response = await fetch(`/api/site-walk/items?session_id=${encodeURIComponent(sessionId)}`, { cache: "no-store" });
  const data = (await response.json().catch(() => null)) as { items?: Array<{ id: string; client_item_id?: string | null }> } | null;
  return data?.items?.find((item) => item.client_item_id === clientItemId)?.id ?? null;
}

function replaceLocalRefs(value: unknown): unknown {
  if (typeof value === "string" && value.startsWith("__client:")) return idMap.get(value.slice(9)) ?? value;
  if (Array.isArray(value)) return value.map(replaceLocalRefs);
  if (value && typeof value === "object") {
    const next: Record<string, unknown> = {};
    for (const [key, child] of Object.entries(value)) next[key] = replaceLocalRefs(child);
    return next;
  }
  return value;
}

async function publishSnapshot(forcedState?: SyncState) {
  const summary = await getOfflineQueueSummary();
  const online = typeof navigator === "undefined" ? true : navigator.onLine;
  const state: SyncState = forcedState ?? (!online ? "offline" : summary.failed > 0 ? "failed" : summary.total > 0 ? "syncing" : "synced");
  const snapshot = { state, ...summary };
  for (const listener of listeners) listener(snapshot);
}

export function stopSiteWalkSyncManagerForTests() {
  if (timer !== null && typeof window !== "undefined") window.clearInterval(timer);
  timer = null;
  started = false;
}
