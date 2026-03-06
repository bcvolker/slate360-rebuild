"use client";

import { useState, useEffect, useCallback } from "react";
import type { ApiEnvelope, TradeViewModel } from "@/lib/market/contracts";
import type { BotConfig } from "@/components/dashboard/market/types";

interface UseMarketBotDeps {
  fetchTrades: () => Promise<void>;
  fetchSummary: () => Promise<void>;
  fetchSchedulerHealth: () => Promise<void>;
}

export interface UseMarketBotReturn {
  config: BotConfig;
  appliedConfig: Record<string, unknown> | null;
  scanLog: string[];
  addLog: (msg: string) => void;
  runScan: () => Promise<void>;
  runPreviewScan: () => Promise<void>;
  handleStartBot: () => Promise<void>;
  handlePauseBot: () => Promise<void>;
  handleStopBot: () => Promise<void>;
  applyBeginnerBotPreset: (preset: "starter" | "balanced" | "active") => void;
  toggleFocus: (area: string) => void;
  // Individual setters for cross-hook usage (e.g., from useMarketDirectives)
  setPaperMode: (v: boolean) => void;
  setCapitalAlloc: (v: number) => void;
  setMaxPositions: (v: number) => void;
  setMinEdge: (v: number) => void;
  setMinVolume: (v: number) => void;
  setMinProbLow: (v: number) => void;
  setMinProbHigh: (v: number) => void;
  setRiskMix: (v: "conservative" | "balanced" | "aggressive") => void;
  setWhaleFollow: (v: boolean) => void;
  setFocusAreas: (v: string[]) => void;
  setBotRunning: (v: boolean) => void;
  setBotPaused: (v: boolean) => void;
}

const PREVIEW_SCAN_MARKET_LIMIT = 1500;

export function useMarketBot(deps: UseMarketBotDeps): UseMarketBotReturn {
  const { fetchTrades, fetchSummary, fetchSchedulerHealth } = deps;

  const [botRunning, setBotRunning] = useState(false);
  const [botPaused, setBotPaused] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<number | null>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const [appliedConfig, setAppliedConfig] = useState<Record<string, unknown> | null>(null);
  const [paperMode, setPaperMode] = useState(true);
  const [maxPositions, setMaxPositions] = useState(5);
  const [capitalAlloc, setCapitalAlloc] = useState(500);
  const [minEdge, setMinEdge] = useState(3);
  const [minVolume, setMinVolume] = useState(10000);
  const [minProbLow, setMinProbLow] = useState(10);
  const [minProbHigh, setMinProbHigh] = useState(90);
  const [whaleFollow, setWhaleFollow] = useState(false);
  const [riskMix, setRiskMix] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [focusAreas, setFocusAreas] = useState<string[]>(["Construction"]);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setScanLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  const runScan = useCallback(async () => {
    setScanning(true);
    addLog("🔍 Scanning Polymarket for opportunities…");
    try {
      const res = await fetch("/api/market/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          execute_trades: true,
          paper_mode: paperMode,
          max_positions: maxPositions,
          capital_per_trade: capitalAlloc / maxPositions,
          min_edge: minEdge / 100,
          min_volume: minVolume,
          min_probability: minProbLow / 100,
          max_probability: minProbHigh / 100,
          whale_follow: whaleFollow,
          risk_mix: riskMix,
          focus_areas: focusAreas,
        }),
      });
      const data = await res.json() as ApiEnvelope<{ executed: TradeViewModel[]; appliedConfig?: Record<string, unknown> }>;
      if (res.ok) {
        const scanTrades = data.data?.executed ?? [];
        addLog(`✅ Scan complete — ${scanTrades.length} trades executed`);
        scanTrades.forEach(t => {
          addLog(`  → ${t.outcome} on "${t.marketTitle?.slice(0, 40)}…" @ $${t.avgPrice?.toFixed(3)}`);
        });
        setAppliedConfig(data.data?.appliedConfig ?? null);
        setLastScan(Date.now());
        await fetchTrades();
        await fetchSummary();
        await fetchSchedulerHealth();
      } else {
        addLog(`❌ Scan failed: ${data?.error?.message ?? "Unknown error"}`);
      }
    } catch (e: unknown) {
      addLog(`❌ Error: ${(e as Error).message}`);
    } finally {
      setScanning(false);
    }
  }, [paperMode, maxPositions, capitalAlloc, minEdge, minVolume, minProbLow, minProbHigh,
      whaleFollow, riskMix, focusAreas, addLog, fetchTrades, fetchSummary, fetchSchedulerHealth]);

  const runPreviewScan = useCallback(async () => {
    try {
      const res = await fetch("/api/market/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          execute_trades: false,
          paper_mode: true,
          max_positions: maxPositions,
          capital_per_trade: capitalAlloc / Math.max(1, maxPositions),
          min_edge: minEdge / 100,
          min_volume: minVolume,
          min_probability: minProbLow / 100,
          max_probability: minProbHigh / 100,
          whale_follow: whaleFollow,
          risk_mix: riskMix,
          focus_areas: focusAreas,
          market_limit: PREVIEW_SCAN_MARKET_LIMIT,
        }),
      });
      if (!res.ok) return;
    } catch {
      // non-critical preview
    }
  }, [maxPositions, capitalAlloc, minEdge, minVolume, minProbLow, minProbHigh, whaleFollow, riskMix, focusAreas]);

  const handleStartBot = useCallback(async () => {
    if (!paperMode) {
      addLog("⚠️ Live mode requires wallet verification — switching to paper mode");
      setPaperMode(true);
    }
    setBotRunning(true);
    setBotPaused(false);
    addLog(`🤖 Bot started in ${paperMode ? "PAPER" : "LIVE"} mode`);
    try {
      await fetch("/api/market/bot-status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "running" }),
      });
      await fetchSchedulerHealth();
    } catch (e) { console.error("bot-status start", e); }
    await runScan();
  }, [paperMode, addLog, fetchSchedulerHealth, runScan]);

  const handlePauseBot = useCallback(async () => {
    const newPaused = !botPaused;
    setBotPaused(newPaused);
    addLog(newPaused ? "⏸ Bot paused" : "▶️ Bot resumed");
    try {
      await fetch("/api/market/bot-status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newPaused ? "paused" : "running" }),
      });
      await fetchSchedulerHealth();
    } catch (e) { console.error("bot-status pause", e); }
  }, [botPaused, addLog, fetchSchedulerHealth]);

  const handleStopBot = useCallback(async () => {
    setBotRunning(false);
    setBotPaused(false);
    addLog("⛔ Bot stopped");
    try {
      await fetch("/api/market/bot-status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "stopped" }),
      });
      await fetchSchedulerHealth();
    } catch (e) { console.error("bot-status stop", e); }
  }, [addLog, fetchSchedulerHealth]);

  const applyBeginnerBotPreset = useCallback((preset: "starter" | "balanced" | "active") => {
    if (preset === "starter") {
      setPaperMode(true); setCapitalAlloc(250); setMaxPositions(3); setMinEdge(5);
      setMinVolume(25000); setMinProbLow(20); setMinProbHigh(80); setRiskMix("conservative"); setWhaleFollow(false);
      addLog("🧭 Preset applied: Starter (safe paper setup)");
    } else if (preset === "balanced") {
      setPaperMode(true); setCapitalAlloc(500); setMaxPositions(5); setMinEdge(3);
      setMinVolume(10000); setMinProbLow(10); setMinProbHigh(90); setRiskMix("balanced"); setWhaleFollow(false);
      addLog("🧭 Preset applied: Balanced");
    } else {
      setPaperMode(true); setCapitalAlloc(900); setMaxPositions(10); setMinEdge(2);
      setMinVolume(5000); setMinProbLow(5); setMinProbHigh(95); setRiskMix("aggressive"); setWhaleFollow(true);
      addLog("🧭 Preset applied: Active");
    }
  }, [addLog]);

  const toggleFocus = useCallback((area: string) => {
    setFocusAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  }, []);

  // Auto-trade interval
  useEffect(() => {
    if (!botRunning || botPaused) return;
    const id = setInterval(() => { if (!botPaused) void runScan(); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botRunning, botPaused]);

  return {
    config: { paperMode, botRunning, botPaused, scanning, lastScan, capitalAlloc, maxPositions,
              minEdge, minVolume, minProbLow, minProbHigh, riskMix, whaleFollow, focusAreas },
    appliedConfig, scanLog, addLog, runScan, runPreviewScan,
    handleStartBot, handlePauseBot, handleStopBot, applyBeginnerBotPreset, toggleFocus,
    setPaperMode, setCapitalAlloc, setMaxPositions, setMinEdge, setMinVolume,
    setMinProbLow, setMinProbHigh, setRiskMix, setWhaleFollow, setFocusAreas,
    setBotRunning, setBotPaused,
  };
}
