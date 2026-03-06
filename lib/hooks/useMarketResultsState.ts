"use client";

import { useMemo, useState, useCallback } from "react";
import type {
  MarketTrade,
  ResultsAnalytics,
  TradeReplay,
  MarketActivityLogEntry,
} from "@/components/dashboard/market/types";

type SortKey = "date" | "pnl" | "category";
type SortDir = "asc" | "desc";
type FilterMode = "all" | "paper" | "live";

export interface UseMarketResultsStateReturn {
  analytics: ResultsAnalytics;
  sortedTrades: MarketTrade[];
  sortKey: SortKey;
  sortDir: SortDir;
  filterMode: FilterMode;
  setSortKey: (k: SortKey) => void;
  toggleSortDir: () => void;
  setFilterMode: (m: FilterMode) => void;
  selectedReplay: TradeReplay | null;
  openReplay: (trade: MarketTrade) => void;
  closeReplay: () => void;
  recentLogs: MarketActivityLogEntry[];
}

function computeAnalytics(trades: MarketTrade[]): ResultsAnalytics {
  const closed = trades.filter((t) => t.status === "closed" || t.closedAt);
  const open = trades.filter((t) => t.status === "open" && !t.closedAt);

  const realizedPnl = closed.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const unrealizedPnl = open.reduce((s, t) => s + (t.pnl ?? 0), 0);
  // Approximate fee at 2% of total traded value
  const totalTraded = trades.reduce((s, t) => s + Math.abs(t.total ?? 0), 0);
  const estimatedFees = totalTraded * 0.02;
  const feeAdjustedPnl = realizedPnl + unrealizedPnl - estimatedFees;

  const wins = trades.filter((t) => (t.pnl ?? 0) > 0);
  const losses = trades.filter((t) => (t.pnl ?? 0) < 0);
  const grossWins = wins.reduce((s, t) => s + (t.pnl ?? 0), 0);
  const grossLosses = Math.abs(losses.reduce((s, t) => s + (t.pnl ?? 0), 0));
  const profitFactor = grossLosses > 0 ? grossWins / grossLosses : grossWins > 0 ? Infinity : 0;
  const winRate = trades.length > 0 ? (wins.length / trades.length) * 100 : 0;
  const expectancy = trades.length > 0 ? (realizedPnl + unrealizedPnl) / trades.length : 0;

  // Average hold time (only for trades with both timestamps)
  let totalHoldMs = 0;
  let holdCount = 0;
  for (const t of closed) {
    if (t.createdAt && t.closedAt) {
      const diff = new Date(t.closedAt).getTime() - new Date(t.createdAt).getTime();
      if (diff > 0) { totalHoldMs += diff; holdCount++; }
    }
  }
  const avgHoldTimeMs = holdCount > 0 ? totalHoldMs / holdCount : 0;

  // P/L by category
  const catMap = new Map<string, { pnl: number; count: number }>();
  for (const t of trades) {
    const cat = t.category || "Unknown";
    const prev = catMap.get(cat) ?? { pnl: 0, count: 0 };
    catMap.set(cat, { pnl: prev.pnl + (t.pnl ?? 0), count: prev.count + 1 });
  }
  const pnlByCategory = Array.from(catMap, ([category, v]) => ({ category, ...v }))
    .sort((a, b) => b.pnl - a.pnl);

  // Paper vs live comparison
  const paperTrades = trades.filter((t) => t.paperTrade);
  const liveTrades = trades.filter((t) => !t.paperTrade);
  const paperVsLive: ResultsAnalytics["paperVsLive"] = [
    {
      mode: "paper",
      pnl: paperTrades.reduce((s, t) => s + (t.pnl ?? 0), 0),
      count: paperTrades.length,
      winRate: paperTrades.length > 0
        ? (paperTrades.filter((t) => (t.pnl ?? 0) > 0).length / paperTrades.length) * 100
        : 0,
    },
    {
      mode: "live",
      pnl: liveTrades.reduce((s, t) => s + (t.pnl ?? 0), 0),
      count: liveTrades.length,
      winRate: liveTrades.length > 0
        ? (liveTrades.filter((t) => (t.pnl ?? 0) > 0).length / liveTrades.length) * 100
        : 0,
    },
  ];

  return {
    realizedPnl: parseFloat(realizedPnl.toFixed(2)),
    unrealizedPnl: parseFloat(unrealizedPnl.toFixed(2)),
    feeAdjustedPnl: parseFloat(feeAdjustedPnl.toFixed(2)),
    totalPnl: parseFloat((realizedPnl + unrealizedPnl).toFixed(2)),
    expectancy: parseFloat(expectancy.toFixed(2)),
    profitFactor: profitFactor === Infinity ? 999 : parseFloat(profitFactor.toFixed(2)),
    winRate: parseFloat(winRate.toFixed(1)),
    avgHoldTimeMs,
    totalTrades: trades.length,
    openTrades: open.length,
    closedTrades: closed.length,
    pnlByCategory,
    paperVsLive,
  };
}

export function useMarketResultsState(
  trades: MarketTrade[],
  activityLogs: MarketActivityLogEntry[],
): UseMarketResultsStateReturn {
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [selectedReplay, setSelectedReplay] = useState<TradeReplay | null>(null);

  const analytics = useMemo(() => computeAnalytics(trades), [trades]);

  const sortedTrades = useMemo(() => {
    let filtered = trades;
    if (filterMode === "paper") filtered = trades.filter((t) => t.paperTrade);
    if (filterMode === "live") filtered = trades.filter((t) => !t.paperTrade);

    return [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") {
        cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortKey === "pnl") {
        cmp = (a.pnl ?? 0) - (b.pnl ?? 0);
      } else if (sortKey === "category") {
        cmp = (a.category ?? "").localeCompare(b.category ?? "");
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [trades, sortKey, sortDir, filterMode]);

  const openReplay = useCallback((trade: MarketTrade) => {
    setSelectedReplay({
      trade,
      reasoning: trade.reason ?? null,
      exitReason: trade.closedAt ? "Market resolved / position closed" : null,
      matchedConstraints: [
        trade.paperTrade ? "Paper trade" : "Live trade",
        trade.category ? `Category: ${trade.category}` : "",
        trade.probability != null ? `Probability: ${trade.probability}%` : "",
        trade.volume != null ? `Volume: $${trade.volume.toLocaleString()}` : "",
      ].filter(Boolean),
    });
  }, []);

  const closeReplay = useCallback(() => setSelectedReplay(null), []);

  const recentLogs = useMemo(() => activityLogs.slice(0, 50), [activityLogs]);

  return {
    analytics,
    sortedTrades,
    sortKey,
    sortDir,
    filterMode,
    setSortKey,
    toggleSortDir: useCallback(() => setSortDir((d) => (d === "asc" ? "desc" : "asc")), []),
    setFilterMode,
    selectedReplay,
    openReplay,
    closeReplay,
    recentLogs,
  };
}
