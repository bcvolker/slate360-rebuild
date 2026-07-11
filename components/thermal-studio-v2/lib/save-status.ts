"use client";

import { useEffect, useState } from "react";

/**
 * R1 "never lie" reliability pack (Addendum H2/G1): a failed autosave PATCH
 * used to vanish into a silent `.catch(() => {})`. This is the shared status
 * store the three save-*.ts modules (spots/tuning/findings) report into, so
 * the shell's Saved chip can show a real state and a Retry action instead.
 */
export type SaveStatus = "idle" | "saving" | "saved" | "error";

export type SaveEntry = {
  status: SaveStatus;
  message?: string;
  retry?: () => void;
};

const entries = new Map<string, SaveEntry>();
const listeners = new Set<() => void>();

function notify() {
  for (const l of listeners) l();
}

export function reportSaveStart(captureId: string) {
  entries.set(captureId, { status: "saving" });
  notify();
}

export function reportSaveOk(captureId: string) {
  entries.set(captureId, { status: "saved" });
  notify();
}

export function reportSaveError(captureId: string, message: string, retry: () => void) {
  entries.set(captureId, { status: "error", message, retry });
  notify();
}

export function retryAllFailed() {
  for (const [, entry] of entries) {
    if (entry.status === "error" && entry.retry) entry.retry();
  }
}

/** Worst-first: any error outranks saving, which outranks saved/idle. */
export function worstStatus(): { status: SaveStatus; failedCount: number } {
  let failedCount = 0;
  let saving = false;
  for (const [, entry] of entries) {
    if (entry.status === "error") failedCount += 1;
    if (entry.status === "saving") saving = true;
  }
  if (failedCount > 0) return { status: "error", failedCount };
  if (saving) return { status: "saving", failedCount: 0 };
  return { status: entries.size ? "saved" : "idle", failedCount: 0 };
}

export function useSaveStatus() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);
  return worstStatus();
}

/** True when any capture has an unsaved (in-flight or errored) change — for the nav guard. */
export function hasUnsavedWork(): boolean {
  for (const [, entry] of entries) {
    if (entry.status === "saving" || entry.status === "error") return true;
  }
  return false;
}

const RETRY_DELAYS_MS = [1000, 3000, 9000];

/** Fetch with the R1 retry/backoff + status-reporting contract every autosave uses. */
export function patchCaptureWithStatus(
  captureId: string,
  body: Record<string, unknown>,
  attempt = 0,
): Promise<boolean> {
  reportSaveStart(captureId);
  return fetch(`/api/ops/thermal/captures/${captureId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
    .then((res) => {
      if (!res.ok) throw new Error(`Save failed (${res.status})`);
      reportSaveOk(captureId);
      return true;
    })
    .catch((err) => {
      if (attempt < RETRY_DELAYS_MS.length) {
        return new Promise<boolean>((resolve) => {
          setTimeout(() => {
            resolve(patchCaptureWithStatus(captureId, body, attempt + 1));
          }, RETRY_DELAYS_MS[attempt]);
        });
      }
      const message = err instanceof Error ? err.message : "Not saved";
      reportSaveError(captureId, message, () => {
        void patchCaptureWithStatus(captureId, body, 0);
      });
      return false;
    });
}
