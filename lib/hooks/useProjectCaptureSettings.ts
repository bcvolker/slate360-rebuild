"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CAPTURE_TRADES } from "@/lib/types/site-walk-capture";

type Result = {
  trades: string[];
  isCustom: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  save: (next: string[]) => Promise<void>;
};

const DEFAULT_TRADES = [...CAPTURE_TRADES];

export function useProjectCaptureSettings(projectId: string | null): Result {
  const [trades, setTrades] = useState<string[]>(DEFAULT_TRADES);
  const [isCustom, setIsCustom] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef<AbortController | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setTrades(DEFAULT_TRADES);
      setIsCustom(false);
      return;
    }
    inFlight.current?.abort();
    const controller = new AbortController();
    inFlight.current = controller;
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/site-walk/projects/${projectId}/capture-settings`, { signal: controller.signal });
      if (!response.ok) throw new Error(`Failed to load capture settings (${response.status})`);
      const json = (await response.json()) as { trades?: unknown; isCustom?: unknown };
      const next = Array.isArray(json.trades) ? json.trades.filter((value): value is string => typeof value === "string") : DEFAULT_TRADES;
      setTrades(next.length > 0 ? next : DEFAULT_TRADES);
      setIsCustom(Boolean(json.isCustom));
    } catch (caught) {
      if ((caught as { name?: string }).name === "AbortError") return;
      setError((caught as Error).message ?? "Could not load trades");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const save = useCallback(async (next: string[]) => {
    if (!projectId) throw new Error("Cannot save trades without a project");
    setError(null);
    const response = await fetch(`/api/site-walk/projects/${projectId}/capture-settings`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trades: next }),
    });
    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `Failed to save trades (${response.status})`);
    }
    const json = (await response.json()) as { trades?: unknown };
    const saved = Array.isArray(json.trades) ? json.trades.filter((value): value is string => typeof value === "string") : next;
    setTrades(saved.length > 0 ? saved : DEFAULT_TRADES);
    setIsCustom(saved.length > 0);
  }, [projectId]);

  useEffect(() => { void refresh(); }, [refresh]);

  return { trades, isCustom, loading, error, refresh, save };
}
