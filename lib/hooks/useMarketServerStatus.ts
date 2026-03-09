"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { SchedulerHealthViewModel, ApiEnvelope } from "@/lib/market/contracts";

export type ServerBotStatus = "running" | "paused" | "stopped" | "paper" | "unknown";

export interface MarketServerStatus {
  /** Canonical server-confirmed bot status */
  status: ServerBotStatus;
  /** True when we have received at least one successful server response */
  isConfirmed: boolean;
  /** True while a fetch is in flight */
  isLoading: boolean;
  /** Full scheduler health data from server (null until first fetch) */
  health: SchedulerHealthViewModel | null;
  /** ISO timestamp of last successful server check */
  lastCheckedAt: string | null;
  /** Any fetch error message */
  error: string | null;
  /** Force an immediate refresh */
  refresh: () => Promise<void>;
}

const POLL_INTERVAL_MS = 30_000; // 30 seconds — reduce noisy status polling and transient 504s

export function useMarketServerStatus(): MarketServerStatus {
  const [status, setStatus] = useState<ServerBotStatus>("unknown");
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [health, setHealth] = useState<SchedulerHealthViewModel | null>(null);
  const [lastCheckedAt, setLastCheckedAt] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchServerStatus = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [botRes, healthRes] = await Promise.all([
        fetch("/api/market/bot-status", { cache: "no-store" }),
        fetch("/api/market/scheduler/health", { cache: "no-store" }),
      ]);

      if (!mountedRef.current) return;

      // Parse bot-status
      let serverStatus: ServerBotStatus = "unknown";
      if (botRes.ok) {
        const botPayload = (await botRes.json()) as ApiEnvelope<{ status: string }>;
        if (botPayload.ok && botPayload.data?.status) {
          const raw = botPayload.data.status.toLowerCase();
          if (raw === "running" || raw === "paused" || raw === "stopped" || raw === "paper") {
            serverStatus = raw;
          }
        }
      }

      // Parse scheduler health
      if (healthRes.ok) {
        const healthPayload = (await healthRes.json()) as ApiEnvelope<SchedulerHealthViewModel>;
        if (healthPayload.ok && healthPayload.data) {
          setHealth(healthPayload.data);
          // Scheduler health status can override if bot-status didn't return usable data
          if (serverStatus === "unknown") {
            serverStatus = healthPayload.data.status;
          }
        }
      }

      if (!mountedRef.current) return;
      setStatus(serverStatus);
      setIsConfirmed(serverStatus !== "unknown");
      setLastCheckedAt(new Date().toISOString());
    } catch (e: unknown) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : "Failed to fetch server status");
      // Don't reset status to unknown on transient errors — keep last known
    } finally {
      if (mountedRef.current) setIsLoading(false);
    }
  }, []);

  // Initial fetch + polling
  useEffect(() => {
    mountedRef.current = true;
    void fetchServerStatus();

    const id = setInterval(() => {
      void fetchServerStatus();
    }, POLL_INTERVAL_MS);

    return () => {
      mountedRef.current = false;
      clearInterval(id);
    };
  }, [fetchServerStatus]);

  return {
    status,
    isConfirmed,
    isLoading,
    health,
    lastCheckedAt,
    error,
    refresh: fetchServerStatus,
  };
}
