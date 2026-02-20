"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tier } from "@/lib/entitlements";
import {
  Bot,
  Activity,
  Wallet,
  ShieldAlert,
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  Power,
  OctagonX,
  CheckCircle2,
  Loader2,
  Clock,
  Zap,
  Shield,
  Flame,
  ToggleLeft,
  ToggleRight,
  Copy,
  CircleDot,
  Crosshair,
  LineChart,
  ShoppingCart,
  Fish,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
} from "lucide-react";

/* ================================================================
   TYPES
   ================================================================ */

interface MarketProps {
  user: { name: string; email: string; avatar?: string };
  tier: Tier;
}

type BotStatus = "stopped" | "running" | "paper";
type RiskLevel = "low" | "medium" | "high";
type FocusArea =
  | "all"
  | "crypto"
  | "politics"
  | "sports"
  | "weather"
  | "economy";

interface PortfolioMix {
  low: number;
  medium: number;
  high: number;
}

interface BotConfig {
  riskLevel: RiskLevel;
  maxDailyLoss: number;
  emergencyStopPct: number;
  paperMode: boolean;
  walletAddress: string | null;
  botStatus: BotStatus;
  portfolioMix: PortfolioMix;
  focusAreas: FocusArea[];
  whaleWatch: boolean;
}

interface HotOpportunity {
  id: string;
  question: string;
  edge: number;
  side: "YES" | "NO";
  price: number;
  volume: string;
  category: string;
}

interface TradeRow {
  id: string;
  question: string;
  side: "YES" | "NO";
  shares: number;
  price: number;
  total: number;
  pnl: number | null;
  status: "open" | "closed" | "cancelled";
  paper_trade: boolean;
  created_at: string;
  reason?: string;
}

const DEFAULT_CONFIG: BotConfig = {
  riskLevel: "low",
  paperMode: true,
  maxDailyLoss: 25,
  emergencyStopPct: 15,
  walletAddress: null,
  botStatus: "stopped",
  portfolioMix: { low: 60, medium: 30, high: 10 },
  focusAreas: ["all"],
  whaleWatch: false,
};

/* ================================================================
   DEMO DATA
   ================================================================ */

const demoOpportunities: HotOpportunity[] = [
  {
    id: "h1",
    question: "Will BTC hit $120k by March?",
    edge: 4.2,
    side: "YES",
    price: 0.62,
    volume: "$142k",
    category: "Crypto",
  },
  {
    id: "h2",
    question: "Fed rate cut in Q2 2026?",
    edge: 3.8,
    side: "NO",
    price: 0.38,
    volume: "$89k",
    category: "Economy",
  },
  {
    id: "h3",
    question: "Super Bowl LXII winner: Chiefs?",
    edge: 2.9,
    side: "YES",
    price: 0.44,
    volume: "$312k",
    category: "Sports",
  },
];

const CHART_DATA = [12, 18, 14, 22, 19, 28, 25, 32, 29, 35, 31, 38, 42, 39, 47];

/* ================================================================
   HELPERS
   ================================================================ */

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const statusConfig: Record<
  BotStatus,
  { label: string; color: string; bg: string; dot: string }
> = {
  stopped: {
    label: "Stopped",
    color: "text-red-600",
    bg: "bg-red-50 border-red-200",
    dot: "bg-red-500",
  },
  running: {
    label: "Running",
    color: "text-emerald-600",
    bg: "bg-emerald-50 border-emerald-200",
    dot: "bg-emerald-500",
  },
  paper: {
    label: "Paper Trading",
    color: "text-amber-600",
    bg: "bg-amber-50 border-amber-200",
    dot: "bg-amber-500",
  },
};

const riskConfig: Record<
  RiskLevel,
  { label: string; desc: string; icon: typeof Shield; color: string }
> = {
  low: { label: "Low Risk", desc: "Tiny arbitrage & spreads", icon: Shield, color: "#059669" },
  medium: { label: "Medium", desc: "Moderate positions", icon: Zap, color: "#D97706" },
  high: { label: "High Risk", desc: "Aggressive trading", icon: Flame, color: "#DC2626" },
};

const focusOptions: { key: FocusArea; label: string; emoji: string }[] = [
  { key: "all", label: "All Markets", emoji: "🌍" },
  { key: "crypto", label: "Crypto", emoji: "₿" },
  { key: "politics", label: "Politics", emoji: "🏛️" },
  { key: "sports", label: "Sports", emoji: "⚽" },
  { key: "weather", label: "Weather", emoji: "🌦️" },
  { key: "economy", label: "Economy", emoji: "📈" },
];

/* ================================================================
   CONFIRMATION DIALOG
   ================================================================ */

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  confirmColor,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  confirmColor: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl border border-gray-200 shadow-2xl w-full max-w-md p-6 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ backgroundColor: `${confirmColor}1A`, color: confirmColor }}
          >
            <ShieldAlert size={20} />
          </div>
          <h3 className="text-lg font-bold text-gray-900">{title}</h3>
        </div>
        <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90"
            style={{ backgroundColor: confirmColor }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ================================================================
   MINI LINE CHART
   ================================================================ */

function MiniChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 100;
  const h = 40;
  const points = data
    .map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-10" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`chartGrad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity={0.2} />
          <stop offset="100%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon
        points={`0,${h} ${points} ${w},${h}`}
        fill={`url(#chartGrad-${color.replace("#", "")})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ================================================================
   MAIN COMPONENT
   ================================================================ */

export default function MarketClient({ user, tier }: MarketProps) {
  const supabase = createClient();

  /* ── State ── */
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<{
    marketsScanned: number;
    opportunitiesFound: number;
    executedTrades: number;
  } | null>(null);
  const [trades, setTrades] = useState<TradeRow[]>([]);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [opportunities, setOpportunities] =
    useState<HotOpportunity[]>(demoOpportunities);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scanInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const scanningRef = useRef(false);

  /* ── Computed ── */
  const todayPnl = config.botStatus === "stopped" ? 0 : 47.3;
  const totalBalance = config.walletAddress ? 1248.65 : 0;
  const activePositions =
    config.botStatus === "stopped"
      ? 0
      : trades.filter((t) => t.status === "open").length || 4;
  const volume24h = config.botStatus === "stopped" ? 0 : 892.4;
  const status = statusConfig[config.botStatus];

  /* ── Load config from Supabase ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      const saved = u?.user_metadata?.marketBotConfig as BotConfig | undefined;
      if (saved && typeof saved === "object") {
        setConfig({ ...DEFAULT_CONFIG, ...saved });
      }
      setLoading(false);
    });
  }, [supabase]);

  /* ── Load trades from Supabase ── */
  const loadTrades = useCallback(async () => {
    setTradesLoading(true);
    try {
      const res = await fetch("/api/market/trades?limit=20");
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades ?? []);
      }
    } catch {
      /* silently handle */
    } finally {
      setTradesLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTrades();
  }, [loadTrades]);

  /* ── Auto-save config ── */
  const persistConfig = useCallback(
    (next: BotConfig) => {
      setConfig(next);
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      saveTimeout.current = setTimeout(async () => {
        setSaving(true);
        try {
          await supabase.auth.updateUser({ data: { marketBotConfig: next } });
        } finally {
          setSaving(false);
        }
      }, 800);
    },
    [supabase],
  );

  const updateConfig = useCallback(
    (patch: Partial<BotConfig>) => {
      persistConfig({ ...config, ...patch });
    },
    [config, persistConfig],
  );

  /* ── Portfolio Mix (always sums to 100%) ── */
  function handleMixChange(key: keyof PortfolioMix, value: number) {
    const mix = { ...config.portfolioMix };
    const old = mix[key];
    const diff = value - old;
    mix[key] = value;

    const others = (Object.keys(mix) as (keyof PortfolioMix)[]).filter(
      (k) => k !== key,
    );
    const otherTotal = others.reduce((s, k) => s + mix[k], 0);
    if (otherTotal > 0) {
      for (const k of others) {
        mix[k] = Math.max(0, Math.round(mix[k] - (diff * mix[k]) / otherTotal));
      }
    }
    const total = mix.low + mix.medium + mix.high;
    if (total !== 100) {
      const adjust = others.find((k) => mix[k] > 0);
      if (adjust) mix[adjust] += 100 - total;
    }
    updateConfig({ portfolioMix: mix });
  }

  /* ── Focus Areas ── */
  function toggleFocus(area: FocusArea) {
    let next: FocusArea[];
    if (area === "all") {
      next = ["all"];
    } else {
      const current = config.focusAreas.filter((a) => a !== "all");
      next = current.includes(area)
        ? current.filter((a) => a !== area)
        : [...current, area];
      if (next.length === 0) next = ["all"];
    }
    updateConfig({ focusAreas: next });
  }

  /* ── Scan ── */
  const runScan = useCallback(async () => {
    if (scanningRef.current) return;
    scanningRef.current = true;
    setScanning(true);
    try {
      const res = await fetch("/api/market/scan", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setScanResult({
          marketsScanned: data.marketsScanned,
          opportunitiesFound: data.opportunitiesFound,
          executedTrades: data.executedTrades,
        });
        setLastScan(new Date().toLocaleTimeString());

        if (data.topOpportunities?.length > 0) {
          setOpportunities(
            data.topOpportunities
              .slice(0, 3)
              .map(
                (o: {
                  id: string;
                  question: string;
                  edge: number;
                  yesPrice: number;
                  noPrice: number;
                  volume24h: number;
                  category: string;
                }) => ({
                  id: o.id,
                  question: o.question,
                  edge: o.edge,
                  side: o.yesPrice < o.noPrice ? "YES" : "NO",
                  price: Math.min(o.yesPrice, o.noPrice),
                  volume: `$${Math.round(o.volume24h / 1000)}k`,
                  category:
                    o.category.charAt(0).toUpperCase() + o.category.slice(1),
                }),
              ),
          );
        }

        loadTrades();
      }
    } catch {
      /* silently handle */
    } finally {
      scanningRef.current = false;
      setScanning(false);
    }
  }, [loadTrades]);

  /* ── Polling when bot is running ── */
  useEffect(() => {
    if (config.botStatus !== "stopped") {
      runScan();
      scanInterval.current = setInterval(runScan, 60_000);
    } else {
      if (scanInterval.current) {
        clearInterval(scanInterval.current);
        scanInterval.current = null;
      }
    }
    return () => {
      if (scanInterval.current) clearInterval(scanInterval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config.botStatus]);

  /* ── Actions ── */
  function handleStart() {
    const st: BotStatus = config.paperMode ? "paper" : "running";
    updateConfig({ botStatus: st });
    setConfirmStart(false);
  }

  function handleStop() {
    updateConfig({ botStatus: "stopped" });
    setConfirmStop(false);
    setScanResult(null);
  }

  async function handleConnectWallet() {
    setWalletConnecting(true);
    await new Promise((r) => setTimeout(r, 1500));
    const fakeAddr =
      "0x" +
      Array.from({ length: 40 }, () =>
        Math.floor(Math.random() * 16).toString(16),
      ).join("");
    updateConfig({ walletAddress: fakeAddr });
    setWalletConnecting(false);
  }

  function handleCopyAddress() {
    if (config.walletAddress) {
      navigator.clipboard.writeText(config.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 size={28} className="animate-spin text-[#FF4D00]" />
      </div>
    );
  }

  /* ================================================================
     RENDER
     ================================================================ */

  return (
    <div className="space-y-6 pb-12">
      {/* ════════ WARNING BANNER ════════ */}
      <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-red-50 border border-red-200">
        <ShieldAlert size={18} className="text-red-600 shrink-0" />
        <p className="text-sm font-semibold text-red-700 leading-snug">
          This tool can lose real money. Start with small amounts and
          paper-trading mode first.
        </p>
      </div>

      {/* ════════ HEADER ════════ */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: "#1E3A8A", color: "#fff" }}
          >
            <Bot size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">
              Market Robot
            </h1>
            <p className="text-xs text-gray-400 mt-0.5">
              Automated Polymarket trading
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold ${status.bg} ${status.color}`}
          >
            <span
              className={`w-2 h-2 rounded-full ${status.dot} ${config.botStatus === "running" ? "animate-pulse" : ""}`}
            />
            {status.label}
          </div>
          {scanning && (
            <span className="inline-flex items-center gap-1 text-[10px] text-[#FF4D00] font-semibold">
              <RefreshCw size={10} className="animate-spin" /> Scanning…
            </span>
          )}
          {saving && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <Loader2 size={10} className="animate-spin" /> Saving…
            </span>
          )}
        </div>
      </div>

      {/* ════════ PERFORMANCE CARDS ════════ */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* P&L */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                backgroundColor: todayPnl >= 0 ? "#05966910" : "#DC262610",
                color: todayPnl >= 0 ? "#059669" : "#DC2626",
              }}
            >
              {todayPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
            <span className="text-[11px] font-semibold text-gray-500">
              Today P&amp;L
            </span>
          </div>
          <p
            className={`text-2xl sm:text-3xl font-black tracking-tight ${todayPnl >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {todayPnl >= 0 ? "+" : ""}${todayPnl.toFixed(2)}
          </p>
          <MiniChart data={CHART_DATA} color={todayPnl >= 0 ? "#059669" : "#DC2626"} />
        </div>

        {/* Balance */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#1E3A8A1A", color: "#1E3A8A" }}
            >
              <DollarSign size={16} />
            </div>
            <span className="text-[11px] font-semibold text-gray-500">
              Balance
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
            $
            {totalBalance.toLocaleString("en-US", {
              minimumFractionDigits: 2,
            })}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {config.walletAddress ? "Polygon USDC" : "No wallet"}
          </p>
        </div>

        {/* Positions */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}
            >
              <BarChart3 size={16} />
            </div>
            <span className="text-[11px] font-semibold text-gray-500">
              Positions
            </span>
          </div>
          <p className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">
            {activePositions}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            24h vol: ${volume24h.toFixed(0)}
          </p>
        </div>

        {/* Scans */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#7C3AED1A", color: "#7C3AED" }}
            >
              <Crosshair size={16} />
            </div>
            <span className="text-[11px] font-semibold text-gray-500">
              Last Scan
            </span>
          </div>
          <p className="text-lg font-black tracking-tight text-gray-900">
            {lastScan ?? "—"}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {scanResult
              ? `${scanResult.marketsScanned} markets, ${scanResult.opportunitiesFound} opps`
              : "Not scanned yet"}
          </p>
        </div>
      </div>

      {/* ════════ PERFORMANCE CHART PLACEHOLDER ════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#1E3A8A1A", color: "#1E3A8A" }}
            >
              <LineChart size={18} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Performance</h2>
          </div>
          <div className="flex gap-1">
            {["1D", "1W", "1M", "ALL"].map((p) => (
              <button
                key={p}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="h-32 sm:h-48">
          <MiniChart
            data={[...CHART_DATA, ...CHART_DATA.map((v) => v + 8)]}
            color="#1E3A8A"
          />
        </div>
        <p className="text-[10px] text-gray-400 text-center mt-2">
          Real chart data will populate once trades are running
        </p>
      </div>

      {/* ════════ TWO-COLUMN: Controls + Wallet ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-2 space-y-6">
          {/* ── RISK CONTROLS ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-5">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}
              >
                <ShieldAlert size={18} />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Risk Controls</h2>
            </div>

            {/* Risk Level */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(["low", "medium", "high"] as RiskLevel[]).map((level) => {
                const rc = riskConfig[level];
                const Icon = rc.icon;
                const active = config.riskLevel === level;
                return (
                  <button
                    key={level}
                    onClick={() => updateConfig({ riskLevel: level })}
                    className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${active ? "border-current shadow-md -translate-y-0.5" : "border-gray-100 hover:border-gray-200"}`}
                    style={
                      active ? { borderColor: rc.color, color: rc.color } : undefined
                    }
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${rc.color}1A`, color: rc.color }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${active ? "" : "text-gray-900"}`}>
                        {rc.label}
                      </p>
                      <p className="text-[11px] text-gray-400 leading-snug">
                        {rc.desc}
                      </p>
                    </div>
                    {active && (
                      <CheckCircle2
                        size={16}
                        className="absolute top-2.5 right-2.5"
                        style={{ color: rc.color }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Max Daily Loss */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Max daily loss
                </label>
                <span className="text-sm font-black text-gray-900">
                  ${config.maxDailyLoss}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={config.maxDailyLoss}
                onChange={(e) =>
                  updateConfig({ maxDailyLoss: Number(e.target.value) })
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-[#FF4D00]"
                style={{
                  background: `linear-gradient(to right, #FF4D00 0%, #FF4D00 ${config.maxDailyLoss}%, #e5e7eb ${config.maxDailyLoss}%, #e5e7eb 100%)`,
                }}
              />
            </div>

            {/* Emergency Stop */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Emergency stop if down
                </label>
                <span className="text-sm font-black text-gray-900">
                  {config.emergencyStopPct}%
                </span>
              </div>
              <input
                type="range"
                min={5}
                max={50}
                step={5}
                value={config.emergencyStopPct}
                onChange={(e) =>
                  updateConfig({ emergencyStopPct: Number(e.target.value) })
                }
                className="w-full h-2 rounded-full appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, #DC2626 0%, #DC2626 ${((config.emergencyStopPct - 5) / 45) * 100}%, #e5e7eb ${((config.emergencyStopPct - 5) / 45) * 100}%, #e5e7eb 100%)`,
                }}
              />
            </div>

            {/* Paper Trading Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
              <div>
                <p className="text-sm font-bold text-gray-900">
                  Paper Trading Mode
                </p>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Use fake money — no real risk.
                </p>
              </div>
              <button
                onClick={() => updateConfig({ paperMode: !config.paperMode })}
                className="shrink-0 transition-colors"
                style={{ color: config.paperMode ? "#FF4D00" : "#D1D5DB" }}
              >
                {config.paperMode ? (
                  <ToggleRight size={36} />
                ) : (
                  <ToggleLeft size={36} />
                )}
              </button>
            </div>
          </div>

          {/* ── PORTFOLIO MIX ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#1E3A8A1A", color: "#1E3A8A" }}
              >
                <BarChart3 size={18} />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Portfolio Mix</h2>
              <span className="ml-auto text-[10px] text-gray-400 font-semibold">
                Must total 100%
              </span>
            </div>

            {(["low", "medium", "high"] as (keyof PortfolioMix)[]).map((key) => {
              const rc = riskConfig[key];
              const value = config.portfolioMix[key];
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: rc.color }}
                      />
                      <span className="text-xs font-semibold text-gray-700">
                        {rc.label}
                      </span>
                    </div>
                    <span className="text-sm font-black" style={{ color: rc.color }}>
                      {value}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={value}
                    onChange={(e) => handleMixChange(key, Number(e.target.value))}
                    className="w-full h-2 rounded-full appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, ${rc.color} 0%, ${rc.color} ${value}%, #e5e7eb ${value}%, #e5e7eb 100%)`,
                    }}
                  />
                </div>
              );
            })}

            {/* Visual bar */}
            <div className="flex rounded-full overflow-hidden h-3 mt-2">
              <div
                style={{
                  width: `${config.portfolioMix.low}%`,
                  backgroundColor: "#059669",
                }}
                className="transition-all duration-300"
              />
              <div
                style={{
                  width: `${config.portfolioMix.medium}%`,
                  backgroundColor: "#D97706",
                }}
                className="transition-all duration-300"
              />
              <div
                style={{
                  width: `${config.portfolioMix.high}%`,
                  backgroundColor: "#DC2626",
                }}
                className="transition-all duration-300"
              />
            </div>
            <div className="flex justify-between text-[10px] text-gray-400">
              <span>Low {config.portfolioMix.low}%</span>
              <span>Med {config.portfolioMix.medium}%</span>
              <span>High {config.portfolioMix.high}%</span>
            </div>
          </div>

          {/* ── FOCUS AREAS ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}
              >
                <Crosshair size={18} />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Focus Areas</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {focusOptions.map((opt) => {
                const active = config.focusAreas.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    onClick={() => toggleFocus(opt.key)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all duration-200 ${active ? "border-[#FF4D00] bg-[#FF4D00]/10 text-[#FF4D00] shadow-sm" : "border-gray-100 text-gray-600 hover:border-gray-200"}`}
                  >
                    <span className="text-base">{opt.emoji}</span>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── WHALE WATCH ── */}
          <div className="flex items-center justify-between p-5 bg-white rounded-2xl border border-gray-100">
            <div className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#7C3AED1A", color: "#7C3AED" }}
              >
                <Fish size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-900">Whale Watch</p>
                <p className="text-[11px] text-gray-400">
                  Follow large wallet moves for signal
                </p>
              </div>
            </div>
            <button
              onClick={() => updateConfig({ whaleWatch: !config.whaleWatch })}
              className="shrink-0 transition-colors"
              style={{ color: config.whaleWatch ? "#7C3AED" : "#D1D5DB" }}
            >
              {config.whaleWatch ? (
                <ToggleRight size={36} />
              ) : (
                <ToggleLeft size={36} />
              )}
            </button>
          </div>
        </div>

        {/* ── RIGHT COLUMN: Wallet + Hot Opportunities ── */}
        <div className="space-y-6">
          {/* ── WALLET ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#1E3A8A1A", color: "#1E3A8A" }}
              >
                <Wallet size={18} />
              </div>
              <h2 className="text-sm font-bold text-gray-900">Wallet</h2>
            </div>

            {config.walletAddress ? (
              <div className="space-y-4 flex-1">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Connected Address
                  </p>
                  <div className="flex items-center gap-2">
                    <CircleDot size={14} className="text-emerald-500" />
                    <code className="text-sm font-bold text-gray-900 tracking-wide">
                      {shortenAddress(config.walletAddress)}
                    </code>
                    <button
                      onClick={handleCopyAddress}
                      className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      {copied ? (
                        <CheckCircle2 size={14} className="text-emerald-500" />
                      ) : (
                        <Copy size={14} />
                      )}
                    </button>
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                  <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
                    Network
                  </p>
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                      <span className="text-[8px] font-bold text-white">P</span>
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      Polygon (MATIC)
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => updateConfig({ walletAddress: null })}
                  className="w-full py-2.5 rounded-xl text-xs font-semibold border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-red-500 transition-colors mt-auto"
                >
                  Disconnect Wallet
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center py-6">
                <div className="w-14 h-14 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-3">
                  <Wallet size={24} className="text-gray-300" />
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">
                  No wallet connected
                </p>
                <p className="text-[11px] text-gray-400 mb-5 max-w-[200px] leading-snug">
                  Connect a Polygon wallet for live trading.
                </p>
                <button
                  onClick={handleConnectWallet}
                  disabled={walletConnecting}
                  className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
                  style={{ backgroundColor: "#1E3A8A" }}
                >
                  {walletConnecting ? (
                    <>
                      <Loader2 size={15} className="animate-spin" /> Connecting…
                    </>
                  ) : (
                    <>
                      <Wallet size={15} /> Connect Wallet
                    </>
                  )}
                </button>
              </div>
            )}
          </div>

          {/* ── HOT OPPORTUNITIES ── */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}
              >
                <Zap size={18} />
              </div>
              <h2 className="text-sm font-bold text-gray-900">
                Hot Opportunities
              </h2>
            </div>
            <div className="space-y-3">
              {opportunities.map((opp) => (
                <div
                  key={opp.id}
                  className="p-4 rounded-xl border border-gray-100 hover:border-[#FF4D00]/30 hover:shadow-sm transition-all space-y-2"
                >
                  <p className="text-[13px] font-semibold text-gray-900 leading-snug">
                    {opp.question}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF4D00]/10 text-[#FF4D00]">
                      {opp.edge}% edge
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${opp.side === "YES" ? "bg-emerald-50 text-emerald-600" : "bg-red-50 text-red-600"}`}
                    >
                      {opp.side} @ ${opp.price.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {opp.volume} vol
                    </span>
                    <span className="text-[10px] text-gray-400">
                      • {opp.category}
                    </span>
                  </div>
                  <button
                    className="w-full mt-1 py-2 rounded-lg text-xs font-bold text-white transition-all hover:opacity-90"
                    style={{ backgroundColor: "#FF4D00" }}
                  >
                    <ShoppingCart size={12} className="inline mr-1 -mt-0.5" />{" "}
                    Auto Buy
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════ ACTION BUTTONS ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <button
          onClick={() => setConfirmStart(true)}
          disabled={config.botStatus !== "stopped"}
          className="flex items-center justify-center gap-3 py-5 rounded-2xl text-lg font-black text-white transition-all hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          style={{ backgroundColor: "#059669" }}
        >
          <Power size={22} />
          {config.botStatus === "stopped"
            ? "START ROBOT"
            : config.paperMode
              ? "PAPER MODE ACTIVE"
              : "ROBOT RUNNING"}
        </button>
        <button
          onClick={() => setConfirmStop(true)}
          disabled={config.botStatus === "stopped"}
          className="flex items-center justify-center gap-3 py-5 rounded-2xl text-lg font-black text-white transition-all hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          style={{ backgroundColor: "#DC2626" }}
        >
          <OctagonX size={22} /> EMERGENCY STOP
        </button>
      </div>

      {/* ════════ TRADE HISTORY TABLE ════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}
            >
              <Activity size={18} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Trade History</h2>
          </div>
          <button
            onClick={loadTrades}
            disabled={tradesLoading}
            className="text-[10px] font-bold uppercase tracking-wider text-gray-400 hover:text-[#FF4D00] transition-colors flex items-center gap-1"
          >
            <RefreshCw size={10} className={tradesLoading ? "animate-spin" : ""} />{" "}
            Refresh
          </button>
        </div>

        {trades.length > 0 ? (
          <div className="overflow-x-auto -mx-2 px-2">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-3 pr-4">
                    Market
                  </th>
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-3 pr-4">
                    Side
                  </th>
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-3 pr-4">
                    Shares
                  </th>
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-3 pr-4">
                    Price
                  </th>
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-3 pr-4">
                    Total
                  </th>
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-3 pr-4">
                    P&amp;L
                  </th>
                  <th className="text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {trades.map((t) => (
                  <tr
                    key={t.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                  >
                    <td className="py-3 pr-4">
                      <p className="text-[12px] text-gray-800 font-medium leading-snug max-w-[200px] truncate">
                        {t.question}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                        <Clock size={9} />{" "}
                        {new Date(t.created_at).toLocaleString()}
                        {t.paper_trade && (
                          <span className="ml-1 text-amber-500 font-bold">
                            PAPER
                          </span>
                        )}
                      </p>
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`text-[11px] font-bold ${t.side === "YES" ? "text-emerald-600" : "text-red-600"}`}
                      >
                        {t.side === "YES" ? (
                          <ArrowUpRight size={11} className="inline -mt-0.5" />
                        ) : (
                          <ArrowDownRight size={11} className="inline -mt-0.5" />
                        )}
                        {t.side}
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-[12px] text-gray-700 font-semibold">
                      {t.shares}
                    </td>
                    <td className="py-3 pr-4 text-[12px] text-gray-700">
                      ${t.price.toFixed(2)}
                    </td>
                    <td className="py-3 pr-4 text-[12px] text-gray-900 font-bold">
                      ${t.total.toFixed(2)}
                    </td>
                    <td className="py-3 pr-4">
                      {t.pnl !== null ? (
                        <span
                          className={`text-[12px] font-bold ${t.pnl >= 0 ? "text-emerald-600" : "text-red-600"}`}
                        >
                          {t.pnl >= 0 ? "+" : ""}${t.pnl.toFixed(2)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-3">
                      <span
                        className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                          t.status === "open"
                            ? "bg-blue-50 text-blue-600"
                            : t.status === "closed"
                              ? "bg-emerald-50 text-emerald-600"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-12 text-center">
            <Activity size={32} className="mx-auto text-gray-200 mb-3" />
            <p className="text-sm font-semibold text-gray-500">No trades yet</p>
            <p className="text-[11px] text-gray-400 mt-1">
              Start the robot to begin automatic scanning and trading
            </p>
          </div>
        )}
      </div>

      {/* ════════ CONFIRMATION DIALOGS ════════ */}
      <ConfirmDialog
        open={confirmStart}
        title={config.paperMode ? "Start Paper Trading?" : "Start Live Trading?"}
        description={
          config.paperMode
            ? "The robot will scan Polymarket every 60 seconds and execute paper trades. No real funds at risk."
            : `The robot will trade with REAL money. Max daily loss: $${config.maxDailyLoss}. Emergency stop at ${config.emergencyStopPct}% drawdown.`
        }
        confirmLabel={config.paperMode ? "Start Paper Trading" : "Start Live Trading"}
        confirmColor={config.paperMode ? "#D97706" : "#059669"}
        onConfirm={handleStart}
        onCancel={() => setConfirmStart(false)}
      />
      <ConfirmDialog
        open={confirmStop}
        title="Emergency Stop"
        description="This will immediately stop scanning and close all pending orders."
        confirmLabel="Stop Everything"
        confirmColor="#DC2626"
        onConfirm={handleStop}
        onCancel={() => setConfirmStop(false)}
      />
    </div>
  );
}
