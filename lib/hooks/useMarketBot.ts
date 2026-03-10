"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiEnvelope, TradeViewModel } from "@/lib/market/contracts";
import type { BotConfig } from "@/components/dashboard/market/types";

interface UseMarketBotDeps {
  trades: TradeViewModel[];
  fetchTrades: () => Promise<void>; fetchSummary: () => Promise<void>; fetchSchedulerHealth: () => Promise<void>;
}

export interface UseMarketBotReturn {
  config: BotConfig;
  appliedConfig: Record<string, unknown> | null;
  scanLog: string[];
  addLog: (msg: string) => void;
  runScan: (override?: Partial<BotConfig>) => Promise<void>;
  runPreviewScan: () => Promise<void>;
  handleStartBot: () => Promise<void>;
  handlePauseBot: () => Promise<void>;
  handleStopBot: () => Promise<void>;
  applyBeginnerBotPreset: (preset: "starter" | "balanced" | "active") => void;
  toggleFocus: (area: string) => void;
  setPaperMode: (v: boolean) => void; setCapitalAlloc: (v: number) => void; setMaxTradesPerDay: (v: number) => void;
  setMaxPositions: (v: number) => void; setMinEdge: (v: number) => void; setMinVolume: (v: number) => void;
  setMinProbLow: (v: number) => void; setMinProbHigh: (v: number) => void;
  setRiskMix: (v: "conservative" | "balanced" | "aggressive") => void; setWhaleFollow: (v: boolean) => void;
  setFocusAreas: (v: string[]) => void; setBotRunning: (v: boolean) => void; setBotPaused: (v: boolean) => void;
}

const PREVIEW_SCAN_MARKET_LIMIT = 1500;

async function loadServerConfig(): Promise<Partial<BotConfig> | null> {
  try {
    const [plansRes, dirRes, statusRes] = await Promise.all([
      fetch("/api/market/plans"),
      fetch("/api/market/directives"),
      fetch("/api/market/bot-status"),
    ]);
    const plansData = await plansRes.json() as { plans?: Array<Record<string, unknown>> };
    const dirData = await dirRes.json() as { directives?: Array<Record<string, unknown>> };
    const statusData = await statusRes.json() as { ok?: boolean; data?: { status?: string } };

    const activePlan = (plansData.plans ?? []).find((plan) => plan.isDefault === true && plan.isArchived !== true) ?? (plansData.plans ?? []).find((plan) => plan.isArchived !== true);
    const d = dirData.directives?.[0];
    const status = statusData.data?.status ?? "stopped";

    const config: Partial<BotConfig> = {};
    config.botRunning = status === "running" || status === "paper";
    config.botPaused = status === "paused";

    if (activePlan) {
      config.paperMode = activePlan.mode !== "real";
      config.capitalAlloc = typeof activePlan.budget === "number" && activePlan.budget > 0 ? activePlan.budget : 500;
      config.maxTradesPerDay = typeof activePlan.maxTradesPerDay === "number" && activePlan.maxTradesPerDay > 0 ? activePlan.maxTradesPerDay : 25;
      config.maxPositions = typeof activePlan.maxOpenPositions === "number" && activePlan.maxOpenPositions > 0 ? activePlan.maxOpenPositions : 25;
      config.riskMix = (activePlan.riskLevel === "conservative" || activePlan.riskLevel === "balanced" || activePlan.riskLevel === "aggressive") ? activePlan.riskLevel : "balanced";
      config.focusAreas = Array.isArray(activePlan.categories) && activePlan.categories.length > 0 ? activePlan.categories as string[] : ["all"];
      config.whaleFollow = activePlan.largeTraderSignals === true;
      config.minVolume = typeof activePlan.minimumLiquidity === "number" && activePlan.minimumLiquidity >= 0 ? activePlan.minimumLiquidity : 5000;
    } else if (d) {
      config.paperMode = d.paper_mode !== false;
      config.capitalAlloc = typeof d.amount === "number" && d.amount > 0 ? d.amount : 500;
      config.maxTradesPerDay = typeof d.buys_per_day === "number" && d.buys_per_day > 0 ? d.buys_per_day : 25;
      config.maxPositions = typeof d.buys_per_day === "number" && d.buys_per_day > 0 ? Math.min(d.buys_per_day, 50) : 25;
      config.riskMix = (["conservative", "balanced", "aggressive"] as const).includes(d.risk_mix as "conservative" | "balanced" | "aggressive") ? d.risk_mix as "conservative" | "balanced" | "aggressive" : "balanced";
      config.focusAreas = Array.isArray(d.focus_areas) && d.focus_areas.length > 0 ? d.focus_areas as string[] : ["all"];
      config.whaleFollow = d.whale_follow === true;
    }
    return config;
  } catch {
    return null;
  }
}

export function useMarketBot(deps: UseMarketBotDeps): UseMarketBotReturn {
  const { trades, fetchTrades, fetchSummary, fetchSchedulerHealth } = deps;

  const [botRunning, setBotRunning] = useState(false), [botPaused, setBotPaused] = useState(false), [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<number | null>(null), [scanLog, setScanLog] = useState<string[]>([]), [appliedConfig, setAppliedConfig] = useState<Record<string, unknown> | null>(null);
  const [paperMode, setPaperMode] = useState(true), [maxTradesPerDay, setMaxTradesPerDay] = useState(25), [maxPositions, setMaxPositions] = useState(25);
  const [capitalAlloc, setCapitalAlloc] = useState(500), [minEdge, setMinEdge] = useState(0), [minVolume, setMinVolume] = useState(5000);
  const [minProbLow, setMinProbLow] = useState(5), [minProbHigh, setMinProbHigh] = useState(95), [whaleFollow, setWhaleFollow] = useState(false);
  const [riskMix, setRiskMix] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [focusAreas, setFocusAreas] = useState<string[]>(["all"]);
  const hydrated = useRef(false);

  const addLog = useCallback((msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setScanLog((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 100));
  }, []);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    void loadServerConfig().then((cfg) => {
      if (!cfg) return;
      if (cfg.botRunning != null) setBotRunning(cfg.botRunning);
      if (cfg.botPaused != null) setBotPaused(cfg.botPaused);
      if (cfg.paperMode != null) setPaperMode(cfg.paperMode);
      if (cfg.capitalAlloc != null) setCapitalAlloc(cfg.capitalAlloc);
      if (cfg.maxTradesPerDay != null) setMaxTradesPerDay(cfg.maxTradesPerDay);
      if (cfg.maxPositions != null) setMaxPositions(cfg.maxPositions);
      if (cfg.riskMix != null) setRiskMix(cfg.riskMix);
      if (cfg.focusAreas != null) setFocusAreas(cfg.focusAreas);
      if (cfg.whaleFollow != null) setWhaleFollow(cfg.whaleFollow);
      if (cfg.minVolume != null) setMinVolume(cfg.minVolume);
    });
  }, []);

  const getTradesTodayCount = useCallback(() => {
    const todayUtc = new Date().toISOString().slice(0, 10);
    return trades.filter((trade) => trade.createdAt.slice(0, 10) === todayUtc).length;
  }, [trades]);

  const runScan = useCallback(async (override?: Partial<BotConfig>) => {
    const nextConfig = {
      paperMode: override?.paperMode ?? paperMode,
      maxPositions: override?.maxPositions ?? maxPositions,
      maxTradesPerDay: override?.maxTradesPerDay ?? maxTradesPerDay,
      capitalAlloc: override?.capitalAlloc ?? capitalAlloc,
      minEdge: override?.minEdge ?? minEdge,
      minVolume: override?.minVolume ?? minVolume,
      minProbLow: override?.minProbLow ?? minProbLow,
      minProbHigh: override?.minProbHigh ?? minProbHigh,
      whaleFollow: override?.whaleFollow ?? whaleFollow,
      riskMix: override?.riskMix ?? riskMix,
      focusAreas: override?.focusAreas ?? focusAreas,
    };
    const tradesToday = getTradesTodayCount();
    if (tradesToday >= nextConfig.maxTradesPerDay) {
      addLog(`🛑 Daily trade cap reached (${tradesToday}/${nextConfig.maxTradesPerDay}) — skipping scan`);
      return;
    }

    setScanning(true);
    addLog("🔍 Scanning Polymarket for opportunities…");
    try {
      const res = await fetch("/api/market/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          execute_trades: true,
          paper_mode: nextConfig.paperMode,
          max_positions: nextConfig.maxPositions,
          capital_per_trade: nextConfig.capitalAlloc / nextConfig.maxPositions,
          max_trades_per_day: nextConfig.maxTradesPerDay,
          min_edge: nextConfig.minEdge / 100,
          min_volume: nextConfig.minVolume,
          min_probability: nextConfig.minProbLow / 100,
          max_probability: nextConfig.minProbHigh / 100,
          whale_follow: nextConfig.whaleFollow,
          risk_mix: nextConfig.riskMix,
          focus_areas: nextConfig.focusAreas,
        }),
      });
      const data = await res.json() as ApiEnvelope<{
        executed: TradeViewModel[];
        appliedConfig?: Record<string, unknown>;
        opportunitiesFound?: number;
        decisions?: Array<unknown>;
      }>;
      if (res.ok) {
        const scanTrades = data.data?.executed ?? [];
        const opportunitiesFound = Number(data.data?.opportunitiesFound ?? 0);
        const decisionsCount = Array.isArray(data.data?.decisions) ? data.data.decisions.length : 0;
        addLog(`✅ Scan complete — ${scanTrades.length} trades executed`);
        if (scanTrades.length === 0) {
          addLog(`ℹ️ No trades placed — ${opportunitiesFound} opportunities passed filters, ${decisionsCount} decisions survived sizing`);
        }
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
    } finally { setScanning(false); }
  }, [paperMode, maxPositions, maxTradesPerDay, capitalAlloc, minEdge, minVolume, minProbLow, minProbHigh, whaleFollow, riskMix, focusAreas, addLog, fetchTrades, fetchSummary, fetchSchedulerHealth, getTradesTodayCount]);

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
          max_trades_per_day: maxTradesPerDay,
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
  }, [maxPositions, maxTradesPerDay, capitalAlloc, minEdge, minVolume, minProbLow, minProbHigh, whaleFollow, riskMix, focusAreas]);

  const handleStartBot = useCallback(async () => {
    if (!paperMode) {
      addLog("⚠️ Live mode requires wallet verification — switching to paper mode");
      setPaperMode(true);
    }
    setBotRunning(true);
    setBotPaused(false);
    const effectiveMode = paperMode ? "paper" : "running";
    addLog(`🤖 Bot started in ${paperMode ? "PAPER" : "LIVE"} mode`);
    try {
      await fetch("/api/market/bot-status", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: effectiveMode }),
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
      setPaperMode(true); setCapitalAlloc(500); setMaxPositions(10); setMinEdge(0); setMaxTradesPerDay(25);
      setMinVolume(10000); setMinProbLow(10); setMinProbHigh(90); setRiskMix("conservative"); setWhaleFollow(false);
      addLog("🧭 Preset applied: Starter (safe paper setup, 25 trades/day)");
    } else if (preset === "balanced") {
      setPaperMode(true); setCapitalAlloc(1000); setMaxPositions(25); setMinEdge(0); setMaxTradesPerDay(50);
      setMinVolume(5000); setMinProbLow(5); setMinProbHigh(95); setRiskMix("balanced"); setWhaleFollow(false);
      addLog("🧭 Preset applied: Balanced (50 trades/day)");
    } else {
      setPaperMode(true); setCapitalAlloc(2500); setMaxPositions(50); setMinEdge(0); setMaxTradesPerDay(200);
      setMinVolume(1000); setMinProbLow(3); setMinProbHigh(97); setRiskMix("aggressive"); setWhaleFollow(true);
      addLog("🧭 Preset applied: Active (200 trades/day, aggressive)");
    }
  }, [addLog]);

  const toggleFocus = useCallback((area: string) => {
    setFocusAreas(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]);
  }, []);

  useEffect(() => {
    if (!botRunning || botPaused) return;
    const id = setInterval(() => { if (!botPaused) void runScan(); }, 5 * 60 * 1000);
    return () => clearInterval(id);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [botRunning, botPaused]);

  return {
    config: { paperMode, botRunning, botPaused, scanning, lastScan, capitalAlloc, maxTradesPerDay, maxPositions, minEdge, minVolume, minProbLow, minProbHigh, riskMix, whaleFollow, focusAreas },
    appliedConfig, scanLog, addLog, runScan, runPreviewScan,
    handleStartBot, handlePauseBot, handleStopBot, applyBeginnerBotPreset, toggleFocus,
    setPaperMode, setCapitalAlloc, setMaxTradesPerDay, setMaxPositions, setMinEdge, setMinVolume,
    setMinProbLow, setMinProbHigh, setRiskMix, setWhaleFollow, setFocusAreas,
    setBotRunning, setBotPaused,
  };
}
