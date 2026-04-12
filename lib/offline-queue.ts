/**
 * lib/offline-queue.ts
 * IndexedDB-backed queue for offline mutations.
 * Entries are stored when the network is unavailable and
 * flushed automatically when connectivity returns.
 */
import { get, set, del, keys, createStore } from "idb-keyval";

const store = createStore("slate360-offline", "pending-mutations");

export interface QueuedMutation {
  id: string;
  url: string;
  method: "POST" | "PATCH" | "DELETE";
  body: string;
  createdAt: number;
  retries: number;
}

/** Enqueue a mutation for later replay */
export async function enqueue(entry: Omit<QueuedMutation, "id" | "createdAt" | "retries">) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const mutation: QueuedMutation = {
    ...entry,
    id,
    createdAt: Date.now(),
    retries: 0,
  };
  await set(id, mutation, store);
  return id;
}

/** List all pending mutations (oldest first) */
export async function listPending(): Promise<QueuedMutation[]> {
  const allKeys = await keys(store);
  const entries: QueuedMutation[] = [];
  for (const k of allKeys) {
    const val = await get<QueuedMutation>(k, store);
    if (val) entries.push(val);
  }
  return entries.sort((a, b) => a.createdAt - b.createdAt);
}

/** Remove a successfully replayed mutation */
export async function remove(id: string) {
  await del(id, store);
}

/** Replay all pending mutations in order. Returns count of successes. */
export async function flushQueue(): Promise<number> {
  const pending = await listPending();
  let successes = 0;

  for (const mutation of pending) {
    try {
      const res = await fetch(mutation.url, {
        method: mutation.method,
        headers: { "Content-Type": "application/json" },
        body: mutation.method !== "DELETE" ? mutation.body : undefined,
      });
      if (res.ok || res.status === 409) {
        await remove(mutation.id);
        successes++;
      } else if (mutation.retries >= 3) {
        // Drop after 3 failed retries
        await remove(mutation.id);
      } else {
        await set(mutation.id, { ...mutation, retries: mutation.retries + 1 }, store);
      }
    } catch {
      // Still offline — stop flushing
      break;
    }
  }

  return successes;
}

/** Get count of pending mutations */
export async function pendingCount(): Promise<number> {
  const allKeys = await keys(store);
  return allKeys.length;
}
