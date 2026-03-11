"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import type { ApiEnvelope, TradeViewModel } from "@/lib/market/contracts";
import type { BotConfig } from "@/components/dashboard/market/types";

interface UseMarketBotDeps {
  trades: TradeViewModel[];
  fetchTrades: () => Promise<void>; fetchSummary: () => Promise<void>; fetchSchedulerHealth: () => Promise<void>; fetchMarketLogs: () => Promise<void>;
}

export interface ScanResult {
  ok: boolean;
  tradesPlaced: number;
  opportunitiesFound: number;
  decisionsCount: number;
  error?: string;
}

export interface UseMarketBotReturn {
  config: BotConfig;
  appliedConfig: Record<string, unknown> | null;
  scanLog: string[];
  addLog: (msg: string) => void;
  runScan: (override?: Partial<BotConfig>) => Promise<ScanResult>;
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

    const plans = plansData.plans ?? [];
    const activePlan = plans.find((p) => p.isDefault === true && p.isArchived !== true) ?? plans.find((p) => p.isArchived !== true);
    const d = dirData.directives?.[0];
    const status = statusData.data?.status ?? "stopped";
    const posNum = (v: unknown, fallback: number) => typeof v === "number" && v > 0 ? v : fallback;
    const validRisk = (v: unknown): v is "conservative" | "balanced" | "aggressive" => v === "conservative" || v === "balanced" || v === "aggressive";
    const validAreas = (v: unknown): v is string[] => Array.isArray(v) && v.length > 0;

    const config: Partial<BotConfig> = { botRunning: status === "running" || status === "paper", botPaused: status === "paused" };

    if (activePlan) {
      config.paperMode = activePlan.mode !== "real";
      config.capitalAlloc = posNum(activePlan.budget, 500);
      config.maxTradesPerDay = posNum(activePlan.maxTradesPerDay, 25);
      config.maxPositions = posNum(activePlan.maxOpenPositions, 25);
      config.riskMix = validRisk(activePlan.riskLevel) ? activePlan.riskLevel : "balanced";
      config.focusAreas = validAreas(activePlan.categories) ? activePlan.categories : ["all"];
      config.whaleFollow = activePlan.largeTraderSignals === true;
      config.minVolume = typeof activePlan.minimumLiquidity === "number" && activePlan.minimumLiquidity >= 0 ? activePlan.minimumLiquidity : 5000;
    } else if (d) {
      config.paperMode = d.paper_mode !== false;
      config.capitalAlloc = posNum(d.amount, 500);
      config.maxTradesPerDay = posNum(d.buys_per_day, 25);
      config.maxPositions = posNum(d.buys_per_day, 25) > 50 ? 50 : posNum(d.buys_per_day, 25);
      config.riskMix = validRisk(d.risk_mix) ? d.risk_mix : "balanced";
      config.focusAreas = validAreas(d.focus_areas) ? d.focus_areas : ["all"];
      config.whaleFollow = d.whale_follow === true;
    }
    return config;
  } catch {
    return null;
  }
}

export function useMarketBot(deps: UseMarketBotDeps): UseMarketBotReturn {
  const { trades, fetchTrades, fetchSummary, fetchSchedulerHealth, fetchMarketLogs } = deps;

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

  const runScan = useCallback(async (override?: Partial<BotConfig>): Promise<ScanResult> => {
    const fail = (error: string): ScanResult => ({ ok: false, tradesPlaced: 0, opportunitiesFound: 0, decisionsCount: 0, error });
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
      return fail(`Daily trade cap reached (${tradesToday}/${nextConfig.maxTradesPerDay})`);
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
        await fetchMarketLogs();
        return { ok: true, tradesPlaced: scanTrades.length, opportunitiesFound, decisionsCount };
      } else {
        const errMsg = data?.error?.message ?? "Unknown error";
        addLog(`❌ Scan failed: ${errMsg}`);
        await fetchMarketLogs();
        return fail(errMsg);
      }
    } catch (e: unknown) {
      const errMsg = (e as Error).message;
      addLog(`❌ Error: ${errMsg}`);
      return fail(errMsg);
    } finally { setScanning(false); }
  }, [paperMode, maxPositions, maxTradesPerDay, capitalAlloc, minEdge, minVolume, minProbLow, minProbHigh, whaleFollow, riskMix, focusAreas, addLog, fetchTrades, fetchSummary, fetchSchedulerHealth, fetchMarketLogs, getTradesTodayCount]);

  const runPreviewScan = useCallback(async () => {
    try {
      await fetch("/api/market/scan", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ execute_trades: false, paper_mode: true, max_positions: maxPositions, capital_per_trade: capitalAlloc / Math.max(1, maxPositions), max_trades_per_day: maxTradesPerDay, min_edge: minEdge / 100, min_volume: minVolume, min_probability: minProbLow / 100, max_probability: minProbHigh / 100, whale_follow: whaleFollow, risk_mix: riskMix, focus_areas: focusAreas, market_limit: PREVIEW_SCAN_MARKET_LIMIT }),
      });
    } catch { /* non-critical preview */ }
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
      await fetchMarketLogs();
    } catch (e) { console.error("bot-status start", e); }
    await runScan();
  }, [paperMode, addLog, fetchSchedulerHealth, fetchMarketLogs, runScan]);

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
      await fetchMarketLogs();
    } catch (e) { console.error("bot-status pause", e); }
  }, [botPaused, addLog, fetchSchedulerHealth, fetchMarketLogs]);

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
      await fetchMarketLogs();
    } catch (e) { console.error("bot-status stop", e); }
  }, [addLog, fetchSchedulerHealth, fetchMarketLogs]);

  const applyBeginnerBotPreset = useCallback((preset: "starter" | "balanced" | "active") => {
    const presets = {
      starter:  { cap: 500,  pos: 10, tpd: 25,  vol: 10000, pL: 10, pH: 90, risk: "conservative" as const, whale: false, label: "Starter (safe paper setup, 25 trades/day)" },
      balanced: { cap: 1000, pos: 25, tpd: 50,  vol: 5000,  pL: 5,  pH: 95, risk: "balanced" as const,      whale: false, label: "Balanced (50 trades/day)" },
      active:   { cap: 2500, pos: 50, tpd: 200, vol: 1000,  pL: 3,  pH: 97, risk: "aggressive" as const,    whale: true,  label: "Active (200 trades/day, aggressive)" },
    };
    const p = presets[preset];
    setPaperMode(true); setCapitalAlloc(p.cap); setMaxPositions(p.pos); setMinEdge(0); setMaxTradesPerDay(p.tpd);
    setMinVolume(p.vol); setMinProbLow(p.pL); setMinProbHigh(p.pH); setRiskMix(p.risk); setWhaleFollow(p.whale);
    addLog(`🧭 Preset applied: ${p.label}`);
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
