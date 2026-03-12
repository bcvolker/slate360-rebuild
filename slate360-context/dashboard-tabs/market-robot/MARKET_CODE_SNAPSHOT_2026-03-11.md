# Market Code Snapshot

Generated: 2026-03-11

This file bundles the current source for the requested Market bot/runtime/UI files plus the adjacent direct-buy, automation save/apply, and Results/Open Positions navigation files.

## lib/hooks/useMarketBot.ts

```typescript
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
```

## lib/hooks/useMarketWalletState.ts

```typescript
"use client";

import { useState } from "react";
import {
  useAccount, useConnect, useDisconnect, useSignMessage, useBalance,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import type { LiveChecklist } from "@/components/dashboard/market/types";

const USDC_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as const;
const BAL_ABI = [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const;
const ALLOW_ABI = [{ name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const;
const APPROVE_ABI = [{ name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }] }] as const;
const MAX_UINT256 = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");

interface UseMarketWalletStateParams {
  addLog: (msg: string) => void;
}

export function useMarketWalletState({ addLog }: UseMarketWalletStateParams) {
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { writeContract, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: waitingApproveReceipt, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { data: maticData } = useBalance({ address, chainId: 137, query: { enabled: isConnected && !!address } });
  const POLYMARKET_SPENDER = process.env.NEXT_PUBLIC_POLYMARKET_SPENDER ?? "";
  const { data: usdcRaw } = useReadContract({ address: USDC_POLYGON, abi: BAL_ABI, functionName: "balanceOf", args: address ? [address] : undefined, chainId: 137, query: { enabled: isConnected && !!address } });
  const usdcBalance = usdcRaw != null ? (Number(usdcRaw) / 1e6).toFixed(2) : null;
  const { data: usdcAllowanceRaw } = useReadContract({ address: USDC_POLYGON, abi: ALLOW_ABI, functionName: "allowance", args: address && POLYMARKET_SPENDER ? [address, POLYMARKET_SPENDER as `0x${string}`] : undefined, chainId: 137, query: { enabled: isConnected && !!address && !!POLYMARKET_SPENDER } });
  const usdcAllowance = usdcAllowanceRaw != null ? Number(usdcAllowanceRaw) / 1e6 : 0;

  const [walletVerified, setWalletVerified] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletChoice, setWalletChoice] = useState<"metamask" | "coinbase" | "trust">("metamask");

  const liveChecklist: LiveChecklist = {
    walletConnected: isConnected,
    polygonSelected: chain?.id === 137,
    usdcFunded: Number(usdcBalance ?? 0) > 0,
    signatureVerified: walletVerified,
    usdcApproved: usdcAllowance > 0,
  };

  const handleConnectWallet = async () => {
    setWalletError("");
    try {
      if (!isConnected) {
        const pref = connectors.find(c => {
          const id = c.id.toLowerCase();
          if (walletChoice === "coinbase") return id.includes("coinbase");
          if (walletChoice === "trust") return id.includes("walletconnect");
          return id.includes("meta") || id.includes("injected");
        }) ?? connectors[0];
        if (!pref) { setWalletError("No wallet connector available."); return; }
        connect({ connector: pref }); return;
      }
      const message = `Slate360 Market Robot verification: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/market/wallet-connect", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, message }),
      });
      if (res.ok) {
        setWalletVerified(true);
        addLog(`✅ Wallet verified: ${address}`);
      } else {
        const e = await res.json() as { error?: string };
        setWalletError(e.error ?? "Verification failed");
      }
    } catch (e: unknown) { setWalletError((e as Error).message || "Connection failed"); }
  };

  const handleApproveUsdc = () => {
    if (!address || !POLYMARKET_SPENDER) { setWalletError("Missing wallet address or spender env."); return; }
    try {
      writeContract({ address: USDC_POLYGON, abi: APPROVE_ABI, functionName: "approve", args: [POLYMARKET_SPENDER as `0x${string}`, MAX_UINT256], chainId: 137 });
      addLog("🧾 Sent USDC approval transaction.");
    } catch (e: unknown) { setWalletError((e as Error).message || "USDC approval failed"); }
  };

  return {
    address, isConnected, chain, isConnecting, isApproving,
    waitingApproveReceipt, approveSuccess, usdcBalance, maticData,
    walletVerified, setWalletVerified, walletError, walletChoice, setWalletChoice,
    liveChecklist, handleConnectWallet, handleApproveUsdc, disconnect,
    POLYMARKET_SPENDER,
  };
}
```

## lib/hooks/useMarketAutomationState.ts

```typescript
"use client";

import { useState, useEffect, useCallback } from "react";
import type { AutomationPlan, RiskLevel, ScanMode, FillPolicy, ExitRules } from "@/components/dashboard/market/types";

const PLANS_KEY = "slate360_automation_plans";

function defaultPlan(): AutomationPlan {
  return {
    id: "", name: "",
    budget: 200, riskLevel: "balanced", categories: ["General"],
    scanMode: "balanced", maxTradesPerDay: 5, mode: "practice",
    maxDailyLoss: 40, maxOpenPositions: 3,
    maxPctPerTrade: 10, feeAlertThreshold: 5, cooldownAfterLossStreak: 2,
    largeTraderSignals: false, closingSoonFocus: false,
    slippage: 2, minimumLiquidity: 1000, maximumSpread: 5,
    fillPolicy: "conservative", exitRules: "auto",
    isDefault: false, isArchived: false,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
}

function loadPlans(): AutomationPlan[] {
  try {
    const raw = localStorage.getItem(PLANS_KEY);
    if (raw) return JSON.parse(raw) as AutomationPlan[];
  } catch { /* ignore */ }
  return [];
}

function persistPlans(plans: AutomationPlan[]) {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

async function fetchPlansFromServer(): Promise<AutomationPlan[] | null> {
  try {
    const res = await fetch("/api/market/plans", { cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json() as { plans?: AutomationPlan[] };
    return data.plans ?? [];
  } catch {
    return null;
  }
}

async function savePlanToServer(plan: AutomationPlan, isEdit: boolean): Promise<AutomationPlan | null> {
  try {
    const res = await fetch("/api/market/plans", {
      method: isEdit ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(plan),
    });
    if (!res.ok) return null;
    const data = await res.json() as { plan?: AutomationPlan };
    return data.plan ?? null;
  } catch {
    return null;
  }
}

async function deletePlanFromServer(id: string): Promise<boolean> {
  try {
    const res = await fetch(`/api/market/plans?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    return res.ok;
  } catch {
    return false;
  }
}

export function useMarketAutomationState() {
  const [plans, setPlans] = useState<AutomationPlan[]>([]);
  const [draft, setDraft] = useState<AutomationPlan>(defaultPlan);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [controlLevel, setControlLevel] = useState<"basic" | "intermediate" | "advanced">("basic");

  useEffect(() => {
    void (async () => {
      const serverPlans = await fetchPlansFromServer();
      if (serverPlans) {
        setPlans(serverPlans);
        persistPlans(serverPlans);
        return;
      }
      setPlans(loadPlans());
    })();
  }, []);

  const updateDraft = useCallback((patch: Partial<AutomationPlan>) => {
    setDraft(prev => ({ ...prev, ...patch, updatedAt: new Date().toISOString() }));
  }, []);

  const setDraftField = useCallback(<K extends keyof AutomationPlan>(key: K, value: AutomationPlan[K]) => {
    setDraft(prev => ({ ...prev, [key]: value, updatedAt: new Date().toISOString() }));
  }, []);

  const resetDraft = useCallback(() => {
    setDraft(defaultPlan());
    setEditingId(null);
    setControlLevel("basic");
  }, []);

  const savePlan = useCallback(async () => {
    if (!draft.name.trim()) return;
    const now = new Date().toISOString();
    const optimistic: AutomationPlan = {
      ...draft,
      id: editingId || Date.now().toString(),
      updatedAt: now,
      createdAt: editingId ? draft.createdAt : now,
    };
    const next = editingId
      ? plans.map(p => (p.id === editingId ? optimistic : p))
      : [optimistic, ...plans];
    setPlans(next);
    persistPlans(next);
    const saved = await savePlanToServer(optimistic, Boolean(editingId));
    if (saved) {
      const refreshed = editingId
        ? next.map((plan) => (plan.id === saved.id ? saved : plan))
        : [saved, ...next.filter((plan) => plan.id !== optimistic.id)];
      setPlans(refreshed);
      persistPlans(refreshed);
    }
    resetDraft();
    return saved ?? optimistic;
  }, [draft, editingId, plans, resetDraft]);

  const deletePlan = useCallback(async (id: string) => {
    const previous = plans;
    const next = previous.filter(p => p.id !== id);
    setPlans(next);
    persistPlans(next);
    const removed = await deletePlanFromServer(id);
    if (!removed) {
      setPlans(previous);
      persistPlans(previous);
    }
  }, [plans]);

  const clonePlan = useCallback((id: string) => {
    const source = plans.find(p => p.id === id);
    if (!source) return;
    const clone: AutomationPlan = {
      ...source,
      id: Date.now().toString(),
      name: `${source.name} (copy)`,
      isDefault: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [clone, ...plans];
    setPlans(next);
    persistPlans(next);
  }, [plans]);

  const renamePlan = useCallback(async (id: string, name: string) => {
    const next = plans.map(p => (p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p));
    setPlans(next);
    persistPlans(next);
    const target = next.find((plan) => plan.id === id);
    if (target) await savePlanToServer(target, true);
  }, [plans]);

  const archivePlan = useCallback(async (id: string) => {
    const next = plans.map(p =>
      p.id === id ? { ...p, isArchived: !p.isArchived, updatedAt: new Date().toISOString() } : p,
    );
    setPlans(next);
    persistPlans(next);
    const target = next.find((plan) => plan.id === id);
    if (target) await savePlanToServer(target, true);
  }, [plans]);

  const setDefaultPlan = useCallback(async (id: string) => {
    const next = plans.map(p => ({
      ...p,
      isDefault: p.id === id ? !p.isDefault : false,
      updatedAt: new Date().toISOString(),
    }));
    setPlans(next);
    persistPlans(next);
    const updates = next.filter((plan) => plan.id === id || plan.isDefault === false);
    await Promise.all(updates.map((plan) => savePlanToServer(plan, true)));
  }, [plans]);

  const startEdit = useCallback((id: string) => {
    const plan = plans.find(p => p.id === id);
    if (!plan) return;
    setDraft(plan);
    setEditingId(id);
  }, [plans]);

  return {
    plans, draft, editingId, controlLevel,
    setControlLevel, updateDraft, setDraftField, resetDraft,
    savePlan, deletePlan, clonePlan, renamePlan, archivePlan,
    setDefaultPlan, startEdit,
  };
}

export type { RiskLevel, ScanMode, FillPolicy, ExitRules };
```

## lib/hooks/useMarketDirectBuyState.ts

```typescript
"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { MarketListing, MktTimeframe, MktRiskTag, MarketSortDirection, MarketSortKey } from "@/components/dashboard/market/types";
import type { ApiEnvelope, MarketViewModel } from "@/lib/market/contracts";
import { buildTableInsights, filterAndSortMarkets } from "@/lib/market/direct-buy-table";
import { getDirectBuyFetchPlan } from "@/lib/market/direct-buy-fetch";

const FETCH_BATCH_SIZE = 200;

export function useMarketDirectBuyState({
  paperMode,
  walletAddress,
  liveChecklist,
  onTradePlaced,
}: {
  paperMode: boolean;
  walletAddress?: `0x${string}`;
  liveChecklist: {
    walletConnected: boolean;
    polygonSelected: boolean;
    usdcFunded: boolean;
    signatureVerified: boolean;
    usdcApproved: boolean;
  };
  onTradePlaced?: () => void | Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [timeframe, setTimeframe] = useState<MktTimeframe>("all");
  const [category, setCategory] = useState("all");
  const [probMin, setProbMin] = useState(0);
  const [probMax, setProbMax] = useState(100);
  const [minEdge, setMinEdge] = useState(0);
  const [riskTag, setRiskTag] = useState<MktRiskTag>("all");
  const [sortBy, setSortBy] = useState<MarketSortKey>("edge");
  const [sortDirection, setSortDirection] = useState<MarketSortDirection>("desc");
  const [minVolume, setMinVolume] = useState(0);
  const [minLiquidity, setMinLiquidity] = useState(0);
  const [maxSpread, setMaxSpread] = useState(100);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [markets, setMarkets] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const fetchPlan = useMemo(() => getDirectBuyFetchPlan(timeframe, query), [timeframe, query]);
  const lastFetchPlanKey = useRef<string | null>(null);

  const [buyMarket, setBuyMarket] = useState<MarketListing | null>(null);
  const [buyOutcome, setBuyOutcome] = useState<"YES" | "NO">("YES");
  const [buyAmount, setBuyAmount] = useState(25);
  const [buyPaper, setBuyPaper] = useState(paperMode);
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buySuccess, setBuySuccess] = useState("");

  const mapMarket = useCallback((m: MarketViewModel): MarketListing => ({
    ...m,
    bookmarked: false,
    endDateLabel: m.endDate
      ? new Date(m.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
      : undefined,
    liquidity: m.liquidityUsd,
  }), []);

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const collected: MarketViewModel[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      lastFetchPlanKey.current = fetchPlan.key;

      while (hasMore && collected.length < fetchPlan.maxMarkets) {
        const params = new URLSearchParams({
          limit: String(FETCH_BATCH_SIZE),
          active: "true",
          closed: "false",
          order: fetchPlan.order,
          ascending: String(fetchPlan.ascending),
        });
        const normalizedQuery = query.trim();
        if (normalizedQuery) params.set("_q", normalizedQuery);
        if (fetchPlan.upcoming) params.set("upcoming", "true");
        if (cursor) {
          params.set("cursor", cursor);
        }

        const res = await fetch(`/api/market/polymarket?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to load markets (${res.status})`);
        }
        const payload = await res.json() as ApiEnvelope<{ markets: MarketViewModel[]; nextCursor?: string }>;
        const batch = payload.data?.markets ?? [];
        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        collected.push(...batch);
        cursor = payload.data?.nextCursor;
        hasMore = Boolean(cursor);
      }

      const mapped: MarketListing[] = collected.map(mapMarket);
      setMarkets(mapped);
      setLoaded(true);
    } catch (error) {
      setMarkets([]);
      setLoaded(true);
      setLoadError(error instanceof Error ? error.message : "Failed to load markets");
    } finally {
      setLoading(false);
    }
  }, [fetchPlan, mapMarket, query]);

  const autoLoaded = useRef(false);
  useEffect(() => {
    if (!autoLoaded.current) {
      autoLoaded.current = true;
      fetchMarkets();
    }
  }, [fetchMarkets]);

  useEffect(() => {
    if (!loaded || loading) return;
    if (fetchPlan.key !== lastFetchPlanKey.current) {
      void fetchMarkets();
    }
  }, [fetchMarkets, fetchPlan.key, loaded, loading]);

  const availableCategories = useMemo(() => [...new Set(markets.map(m => m.category))].sort(), [markets]);

  const toggleSort = useCallback((nextSort: MarketSortKey) => {
    if (nextSort === sortBy) {
      setSortDirection(current => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(nextSort);
    setSortDirection(nextSort === "title" || nextSort === "endDate" ? "asc" : "desc");
  }, [sortBy]);

  const filteredMarkets = useMemo(() => {
    return filterAndSortMarkets({
      markets,
      query,
      timeframe,
      category,
      probMin,
      probMax,
      minEdge,
      riskTag,
      sortBy,
      sortDirection,
      minVolume,
      minLiquidity,
      maxSpread,
    });
  }, [markets, query, timeframe, category, probMin, probMax, minEdge, riskTag, sortBy, sortDirection, minVolume, minLiquidity, maxSpread]);

  const tableInsights = useMemo(() => buildTableInsights(filteredMarkets), [filteredMarkets]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setTimeframe("all");
    setCategory("all");
    setProbMin(0);
    setProbMax(100);
    setMinEdge(0);
    setRiskTag("all");
    setSortBy("edge");
    setSortDirection("desc");
    setMinVolume(0);
    setMinLiquidity(0);
    setMaxSpread(100);
  }, []);

  const buyPayloadIssues = useMemo(() => {
    if (!buyMarket) return ["Select a market"];

    const rawPrice = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
    const price = rawPrice > 0 ? rawPrice : buyMarket.probabilityPct / 100;
    const issues: string[] = [];

    if (!buyMarket.id) issues.push("Missing market id");
    if (!(buyAmount > 0)) issues.push("Enter an amount greater than $0");
    if (!Number.isFinite(price) || price <= 0) issues.push("Price unavailable");

    if (!buyPaper) {
      const tokenId = buyOutcome === "YES" ? buyMarket.tokenIdYes : buyMarket.tokenIdNo;
      if (!tokenId) issues.push(`No ${buyOutcome} token id available`);
      if (!walletAddress) issues.push("Connect wallet on the Live Wallet tab");
      if (!liveChecklist.walletConnected) issues.push("Wallet not connected");
      if (!liveChecklist.polygonSelected) issues.push("Switch wallet to Polygon");
      if (!liveChecklist.signatureVerified) issues.push("Verify wallet signature");
      if (!liveChecklist.usdcApproved) issues.push("Approve USDC spending");
      if (!liveChecklist.usdcFunded) issues.push("Fund wallet with USDC");
    }

    return issues;
  }, [buyAmount, buyMarket, buyOutcome, buyPaper, liveChecklist, walletAddress]);

  const buyPayloadReady = buyPayloadIssues.length === 0;

  const openBuyPanel = (m: MarketListing, o: "YES" | "NO" = "YES") => {
    setBuyMarket(m);
    setBuyOutcome(o);
    setBuyAmount(25);
    setBuySuccess("");
    setBuyPaper(paperMode);
  };

  const closeBuyPanel = () => setBuyMarket(null);

  const handleBuy = useCallback(async () => {
    if (!buyMarket) return;
    setBuySubmitting(true);
    setBuySuccess("");
    try {
      const rawPrice = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
      const avgPrice = rawPrice > 0 ? rawPrice : buyMarket.probabilityPct / 100;
      const res = await fetch("/api/market/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_id: buyMarket.id,
          market_title: buyMarket.title,
          outcome: buyOutcome,
          amount: buyAmount,
          avg_price: avgPrice,
          category: buyMarket.category,
          probability: buyMarket.probabilityPct,
          paper_mode: buyPaper,
          wallet_address: walletAddress ?? null,
          token_id: buyOutcome === "YES" ? (buyMarket.tokenIdYes ?? null) : (buyMarket.tokenIdNo ?? null),
          take_profit_pct: 20,
          stop_loss_pct: 10,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const data = await res.json() as { error?: string; openPositions?: number; limit?: number; help?: string };
      if (res.ok) {
        setBuySuccess(`✅ ${buyPaper ? "Paper " : ""}Buy placed — ${(buyAmount / avgPrice).toFixed(1)} shares ${buyOutcome}`);
        window.setTimeout(() => {
          setBuyMarket(null);
          void onTradePlaced?.();
        }, 900);
      } else {
        if (typeof data.openPositions === "number" && typeof data.limit === "number") {
          setBuySuccess(`❌ ${data.error ?? "Buy failed"} — ${data.openPositions}/${data.limit} open. ${data.help ?? "Raise 'Max positions at once' in Automation."}`);
        } else {
          setBuySuccess(`❌ ${data.error ?? "Buy failed"}`);
        }
      }
    } catch (e: unknown) {
      setBuySuccess(`❌ ${(e as Error).message}`);
    } finally {
      setBuySubmitting(false);
    }
  }, [buyAmount, buyMarket, buyOutcome, buyPaper, onTradePlaced, walletAddress]);

  const fetchModeLabel = fetchPlan.label;

  return {
    query, setQuery,
    timeframe, setTimeframe,
    category, setCategory,
    probMin, setProbMin,
    probMax, setProbMax,
    minEdge, setMinEdge,
    riskTag, setRiskTag,
    sortBy, setSortBy,
    sortDirection,
    toggleSort,
    minVolume, setMinVolume,
    minLiquidity, setMinLiquidity,
    maxSpread, setMaxSpread,
    filtersOpen, setFiltersOpen,
    availableCategories,
    filteredMarkets,
    filteredCount: filteredMarkets.length,
    fetchModeLabel,
    tableInsights,
    loading, loaded, loadError,
    clearFilters,
    fetchMarkets,
    buyMarket, buyOutcome, setBuyOutcome,
    buyAmount, setBuyAmount,
    buyPaper, setBuyPaper,
    buySubmitting, buySuccess,
    buyPayloadReady,
    buyPayloadIssues,
    openBuyPanel, closeBuyPanel, handleBuy,
  };
}
```

## lib/market/runtime-config.ts

```typescript
import type { FocusArea, MarketOpportunity } from "@/lib/market-bot";

export type MarketPlanRuntimeRow = {
  mode: "practice" | "real";
  budget: number | string | null;
  risk_level: "conservative" | "balanced" | "aggressive" | null;
  categories: string[] | null;
  scan_mode: "slow" | "balanced" | "fast" | "closing-soon" | null;
  max_trades_per_day: number | null;
  max_daily_loss: number | string | null;
  max_open_positions: number | null;
  max_pct_per_trade: number | string | null;
  fee_alert_threshold: number | string | null;
  cooldown_after_loss_streak: number | null;
  large_trader_signals: boolean | null;
  closing_soon_focus: boolean | null;
  slippage: number | string | null;
  minimum_liquidity: number | string | null;
  maximum_spread: number | string | null;
  fill_policy: "aggressive" | "conservative" | "limit-only" | null;
  exit_rules: "auto" | "manual" | "trailing-stop" | null;
  runtime_config: Record<string, unknown> | null;
};

export type MarketDirectiveRuntimeRow = {
  amount: number | string | null;
  buys_per_day: number | null;
  risk_mix: "conservative" | "balanced" | "aggressive" | null;
  focus_areas: string[] | null;
  paper_mode: boolean | null;
  timeframe: string | null;
};

export type MarketRuntimeConfig = {
  capitalAlloc: number;
  maxTradesPerDay: number;
  maxOpenPositions: number;
  paperMode: boolean;
  focusAreas: FocusArea[];
  timeframe: string;
  timeframeHours: number | null;
  minimumLiquidity: number;
  maximumSpreadPct: number | null;
  maxPctPerTrade: number | null;
  feeAlertThreshold: number | null;
  cooldownAfterLossStreak: number;
  largeTraderSignals: boolean;
  closingSoonFocus: boolean;
  slippagePct: number | null;
  fillPolicy: "aggressive" | "conservative" | "limit-only";
  exitRules: "auto" | "manual" | "trailing-stop";
  dailyLossCap: number;
  moonshotMode: boolean;
  totalLossCap: number;
  autoPauseLosingDays: number;
  targetProfitMonthly: number | null;
  takeProfitPct: number;
  stopLossPct: number;
  minProbabilityPct: number;
  maxProbabilityPct: number;
};

type RuntimeConfigInput = {
  capitalAlloc?: number | string | null;
  maxTradesPerDay?: number | string | null;
  maxOpenPositions?: number | string | null;
  paperMode?: boolean;
  focusAreas?: string[] | null;
  timeframe?: string | null;
  timeframeHours?: number | string | null;
  minimumLiquidity?: number | string | null;
  maximumSpreadPct?: number | string | null;
  maximumSpread?: number | string | null;
  maxPctPerTrade?: number | string | null;
  feeAlertThreshold?: number | string | null;
  cooldownAfterLossStreak?: number | string | null;
  largeTraderSignals?: boolean;
  closingSoonFocus?: boolean;
  slippagePct?: number | string | null;
  slippage?: number | string | null;
  fillPolicy?: string | null;
  exitRules?: string | null;
  dailyLossCap?: number | string | null;
  moonshotMode?: boolean;
  totalLossCap?: number | string | null;
  autoPauseLosingDays?: number | string | null;
  targetProfitMonthly?: number | string | null;
  takeProfitPct?: number | string | null;
  stopLossPct?: number | string | null;
  minProbabilityPct?: number | string | null;
  maxProbabilityPct?: number | string | null;
};

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeFocusArea(value: string): FocusArea | null {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "all" || normalized === "general") return "all";
  if (normalized === "real estate" || normalized === "real-estate") return "real-estate";
  if (normalized === "construction") return "construction";
  if (normalized === "economy" || normalized === "finance") return "economy";
  if (normalized === "politics") return "politics";
  if (normalized === "sports") return "sports";
  if (normalized === "crypto") return "crypto";
  if (normalized === "weather") return "weather";
  if (normalized === "entertainment") return "entertainment";
  return null;
}

export function normalizeFocusAreas(values: string[] | null | undefined): FocusArea[] {
  const normalized = (values ?? [])
    .map(normalizeFocusArea)
    .filter((value): value is FocusArea => value !== null);

  const unique = Array.from(new Set(normalized));
  if (unique.length === 0) return ["all"];
  if (unique.includes("all") && unique.length > 1) {
    return unique.filter((value) => value !== "all");
  }
  return unique;
}

export function timeframeToHours(timeframe: string | null | undefined): number | null {
  const normalized = String(timeframe ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized === "12h") return 12;
  if (normalized === "24h") return 24;
  if (normalized === "3d") return 72;
  if (normalized === "1w") return 168;

  const match = normalized.match(/^(\d+)(h|d|w)$/);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  if (match[2] === "h") return amount;
  if (match[2] === "d") return amount * 24;
  return amount * 24 * 7;
}

function scanModeToTimeframe(scanMode: MarketPlanRuntimeRow["scan_mode"], closingSoonFocus: boolean | null): string {
  if (closingSoonFocus || scanMode === "closing-soon") return "24h";
  if (scanMode === "fast") return "12h";
  if (scanMode === "slow") return "1w";
  return "3d";
}

export function buildRuntimeConfig(input?: RuntimeConfigInput): MarketRuntimeConfig {
  const source = input ?? {};
  const timeframe = String(source.timeframe ?? "3d");
  const explicitTimeframeHours = toFiniteNumber(source.timeframeHours);
  const timeframeHours = explicitTimeframeHours ?? timeframeToHours(timeframe);
  const closingSoonFocus = source.closingSoonFocus === true;

  return {
    capitalAlloc: Math.max(1, toFiniteNumber(source.capitalAlloc) ?? 200),
    maxTradesPerDay: clamp(Math.round(toFiniteNumber(source.maxTradesPerDay) ?? 5), 1, 100000),
    maxOpenPositions: clamp(Math.round(toFiniteNumber(source.maxOpenPositions) ?? 3), 1, 100000),
    paperMode: source.paperMode !== false,
    focusAreas: normalizeFocusAreas(source.focusAreas),
    timeframe,
    timeframeHours: closingSoonFocus ? 24 : timeframeHours,
    minimumLiquidity: Math.max(0, toFiniteNumber(source.minimumLiquidity) ?? 1000),
    maximumSpreadPct: Math.max(0, toFiniteNumber(source.maximumSpreadPct ?? source.maximumSpread) ?? 5),
    maxPctPerTrade: Math.max(0, toFiniteNumber(source.maxPctPerTrade) ?? 10),
    feeAlertThreshold: Math.max(0, toFiniteNumber(source.feeAlertThreshold) ?? 5),
    cooldownAfterLossStreak: clamp(Math.round(toFiniteNumber(source.cooldownAfterLossStreak) ?? 2), 0, 30),
    largeTraderSignals: source.largeTraderSignals === true,
    closingSoonFocus,
    slippagePct: Math.max(0, toFiniteNumber(source.slippagePct ?? source.slippage) ?? 2),
    fillPolicy:
      source.fillPolicy === "aggressive" || source.fillPolicy === "limit-only"
        ? source.fillPolicy
        : "conservative",
    exitRules:
      source.exitRules === "manual" || source.exitRules === "trailing-stop"
        ? source.exitRules
        : "auto",
    dailyLossCap: Math.max(1, toFiniteNumber(source.dailyLossCap) ?? 40),
    moonshotMode: source.moonshotMode === true,
    totalLossCap: Math.max(1, toFiniteNumber(source.totalLossCap) ?? 200),
    autoPauseLosingDays: clamp(Math.round(toFiniteNumber(source.autoPauseLosingDays) ?? 3), 1, 30),
    targetProfitMonthly: toFiniteNumber(source.targetProfitMonthly),
    takeProfitPct: Math.max(1, toFiniteNumber(source.takeProfitPct) ?? 20),
    stopLossPct: Math.max(1, toFiniteNumber(source.stopLossPct) ?? 10),
    minProbabilityPct: clamp(toFiniteNumber(source.minProbabilityPct) ?? 5, 0, 100),
    maxProbabilityPct: clamp(toFiniteNumber(source.maxProbabilityPct) ?? 95, 0, 100),
  };
}

export function buildRuntimeConfigFromPlan(
  plan: MarketPlanRuntimeRow,
  metadata?: Record<string, unknown>,
): MarketRuntimeConfig {
  const runtimeOverrides = plan.runtime_config && typeof plan.runtime_config === "object" ? plan.runtime_config : {};
  const dailyLossCap = toFiniteNumber(plan.max_daily_loss) ?? 40;
  const budget = toFiniteNumber(plan.budget) ?? 200;

  return buildRuntimeConfig({
    ...(metadata ?? {}),
    ...runtimeOverrides,
    capitalAlloc: plan.budget,
    maxTradesPerDay: plan.max_trades_per_day,
    maxOpenPositions: plan.max_open_positions,
    paperMode: plan.mode !== "real",
    focusAreas: plan.categories,
    timeframe:
      typeof runtimeOverrides.timeframe === "string"
        ? runtimeOverrides.timeframe
        : scanModeToTimeframe(plan.scan_mode, plan.closing_soon_focus),
    minimumLiquidity: plan.minimum_liquidity,
    maximumSpread: plan.maximum_spread,
    maxPctPerTrade: plan.max_pct_per_trade,
    feeAlertThreshold: plan.fee_alert_threshold,
    cooldownAfterLossStreak: plan.cooldown_after_loss_streak,
    largeTraderSignals: plan.large_trader_signals === true,
    closingSoonFocus: plan.closing_soon_focus === true,
    slippage: plan.slippage,
    fillPolicy: plan.fill_policy,
    exitRules: plan.exit_rules,
    dailyLossCap: plan.max_daily_loss,
    moonshotMode:
      typeof runtimeOverrides.moonshotMode === "boolean"
        ? runtimeOverrides.moonshotMode
        : plan.risk_level === "aggressive" && plan.scan_mode === "fast",
    totalLossCap: toFiniteNumber(runtimeOverrides.totalLossCap) ?? Math.max(dailyLossCap * 5, budget * 0.5),
    autoPauseLosingDays: toFiniteNumber(runtimeOverrides.autoPauseLosingDays) ?? plan.cooldown_after_loss_streak,
    targetProfitMonthly: toFiniteNumber(runtimeOverrides.targetProfitMonthly),
    takeProfitPct: toFiniteNumber(runtimeOverrides.takeProfitPct) ?? 20,
    stopLossPct: toFiniteNumber(runtimeOverrides.stopLossPct) ?? 10,
  });
}

export function buildRuntimeConfigFromDirective(
  directive: MarketDirectiveRuntimeRow | null,
  runtimeStatus: "running" | "paused" | "stopped" | "paper",
  metadata?: Record<string, unknown>,
): MarketRuntimeConfig {
  return buildRuntimeConfig({
    ...(metadata ?? {}),
    capitalAlloc: directive?.amount,
    maxTradesPerDay: directive?.buys_per_day,
    paperMode: directive?.paper_mode ?? runtimeStatus !== "running",
    focusAreas: directive?.focus_areas,
    timeframe: directive?.timeframe,
  });
}

export function filterExecutableOpportunities(
  opportunities: MarketOpportunity[],
  filters: {
    minEdgePct: number;
    minVolumeUsd: number;
    minProbabilityPct: number;
    maxProbabilityPct: number;
    timeframeHours: number | null;
    maxSpreadPct: number | null;
  },
): MarketOpportunity[] {
  const now = Date.now();

  return opportunities.filter((opp) => {
    const probabilityPct = opp.yesPrice * 100;
    if (opp.edge < filters.minEdgePct) return false;
    if (opp.volume24h < filters.minVolumeUsd) return false;
    if (probabilityPct < filters.minProbabilityPct || probabilityPct > filters.maxProbabilityPct) {
      return false;
    }
    if (filters.maxSpreadPct != null && opp.edge > filters.maxSpreadPct) return false;
    if (filters.timeframeHours != null) {
      const expiry = new Date(opp.expiresAt).getTime();
      if (Number.isFinite(expiry)) {
        const hoursUntilExpiry = (expiry - now) / 3_600_000;
        if (hoursUntilExpiry > filters.timeframeHours) return false;
      }
    }
    return true;
  });
}
```

## lib/market/scheduler-runtime.ts

```typescript
import { buildRuntimeConfig, type MarketRuntimeConfig } from "@/lib/market/runtime-config";

type DirectiveSchedulerShape = {
  amount: number | string | null;
  buys_per_day: number | null;
  paper_mode: boolean | null;
  focus_areas: string[] | null;
  timeframe: string | null;
};

export function buildSchedulerRuntimeConfig(
  directiveRow: DirectiveSchedulerShape | null,
  runtimeStatus: "running" | "paused" | "stopped" | "paper",
  userMetadata: Record<string, unknown> | undefined,
): MarketRuntimeConfig {
  return buildRuntimeConfig({
    ...(userMetadata ?? {}),
    capitalAlloc: directiveRow?.amount,
    maxTradesPerDay: directiveRow?.buys_per_day,
    paperMode: directiveRow?.paper_mode ?? runtimeStatus !== "running",
    focusAreas: directiveRow?.focus_areas ?? undefined,
    timeframe: directiveRow?.timeframe ?? undefined,
  });
}

export function applyDecisionShareCaps<T extends { side: "YES" | "NO"; shares: number; opp: { yesPrice: number; noPrice: number } }>(
  decisions: T[],
  capitalBase: number,
  runtimeConfig: MarketRuntimeConfig,
  maxDecisions: number,
): T[] {
  return decisions
    .map((decision) => {
      const price = decision.side === "YES" ? decision.opp.yesPrice : decision.opp.noPrice;
      const maxSharesByPortfolioPct = runtimeConfig.maxPctPerTrade
        ? Math.floor(((capitalBase * runtimeConfig.maxPctPerTrade) / 100) / Math.max(price, 0.01))
        : decision.shares;
      return {
        ...decision,
        shares: Math.max(1, Math.min(decision.shares, Math.max(1, maxSharesByPortfolioPct))),
      };
    })
    .slice(0, maxDecisions);
}
```

## lib/market/scheduler.ts

```typescript
import { createAdminClient } from "@/lib/supabase/admin";
import { runForUser, type SchedulerUserResult } from "@/lib/market/scheduler-run-user";
import { getConfig, isoDay, type MarketsPromiseCache } from "@/lib/market/scheduler-utils";

type RuntimeRow = { user_id: string; status: "running" | "paused" | "stopped" | "paper" };

export type SchedulerTickResult = {
  usersConsidered: number;
  usersExecuted: number;
  totalTradesExecuted: number;
  results: SchedulerUserResult[];
  timestamp: string;
};

export async function runMarketSchedulerTick(now = new Date()): Promise<SchedulerTickResult> {
  const admin = createAdminClient();
  const config = getConfig();

  const { data: runtimeRows, error } = await admin
    .from("market_bot_runtime")
    .select("user_id,status")
    .in("status", ["running", "paper"])
    .limit(config.maxUsersPerTick);

  if (error) {
    throw new Error(`Failed to fetch runtime rows: ${error.message}`);
  }

  const rows = (runtimeRows ?? []) as RuntimeRow[];
  const results: SchedulerUserResult[] = [];
  const marketsCache: MarketsPromiseCache = new Map();

  for (let offset = 0; offset < rows.length; offset += config.concurrency) {
    const chunk = rows.slice(offset, offset + config.concurrency);

    const chunkResults = await Promise.all(
      chunk.map(async (row): Promise<SchedulerUserResult> => {
        try {
          return await runForUser(row.user_id, row.status, now, config, marketsCache);
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown_error";

          await admin.from("market_bot_runtime_state").upsert(
            {
              user_id: row.user_id,
              day_bucket: isoDay(now),
              updated_at: now.toISOString(),
              last_error: message.slice(0, 500),
              last_error_at: now.toISOString(),
            },
            { onConflict: "user_id" },
          );

          return {
            userId: row.user_id,
            status: "error",
            reason: message,
            tradesExecuted: 0,
            decisions: 0,
          };
        }
      }),
    );

    results.push(...chunkResults);
  }

  return {
    usersConsidered: rows.length,
    usersExecuted: results.filter((result) => result.status === "executed").length,
    totalTradesExecuted: results.reduce((sum, result) => sum + result.tradesExecuted, 0),
    results,
    timestamp: now.toISOString(),
  };
}
```

## lib/market/sync-automation-plan.ts

```typescript
import type { AutomationPlan } from "@/components/dashboard/market/types";

export interface SyncResult {
  ok: boolean;
  status: number;
  error?: string;
  planId?: string;
}

/**
 * Persist or update an automation plan to the canonical `market_plans` table.
 * This replaces the legacy dual-write that previously synced to `market_directives`.
 */
export async function syncAutomationPlan(plan: AutomationPlan): Promise<SyncResult> {
  const method = plan.id ? "PATCH" : "POST";
  const body: AutomationPlan = {
    ...plan,
    isDefault: plan.isDefault ?? true,
    isArchived: false,
  };

  const response = await fetch("/api/market/plans", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({})) as Record<string, unknown>;
    return {
      ok: false,
      status: response.status,
      error: typeof errData.error === "string" ? errData.error : `HTTP ${response.status}`,
    };
  }

  const data = await response.json() as { plan?: { id?: string } };
  return { ok: true, status: response.status, planId: data.plan?.id };
}

/** Set bot-status to running/paper so the scheduler picks it up */
export async function ensureBotRunning(paperMode: boolean): Promise<boolean> {
  try {
    const res = await fetch("/api/market/bot-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: paperMode ? "paper" : "running" }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
```

## components/dashboard/MarketClient.tsx

```typescript
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import { useMarketTradeData } from "@/lib/hooks/useMarketTradeData";
import { useMarketBot } from "@/lib/hooks/useMarketBot";
import { useMarketServerStatus } from "@/lib/hooks/useMarketServerStatus";
import MarketPrimaryNav from "@/components/dashboard/market/MarketPrimaryNav";
import MarketStartHereTab from "@/components/dashboard/market/MarketStartHereTab";
import MarketDirectBuyTab from "@/components/dashboard/market/MarketDirectBuyTab";
import MarketAutomationTab from "@/components/dashboard/market/MarketAutomationTab";
import MarketResultsTab from "@/components/dashboard/market/MarketResultsTab";
import MarketLiveWalletTab from "@/components/dashboard/market/MarketLiveWalletTab";
import MarketSavedMarketsTab from "@/components/dashboard/market/MarketSavedMarketsTab";
import MarketTopOverview from "@/components/dashboard/market/MarketTopOverview";
import { useMarketWalletState } from "@/lib/hooks/useMarketWalletState";
import { normalizeFocusAreas } from "@/lib/market/runtime-config";
import { syncAutomationPlan, ensureBotRunning } from "@/lib/market/sync-automation-plan";
import type { MarketShellContext } from "@/components/dashboard/market/MarketRouteShell";
import type { AutomationPlan } from "@/components/dashboard/market/types";
import type { ScanResult } from "@/lib/hooks/useMarketBot";

interface ScanBanner { type: "success" | "empty" | "error"; message: string }

interface MarketClientProps {
  layoutPrefs?: MarketShellContext;
}

export default function MarketClient({ layoutPrefs }: MarketClientProps) {
  const visibleTabs = layoutPrefs?.visibleTabs ?? [];
  const [activeTabId, setActiveTabId] = useState("start-here");
  const [scanBanner, setScanBanner] = useState<ScanBanner | null>(null);
  const logsEnabled = activeTabId === "results";

  // If active tab is hidden, snap to first visible
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find((t) => t.id === activeTabId)) {
      setActiveTabId(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTabId]);

  const td = useMarketTradeData(logsEnabled);
  const { fetchTrades, fetchSummary, fetchSchedulerHealth, fetchMarketLogs, trades, activityLogs } = td;
  const bot = useMarketBot({
    trades,
    fetchTrades,
    fetchSummary,
    fetchSchedulerHealth,
    fetchMarketLogs,
  });
  const wallet = useMarketWalletState({ addLog: bot.addLog });
  const serverStatus = useMarketServerStatus();

  useEffect(() => {
    fetchTrades();
    fetchSummary();
    fetchSchedulerHealth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTabId === "results") {
      void fetchTrades();
      void fetchSummary();
      void fetchSchedulerHealth();
      void fetchMarketLogs();
    }
  }, [activeTabId, fetchTrades, fetchSummary, fetchSchedulerHealth, fetchMarketLogs]);

  const handleApplyPlan = useCallback((plan: AutomationPlan) => {
    void (async () => {
      setScanBanner(null);
      const focusAreas = normalizeFocusAreas(plan.categories);
      const paperMode = plan.mode === "practice";
      const scanConfig = {
        paperMode,
        capitalAlloc: plan.budget,
        maxTradesPerDay: plan.maxTradesPerDay,
        maxPositions: plan.maxOpenPositions,
        minVolume: plan.minimumLiquidity,
        riskMix: plan.riskLevel,
        whaleFollow: plan.largeTraderSignals,
        focusAreas,
      };

      bot.setCapitalAlloc(plan.budget);
      bot.setMaxTradesPerDay(plan.maxTradesPerDay);
      bot.setMaxPositions(plan.maxOpenPositions);
      bot.setMinVolume(plan.minimumLiquidity);
      bot.setRiskMix(plan.riskLevel);
      bot.setWhaleFollow(plan.largeTraderSignals);
      bot.setFocusAreas(focusAreas);
      bot.setPaperMode(paperMode);
      bot.addLog(`📋 Plan "${plan.name}" applied to bot`);

      // 1. Sync plan to market_plans table (canonical source of truth)
      try {
        const result = await syncAutomationPlan(plan);
        if (result.ok) {
          bot.addLog(`🗂 Synced "${plan.name}" to server (plan ${result.planId ?? "created"})`);
        } else {
          bot.addLog(`⚠️ Server sync failed: ${result.error ?? `HTTP ${result.status}`}. Bot will use local config for manual scans.`);
        }
      } catch (error) {
        bot.addLog(`⚠️ Server sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
      }

      // 2. Set bot status to paper/running so the scheduler picks this user up
      const statusSet = await ensureBotRunning(paperMode);
      if (statusSet) {
        bot.addLog(`🟢 Bot status set to ${paperMode ? "paper" : "running"} — scheduler will pick up trades`);
      } else {
        bot.addLog(`⚠️ Failed to set bot status on server — scheduler may not run`);
      }

      bot.setBotRunning(true);
      bot.setBotPaused(false);

      // 3. Run scan and surface the result
      const scanResult: ScanResult = await bot.runScan(scanConfig);

      if (scanResult.tradesPlaced > 0) {
        setScanBanner({ type: "success", message: `Robot placed ${scanResult.tradesPlaced} trade${scanResult.tradesPlaced !== 1 ? "s" : ""}. Check History for details.` });
        setActiveTabId("results");
      } else if (scanResult.ok) {
        setScanBanner({ type: "empty", message: `Scan complete — scanned markets but no trades matched your filters right now. The robot will keep scanning automatically.` });
      } else {
        setScanBanner({ type: "error", message: `Scan error: ${scanResult.error ?? "Unknown error"}` });
      }
    })();
  }, [bot]);

  const handleTradePlaced = useCallback(async () => {
    await fetchTrades();
    await fetchSummary();
    await fetchSchedulerHealth();
    setActiveTabId("results");
  }, [fetchSchedulerHealth, fetchSummary, fetchTrades]);

  function renderActiveTab() {
    switch (activeTabId) {
      case "start-here":
        return (
          <MarketStartHereTab
            onNavigate={setActiveTabId}
            onApplyRecommendation={handleApplyPlan}
            onQuickStart={bot.handleStartBot}
            onStopBot={bot.handleStopBot}
            paperMode={bot.config.paperMode}
            serverStatus={serverStatus.status}
            serverConfirmed={serverStatus.isConfirmed}
            serverHealth={serverStatus.health}
          />
        );
      case "direct-buy":
        return (
          <MarketDirectBuyTab
            paperMode={bot.config.paperMode}
            walletAddress={wallet.address}
            liveChecklist={wallet.liveChecklist}
            onTradePlaced={handleTradePlaced}
            onOpenAutomation={() => setActiveTabId("automation")}
          />
        );
      case "automation":
        return (
          <MarketAutomationTab
            botConfig={bot.config}
            onApplyPlan={handleApplyPlan}
            onRunNow={() => {
              void (async () => {
                setScanBanner(null);
                const result = await bot.runScan();
                if (result.tradesPlaced > 0) {
                  setScanBanner({ type: "success", message: `Scan placed ${result.tradesPlaced} trade${result.tradesPlaced !== 1 ? "s" : ""}.` });
                  setActiveTabId("results");
                } else if (result.ok) {
                  setScanBanner({ type: "empty", message: `Scan complete — no opportunities matched filters right now.` });
                } else {
                  setScanBanner({ type: "error", message: `Scan error: ${result.error ?? "Unknown error"}` });
                }
              })();
            }}
            onStopBot={() => { void bot.handleStopBot(); }}
            serverStatus={serverStatus.status}
            serverHealth={serverStatus.health}
            scanLog={bot.scanLog}
          />
        );
      case "saved-markets":
        return <MarketSavedMarketsTab onNavigate={setActiveTabId} />;
      case "results":
        return (
          <MarketResultsTab
            trades={trades}
            activityLogs={activityLogs}
            onRefresh={async () => {
              await fetchTrades();
              await fetchSummary();
              await fetchSchedulerHealth();
              await fetchMarketLogs();
            }}
          />
        );
      case "live-wallet":
        return (
          <MarketLiveWalletTab
            address={wallet.address}
            isConnected={wallet.isConnected}
            chain={wallet.chain as { id: number; name: string } | undefined}
            isConnecting={wallet.isConnecting}
            isApproving={wallet.isApproving}
            waitingApproveReceipt={wallet.waitingApproveReceipt}
            approveSuccess={wallet.approveSuccess}
            usdcBalance={wallet.usdcBalance}
            maticData={wallet.maticData as { formatted: string; symbol: string } | undefined}
            walletVerified={wallet.walletVerified}
            walletError={wallet.walletError}
            walletChoice={wallet.walletChoice}
            setWalletChoice={wallet.setWalletChoice}
            liveChecklist={wallet.liveChecklist}
            handleConnectWallet={wallet.handleConnectWallet}
            handleApproveUsdc={wallet.handleApproveUsdc}
            disconnect={wallet.disconnect}
            paperMode={bot.config.paperMode}
          />
        );
      default:
        return null;
    }
  }

  const displayStatus = serverStatus.isConfirmed ? serverStatus.status : "unknown";
  const statusLabels: Record<string, string> = { running: "Running", paused: "Paused", paper: "Paper", stopped: "Stopped" };
  const displayStatusLabel = statusLabels[displayStatus] ?? "Checking…";

  return (
    <div className="text-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 flex-wrap">
            Market Robot{" "}
            <StatusBadge status={displayStatus === "unknown" ? "idle" : displayStatus} />
            {!serverStatus.isConfirmed && !serverStatus.isLoading && (
              <span className="text-[10px] text-gray-400 font-normal">(unconfirmed)</span>
            )}
            {bot.config.paperMode && (
              <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                Paper Mode
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            AI-powered prediction market bot
            {serverStatus.isConfirmed && (
              <> — Server: <strong className="text-gray-700">{displayStatusLabel}</strong></>
            )}
            {serverStatus.health?.lastRunIso && (
              <> · Last run: {new Date(serverStatus.health.lastRunIso).toLocaleTimeString()}</>
            )}
            {serverStatus.health && (
              <> · {serverStatus.health.tradesToday} trade{serverStatus.health.tradesToday !== 1 ? "s" : ""} today</>
            )}
          </p>
        </div>
      </div>

      <MarketPrimaryNav
        tabs={visibleTabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
      />

      <MarketTopOverview
        trades={trades}
        botConfig={bot.config}
        onOpenResults={() => setActiveTabId("results")}
        onOpenAutomation={() => setActiveTabId("automation")}
      />

      {/* Scan feedback banner — visible on all tabs */}
      {scanBanner && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm flex items-center justify-between ${
          scanBanner.type === "success" ? "bg-green-50 border-green-200 text-green-800" :
          scanBanner.type === "empty" ? "bg-amber-50 border-amber-200 text-amber-800" :
          "bg-red-50 border-red-200 text-red-800"
        }`}>
          <span>{scanBanner.message}</span>
          <button onClick={() => setScanBanner(null)} className="ml-3 text-current opacity-60 hover:opacity-100 text-xs font-bold">✕</button>
        </div>
      )}

      {renderActiveTab()}
    </div>
  );
}


```

## components/dashboard/market/types.ts

```typescript
export interface BuyDirective {
  id?: string;
  name: string;
  amount: number;
  timeframe: string;
  buys_per_day: number;
  risk_mix: "conservative" | "balanced" | "aggressive";
  whale_follow: boolean;
  focus_areas: string[];
  profit_strategy: "arbitrage" | "market-making" | "whale-copy" | "longshot";
  paper_mode: boolean;
  daily_loss_cap?: number;
  moonshot_mode?: boolean;
  total_loss_cap?: number;
  auto_pause_losing_days?: number;
  target_profit_monthly?: number | null;
  take_profit_pct?: number;
  stop_loss_pct?: number;
  created_at?: string;
}

export interface MarketActivityLogEntry {
  id: string;
  level: string;
  message: string;
  created_at: string;
}

// ── Shared domain types ────────────────────────────────────────────────────

export type { MarketViewModel, TradeViewModel, SchedulerHealthViewModel, MarketSummaryViewModel, WhaleActivityViewModel } from "@/lib/market/contracts";

export interface MarketListing {
  id: string;
  title: string;
  category: string;
  probabilityPct: number;
  yesPrice: number;
  noPrice: number;
  volume24hUsd: number;
  liquidityUsd: number;
  edgePct: number;
  riskTag: "hot" | "high-risk" | "construction" | "high-potential" | null;
  endDate: string | null;
  endDateIso?: string | null;
  tokenIdYes?: string | null;
  tokenIdNo?: string | null;
  bookmarked: boolean;
  endDateLabel?: string;
  liquidity?: number;
}

export interface MarketTrade {
  id: string;
  marketId: string;
  marketTitle: string;
  outcome: "YES" | "NO";
  shares: number;
  avgPrice: number;
  currentPrice: number;
  total: number;
  pnl: number;
  status: string;
  paperTrade: boolean;
  reason: string | null;
  createdAt: string;
  closedAt: string | null;
  category?: string;
  probability?: number;
  volume?: number;
}

export interface LiveChecklist {
  walletConnected: boolean;
  polygonSelected: boolean;
  usdcFunded: boolean;
  signatureVerified: boolean;
  usdcApproved: boolean;
}

export interface SimRun {
  id: string;
  name: string;
  created_at: string;
  config: BuyDirective;
  pnl_data: { label: string; pnl: number }[];
  total_pnl: number;
  win_rate: number;
  trade_count: number;
  // Simulation labels (Batch 4)
  fillModel?: "realistic" | "ideal";
  feeMode?: boolean;
  partialFills?: boolean;
  startingBalance?: number;
}

export type PnlPoint = { label: string; pnl: number; cumPnl: number };
export type MarketSortKey = "volume" | "edge" | "probability" | "title" | "endDate" | "yesPrice" | "noPrice" | "signal";
export type MarketSortDirection = "asc" | "desc";
export type MktRiskTag = "all" | "hot" | "high-risk" | "construction" | "high-potential" | "none";
export type MktTimeframe = "hour" | "day" | "week" | "month" | "year" | "all" | "today" | "tomorrow";

// ── Simulation types ───────────────────────────────────────────────────────

export interface SimulationConfig {
  startingBalance: number;
  fillModel: "realistic" | "ideal";
  feeMode: boolean;
  partialFills: boolean;
}

// ── Automation plan types ──────────────────────────────────────────────────

export type RiskLevel = "conservative" | "balanced" | "aggressive";
export type ScanMode = "slow" | "balanced" | "fast" | "closing-soon";
export type FillPolicy = "aggressive" | "conservative" | "limit-only";
export type ExitRules = "auto" | "manual" | "trailing-stop";

export interface AutomationPlan {
  id: string;
  name: string;
  // Basic
  budget: number;
  riskLevel: RiskLevel;
  categories: string[];
  scanMode: ScanMode;
  maxTradesPerDay: number;
  mode: "practice" | "real";
  maxDailyLoss: number;
  maxOpenPositions: number;
  // Intermediate
  maxPctPerTrade: number;
  feeAlertThreshold: number;
  cooldownAfterLossStreak: number;
  largeTraderSignals: boolean;
  closingSoonFocus: boolean;
  // Advanced
  slippage: number;
  minimumLiquidity: number;
  maximumSpread: number;
  fillPolicy: FillPolicy;
  exitRules: ExitRules;
  // Metadata
  isDefault: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BotConfig {
  paperMode: boolean;
  botRunning: boolean;
  botPaused: boolean;
  scanning: boolean;
  lastScan: number | null;
  capitalAlloc: number;
  maxTradesPerDay: number;
  maxPositions: number;
  minEdge: number;
  minVolume: number;
  minProbLow: number;
  minProbHigh: number;
  riskMix: "conservative" | "balanced" | "aggressive";
  whaleFollow: boolean;
  focusAreas: string[];
}

// ── Results analytics types ────────────────────────────────────────────────

export interface ResultsAnalytics {
  realizedPnl: number;
  unrealizedPnl: number;
  feeAdjustedPnl: number;
  totalPnl: number;
  expectancy: number;
  profitFactor: number;
  winRate: number;
  avgHoldTimeMs: number;
  totalTrades: number;
  openTrades: number;
  closedTrades: number;
  pnlByCategory: { category: string; pnl: number; count: number }[];
  paperVsLive: { mode: "paper" | "live"; pnl: number; count: number; winRate: number }[];
}

export interface TradeReplay {
  trade: MarketTrade;
  reasoning: string | null;
  exitReason: string | null;
  matchedConstraints: string[];
}
```

## components/dashboard/market/MarketAutomationTab.tsx

```typescript
"use client";

import React, { useCallback, useMemo, useState } from "react";
import { useMarketAutomationState } from "@/lib/hooks/useMarketAutomationState";
import MarketAutomationBuilder from "@/components/dashboard/market/MarketAutomationBuilder";
import MarketPlanList from "@/components/dashboard/market/MarketPlanList";
import MarketSystemStatusCard from "@/components/dashboard/market/MarketSystemStatusCard";
import type { AutomationPlan, BotConfig } from "@/components/dashboard/market/types";
import type { SchedulerHealthViewModel } from "@/lib/market/contracts";
import type { ServerBotStatus } from "@/lib/hooks/useMarketServerStatus";
import { useMarketSystemStatus } from "@/lib/hooks/useMarketSystemStatus";

interface MarketAutomationTabProps {
  botConfig: BotConfig;
  onApplyPlan: (plan: AutomationPlan) => void;
  onRunNow: () => void;
  onStopBot: () => void;
  serverStatus: ServerBotStatus;
  serverHealth: SchedulerHealthViewModel | null;
  scanLog: string[];
}

export default function MarketAutomationTab({ botConfig, onApplyPlan, onRunNow, onStopBot, serverStatus, serverHealth, scanLog }: MarketAutomationTabProps) {
  const auto = useMarketAutomationState();
  const [composerOpen, setComposerOpen] = useState(false);
  const systemStatus = useMarketSystemStatus();

  const handleApply = useCallback((plan: AutomationPlan) => {
    onApplyPlan(plan);
  }, [onApplyPlan]);

  const handleSave = useCallback(async () => {
    const saved = await auto.savePlan();
    if (saved) {
      setComposerOpen(false);
    }
  }, [auto]);

  const handleSaveAndApply = useCallback(async () => {
    const saved = await auto.savePlan();
    if (saved) {
      setComposerOpen(false);
      onApplyPlan(saved);
    }
  }, [auto, onApplyPlan]);

  const quickStats = useMemo(() => ({
    practicePlans: auto.plans.filter((plan) => !plan.isArchived && plan.mode === "practice").length,
    realPlans: auto.plans.filter((plan) => !plan.isArchived && plan.mode === "real").length,
  }), [auto.plans]);

  return (
    <div className="space-y-5">
      {/* Active plan summary */}
      <ActivePlanSummary
        botConfig={botConfig}
        defaultPlan={auto.plans.find(p => p.isDefault)}
        serverStatus={serverStatus}
        serverHealth={serverHealth}
        scanLog={scanLog}
        onRunNow={onRunNow}
        onStopBot={onStopBot}
      />

      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Automation Plans</h3>
          <p className="text-xs text-gray-500 mt-1">
            Build a paper or live robot plan, then start it immediately from here. Practice plans: {quickStats.practicePlans} · Live plans: {quickStats.realPlans}
          </p>
        </div>
        <button
          onClick={() => setComposerOpen((value) => !value)}
          className="px-4 py-2 rounded-lg bg-[#FF4D00] text-white text-sm font-semibold hover:bg-[#e04400] transition"
        >
          {composerOpen || auto.editingId ? "Close plan builder" : "New plan"}
        </button>
      </div>

      <MarketSystemStatusCard
        system={systemStatus.system}
        loading={systemStatus.loading}
        error={systemStatus.error}
        title="Automation backend health"
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
        {(composerOpen || auto.editingId) && (
          <MarketAutomationBuilder
            draft={auto.draft}
            editingId={auto.editingId}
            controlLevel={auto.controlLevel}
            onControlLevelChange={auto.setControlLevel}
            onFieldChange={auto.setDraftField}
            onSave={handleSave}
            onSaveAndApply={handleSaveAndApply}
            onReset={() => {
              auto.resetDraft();
              setComposerOpen(false);
            }}
          />
        )}

        <MarketPlanList
          plans={auto.plans}
          onEdit={(id) => {
            auto.startEdit(id);
            setComposerOpen(true);
          }}
          onClone={auto.clonePlan}
          onRename={auto.renamePlan}
          onArchive={auto.archivePlan}
          onSetDefault={auto.setDefaultPlan}
          onDelete={auto.deletePlan}
          onApply={handleApply}
        />
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-600">
        <p>
          <span className="font-semibold text-slate-800">How this works:</span> Save Draft only stores the plan. Save + Start Robot stores it, applies it, switches the robot on, and triggers an immediate scan. Run scan now is the fastest way to verify that paper-mode execution is alive.
        </p>
      </div>
    </div>
  );
}

function ActivePlanSummary({
  botConfig,
  defaultPlan,
  serverStatus,
  serverHealth,
  scanLog,
  onRunNow,
  onStopBot,
}: {
  botConfig: BotConfig;
  defaultPlan?: AutomationPlan;
  serverStatus: ServerBotStatus;
  serverHealth: SchedulerHealthViewModel | null;
  scanLog: string[];
  onRunNow: () => void;
  onStopBot: () => void;
}) {
  const isRunning = botConfig.botRunning && !botConfig.botPaused;
  const recentLogLines = scanLog.slice(0, 4);
  const [showDebug, setShowDebug] = React.useState(false);

  return (
    <div className={`rounded-2xl border p-4 ${isRunning ? "bg-orange-50 border-orange-200" : "bg-gray-50 border-gray-200"}`}>
      {/* Status + actions row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            {isRunning ? "🟢 Robot Running" : "⏸️ Robot Idle"}
            {botConfig.paperMode && (
              <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">Practice</span>
            )}
          </h3>
          <p className="text-xs text-gray-500 mt-1">
            {defaultPlan ? `Plan: ${defaultPlan.name}` : "No plan selected"}
            {" · "}${botConfig.capitalAlloc} budget · {botConfig.maxTradesPerDay} trades/day · {botConfig.riskMix} risk
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onRunNow}
            className="px-3 py-1.5 rounded-lg bg-[#FF4D00] text-white text-xs font-semibold hover:bg-[#e04400] transition"
          >
            Run scan now
          </button>
          {isRunning && (
            <button
              onClick={onStopBot}
              className="px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 transition"
            >
              Stop robot
            </button>
          )}
        </div>
      </div>

      {/* Quick stats row */}
      <div className="grid grid-cols-3 gap-3 text-center text-xs">
        <div className="rounded-lg bg-white/70 border border-white px-2 py-1.5">
          <span className="text-gray-400">Trades today</span>
          <p className="font-bold text-gray-900">{serverHealth?.tradesToday ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white/70 border border-white px-2 py-1.5">
          <span className="text-gray-400">Scans today</span>
          <p className="font-bold text-gray-900">{serverHealth?.runsToday ?? 0}</p>
        </div>
        <div className="rounded-lg bg-white/70 border border-white px-2 py-1.5">
          <span className="text-gray-400">Last scan</span>
          <p className="font-bold text-gray-900">
            {serverHealth?.lastRunIso ? new Date(serverHealth.lastRunIso).toLocaleTimeString() : "—"}
          </p>
        </div>
      </div>

      {/* Recent messages */}
      {recentLogLines.length > 0 && (
        <div className="mt-3 space-y-1">
          {recentLogLines.map((line, i) => (
            <p key={i} className="text-xs text-gray-600">{line}</p>
          ))}
        </div>
      )}

      {serverHealth?.lastError && (
        <p className="text-xs text-red-600 mt-2">Last error: {serverHealth.lastError}</p>
      )}

      {/* Collapsible debug info */}
      <button
        onClick={() => setShowDebug(v => !v)}
        className="mt-2 text-[10px] text-gray-400 hover:text-gray-600 transition"
      >
        {showDebug ? "▲ Hide server details" : "▼ Server details"}
      </button>
      {showDebug && (
        <div className="mt-2 text-xs text-gray-500 space-y-1">
          <p>Server status: <strong className="text-gray-700 capitalize">{serverStatus}</strong></p>
          {serverHealth?.nextEligibleRunIso && (
            <p>Next background run: {new Date(serverHealth.nextEligibleRunIso).toLocaleTimeString()}</p>
          )}
          {(serverHealth?.tradesToday ?? 0) === 0 && serverStatus !== "stopped" && (
            <p className="text-amber-700">Robot is on but placed no trades yet — no markets may match your filters right now.</p>
          )}
        </div>
      )}
    </div>
  );
}
```

## components/dashboard/market/MarketAutomationBuilder.tsx

```typescript
"use client";
import React from "react";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import MarketAutomationDetailControls from "@/components/dashboard/market/MarketAutomationDetailControls";
import MarketPlanInsights from "@/components/dashboard/market/MarketPlanInsights";
import MarketNumericInput from "@/components/dashboard/market/MarketNumericInput";
import { FOCUS_AREAS } from "@/components/dashboard/market/market-constants";
import type { AutomationPlan, RiskLevel, ScanMode } from "@/components/dashboard/market/types";

interface MarketAutomationBuilderProps {
  draft: AutomationPlan;
  editingId: string | null;
  controlLevel: "basic" | "intermediate" | "advanced";
  onControlLevelChange: (level: "basic" | "intermediate" | "advanced") => void;
  onFieldChange: <K extends keyof AutomationPlan>(key: K, value: AutomationPlan[K]) => void;
  onSave: () => void;
  onSaveAndApply: () => void;
  onReset: () => void;
}

export default function MarketAutomationBuilder({
  draft, editingId, controlLevel,
  onControlLevelChange, onFieldChange, onSave, onSaveAndApply, onReset,
}: MarketAutomationBuilderProps) {
  const toggleCategory = (cat: string) => {
    const next = draft.categories.includes(cat)
      ? draft.categories.filter(c => c !== cat)
      : [...draft.categories, cat];
    onFieldChange("categories", next);
  };

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-900">
          {editingId ? "Edit Plan" : "Create a Robot Plan"}
          <HelpTip content="Tell the robot how much to spend, what risk level, and which topics to focus on." />
        </h3>
      </div>

      {/* Control level selector */}
      <div>
        <p className="text-xs text-gray-500 mb-2">Control level</p>
        <div className="flex gap-1">
          {(["basic", "intermediate", "advanced"] as const).map(lvl => (
            <button key={lvl} onClick={() => onControlLevelChange(lvl)}
              className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                controlLevel === lvl ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Basic is recommended. Intermediate and Advanced expose extra controls that most users do not need.
        </p>
      </div>

      {/* Plan name */}
      <div>
        <label className="text-xs text-gray-500 mb-1 block">Plan Name</label>
        <input type="text" placeholder="e.g. Conservative Scanner Q1" value={draft.name}
          onChange={e => onFieldChange("name", e.target.value)}
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#FF4D00]" />
      </div>

      {/* Basic controls — always show */}
      <BasicControls draft={draft} onFieldChange={onFieldChange} toggleCategory={toggleCategory} />

      {/* Intermediate controls */}
      {(controlLevel === "intermediate" || controlLevel === "advanced") && (
        <MarketAutomationDetailControls
          draft={draft}
          level={controlLevel}
          onFieldChange={onFieldChange}
        />
      )}

      <MarketPlanInsights draft={draft} />

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button onClick={onSave} disabled={!draft.name.trim()}
          className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-sm font-bold transition disabled:opacity-40 text-gray-700">
          {editingId ? "Save changes" : "Save plan"}
        </button>
        <button onClick={onSaveAndApply} disabled={!draft.name.trim()}
          className="flex-1 bg-[#FF4D00] hover:bg-orange-600 py-2 rounded-lg text-sm font-bold transition disabled:opacity-40 text-white">
          ▶ {editingId ? "Save & start" : "Save & start robot"}
        </button>
        {editingId && (
          <button onClick={onReset}
            className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition text-gray-700">
            Cancel
          </button>
        )}
      </div>
      <p className="text-[11px] text-gray-400">
        "Save plan" stores your settings without starting. "Save & start" saves, turns the robot on, and runs a scan immediately.
      </p>
    </div>
  );
}

/* ── Basic Controls ─────────────────────────────────────────────── */
function BasicControls({ draft, onFieldChange, toggleCategory }: {
  draft: AutomationPlan;
  onFieldChange: <K extends keyof AutomationPlan>(key: K, value: AutomationPlan[K]) => void;
  toggleCategory: (cat: string) => void;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
              Total budget ($) <HelpTip content="The maximum capital this plan is allowed to use." />
          </label>
          <MarketNumericInput
            value={draft.budget}
            min={10}
            max={100000}
            fallback={200}
            onCommit={(value) => onFieldChange("budget", value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Mode <HelpTip content="Practice = no real money. Real = live trades." />
          </label>
          <div className="flex gap-1">
            {(["practice", "real"] as const).map(m => (
              <button key={m} onClick={() => onFieldChange("mode", m)}
                className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                  draft.mode === m ? (m === "practice" ? "bg-purple-600 text-white" : "bg-green-600 text-white") : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}>
                {m === "practice" ? "🧪 Practice" : "💵 Real"}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Risk Level <HelpTip content="Conservative = low risk/reward. Aggressive = high risk/reward." />
        </label>
        <div className="flex gap-1">
          {(["conservative", "balanced", "aggressive"] as const).map(r => (
            <button key={r} onClick={() => onFieldChange("riskLevel", r as RiskLevel)}
              className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${
                draft.riskLevel === r ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}>
              {r === "conservative" ? "Safe" : r === "balanced" ? "Balanced" : "Aggressive"}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Daily trade cap <HelpTip content="The most trades the robot can place in one day." />
          </label>
          <MarketNumericInput
            value={draft.maxTradesPerDay}
            min={1}
            max={5000}
            fallback={5}
            onCommit={(value) => onFieldChange("maxTradesPerDay", value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Stop after losing this much today ($) <HelpTip content="When losses hit this amount in one day, the robot should stop trading." />
          </label>
          <MarketNumericInput
            value={draft.maxDailyLoss}
            min={5}
            fallback={40}
            onCommit={(value) => onFieldChange("maxDailyLoss", value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Max positions at once <HelpTip content="The most open positions the robot can hold at one time." />
          </label>
          <MarketNumericInput
            value={draft.maxOpenPositions}
            min={1}
            max={5000}
            fallback={3}
            onCommit={(value) => onFieldChange("maxOpenPositions", value)}
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 flex items-center">
            Scan speed <HelpTip content="Controls how often the robot looks for opportunities. Faster modes create more activity and more noise." />
          </label>
          <select value={draft.scanMode} onChange={e => onFieldChange("scanMode", e.target.value as ScanMode)}
            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
            {(["slow", "balanced", "fast", "closing-soon"] as const).map(s => (
              <option key={s} value={s}>{s === "closing-soon" ? "Soon-ending only" : s.charAt(0).toUpperCase() + s.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-xs text-gray-500 mb-2 flex items-center">
          Categories <HelpTip content="Market categories this plan targets." />
        </label>
        <div className="flex flex-wrap gap-1">
          {FOCUS_AREAS.map(area => (
            <button key={area} onClick={() => toggleCategory(area)}
              className={`px-2 py-0.5 text-xs rounded-full transition ${
                draft.categories.includes(area) ? "bg-[#1E3A8A] text-blue-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"
              }`}>
              {area}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-2">
          Budget = total money the robot can use. Daily cap = max buys per day. Positions = how many open bets at once.
        </p>
      </div>
    </>
  );
}
```

## components/dashboard/market/MarketPlanList.tsx

```typescript
"use client";

import React, { useState } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import type { AutomationPlan } from "@/components/dashboard/market/types";

interface MarketPlanListProps {
  plans: AutomationPlan[];
  onEdit: (id: string) => void;
  onClone: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onArchive: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onApply: (plan: AutomationPlan) => void;
}

export default function MarketPlanList({
  plans, onEdit, onClone, onRename, onArchive, onSetDefault, onDelete, onApply,
}: MarketPlanListProps) {
  const activePlans = plans.filter(p => !p.isArchived);
  const archivedPlans = plans.filter(p => p.isArchived);
  const [showArchived, setShowArchived] = useState(false);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  const startRename = (p: AutomationPlan) => {
    setRenamingId(p.id);
    setRenameValue(p.name);
  };

  const commitRename = () => {
    if (renamingId && renameValue.trim()) {
      onRename(renamingId, renameValue.trim());
    }
    setRenamingId(null);
    setRenameValue("");
  };

  return (
    <div className="space-y-3">
      <h3 className="font-semibold text-gray-700">
        Saved Plans ({activePlans.length})
        {archivedPlans.length > 0 && (
          <button onClick={() => setShowArchived(v => !v)}
            className="ml-2 text-xs text-gray-400 font-normal hover:text-gray-600">
            {showArchived ? "Hide" : "Show"} archived ({archivedPlans.length})
          </button>
        )}
      </h3>

      {activePlans.length === 0 && (
        <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 text-center text-gray-400 text-sm">
          No saved plans yet. Create one using the builder.
        </div>
      )}

      {activePlans.map(plan => (
        <PlanCard key={plan.id} plan={plan}
          renamingId={renamingId} renameValue={renameValue}
          onRenameValueChange={setRenameValue} onStartRename={startRename}
          onCommitRename={commitRename}
          onEdit={onEdit} onClone={onClone} onArchive={onArchive}
          onSetDefault={onSetDefault} onDelete={onDelete} onApply={onApply} />
      ))}

      {showArchived && archivedPlans.map(plan => (
        <PlanCard key={plan.id} plan={plan} archived
          renamingId={renamingId} renameValue={renameValue}
          onRenameValueChange={setRenameValue} onStartRename={startRename}
          onCommitRename={commitRename}
          onEdit={onEdit} onClone={onClone} onArchive={onArchive}
          onSetDefault={onSetDefault} onDelete={onDelete} onApply={onApply} />
      ))}
    </div>
  );
}

function PlanCard({ plan, archived, renamingId, renameValue, onRenameValueChange, onStartRename, onCommitRename, onEdit, onClone, onArchive, onSetDefault, onDelete, onApply }: {
  plan: AutomationPlan;
  archived?: boolean;
  renamingId: string | null;
  renameValue: string;
  onRenameValueChange: (v: string) => void;
  onStartRename: (p: AutomationPlan) => void;
  onCommitRename: () => void;
  onEdit: (id: string) => void;
  onClone: (id: string) => void;
  onArchive: (id: string) => void;
  onSetDefault: (id: string) => void;
  onDelete: (id: string) => void;
  onApply: (plan: AutomationPlan) => void;
}) {
  const isRenaming = renamingId === plan.id;
  return (
    <div className={`bg-white border rounded-2xl shadow-sm p-4 ${archived ? "border-gray-200 opacity-60" : "border-gray-100"}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {isRenaming ? (
            <div className="flex gap-1">
              <input type="text" value={renameValue}
                onChange={e => onRenameValueChange(e.target.value)}
                onKeyDown={e => e.key === "Enter" && onCommitRename()}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-sm text-gray-900 outline-none focus:border-[#FF4D00]"
                autoFocus />
              <button onClick={onCommitRename} className="text-xs text-green-600 hover:text-green-800 px-1">✓</button>
            </div>
          ) : (
            <p className="text-sm font-semibold text-gray-900 truncate">{plan.name}</p>
          )}
          <p className="text-xs text-gray-400 mt-0.5">
            ${plan.budget} · {plan.riskLevel} · {plan.maxTradesPerDay}/day · {plan.scanMode} scan
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5">
            Loss cap ${plan.maxDailyLoss} · {plan.maxOpenPositions} positions · {plan.categories.join(", ")}
          </p>
        </div>
        <div className="flex gap-1 shrink-0">
          {plan.mode === "practice" && (
            <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">Practice</span>
          )}
          {plan.isDefault && (
            <span className="text-[10px] bg-orange-100 text-orange-700 border border-orange-200 px-1.5 py-0.5 rounded-full">Default</span>
          )}
          <StatusBadge status={plan.riskLevel} />
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onApply(plan)}
              className="bg-[#FF4D00] hover:bg-orange-600 text-white text-xs py-1.5 px-3 rounded-lg font-medium transition">
              ▶ Start this plan
            </button>
          </TooltipTrigger>
          <TooltipContent>Turn the robot on using this plan&apos;s settings.</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onEdit(plan.id)} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition">✏️</button>
          </TooltipTrigger>
          <TooltipContent>Edit plan</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onClone(plan.id)} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition">📋</button>
          </TooltipTrigger>
          <TooltipContent>Duplicate plan</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onStartRename(plan)} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition">✍️</button>
          </TooltipTrigger>
          <TooltipContent>Rename</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onSetDefault(plan.id)} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition">⭐</button>
          </TooltipTrigger>
          <TooltipContent>Set as default</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onArchive(plan.id)} className="px-2 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition">
              {archived ? "📤" : "📥"}
            </button>
          </TooltipTrigger>
          <TooltipContent>{archived ? "Unarchive" : "Archive"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <button onClick={() => onDelete(plan.id)} className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs rounded-lg transition">🗑</button>
          </TooltipTrigger>
          <TooltipContent>Delete plan</TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
```

## components/dashboard/market/MarketStartHereTab.tsx

```typescript
"use client";

import React, { useState } from "react";
import MarketSystemStatusCard from "@/components/dashboard/market/MarketSystemStatusCard";
import type { SchedulerHealthViewModel } from "@/lib/market/contracts";
import type { ServerBotStatus } from "@/lib/hooks/useMarketServerStatus";
import { useMarketSystemStatus } from "@/lib/hooks/useMarketSystemStatus";
import type { AutomationPlan } from "@/components/dashboard/market/types";

type Mode = "practice" | "real";

interface RecommendationPreset {
  id: string;
  emoji: string;
  title: string;
  why: string;
  budget: number;
  risk: "conservative" | "balanced" | "aggressive";
  categories: string[];
}

const QUICK_STARTS: RecommendationPreset[] = [
  {
    id: "micro-test",
    emoji: "🔬",
    title: "Micro test — $50 budget",
    why: "Learn the robot with minimal risk. Conservative, 2–3 trades/day, practice mode.",
    budget: 50,
    risk: "conservative",
    categories: ["General"],
  },
  {
    id: "beginner",
    emoji: "🛡️",
    title: "Beginner — $200 budget",
    why: "Balanced settings across popular categories. 5 trades/day max.",
    budget: 200,
    risk: "conservative",
    categories: ["General", "Politics", "Economy"],
  },
  {
    id: "hands-off",
    emoji: "🤖",
    title: "Hands-off — $500 budget",
    why: "Set it once, check in weekly. Balanced risk across 4 categories.",
    budget: 500,
    risk: "balanced",
    categories: ["General", "Economy", "Politics", "Crypto"],
  },
];

function presetToPlan(rec: RecommendationPreset, mode: Mode): AutomationPlan {
  const trades = rec.budget < 100 ? 3 : rec.budget < 300 ? 5 : 15;
  return {
    id: `rec-${rec.id}`,
    name: rec.title,
    budget: rec.budget,
    riskLevel: rec.risk,
    categories: rec.categories,
    scanMode: "balanced",
    maxTradesPerDay: trades,
    mode,
    maxDailyLoss: Math.round(rec.budget * 0.12),
    maxOpenPositions: trades,
    maxPctPerTrade: 15,
    feeAlertThreshold: 5,
    cooldownAfterLossStreak: 3,
    largeTraderSignals: false,
    closingSoonFocus: false,
    slippage: 2,
    minimumLiquidity: 5000,
    maximumSpread: 10,
    fillPolicy: "conservative",
    exitRules: "auto",
    isDefault: false,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

interface MarketStartHereTabProps {
  onNavigate: (tabId: string) => void;
  onApplyRecommendation: (plan: AutomationPlan) => void;
  onQuickStart?: () => void;
  onStopBot?: () => void;
  paperMode: boolean;
  serverStatus: ServerBotStatus;
  serverConfirmed: boolean;
  serverHealth: SchedulerHealthViewModel | null;
}

export default function MarketStartHereTab({
  onNavigate,
  onApplyRecommendation,
  onQuickStart,
  onStopBot,
  paperMode,
  serverStatus,
  serverConfirmed,
  serverHealth,
}: MarketStartHereTabProps) {
  const [explainerOpen, setExplainerOpen] = useState(false);
  const systemStatus = useMarketSystemStatus();

  const isActive = serverStatus === "running" || serverStatus === "paper";
  const isPaper = serverStatus === "paper" || (paperMode && isActive);
  const tradesToday = serverHealth?.tradesToday ?? 0;

  return (
    <div className="space-y-5">

      {/* ── Main status card ── */}
      <div className={`rounded-[28px] p-5 sm:p-6 transition-colors ${
        isActive
          ? "bg-[radial-gradient(ellipse_at_top_right,#ff6b1a22,transparent),linear-gradient(135deg,#0f172a,#1e293b)]"
          : "bg-white border border-gray-100 shadow-sm"
      }`}>
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div>
            {isActive ? (
              <>
                <div className="flex items-center gap-2 mb-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-semibold text-green-300">
                    Robot Active — {isPaper ? "Practice Mode" : "Live Trading"}
                  </span>
                </div>
                <p className="text-3xl font-black text-white">
                  {tradesToday} trade{tradesToday !== 1 ? "s" : ""} today
                </p>
                {serverHealth?.lastRunIso && (
                  <p className="text-xs text-white/50 mt-1.5">
                    Last scan: {new Date(serverHealth.lastRunIso).toLocaleTimeString()}
                  </p>
                )}
                {isPaper && (
                  <p className="text-xs text-purple-300 mt-2">
                    {"✓ No real money used — go to "}
                    <button onClick={() => onNavigate("live-wallet")} className="underline font-semibold">
                      Go Live
                    </button>
                    {" when ready"}
                  </p>
                )}
              </>
            ) : (
              <>
                <p className="text-base font-bold text-gray-800 mb-1">🤖 Robot is not running</p>
                <p className="text-sm text-gray-500 max-w-sm leading-relaxed">
                  Start in <strong>practice mode</strong> — the robot scans real Polymarket listings,
                  picks trades automatically, and logs results.{" "}
                  <strong>No real money required.</strong>
                </p>
              </>
            )}
          </div>

          <div className="shrink-0">
            {isActive ? (
              <button
                onClick={onStopBot}
                className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold transition"
              >
                ⏹ Stop Robot
              </button>
            ) : (
              <button
                onClick={onQuickStart}
                className="px-6 py-3 rounded-xl bg-[#FF4D00] hover:bg-[#e04400] text-white text-sm font-bold shadow-lg shadow-orange-500/30 transition"
              >
                ▶ Start Practice Trading
              </button>
            )}
          </div>
        </div>

        {serverHealth?.lastError && (
          <div className="mt-4 px-3 py-2 rounded-xl bg-red-500/20 border border-red-400/30 text-xs text-red-200">
            ⚠ {serverHealth.lastError.slice(0, 140)}
          </div>
        )}

        {!serverConfirmed && (
          <p className="mt-3 text-xs text-gray-400">Checking server status…</p>
        )}

        {serverConfirmed && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-xs text-white/70">
            <p>
              Server status: <span className="font-semibold text-white">{serverStatus}</span>
              {serverHealth?.nextEligibleRunIso ? ` · Next background run: ${new Date(serverHealth.nextEligibleRunIso).toLocaleTimeString()}` : ""}
            </p>
            <p className="mt-1 text-white/60">Best first verification loop: start in practice mode, run one scan, then confirm the banner and Results update.</p>
          </div>
        )}
      </div>

      <MarketSystemStatusCard
        system={systemStatus.system}
        loading={systemStatus.loading}
        error={systemStatus.error}
        title="Execution health"
      />

      {/* ── Stats row (once bot has run) ── */}
      {tradesToday > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Trades today", value: String(tradesToday) },
            { label: "Runs today", value: String(serverHealth?.runsToday ?? "—") },
            { label: "Mode", value: isPaper ? "Practice" : "Live", color: isPaper ? "text-purple-700" : "text-green-700" },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl bg-white border border-gray-100 shadow-sm p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">{stat.label}</p>
              <p className={`text-xl font-black mt-1 ${stat.color ?? "text-gray-900"}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick-start templates (only when bot is idle) ── */}
      {!isActive && (
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
            Or choose a template to start with
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUICK_STARTS.map(rec => (
              <button
                key={rec.id}
                onClick={() => onApplyRecommendation(presetToPlan(rec, "practice"))}
                className="p-4 rounded-2xl border border-gray-100 bg-white shadow-sm text-left hover:border-[#FF4D00]/40 hover:shadow-md transition"
              >
                <p className="text-2xl mb-2">{rec.emoji}</p>
                <p className="font-semibold text-gray-900 text-sm leading-snug">{rec.title}</p>
                <p className="text-[11px] text-gray-400 mt-1 mb-3 leading-relaxed">{rec.why}</p>
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                  Practice mode
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Navigation shortcuts ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { id: "direct-buy", emoji: "🔍", label: "Browse Markets" },
          { id: "automation", emoji: "⚙️", label: "Robot Settings" },
          { id: "results", emoji: "📈", label: "Trade History" },
          { id: "live-wallet", emoji: "⚡", label: "Go Live" },
        ].map(link => (
          <button
            key={link.id}
            onClick={() => onNavigate(link.id)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-gray-100 bg-white shadow-sm text-sm text-gray-700 hover:bg-orange-50 hover:border-orange-200 transition font-medium"
          >
            <span>{link.emoji}</span> {link.label}
          </button>
        ))}
      </div>

      {/* ── YES/NO explainer ── */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setExplainerOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <span>ℹ️ What is YES / NO betting on Polymarket?</span>
          <span className="text-gray-400 text-xs">{explainerOpen ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {explainerOpen && (
          <div className="px-4 pb-4 space-y-2 text-xs text-gray-600 border-t border-gray-100 pt-3">
            <p><strong>YES</strong> — you think an event will happen. Pays $1 per share if it resolves YES.</p>
            <p><strong>NO</strong> — you think it won&apos;t happen. Pays $1 per share if it resolves NO.</p>
            <p>Prices are in cents (0–99¢). A YES at 60¢ means roughly a 60% probability the event happens.</p>
            <p>Your <strong>max loss</strong> is always the amount you spend. Your <strong>max win</strong> = shares × $1.00.</p>
            <p className="text-gray-400">
              Example: 10 YES shares at 40¢ = $4 spent. Resolves YES → you receive $10 (profit: $6).
            </p>
            <button
              onClick={() => onNavigate("direct-buy")}
              className="mt-1 text-[#FF4D00] font-semibold underline text-xs"
            >
              Try browsing live markets →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
```

## components/dashboard/market/MarketTopOverview.tsx

```typescript
"use client";

import React from "react";
import type { BotConfig, MarketTrade } from "@/components/dashboard/market/types";

interface MarketTopOverviewProps {
  trades: MarketTrade[];
  botConfig: BotConfig;
  onOpenResults: () => void;
  onOpenAutomation: () => void;
}

export default function MarketTopOverview({ trades, botConfig, onOpenResults, onOpenAutomation }: MarketTopOverviewProps) {
  const openTrades = trades.filter((trade) => trade.status === "open" && !trade.closedAt);
  const openExposure = openTrades.reduce((sum, trade) => sum + trade.total, 0);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      <button onClick={onOpenResults} className="text-left bg-white border border-gray-100 rounded-2xl shadow-sm p-4 hover:border-[#FF4D00]/30 transition">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Open Positions</p>
        <div className="flex items-end justify-between mt-2 gap-3">
          <div>
            <p className="text-2xl font-black text-gray-900">{openTrades.length}</p>
            <p className="text-sm text-gray-500 mt-1">${openExposure.toFixed(2)} currently deployed</p>
          </div>
          <span className="text-sm font-semibold text-[#FF4D00]">View positions →</span>
        </div>
      </button>

      <button onClick={onOpenAutomation} className="text-left bg-white border border-gray-100 rounded-2xl shadow-sm p-4 hover:border-[#FF4D00]/30 transition">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Automation Programmed</p>
        <div className="flex items-end justify-between mt-2 gap-3">
          <div>
            <p className="text-2xl font-black text-gray-900">{botConfig.botRunning && !botConfig.botPaused ? "Running" : botConfig.botPaused ? "Paused" : "Idle"}</p>
            <p className="text-sm text-gray-500 mt-1">
              ${botConfig.capitalAlloc} budget · {botConfig.maxTradesPerDay}/day · {botConfig.maxPositions} max open
            </p>
          </div>
          <span className="text-sm font-semibold text-[#FF4D00]">Open automation →</span>
        </div>
      </button>
    </div>
  );
}
```

## components/dashboard/market/MarketDirectBuyTab.tsx

```typescript
"use client";

import React, { useState } from "react";
import MarketBuyPanel from "@/components/dashboard/market/MarketBuyPanel";
import MarketAdvancedFilters from "@/components/dashboard/market/MarketAdvancedFilters";
import MarketDirectBuyResults from "@/components/dashboard/market/MarketDirectBuyResults";
import MarketListingDetailDrawer from "@/components/dashboard/market/MarketListingDetailDrawer";
import MarketQuickSearchPills from "@/components/dashboard/market/MarketQuickSearchPills";
import { useMarketDirectBuyState } from "@/lib/hooks/useMarketDirectBuyState";
import { useMarketSystemStatus } from "@/lib/hooks/useMarketSystemStatus";
import { useMarketWatchlist } from "@/lib/hooks/useMarketWatchlist";
import type { MarketListing, MktTimeframe, LiveChecklist } from "@/components/dashboard/market/types";

interface MarketDirectBuyTabProps {
  paperMode: boolean;
  walletAddress?: `0x${string}`;
  liveChecklist: LiveChecklist;
  onTradePlaced?: () => void | Promise<void>;
  onOpenAutomation?: () => void;
}

const QUICK_TIMEFRAMES: { key: MktTimeframe; label: string }[] = [
  { key: "hour", label: "Next hour" },
  { key: "day", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
  { key: "year", label: "This year" },
  { key: "all", label: "Any time" },
];

const fmt = (v: number) => `$${v.toFixed(2)}`;

export default function MarketDirectBuyTab({ paperMode, walletAddress, liveChecklist, onTradePlaced, onOpenAutomation }: MarketDirectBuyTabProps) {
  const s = useMarketDirectBuyState({ paperMode, walletAddress, liveChecklist, onTradePlaced });
  const systemStatus = useMarketSystemStatus();
  const watchlist = useMarketWatchlist();
  const [detailMarket, setDetailMarket] = useState<MarketListing | null>(null);

  const applyPreset = (presetId: string) => {
    s.clearFilters();
    if (presetId === "weather-hour") {
      s.setQuery("weather"); s.setTimeframe("hour"); s.setSortBy("endDate");
    } else if (presetId === "bitcoin-month") {
      s.setQuery("bitcoin"); s.setTimeframe("month"); s.setSortBy("volume");
    } else if (presetId === "election-week") {
      s.setQuery("election"); s.setTimeframe("week"); s.setSortBy("volume");
    } else if (presetId === "closing-soon") {
      s.setTimeframe("day"); s.setSortBy("endDate"); s.setMinVolume(5000);
    } else if (presetId === "high-liquidity") {
      s.setSortBy("volume"); s.setMinVolume(50000); s.setMinLiquidity(50000);
    } else if (presetId === "moonshots") {
      s.setTimeframe("month"); s.setSortBy("edge"); s.setProbMin(5); s.setProbMax(35); s.setMinVolume(1000);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="overflow-hidden rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(255,124,32,0.12),transparent_25%),linear-gradient(135deg,#ffffff,#f4f7fb)] p-5 shadow-sm">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">Manual trading workspace</p>
          <h2 className="mt-2 text-3xl font-black text-slate-900">Browse prediction markets</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Search events, filter by topic and time, then open a market to review pricing and place a trade.</p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-500">
          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1 font-semibold text-slate-700">Mode: {paperMode ? "Practice by default" : "Live-ready by default"}</span>
          <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1">{s.fetchModeLabel}</span>
          {systemStatus.system && <span className="rounded-full border border-slate-200 bg-white/80 px-3 py-1">Open-position cap: {systemStatus.system.effectiveMaxOpenPositions}</span>}
          {s.buyMarket && <span className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 font-semibold text-orange-700">Trade ticket open</span>}
        </div>
        {systemStatus.system && onOpenAutomation && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>Your manual buys now use the same open-position cap as your saved plan.</span>
            <button
              onClick={onOpenAutomation}
              className="rounded-full border border-orange-200 bg-orange-50 px-3 py-1 font-semibold text-orange-700 hover:bg-orange-100 transition"
            >
              Adjust cap in Automation
            </button>
          </div>
        )}
        <div className="mt-4">
          <MarketQuickSearchPills onApplyPreset={applyPreset} />
        </div>
      </div>

      {/* Buy panel */}
      {s.buyMarket && (
        <MarketBuyPanel
          market={s.buyMarket}
          outcome={s.buyOutcome}
          amount={s.buyAmount}
          takeProfitPct={20}
          stopLossPct={10}
          paper={s.buyPaper}
          submitting={s.buySubmitting}
          success={s.buySuccess}
          liveChecklist={liveChecklist}
          payloadReady={s.buyPayloadReady}
          payloadIssues={s.buyPayloadIssues}
          showTpSlControls={false}
          formatMoney={fmt}
          onOutcomeChange={s.setBuyOutcome}
          onAmountChange={s.setBuyAmount}
          onTakeProfitChange={() => { /* managed by automation tab */ }}
          onStopLossChange={() => { /* managed by automation tab */ }}
          onPaperToggle={() => s.setBuyPaper(!s.buyPaper)}
          onSubmit={s.handleBuy}
          onClose={s.closeBuyPanel}
        />
      )}

      {/* Search toolbar */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={s.query}
            onChange={e => s.setQuery(e.target.value)}
            placeholder="Search events (example: election, bitcoin, weather)"
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
          />
          <button
            onClick={() => s.fetchMarkets()}
            disabled={s.loading}
            className="px-4 py-2 bg-[#FF4D00] text-white rounded-lg text-sm font-semibold hover:bg-[#e04400] disabled:opacity-50 transition"
          >
            {s.loading ? "…" : s.loaded ? "Refresh" : "Search"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <label className="text-xs text-gray-600">
            Time range
            <select
              value={s.timeframe}
              onChange={(e) => s.setTimeframe(e.target.value as MktTimeframe)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
            >
              {QUICK_TIMEFRAMES.map((tf) => (
                <option key={tf.key} value={tf.key}>{tf.label}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Topic
            <select
              value={s.category}
              onChange={(e) => s.setCategory(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
            >
              <option value="all">All topics</option>
              {s.availableCategories.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </label>
          <label className="text-xs text-gray-600">
            Sort results by
            <select
              value={s.sortBy}
              onChange={(e) => s.setSortBy(e.target.value as typeof s.sortBy)}
              className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
            >
              <option value="edge">Best value</option>
              <option value="volume">Most active</option>
              <option value="probability">Most likely</option>
              <option value="endDate">Ending soon</option>
              <option value="title">Name A-Z</option>
            </select>
          </label>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => s.setFiltersOpen(!s.filtersOpen)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            {s.filtersOpen ? "Hide extra filters" : "Show extra filters"}
          </button>
          <button
            onClick={s.clearFilters}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition"
          >
            Reset filters
          </button>
        </div>

        {/* Advanced filters */}
        {s.filtersOpen && (
          <MarketAdvancedFilters
            minEdge={s.minEdge}
            onMinEdgeChange={s.setMinEdge}
            probMin={s.probMin}
            onProbMinChange={s.setProbMin}
            probMax={s.probMax}
            onProbMaxChange={s.setProbMax}
            sortBy={s.sortBy}
            onSortByChange={s.setSortBy}
            category={s.category}
            onCategoryChange={s.setCategory}
            availableCategories={s.availableCategories}
            riskTag={s.riskTag}
            onRiskTagChange={s.setRiskTag}
            minVolume={s.minVolume}
            onMinVolumeChange={s.setMinVolume}
            minLiquidity={s.minLiquidity}
            onMinLiquidityChange={s.setMinLiquidity}
            maxSpread={s.maxSpread}
            onMaxSpreadChange={s.setMaxSpread}
          />
        )}
      </div>

      {/* Empty / loading states */}
      {!s.loaded && !s.loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[#FF4D00] border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Loading markets…</p>
        </div>
      )}

      {s.loading && (
        <div className="text-center py-12">
          <div className="animate-spin w-6 h-6 border-2 border-[#FF4D00] border-t-transparent rounded-full mx-auto" />
          <p className="text-xs text-gray-400 mt-2">Loading markets…</p>
        </div>
      )}

      {/* Results */}
      {s.loaded && !s.loading && (
        <>
          {s.loadError && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              {s.loadError}
            </div>
          )}
          <div className="flex items-center justify-between text-xs text-gray-500 px-1">
            <span>
              {s.filteredCount} market{s.filteredCount !== 1 ? "s" : ""}
              {s.filteredCount > 0 && " · showing all matches"}
            </span>
            <span>{s.fetchModeLabel}</span>
          </div>

          <MarketDirectBuyResults
            markets={s.filteredMarkets}
            sortBy={s.sortBy}
            sortDirection={s.sortDirection}
            tableInsights={s.tableInsights}
            onToggleSort={s.toggleSort}
            savedMarketIds={watchlist.items.map((item) => item.marketId)}
            onToggleSave={(market) => void watchlist.toggleSave(market)}
            onBuy={s.openBuyPanel}
            onOpenDetails={setDetailMarket}
          />
        </>
      )}

      <MarketListingDetailDrawer
        market={detailMarket}
        isSaved={detailMarket ? watchlist.isSaved(detailMarket.id) : false}
        onClose={() => setDetailMarket(null)}
        onToggleSave={(market) => void watchlist.toggleSave(market)}
        onBuy={(market, outcome) => {
          setDetailMarket(null);
          s.openBuyPanel(market, outcome);
        }}
      />
    </div>
  );
}
```

## components/dashboard/market/MarketResultsTab.tsx

```typescript
"use client";

import React from "react";
import MarketActivityFeed from "@/components/dashboard/market/MarketActivityFeed";
import MarketOpenPositionsPanel from "@/components/dashboard/market/MarketOpenPositionsPanel";
import MarketResultsInsights from "@/components/dashboard/market/MarketResultsInsights";
import MarketTradeReplayDrawer from "@/components/dashboard/market/MarketTradeReplayDrawer";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import { useMarketResultsState } from "@/lib/hooks/useMarketResultsState";
import { outcomePlainLabel, tradeModeLabel } from "@/lib/market/market-display";
import type { MarketTrade, MarketActivityLogEntry } from "@/components/dashboard/market/types";

interface MarketResultsTabProps {
  trades: MarketTrade[];
  activityLogs: MarketActivityLogEntry[];
  onRefresh: () => Promise<void>;
}

function formatDuration(ms: number): string {
  if (ms <= 0) return "—";
  const mins = Math.round(ms / 60_000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.round(hrs / 24)}d`;
}

function PnlValue({ value, prefix = "" }: { value: number; prefix?: string }) {
  const color = value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : "text-gray-600";
  return <span className={`font-bold ${color}`}>{prefix}{value >= 0 ? "+" : ""}${value.toFixed(2)}</span>;
}

function StatCard({ label, children, tip }: { label: string; children: React.ReactNode; tip?: string }) {
  return (
    <div className="rounded-[24px] border border-slate-200 bg-white/90 p-4 text-center shadow-sm">
      <p className="text-[11px] text-slate-400 uppercase tracking-[0.18em] mb-1 flex items-center justify-center gap-0.5">
        {label}{tip && <HelpTip content={tip} />}
      </p>
      <div className="text-lg">{children}</div>
    </div>
  );
}

export default function MarketResultsTab({ trades, activityLogs, onRefresh }: MarketResultsTabProps) {
  const openPositions = trades.filter((trade) => trade.status === "open" && !trade.closedAt);
  const [showAdvanced, setShowAdvanced] = React.useState(false);
  const {
    analytics, sortedTrades, sortKey, sortDir, filterMode,
    setSortKey, toggleSortDir, setFilterMode,
    selectedReplay, openReplay, closeReplay, recentLogs,
  } = useMarketResultsState(trades, activityLogs);

  const { realizedPnl, unrealizedPnl, feeAdjustedPnl, expectancy, profitFactor, winRate, avgHoldTimeMs, totalTrades, openTrades, closedTrades, pnlByCategory, paperVsLive } = analytics;

  return (
    <div className="space-y-5">
      <div className="rounded-[32px] border border-slate-200 bg-[radial-gradient(circle_at_top_left,rgba(255,124,32,0.12),transparent_26%),linear-gradient(135deg,rgba(255,255,255,0.96),rgba(244,247,251,0.96))] p-5 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">Trade History</p>
        <h2 className="mt-2 text-3xl font-black text-slate-900">How your trades are performing</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Open positions stay here until the market resolves. Click any trade to see full details.</p>
      </div>

      {/* Key stats — 3 essential cards */}
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Total Profit / Loss" tip="How much you've made or lost from closed trades"><PnlValue value={realizedPnl} /></StatCard>
        <StatCard label="Win Rate" tip="Percentage of trades that were profitable"><span className="font-bold text-gray-900">{winRate}%</span></StatCard>
        <StatCard label="Trades"><span className="font-bold text-gray-900">{totalTrades} <span className="text-sm font-normal text-gray-400">({openTrades} open)</span></span></StatCard>
      </div>

      <MarketResultsInsights analytics={analytics} />

      {/* Expandable advanced metrics */}
      <button
        onClick={() => setShowAdvanced(v => !v)}
        className="text-xs font-medium text-gray-500 hover:text-gray-700 transition"
      >
        {showAdvanced ? "▲ Hide detailed stats" : "▼ Show detailed stats"}
      </button>
      {showAdvanced && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <StatCard label="Open P/L" tip="Current profit/loss on positions not yet resolved"><PnlValue value={unrealizedPnl} /></StatCard>
            <StatCard label="After Fees" tip="Total profit/loss minus estimated 2% trading fees"><PnlValue value={feeAdjustedPnl} /></StatCard>
            <StatCard label="Avg per Trade" tip="Average profit/loss per trade"><PnlValue value={expectancy} /></StatCard>
            <StatCard label="Win/Loss Ratio" tip="Total winnings divided by total losses — above 1.0 means profitable overall">
              <span className={`font-bold ${profitFactor >= 1 ? "text-green-600" : "text-red-600"}`}>{profitFactor >= 999 ? "∞" : profitFactor.toFixed(2)}</span>
            </StatCard>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Closed"><span className="font-bold text-gray-700">{closedTrades}</span></StatCard>
            <StatCard label="Avg Hold Time"><span className="font-bold text-gray-900">{formatDuration(avgHoldTimeMs)}</span></StatCard>
          </div>

          {/* P/L by Category + Practice vs Live */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Profit/Loss by Topic</h3>
              {pnlByCategory.length === 0
                ? <p className="text-sm text-gray-400 py-4 text-center">No trades yet</p>
                : (
                  <div className="space-y-2">
                    {pnlByCategory.map((c) => (
                      <div key={c.category} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{c.category} <span className="text-gray-400">({c.count})</span></span>
                        <PnlValue value={c.pnl} />
                      </div>
                    ))}
                  </div>
                )}
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">Practice vs Live</h3>
              <div className="space-y-3">
                {paperVsLive.map((row) => (
                  <div key={row.mode} className="flex items-center justify-between text-sm">
                    <div>
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${row.mode === "paper" ? "bg-purple-500" : "bg-green-500"}`} />
                      <span className="text-gray-700 capitalize">{row.mode === "paper" ? "Practice" : "Live"}</span>
                      <span className="text-gray-400 ml-1">({row.count} trades, {row.winRate.toFixed(1)}% win)</span>
                    </div>
                    <PnlValue value={row.pnl} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      <MarketOpenPositionsPanel trades={openPositions} onOpenTrade={openReplay} />

      <div className="flex justify-end">
        <button
          onClick={() => { void onRefresh(); }}
          className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          Refresh results
        </button>
      </div>

      {/* Trade list */}
      <div className="rounded-[28px] border border-slate-200 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <h3 className="text-lg font-black text-slate-900">Trade history</h3>
          <div className="flex items-center gap-2">
            {(["all", "paper", "live"] as const).map((m) => (
              <button key={m} onClick={() => setFilterMode(m)}
                className={`px-3 py-1 text-xs rounded-full font-medium transition ${filterMode === m ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {m === "all" ? "All" : m === "paper" ? "Practice" : "Live"}
              </button>
            ))}
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
              className="text-xs bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 text-gray-700 outline-none">
              <option value="date">Sort: Date</option>
              <option value="pnl">Sort: P/L</option>
              <option value="category">Sort: Category</option>
            </select>
            <button onClick={toggleSortDir} className="text-xs text-gray-500 hover:text-gray-700 px-1">
              {sortDir === "desc" ? "↓" : "↑"}
            </button>
          </div>
        </div>

        {sortedTrades.length === 0
          ? <p className="text-sm text-gray-400 py-8 text-center">No trades match current filters</p>
          : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {sortedTrades.slice(0, 50).map((t) => (
                <button key={t.id} onClick={() => openReplay(t)}
                  className="w-full text-left rounded-[24px] border border-slate-200 bg-[linear-gradient(135deg,rgba(255,255,255,0.94),rgba(246,248,251,0.94))] px-4 py-4 flex items-center justify-between gap-3 transition hover:border-[#FF4D00]/30 hover:shadow-sm">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-slate-800 font-semibold truncate">{t.marketTitle}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      {outcomePlainLabel(t.outcome)} · {t.shares} shares @ ${t.avgPrice.toFixed(3)} · {t.category ?? "—"}
                      <span className="ml-1 text-slate-500">· {tradeModeLabel(t)}</span>
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <PnlValue value={t.pnl ?? 0} />
                    <p className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
      </div>

      <MarketActivityFeed logs={recentLogs} title="Robot activity and execution log" emptyLabel="No scans, plan syncs, or trade events are visible yet." />

      {/* Trade replay drawer */}
      {selectedReplay && <MarketTradeReplayDrawer replay={selectedReplay} onClose={closeReplay} />}
    </div>
  );
}
```

## app/api/market/plans/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withMarketAuth } from "@/lib/server/api-auth";
import type { AutomationPlan } from "@/components/dashboard/market/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostgrestError } from "@supabase/supabase-js";

type PlanRow = {
  id: string;
  name: string;
  mode: "practice" | "real";
  budget: number;
  risk_level: AutomationPlan["riskLevel"];
  categories: string[];
  scan_mode: AutomationPlan["scanMode"];
  max_trades_per_day: number;
  max_daily_loss: number;
  max_open_positions: number;
  max_pct_per_trade: number;
  fee_alert_threshold: number;
  cooldown_after_loss_streak: number;
  large_trader_signals: boolean;
  closing_soon_focus: boolean;
  slippage: number;
  minimum_liquidity: number;
  maximum_spread: number;
  fill_policy: AutomationPlan["fillPolicy"];
  exit_rules: AutomationPlan["exitRules"];
  runtime_config: Record<string, unknown> | null;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

function toPlan(row: PlanRow): AutomationPlan {
  return {
    id: row.id,
    name: row.name,
    budget: row.budget,
    riskLevel: row.risk_level,
    categories: row.categories ?? ["General"],
    scanMode: row.scan_mode,
    maxTradesPerDay: row.max_trades_per_day,
    mode: row.mode,
    maxDailyLoss: row.max_daily_loss,
    maxOpenPositions: row.max_open_positions,
    maxPctPerTrade: row.max_pct_per_trade,
    feeAlertThreshold: row.fee_alert_threshold,
    cooldownAfterLossStreak: row.cooldown_after_loss_streak,
    largeTraderSignals: row.large_trader_signals,
    closingSoonFocus: row.closing_soon_focus,
    slippage: row.slippage,
    minimumLiquidity: row.minimum_liquidity,
    maximumSpread: row.maximum_spread,
    fillPolicy: row.fill_policy,
    exitRules: row.exit_rules,
    isDefault: row.is_default,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(plan: AutomationPlan, userId: string) {
  return {
    id: plan.id,
    user_id: userId,
    name: plan.name,
    mode: plan.mode,
    budget: plan.budget,
    risk_level: plan.riskLevel,
    categories: plan.categories,
    scan_mode: plan.scanMode,
    max_trades_per_day: plan.maxTradesPerDay,
    max_daily_loss: plan.maxDailyLoss,
    max_open_positions: plan.maxOpenPositions,
    max_pct_per_trade: plan.maxPctPerTrade,
    fee_alert_threshold: plan.feeAlertThreshold,
    cooldown_after_loss_streak: plan.cooldownAfterLossStreak,
    large_trader_signals: plan.largeTraderSignals,
    closing_soon_focus: plan.closingSoonFocus,
    slippage: plan.slippage,
    minimum_liquidity: plan.minimumLiquidity,
    maximum_spread: plan.maximumSpread,
    fill_policy: plan.fillPolicy,
    exit_rules: plan.exitRules,
    runtime_config: {},
    is_default: plan.isDefault,
    is_archived: plan.isArchived,
  };
}

function isMissingPlansSchema(error: PostgrestError | null) {
  return error?.code === "42P01" || error?.code === "PGRST205" || error?.message?.includes("market_plans") === true;
}

async function unsetOtherDefaults(admin: ReturnType<typeof createAdminClient>, userId: string, excludeId?: string) {
  let query = admin.from("market_plans").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
  if (excludeId) query = query.neq("id", excludeId);
  await query;
}

export const GET = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const { data, error } = await admin
      .from("market_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (isMissingPlansSchema(error)) return NextResponse.json({ plans: [], degraded: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plans: (data ?? []).map((row) => toPlan(row as PlanRow)) });
  });

export const POST = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const body = await req.json() as AutomationPlan;
    if (!body.name?.trim()) return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    if (body.isDefault) await unsetOtherDefaults(admin, user.id);

    const { data, error } = await admin
      .from("market_plans")
      .insert(toRow(body, user.id))
      .select("*")
      .single();

    if (isMissingPlansSchema(error)) return NextResponse.json({ plan: body, degraded: true }, { status: 201 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: toPlan(data as PlanRow) }, { status: 201 });
  });

export const PATCH = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const body = await req.json() as AutomationPlan;
    if (!body.id) return NextResponse.json({ error: "Plan id is required" }, { status: 400 });
    if (!body.name?.trim()) return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    if (body.isDefault) await unsetOtherDefaults(admin, user.id, body.id);

    const { data, error } = await admin
      .from("market_plans")
      .update(toRow(body, user.id))
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (isMissingPlansSchema(error)) return NextResponse.json({ plan: body, degraded: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: toPlan(data as PlanRow) });
  });

export const DELETE = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Plan id is required" }, { status: 400 });

    const { error } = await admin.from("market_plans").delete().eq("id", id).eq("user_id", user.id);
    if (isMissingPlansSchema(error)) return NextResponse.json({ ok: true, degraded: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  });
```

## app/api/market/buy/route.ts

```typescript
import { NextRequest, NextResponse } from "next/server";
import { withMarketAuth } from "@/lib/server/api-auth";
import { getClobOrderId, submitClobOrder } from "@/lib/market/clob-api";
import {
  validateTradeInput,
  calculatePositionSize,
  checkSafetyConstraints,
} from "@/lib/market/execution-policy";
import {
  getUnsupportedMarketTradeColumn,
  insertMarketTradesWithFallback,
  updateMarketTradeWithFallback,
} from "@/lib/market/trade-persistence";
import { resolveUserMaxOpenPositions } from "@/lib/market/user-position-limit";

const EVM_ADDRESS_REGEX = /^0x[a-fA-F0-9]{40}$/;
const CLOB_ORDER_PATH = process.env.POLYMARKET_CLOB_ORDER_PATH ?? "/order";
const CLOB_ORDER_TYPE = process.env.POLYMARKET_CLOB_ORDER_TYPE ?? "GTC";
const CLOB_FEE_RATE_BPS = process.env.POLYMARKET_CLOB_FEE_RATE_BPS ?? "200";
const DEFAULT_MAX_OPEN_POSITIONS = 25;

function makeOrderNonce(): string {
  const micros = BigInt(Date.now()) * BigInt(1000);
  const entropy = BigInt(Math.floor(Math.random() * 1_000_000));
  return (micros + entropy).toString();
}

export const POST = (req: NextRequest) =>
  withMarketAuth(req, async ({ user, admin }) => {
    const body = await req.json();
    const {
      market_id,
      market_title,
      outcome,
      amount,
      avg_price,
      category,
      probability,
      paper_mode = true,
      wallet_address,
      token_id,
      take_profit_pct,
      stop_loss_pct,
      idempotency_key,
    } = body;

    let supportsIdempotencyLookup = true;

    if (idempotency_key) {
      const { data: existingTrade, error: existingTradeError } = await admin
        .from("market_trades")
        .select()
        .eq("user_id", user.id)
        .eq("idempotency_key", idempotency_key)
        .maybeSingle();

      const missingIdempotencyColumn = getUnsupportedMarketTradeColumn(existingTradeError);

      if (missingIdempotencyColumn === "idempotency_key") {
        supportsIdempotencyLookup = false;
      }

      if (existingTradeError && supportsIdempotencyLookup) {
        return NextResponse.json({ error: existingTradeError.message }, { status: 500 });
      }

      if (supportsIdempotencyLookup && existingTrade) {
        return NextResponse.json({
          success: true,
          mode: "idempotent_recovery",
          trade: existingTrade,
          summary: `Recovered existing trade order.`,
        });
      }
    }

    const missingFields: string[] = [];

    if (!market_id || String(market_id).trim().length === 0) missingFields.push("market_id");
    if (!market_title || String(market_title).trim().length === 0) missingFields.push("market_title");
    if (!outcome) missingFields.push("outcome");
    if (typeof amount !== "number" || !Number.isFinite(amount)) missingFields.push("amount");
    if (typeof avg_price !== "number" || !Number.isFinite(avg_price)) missingFields.push("avg_price");

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: "Missing or invalid required fields", missingFields },
        { status: 400 }
      );
    }

    // Unified trade validation (shared with scan route)
    const validationError = validateTradeInput({ amount, avgPrice: avg_price, outcome });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    // Unified position sizing (shared with scan route)
    const { shares, maxPayout } = calculatePositionSize({
      amount,
      avgPrice: avg_price,
      maxPctPerTrade: null, // Direct buy: no portfolio cap override by default
      capitalAlloc: amount,
    });

    // Unified safety constraints (shared with scan route)
    const fallbackMaxOpenPositions = Number(process.env.MARKET_MAX_OPEN_POSITIONS) || DEFAULT_MAX_OPEN_POSITIONS;
    const { maxOpenPositions, source: limitSource } = await resolveUserMaxOpenPositions({
      supabase: admin,
      user,
      fallback: fallbackMaxOpenPositions,
    });
    const safetyCheck = await checkSafetyConstraints({
      userId: user.id,
      supabase: admin,
      maxOpenPositions,
    });

    if (!safetyCheck.allowed) {
      return NextResponse.json(
        {
          error: safetyCheck.reason,
          openPositions: safetyCheck.openPositionsCount,
          limit: maxOpenPositions,
          limitSource,
          help: "Raise 'Max positions at once' in Automation, save the plan, and start the robot again so manual and automated execution use the same cap.",
        },
        { status: 400 }
      );
    }

    if (paper_mode) {
      const { data: trade, error } = await insertMarketTradesWithFallback(
        admin,
        {
          user_id: user.id, idempotency_key: idempotency_key ?? null,
          market_id, question: market_title, side: outcome,
          shares, price: avg_price, total: amount,
          status: "open", pnl: 0, paper_trade: true,
          take_profit_pct: typeof take_profit_pct === "number" ? take_profit_pct : null,
          stop_loss_pct: typeof stop_loss_pct === "number" ? stop_loss_pct : null,
          entry_mode: "direct_buy",
          reason: `Direct buy via Markets Explorer — ${category ?? "General"}, prob ${probability ?? "?"}%`,
        },
        { single: true },
      );

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        success: true, mode: "paper", trade,
        summary: `Paper trade saved: ${shares.toFixed(1)} ${outcome} shares @ $${avg_price.toFixed(3)}`,
      });
    }

    if (!wallet_address || !EVM_ADDRESS_REGEX.test(wallet_address)) {
      return NextResponse.json({ error: "Valid wallet_address required for live trades" }, { status: 400 });
    }

    const clob_host = process.env.POLYMARKET_CLOB_HOST ?? "https://clob.polymarket.com";
    const api_key = process.env.POLYMARKET_API_KEY;
    const api_secret = process.env.POLYMARKET_API_SECRET;
    const api_passphrase = process.env.POLYMARKET_API_PASSPHRASE;

    if (!api_key || !api_secret || !api_passphrase || !token_id) {
      const reason = !token_id ? "Missing token_id" : "CLOB API unconfigured";
      const { data: trade, error } = await insertMarketTradesWithFallback(
        admin,
        {
          user_id: user.id, idempotency_key: idempotency_key ?? null,
          market_id, question: market_title, side: outcome,
          shares, price: avg_price, total: amount, status: "open",
          pnl: 0, paper_trade: true, token_id: token_id ?? null,
          take_profit_pct: typeof take_profit_pct === "number" ? take_profit_pct : null,
          stop_loss_pct: typeof stop_loss_pct === "number" ? stop_loss_pct : null,
          entry_mode: "live_fallback", reason: `Saved as paper — ${reason}`,
        },
        { single: true },
      );
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({
        success: true, mode: "paper_fallback", trade,
        warning: reason,
      });
    }

    // 1. Create Pending state in DB BEFORE hitting CLOB to prevent silent timeouts charging users
    const { data: pendingTrade, error: pendingError } = await insertMarketTradesWithFallback<{
      id: string;
    }>(
      admin,
      {
        user_id: user.id, idempotency_key: idempotency_key ?? null,
        market_id, question: market_title, side: outcome,
        shares, price: avg_price, total: amount, status: "pending",
        pnl: 0, paper_trade: false, token_id,
        take_profit_pct: typeof take_profit_pct === "number" ? take_profit_pct : null,
        stop_loss_pct: typeof stop_loss_pct === "number" ? stop_loss_pct : null,
        entry_mode: "live", reason: `Live CLOB trade initiating...`,
      },
      { single: true },
    );

    if (pendingError) {
      return NextResponse.json({ error: "Failed to initialize trade state in DB" }, { status: 500 });
    }
    if (!pendingTrade) {
      return NextResponse.json({ error: "Trade state was not returned from DB" }, { status: 500 });
    }

    try {
      // 2. Submit to CLOB
      const { clobRes, clobData } = await submitClobOrder({
        clob_host, api_key, api_secret, api_passphrase, wallet_address, token_id, outcome, shares, avg_price,
        CLOB_ORDER_TYPE, CLOB_FEE_RATE_BPS, CLOB_ORDER_PATH, nonce: makeOrderNonce()
      });

      if (!clobRes.ok) {
        // Update DB to failed
        const { data: failedTrade } = await updateMarketTradeWithFallback(
          admin,
          pendingTrade.id,
          {
            status: "open", paper_trade: true, entry_mode: "clob_reject_fallback",
            reason: `CLOB rejected (${clobRes.status}): ${JSON.stringify(clobData)}`,
          },
          { single: true },
        );
        
        return NextResponse.json({
          success: false, mode: "clob_error", clob_status: clobRes.status,
          clob_response: clobData, trade: failedTrade,
        }, { status: 422 });
      }

      // 3. Mark DB Trade as Open + Live
      const clobOrderId = getClobOrderId(clobData);
      if (!clobOrderId) {
        const { data: failedTrade } = await updateMarketTradeWithFallback(
          admin,
          pendingTrade.id,
          {
            status: "open", paper_trade: true, entry_mode: "clob_invalid_success_fallback",
            reason: `CLOB response missing order id: ${JSON.stringify(clobData)}`,
          },
          { single: true },
        );

        return NextResponse.json({
          success: false,
          mode: "clob_invalid_success",
          error: "CLOB returned success without an order id",
          clob_response: clobData,
          trade: failedTrade,
        }, { status: 502 });
      }

      const { data: finalTrade } = await updateMarketTradeWithFallback(
        admin,
        pendingTrade.id,
        {
          status: "open",
          clob_order_id: clobOrderId,
          reason: `Live CLOB order ${clobOrderId}`,
        },
        { single: true },
      );

      return NextResponse.json({
        success: true, mode: "live", trade: finalTrade, clob_order_id: clobOrderId,
        summary: `Live order placed: ${shares.toFixed(1)} ${outcome} @ $${avg_price.toFixed(3)}`,
      });
    } catch (clobErr) {
      console.error("[api/market/buy] CLOB submission error:", clobErr);
      const { data: fallbackTrade } = await updateMarketTradeWithFallback(
        admin,
        pendingTrade.id,
        {
          status: "open", paper_trade: true, entry_mode: "clob_network_fallback",
          reason: `CLOB network error — saved as paper fallback: ${(clobErr as Error).message}`,
        },
        { single: true },
      );
      
      return NextResponse.json({
        success: false, mode: "clob_network_error", error: (clobErr as Error).message, trade: fallbackTrade
      }, { status: 502 });
    }
  });

export async function GET() {
  return NextResponse.json({ info: "POST to this endpoint to execute a market buy." });
}
```

## app/api/market/trades/route.ts

```typescript
/**
 * GET  /api/market/trades  — fetch trade history
 * POST /api/market/trades  — save a direct buy (paper or live)
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import type { ApiEnvelope, TradeViewModel } from "@/lib/market/contracts";
import { toNumberOrNull, toNumberOrZero } from "@/lib/market/contracts";
import { mapTradeRowToTradeVM } from "@/lib/market/mappers";
import { insertMarketTradesWithFallback } from "@/lib/market/trade-persistence";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const TRADE_COLUMNS = [
  "id",
  "user_id",
  "market_id",
  "question",
  "side",
  "shares",
  "price",
  "total",
  "status",
  "pnl",
  "paper_trade",
  "reason",
  "created_at",
  "closed_at",
].join(",");

function noStoreJson<T>(body: ApiEnvelope<T>, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET(req: NextRequest) {
  try {
    const access = await resolveServerOrgContext();
    if (!access.user) {
      return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
    }
    if (!access.canAccessMarket) {
      return noStoreJson({ ok: false, error: { code: "forbidden", message: "Market access required" } }, { status: 403 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
    }

    const url = new URL(req.url);
    const limitRaw = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offsetRaw = parseInt(url.searchParams.get("offset") ?? "0", 10);
    const limit = Number.isFinite(limitRaw) ? Math.min(Math.max(limitRaw, 1), 200) : 50;
    const offset = Number.isFinite(offsetRaw) ? Math.max(offsetRaw, 0) : 0;

    const { data: trades, error } = await supabase
      .from("market_trades")
      .select(TRADE_COLUMNS)
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      return noStoreJson(
        { ok: false, error: { code: "trades_fetch_failed", message: error.message } },
        { status: 500 }
      );
    }

    // Calculate daily P&L
    const today = new Date().toISOString().split("T")[0];
    const { data: todayTrades } = await supabase
      .from("market_trades")
      .select("pnl, total")
      .eq("user_id", user.id)
      .gte("created_at", `${today}T00:00:00Z`);

    const dailyPnlUsd = todayTrades?.reduce((sum, t) => sum + toNumberOrZero(t.pnl), 0) ?? 0;
    const dailyVolumeUsd = todayTrades?.reduce((sum, t) => sum + toNumberOrZero(t.total), 0) ?? 0;
    const mappedTrades: TradeViewModel[] = (trades ?? []).map((row) => mapTradeRowToTradeVM(row));

    return noStoreJson({
      ok: true,
      data: {
        trades: mappedTrades,
      },
      meta: {
        timestamp: new Date().toISOString(),
        summary: {
          dailyPnlUsd,
          dailyVolumeUsd,
          count: mappedTrades.length,
        },
      },
    });
  } catch (err) {
    console.error("[api/market/trades]", err);
    return noStoreJson(
      {
        ok: false,
        error: {
          code: "trades_unhandled_error",
          message: err instanceof Error ? err.message : "Failed to fetch trades",
        },
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/market/trades
 * Save a direct buy to market_trades (paper or live).
 * Body: { market_id, market_title, outcome, amount, avg_price, category, probability, paper_mode }
 */
export async function POST(req: NextRequest) {
  try {
    const access = await resolveServerOrgContext();
    if (!access.user) {
      return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
    }
    if (!access.canAccessMarket) {
      return noStoreJson({ ok: false, error: { code: "forbidden", message: "Market access required" } }, { status: 403 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
    }

    const body = await req.json();
    const {
      market_id,
      market_title,
      outcome,
      amount,        // USDC to spend
      avg_price,     // price per share (0-1)
      category,
      probability,
      paper_mode = true,
    } = body;

    const normalizedAmount = toNumberOrNull(amount);
    const normalizedAvgPrice = toNumberOrNull(avg_price);
    const normalizedOutcome = String(outcome ?? "").toUpperCase();

    if (!market_id || !market_title || !normalizedOutcome || normalizedAmount === null || normalizedAvgPrice === null) {
      return noStoreJson({ ok: false, error: { code: "invalid_payload", message: "Missing required fields" } }, { status: 400 });
    }
    if (normalizedOutcome !== "YES" && normalizedOutcome !== "NO") {
      return noStoreJson({ ok: false, error: { code: "invalid_outcome", message: "Outcome must be YES or NO" } }, { status: 400 });
    }
    if (normalizedAmount <= 0 || normalizedAvgPrice <= 0) {
      return noStoreJson(
        { ok: false, error: { code: "invalid_numeric_values", message: "Amount and avg_price must be positive" } },
        { status: 400 }
      );
    }

    const shares = parseFloat((normalizedAmount / normalizedAvgPrice).toFixed(4));
    const total  = parseFloat((normalizedAmount).toFixed(2));

    const { data, error } = await insertMarketTradesWithFallback(
      supabase,
      {
        user_id: user.id,
        market_id,
        question: market_title,
        side: normalizedOutcome,
        shares,
        price: normalizedAvgPrice,
        total,
        status: "open",
        pnl: 0,
        paper_trade: paper_mode,
        reason: `Direct buy via Markets Explorer — ${category ?? "General"}, prob ${probability ?? "?"}%`,
      },
      { select: TRADE_COLUMNS, single: true }
    );

    if (error) {
      return noStoreJson(
        { ok: false, error: { code: "trade_insert_failed", message: error.message } },
        { status: 500 }
      );
    }

    return noStoreJson({
      ok: true,
      data: {
        trade: mapTradeRowToTradeVM(data),
      },
    });
  } catch (err) {
    console.error("[api/market/trades POST]", err);
    return noStoreJson(
      {
        ok: false,
        error: {
          code: "trade_post_unhandled_error",
          message: err instanceof Error ? err.message : "Failed to save trade",
        },
      },
      { status: 500 }
    );
  }
}
```

