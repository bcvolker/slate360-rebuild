"use client";

import { useState, useEffect, useCallback } from "react";
import type { MarketSummaryViewModel, SchedulerHealthViewModel, ApiEnvelope, TradeViewModel } from "@/lib/market/contracts";
import type { MarketTrade, PnlPoint, MarketActivityLogEntry } from "@/components/dashboard/market/types";

export interface UseMarketTradeDataReturn {
  trades: MarketTrade[];
  openTrades: MarketTrade[];
  pnlChart: PnlPoint[];
  loadingTrades: boolean;
  totalPnl: number;
  winRate: string;
  recentOutcomes: MarketTrade[];
  summary: MarketSummaryViewModel | null;
  loadingSummary: boolean;
  summaryError: string | null;
  schedulerHealth: SchedulerHealthViewModel | null;
  loadingSchedulerHealth: boolean;
  schedulerHealthError: string | null;
  schedulerStatus: string;
  schedulerStatusTone: string;
  activityLogs: MarketActivityLogEntry[];
  fetchTrades: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchSchedulerHealth: () => Promise<void>;
  fetchMarketLogs: () => Promise<void>;
  settleAndRefresh: () => Promise<void>;
}

export function useMarketTradeData(): UseMarketTradeDataReturn {
  const [trades, setTrades] = useState<MarketTrade[]>([]);
  const [pnlChart, setPnlChart] = useState<PnlPoint[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [summary, setSummary] = useState<MarketSummaryViewModel | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [schedulerHealth, setSchedulerHealth] = useState<SchedulerHealthViewModel | null>(null);
  const [loadingSchedulerHealth, setLoadingSchedulerHealth] = useState(false);
  const [schedulerHealthError, setSchedulerHealthError] = useState<string | null>(null);
  const [activityLogs, setActivityLogs] = useState<MarketActivityLogEntry[]>([]);

  const fetchTrades = useCallback(async () => {
    setLoadingTrades(true);
    try {
      const res = await fetch("/api/market/trades");
      if (res.ok) {
        const payload = await res.json() as ApiEnvelope<{ trades: TradeViewModel[] }>;
        setTrades(payload.data?.trades ?? []);
      }
    } catch (e) {
      console.error("fetchTrades", e);
    } finally {
      setLoadingTrades(false);
    }
  }, []);

  const fetchSummary = useCallback(async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/market/summary", { cache: "no-store" });
      const payload = await res.json() as ApiEnvelope<MarketSummaryViewModel>;
      if (!res.ok || !payload.ok) {
        setSummaryError(payload.error?.message ?? "Failed to load summary");
        return;
      }
      setSummary(payload.data ?? null);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Failed to load summary");
    } finally {
      setLoadingSummary(false);
    }
  }, []);

  const fetchSchedulerHealth = useCallback(async () => {
    setLoadingSchedulerHealth(true);
    setSchedulerHealthError(null);
    try {
      const res = await fetch("/api/market/scheduler/health", { cache: "no-store" });
      const payload = await res.json() as ApiEnvelope<SchedulerHealthViewModel>;
      if (!res.ok || !payload.ok) {
        setSchedulerHealthError(payload.error?.message ?? "Failed to load scheduler health");
        return;
      }
      setSchedulerHealth(payload.data ?? null);
    } catch (e) {
      setSchedulerHealthError(e instanceof Error ? e.message : "Failed to load scheduler health");
    } finally {
      setLoadingSchedulerHealth(false);
    }
  }, []);

  const fetchMarketLogs = useCallback(async () => {
    try {
      const res = await fetch("/api/market/logs?limit=500", { cache: "no-store" });
      if (!res.ok) return;
      const payload = await res.json() as { data?: { logs?: MarketActivityLogEntry[] } };
      setActivityLogs(payload.data?.logs ?? []);
    } catch {
      // non-critical
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const settleAndRefresh = useCallback(async () => {
    try {
      await fetch("/api/market/settle-trades", { method: "POST" });
    } catch {
      // best effort
    }
    await fetchTrades();
    void fetchSummary();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build cumulative PnL chart whenever trades change
  useEffect(() => {
    const sorted = [...trades].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let cum = 0;
    setPnlChart(sorted.map((t, i) => {
      cum += t.pnl ?? 0;
      return { label: `Trade ${i + 1}`, pnl: t.pnl ?? 0, cumPnl: parseFloat(cum.toFixed(2)) };
    }));
  }, [trades]);

  // Poll activity logs every 30 seconds
  useEffect(() => {
    const id = setInterval(() => { void fetchMarketLogs(); }, 30_000);
    return () => clearInterval(id);
  }, [fetchMarketLogs]);

  const totalPnl = trades.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const openTrades = trades.filter(t => t.status === "open");
  const winRate = trades.length > 0
    ? ((trades.filter(t => t.pnl > 0).length / trades.length) * 100).toFixed(1)
    : "0";
  const recentOutcomes = trades.slice(0, 8);
  const schedulerStatus = schedulerHealth?.status ?? "stopped";
  const schedulerStatusTone =
    schedulerStatus === "running" ? "bg-green-100 text-green-700 border-green-200" :
    schedulerStatus === "paper" ? "bg-purple-100 text-purple-700 border-purple-200" :
    schedulerStatus === "paused" ? "bg-amber-100 text-amber-700 border-amber-200" :
    "bg-gray-100 text-gray-600 border-gray-200";

  return {
    trades, openTrades, pnlChart, loadingTrades, totalPnl, winRate, recentOutcomes,
    summary, loadingSummary, summaryError,
    schedulerHealth, loadingSchedulerHealth, schedulerHealthError, schedulerStatus, schedulerStatusTone,
    activityLogs,
    fetchTrades, fetchSummary, fetchSchedulerHealth, fetchMarketLogs, settleAndRefresh,
  };
}
