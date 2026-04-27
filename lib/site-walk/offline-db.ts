import { createStore, del, get, keys, set } from "idb-keyval";

export type OfflineMutationMethod = "POST" | "PATCH" | "DELETE";
export type OfflineMutationKind = "item_create" | "item_patch" | "pin_mutation" | "generic";

export type OfflineMutation = {
  id: string;
  kind: OfflineMutationKind;
  url: string;
  method: OfflineMutationMethod;
  body?: Record<string, unknown>;
  sessionId?: string;
  localClientItemId?: string;
  blobId?: string;
  upload?: { filename: string; contentType: string; fileSizeBytes: number };
  createdAt: number;
  updatedAt: number;
  retries: number;
  status: "pending" | "syncing" | "failed" | "conflict";
  error?: string;
};

export type OfflineBlobRecord = {
  id: string;
  blob: Blob;
  filename: string;
  contentType: string;
  size: number;
  createdAt: number;
};

export const SITE_WALK_OFFLINE_EVENT = "site-walk-offline-queue-changed";

const mutationStore = createStore("slate360-site-walk-offline", "offline_mutations");
const blobStore = createStore("slate360-site-walk-offline", "offline_blobs");

export function createOfflineId(prefix: string) {
  const cryptoApi = typeof globalThis !== "undefined" ? globalThis.crypto : undefined;
  if (cryptoApi && typeof cryptoApi.randomUUID === "function") return `${prefix}-${cryptoApi.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export async function saveOfflineBlob(record: Omit<OfflineBlobRecord, "createdAt">) {
  await set(record.id, { ...record, createdAt: Date.now() }, blobStore);
  emitQueueChange();
}

export async function readOfflineBlob(id: string) {
  return get<OfflineBlobRecord>(id, blobStore);
}

export async function removeOfflineBlob(id: string) {
  await del(id, blobStore);
  emitQueueChange();
}

export async function enqueueOfflineMutation(input: Omit<OfflineMutation, "id" | "createdAt" | "updatedAt" | "retries" | "status"> & { id?: string }) {
  const now = Date.now();
  const mutation: OfflineMutation = {
    ...input,
    id: input.id ?? createOfflineId("mutation"),
    createdAt: now,
    updatedAt: now,
    retries: 0,
    status: "pending",
  };
  await set(mutation.id, mutation, mutationStore);
  emitQueueChange();
  return mutation;
}

export async function listOfflineMutations() {
  const allKeys = await keys(mutationStore);
  const entries: OfflineMutation[] = [];
  for (const key of allKeys) {
    const value = await get<OfflineMutation>(key, mutationStore);
    if (value) entries.push(value);
  }
  return entries.sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateOfflineMutation(id: string, patch: Partial<OfflineMutation>) {
  const current = await get<OfflineMutation>(id, mutationStore);
  if (!current) return;
  await set(id, { ...current, ...patch, updatedAt: Date.now() }, mutationStore);
  emitQueueChange();
}

export async function removeOfflineMutation(id: string) {
  await del(id, mutationStore);
  emitQueueChange();
}

export async function getOfflineQueueSummary() {
  const mutations = await listOfflineMutations();
  return {
    pending: mutations.filter((item) => item.status === "pending").length,
    syncing: mutations.filter((item) => item.status === "syncing").length,
    failed: mutations.filter((item) => item.status === "failed" || item.status === "conflict").length,
    total: mutations.length,
  };
}

export function emitQueueChange() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SITE_WALK_OFFLINE_EVENT));
}
