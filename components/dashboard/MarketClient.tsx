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
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  ExternalLink,
  Clock,
  Zap,
  Shield,
  Flame,
  ToggleLeft,
  ToggleRight,
  Copy,
  CircleDot,
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

interface BotConfig {
  riskLevel: RiskLevel;
  maxDailyLoss: number;
  emergencyStopPct: number;
  paperMode: boolean;
  walletAddress: string | null;
  botStatus: BotStatus;
}

interface ActivityLog {
  id: string;
  time: string;
  type: "trade" | "info" | "warning" | "error";
  message: string;
}

const DEFAULT_CONFIG: BotConfig = {
  riskLevel: "low",
  paperMode: true,
  maxDailyLoss: 25,
  emergencyStopPct: 15,
  walletAddress: null,
  botStatus: "stopped",
};

/* ================================================================
   DEMO DATA
   ================================================================ */

const demoLogs: ActivityLog[] = [
  { id: "l1", time: "2:34 PM", type: "trade", message: "Opened YES position on 'Will BTC hit $120k by March?' — 150 shares @ $0.62" },
  { id: "l2", time: "2:33 PM", type: "info", message: "Spread opportunity detected — 3.2% edge on event #48291" },
  { id: "l3", time: "2:28 PM", type: "trade", message: "Closed NO position on 'Fed rate cut in March' — +$14.20 profit" },
  { id: "l4", time: "2:15 PM", type: "warning", message: "Daily loss limit 60% reached — reducing position sizing" },
  { id: "l5", time: "1:58 PM", type: "trade", message: "Opened NO position on 'S&P 500 above 6000 EOD' — 200 shares @ $0.41" },
  { id: "l6", time: "1:45 PM", type: "info", message: "Market scan complete — 12 opportunities found, 3 qualify for current risk level" },
  { id: "l7", time: "1:30 PM", type: "error", message: "Order rejected — insufficient liquidity on event #47102" },
  { id: "l8", time: "1:12 PM", type: "trade", message: "Closed YES position on 'ETH above $4000 by Friday' — +$8.50 profit" },
  { id: "l9", time: "12:50 PM", type: "info", message: "Robot started in paper trading mode" },
];

/* ================================================================
   HELPERS
   ================================================================ */

function shortenAddress(addr: string): string {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`;
}

const statusConfig: Record<BotStatus, { label: string; color: string; bg: string; dot: string }> = {
  stopped: { label: "Stopped", color: "text-red-600", bg: "bg-red-50 border-red-200", dot: "bg-red-500" },
  running: { label: "Running", color: "text-emerald-600", bg: "bg-emerald-50 border-emerald-200", dot: "bg-emerald-500" },
  paper: { label: "Paper Trading", color: "text-amber-600", bg: "bg-amber-50 border-amber-200", dot: "bg-amber-500" },
};

const riskConfig: Record<RiskLevel, { label: string; desc: string; icon: typeof Shield; color: string }> = {
  low: { label: "Low Risk", desc: "Tiny arbitrage & spreads only", icon: Shield, color: "#059669" },
  medium: { label: "Medium Risk", desc: "Moderate positions, wider spreads", icon: Zap, color: "#D97706" },
  high: { label: "High Risk", desc: "Aggressive trading, larger positions", icon: Flame, color: "#DC2626" },
};

const logIcon = (type: ActivityLog["type"]) => {
  switch (type) {
    case "trade": return <TrendingUp size={13} className="text-[#FF4D00]" />;
    case "info": return <Activity size={13} className="text-blue-500" />;
    case "warning": return <AlertTriangle size={13} className="text-amber-500" />;
    case "error": return <XCircle size={13} className="text-red-500" />;
  }
};

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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${confirmColor}1A`, color: confirmColor }}>
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
   MAIN COMPONENT
   ================================================================ */

export default function MarketClient({ user, tier }: MarketProps) {
  const supabase = createClient();

  /* ── State ── */
  const [config, setConfig] = useState<BotConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [logs] = useState<ActivityLog[]>(demoLogs);
  const [confirmStart, setConfirmStart] = useState(false);
  const [confirmStop, setConfirmStop] = useState(false);
  const [walletConnecting, setWalletConnecting] = useState(false);
  const [copied, setCopied] = useState(false);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Demo P&L values
  const todayPnl = config.botStatus === "stopped" ? 0 : 47.30;
  const totalBalance = config.walletAddress ? 1248.65 : 0;
  const activePositions = config.botStatus === "stopped" ? 0 : 4;
  const volume24h = config.botStatus === "stopped" ? 0 : 892.40;

  /* ── Load config from Supabase user_metadata ── */
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      const saved = u?.user_metadata?.marketBotConfig as BotConfig | undefined;
      if (saved && typeof saved === "object") {
        setConfig({ ...DEFAULT_CONFIG, ...saved });
      }
      setLoading(false);
    });
  }, [supabase]);

  /* ── Auto-save config to Supabase ── */
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
    [supabase]
  );

  const updateConfig = useCallback(
    (patch: Partial<BotConfig>) => {
      const next = { ...config, ...patch };
      persistConfig(next);
    },
    [config, persistConfig]
  );

  /* ── Actions ── */
  function handleStart() {
    const status: BotStatus = config.paperMode ? "paper" : "running";
    updateConfig({ botStatus: status });
    setConfirmStart(false);
  }

  function handleStop() {
    updateConfig({ botStatus: "stopped" });
    setConfirmStop(false);
  }

  async function handleConnectWallet() {
    setWalletConnecting(true);
    // Placeholder: simulate wallet connection
    await new Promise((r) => setTimeout(r, 1500));
    const fakeAddr = "0x" + Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join("");
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

  const status = statusConfig[config.botStatus];

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
          This tool can lose real money. Start with small amounts and paper-trading mode first.
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
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Market Robot</h1>
            <p className="text-xs text-gray-400 mt-0.5">Automated Polymarket trading</p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border text-xs font-bold ${status.bg} ${status.color}`}>
            <span className={`w-2 h-2 rounded-full ${status.dot} ${config.botStatus === "running" ? "animate-pulse" : ""}`} />
            {status.label}
          </div>
          {saving && (
            <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
              <Loader2 size={10} className="animate-spin" /> Saving…
            </span>
          )}
        </div>
      </div>

      {/* ════════ PERFORMANCE CARDS ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Today P&L */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: todayPnl >= 0 ? "#05966910" : "#DC262610", color: todayPnl >= 0 ? "#059669" : "#DC2626" }}>
              {todayPnl >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
            </div>
            <span className="text-xs font-semibold text-gray-500">Today&apos;s P&amp;L</span>
          </div>
          <p className={`text-3xl font-black tracking-tight ${todayPnl >= 0 ? "text-emerald-600" : "text-red-600"}`}>
            {todayPnl >= 0 ? "+" : ""}${todayPnl.toFixed(2)}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {config.botStatus === "stopped" ? "Robot is stopped" : config.paperMode ? "Paper trading — no real money" : "Live trading"}
          </p>
        </div>

        {/* Total Balance */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1E3A8A1A", color: "#1E3A8A" }}>
              <DollarSign size={16} />
            </div>
            <span className="text-xs font-semibold text-gray-500">Total Balance</span>
          </div>
          <p className="text-3xl font-black tracking-tight text-gray-900">
            ${totalBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-[10px] text-gray-400 mt-1">
            {config.walletAddress ? "Polygon USDC" : "No wallet connected"}
          </p>
        </div>

        {/* Active Positions / Volume */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}>
              <BarChart3 size={16} />
            </div>
            <span className="text-xs font-semibold text-gray-500">Active Positions</span>
          </div>
          <p className="text-3xl font-black tracking-tight text-gray-900">{activePositions}</p>
          <p className="text-[10px] text-gray-400 mt-1">24h volume: ${volume24h.toFixed(2)}</p>
        </div>
      </div>

      {/* ════════ TWO-COLUMN LAYOUT: Risk Controls + Wallet ════════ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── RISK CONTROLS ── */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 p-6 space-y-6">
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}>
              <ShieldAlert size={18} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Risk Controls</h2>
          </div>

          {/* Risk Level Segmented Control */}
          <div>
            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 block">Strategy Risk Level</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {(["low", "medium", "high"] as RiskLevel[]).map((level) => {
                const rc = riskConfig[level];
                const Icon = rc.icon;
                const active = config.riskLevel === level;
                return (
                  <button
                    key={level}
                    onClick={() => updateConfig({ riskLevel: level })}
                    className={`relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                      active
                        ? "border-current shadow-md -translate-y-0.5"
                        : "border-gray-100 hover:border-gray-200 hover:shadow-sm"
                    }`}
                    style={active ? { borderColor: rc.color, color: rc.color } : undefined}
                  >
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${rc.color}1A`, color: rc.color }}
                    >
                      <Icon size={20} />
                    </div>
                    <div>
                      <p className={`text-sm font-bold ${active ? "" : "text-gray-900"}`}>{rc.label}</p>
                      <p className="text-[11px] text-gray-400 leading-snug">{rc.desc}</p>
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
          </div>

          {/* Max Daily Loss Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Max daily loss</label>
              <span className="text-sm font-black text-gray-900">${config.maxDailyLoss}</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={1}
              value={config.maxDailyLoss}
              onChange={(e) => updateConfig({ maxDailyLoss: Number(e.target.value) })}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #FF4D00 0%, #FF4D00 ${config.maxDailyLoss}%, #e5e7eb ${config.maxDailyLoss}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-gray-400">$0</span>
              <span className="text-[10px] text-gray-400">$100</span>
            </div>
          </div>

          {/* Emergency Stop Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Emergency stop if down</label>
              <span className="text-sm font-black text-gray-900">{config.emergencyStopPct}%</span>
            </div>
            <input
              type="range"
              min={5}
              max={50}
              step={5}
              value={config.emergencyStopPct}
              onChange={(e) => updateConfig({ emergencyStopPct: Number(e.target.value) })}
              className="w-full h-2 rounded-full appearance-none cursor-pointer"
              style={{
                background: `linear-gradient(to right, #DC2626 0%, #DC2626 ${((config.emergencyStopPct - 5) / 45) * 100}%, #e5e7eb ${((config.emergencyStopPct - 5) / 45) * 100}%, #e5e7eb 100%)`,
              }}
            />
            <div className="flex items-center justify-between mt-1.5">
              <span className="text-[10px] text-gray-400">5%</span>
              <span className="text-[10px] text-gray-400">50%</span>
            </div>
          </div>

          {/* Paper Trading Toggle */}
          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
            <div>
              <p className="text-sm font-bold text-gray-900">Paper Trading Mode</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Use fake money — no real risk. Perfect for testing.</p>
            </div>
            <button
              onClick={() => updateConfig({ paperMode: !config.paperMode })}
              className="shrink-0 transition-colors"
              style={{ color: config.paperMode ? "#FF4D00" : "#D1D5DB" }}
            >
              {config.paperMode ? <ToggleRight size={36} /> : <ToggleLeft size={36} />}
            </button>
          </div>
        </div>

        {/* ── WALLET SECTION ── */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#1E3A8A1A", color: "#1E3A8A" }}>
              <Wallet size={18} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Wallet</h2>
          </div>

          {config.walletAddress ? (
            <div className="space-y-4 flex-1">
              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Connected Address</p>
                <div className="flex items-center gap-2">
                  <CircleDot size={14} className="text-emerald-500" />
                  <code className="text-sm font-bold text-gray-900 tracking-wide">{shortenAddress(config.walletAddress)}</code>
                  <button
                    onClick={handleCopyAddress}
                    className="ml-auto text-gray-400 hover:text-gray-600 transition-colors"
                    title="Copy address"
                  >
                    {copied ? <CheckCircle2 size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-gray-50 border border-gray-100">
                <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Network</p>
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-white">P</span>
                  </div>
                  <span className="text-sm font-semibold text-gray-900">Polygon (MATIC)</span>
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
            <div className="flex-1 flex flex-col items-center justify-center text-center py-8">
              <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
                <Wallet size={28} className="text-gray-300" />
              </div>
              <p className="text-sm font-semibold text-gray-900 mb-1">No wallet connected</p>
              <p className="text-[11px] text-gray-400 mb-6 max-w-[200px] leading-snug">
                Connect a Polygon wallet to enable live trading and manage your USDC balance.
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
                    <Wallet size={15} /> Connect Polygon Wallet
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ════════ ACTION BUTTONS ════════ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* START */}
        <button
          onClick={() => setConfirmStart(true)}
          disabled={config.botStatus === "running" || config.botStatus === "paper"}
          className="flex items-center justify-center gap-3 py-5 rounded-2xl text-lg font-black text-white transition-all hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          style={{ backgroundColor: "#059669" }}
        >
          <Power size={22} />
          {config.botStatus === "stopped" ? "START ROBOT" : config.paperMode ? "PAPER MODE ACTIVE" : "ROBOT RUNNING"}
        </button>

        {/* EMERGENCY STOP */}
        <button
          onClick={() => setConfirmStop(true)}
          disabled={config.botStatus === "stopped"}
          className="flex items-center justify-center gap-3 py-5 rounded-2xl text-lg font-black text-white transition-all hover:opacity-90 hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none"
          style={{ backgroundColor: "#DC2626" }}
        >
          <OctagonX size={22} /> EMERGENCY STOP
        </button>
      </div>

      {/* ════════ RECENT ACTIVITY ════════ */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: "#FF4D001A", color: "#FF4D00" }}>
              <Activity size={18} />
            </div>
            <h2 className="text-sm font-bold text-gray-900">Recent Activity</h2>
          </div>
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">{logs.length} events</span>
        </div>

        <div className="max-h-72 overflow-y-auto -mx-2 px-2 space-y-1">
          {logs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
            >
              <div className="w-6 h-6 rounded-lg bg-gray-50 flex items-center justify-center shrink-0 mt-0.5">
                {logIcon(log.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] text-gray-700 leading-snug">{log.message}</p>
                <p className="text-[10px] text-gray-400 mt-0.5 flex items-center gap-1">
                  <Clock size={9} /> {log.time}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ════════ CONFIRMATION DIALOGS ════════ */}
      <ConfirmDialog
        open={confirmStart}
        title={config.paperMode ? "Start Paper Trading?" : "Start Live Trading?"}
        description={
          config.paperMode
            ? "The robot will run with fake money. No real funds will be at risk. You can stop at any time."
            : `The robot will trade with REAL money. Max daily loss is set to $${config.maxDailyLoss}. Emergency stop at ${config.emergencyStopPct}% drawdown. Are you sure?`
        }
        confirmLabel={config.paperMode ? "Start Paper Trading" : "Start Live Trading"}
        confirmColor={config.paperMode ? "#D97706" : "#059669"}
        onConfirm={handleStart}
        onCancel={() => setConfirmStart(false)}
      />

      <ConfirmDialog
        open={confirmStop}
        title="Emergency Stop"
        description="This will immediately close all open positions and stop the robot. Any pending orders will be cancelled."
        confirmLabel="Stop Everything"
        confirmColor="#DC2626"
        onConfirm={handleStop}
        onCancel={() => setConfirmStop(false)}
      />

      {/* ════════ RANGE INPUT STYLES ════════ */}
      <style jsx>{`
        input[type="range"]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 3px solid currentColor;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer;
        }
        input[type="range"]::-moz-range-thumb {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: white;
          border: 3px solid currentColor;
          box-shadow: 0 2px 6px rgba(0,0,0,0.15);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
