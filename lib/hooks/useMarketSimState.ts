"use client";

import { useState, useEffect, useCallback } from "react";
import type { SimRun, PnlPoint, BotConfig, MarketTrade, SimulationConfig } from "@/components/dashboard/market/types";

interface UseMarketSimStateParams {
  botConfig: BotConfig;
  trades: MarketTrade[];
  pnlChart: PnlPoint[];
  addLog: (msg: string) => void;
}

const SIM_STORAGE_KEY = "slate360_sim_runs";
const MAX_SNAPSHOTS = 10;

const DEFAULT_SIM_CONFIG: SimulationConfig = {
  startingBalance: 500,
  fillModel: "realistic",
  feeMode: true,
  partialFills: false,
};

export function useMarketSimState({ botConfig, trades, pnlChart, addLog }: UseMarketSimStateParams) {
  const [simRuns, setSimRuns] = useState<SimRun[]>([]);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [simConfig, setSimConfig] = useState<SimulationConfig>(DEFAULT_SIM_CONFIG);

  useEffect(() => {
    try {
      const s = localStorage.getItem(SIM_STORAGE_KEY);
      if (s) setSimRuns(JSON.parse(s) as SimRun[]);
    } catch { /* ignore */ }
  }, []);

  const persistRuns = useCallback((runs: SimRun[]) => {
    localStorage.setItem(SIM_STORAGE_KEY, JSON.stringify(runs));
    setSimRuns(runs);
  }, []);

  const saveCurrentSimRun = useCallback(() => {
    const name = `Sim ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    const run: SimRun = {
      id: Date.now().toString(), name, created_at: new Date().toISOString(),
      config: {
        name, amount: botConfig.capitalAlloc, timeframe: "current",
        buys_per_day: botConfig.maxPositions, risk_mix: botConfig.riskMix,
        whale_follow: botConfig.whaleFollow, focus_areas: botConfig.focusAreas,
        profit_strategy: "arbitrage", paper_mode: botConfig.paperMode,
      },
      pnl_data: pnlChart.map(p => ({ label: p.label, pnl: p.cumPnl })),
      total_pnl: pnlChart.length > 0 ? pnlChart[pnlChart.length - 1].cumPnl : 0,
      win_rate: trades.length > 0 ? parseFloat(((trades.filter(t => t.pnl > 0).length / trades.length) * 100).toFixed(1)) : 0,
      trade_count: trades.length,
      fillModel: simConfig.fillModel,
      feeMode: simConfig.feeMode,
      partialFills: simConfig.partialFills,
      startingBalance: simConfig.startingBalance,
    };
    const updated = [run, ...simRuns].slice(0, MAX_SNAPSHOTS);
    persistRuns(updated);
    addLog(`💾 Sim saved: "${name}" (${simConfig.fillModel} fills, fees ${simConfig.feeMode ? "on" : "off"})`);
  }, [botConfig, pnlChart, trades, simRuns, simConfig, addLog, persistRuns]);

  const deleteSimRun = useCallback((id: string) => {
    const next = simRuns.filter(r => r.id !== id);
    persistRuns(next);
  }, [simRuns, persistRuns]);

  const compareRunA = simRuns.find(r => r.id === compareA);
  const compareRunB = simRuns.find(r => r.id === compareB);
  const compareChartData = (() => {
    if (!compareRunA && !compareRunB) return [];
    const len = Math.max(compareRunA?.pnl_data.length ?? 0, compareRunB?.pnl_data.length ?? 0);
    return Array.from({ length: len }, (_, i) => ({
      label: `T${i + 1}`,
      a: compareRunA?.pnl_data[i]?.pnl ?? null,
      b: compareRunB?.pnl_data[i]?.pnl ?? null,
    }));
  })();

  return {
    simRuns, setSimRuns, compareA, setCompareA, compareB, setCompareB,
    saveCurrentSimRun, deleteSimRun, compareRunA, compareRunB, compareChartData,
    simConfig, setSimConfig,
  };
}
