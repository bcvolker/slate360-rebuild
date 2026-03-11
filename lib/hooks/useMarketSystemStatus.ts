"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ApiEnvelope, MarketSystemStatusViewModel } from "@/lib/market/contracts";

const POLL_INTERVAL_MS = 45_000;

export function useMarketSystemStatus() {
  const [system, setSystem] = useState<MarketSystemStatusViewModel | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/market/system-status", { cache: "no-store" });
      const payload = await res.json() as ApiEnvelope<MarketSystemStatusViewModel>;
      if (!mountedRef.current) return;
      if (!res.ok || !payload.ok || !payload.data) {
        setError(payload.error?.message ?? `Failed to load market system status (${res.status})`);
        return;
      }
      setSystem(payload.data);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load market system status");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void refresh();
    const id = setInterval(() => { void refresh(); }, POLL_INTERVAL_MS);
    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [refresh]);

  return { system, loading, error, refresh };
}