"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { TourBundle } from "@/lib/spatial-tour/types";

type ChecklistRow = { id: string; label: string; ok: boolean; detail: string };
export type TourCallResult = { ok: true } | { ok: false; error: string; items?: ChecklistRow[] };

/** Operator Tour data: one fetch, JSON mutations that return the fresh bundle, and polling while stills are queued. */
export function useTourBundle(projectId: string) {
  const base = `/api/projects/${projectId}/tour`;
  const [bundle, setBundle] = useState<TourBundle | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);

  const refresh = useCallback(async () => {
    const res = await fetch(base, { cache: "no-store" });
    if (!alive.current) return;
    if (!res.ok) return setLoadError(res.status === 403 ? "You need authoring access for this project." : "Could not load the route.");
    setLoadError(null);
    setBundle((await res.json()) as TourBundle);
  }, [base]);

  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);

  const queued = bundle?.marks.some((m) => m.stillStatus === "queued") ?? false;
  useEffect(() => {
    if (!queued) return;
    const id = window.setInterval(() => void refresh(), 3000);
    return () => window.clearInterval(id);
  }, [queued, refresh]);

  const call = useCallback(
    async (path: string, method: "POST" | "PUT" | "PATCH", body: unknown): Promise<TourCallResult> => {
      setBusy(true);
      try {
        const res = await fetch(`${base}${path}`, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        if (!res.ok) {
          return {
            ok: false,
            error: typeof json.error === "string" ? json.error : "Something went wrong. Try again.",
            items: Array.isArray(json.items) ? (json.items as ChecklistRow[]) : undefined,
          };
        }
        setBundle(json as unknown as TourBundle);
        return { ok: true };
      } finally {
        setBusy(false);
      }
    },
    [base],
  );

  return { bundle, loadError, busy, refresh, call };
}
