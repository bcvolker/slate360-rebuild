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
          : "border border-slate-800 bg-slate-950/70"
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
                <p className="text-base font-bold text-slate-100 mb-1">🤖 Robot is not running</p>
                <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
                  Start in <strong className="text-slate-200">practice mode</strong> — the robot scans real Polymarket listings,
                  picks trades automatically, and logs results.{" "}
                  <strong className="text-slate-200">No real money required.</strong>
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
            { label: "Mode", value: isPaper ? "Practice" : "Live", color: isPaper ? "text-purple-300" : "text-green-300" },
          ].map(stat => (
            <div key={stat.label} className="rounded-2xl border border-slate-700 bg-slate-900/80 p-3 text-center">
              <p className="text-[10px] text-slate-500 uppercase tracking-wide">{stat.label}</p>
              <p className={`text-xl font-black mt-1 ${stat.color ?? "text-slate-100"}`}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Quick-start templates (only when bot is idle) ── */}
      {!isActive && (
        <div>
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3">
            Or choose a template to start with
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {QUICK_STARTS.map(rec => (
              <button
                key={rec.id}
                onClick={() => onApplyRecommendation(presetToPlan(rec, "practice"))}
                className="p-4 rounded-2xl border border-slate-700 bg-slate-950/70 text-left hover:border-cyan-400/30 hover:bg-slate-900 transition"
              >
                <p className="text-2xl mb-2">{rec.emoji}</p>
                <p className="font-semibold text-slate-100 text-sm leading-snug">{rec.title}</p>
                <p className="text-[11px] text-slate-400 mt-1 mb-3 leading-relaxed">{rec.why}</p>
                <span className="inline-block text-[10px] px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-200 border border-purple-400/25">
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
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-slate-700 bg-slate-950/70 text-sm text-slate-200 hover:bg-slate-900 hover:border-cyan-400/30 transition font-medium"
          >
            <span>{link.emoji}</span> {link.label}
          </button>
        ))}
      </div>

      {/* ── YES/NO explainer ── */}
      <div className="border border-slate-700 bg-slate-950/70 rounded-2xl overflow-hidden">
        <button
          onClick={() => setExplainerOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-slate-200 hover:bg-slate-900 transition"
        >
          <span>ℹ️ What is YES / NO betting on Polymarket?</span>
          <span className="text-slate-500 text-xs">{explainerOpen ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {explainerOpen && (
          <div className="px-4 pb-4 space-y-2 text-xs text-slate-400 border-t border-slate-700 pt-3">
            <p><strong className="text-slate-200">YES</strong> — you think an event will happen. Pays $1 per share if it resolves YES.</p>
            <p><strong className="text-slate-200">NO</strong> — you think it won&apos;t happen. Pays $1 per share if it resolves NO.</p>
            <p>Prices are in cents (0–99¢). A YES at 60¢ means roughly a 60% probability the event happens.</p>
            <p>Your <strong className="text-slate-200">max loss</strong> is always the amount you spend. Your <strong className="text-slate-200">max win</strong> = shares × $1.00.</p>
            <p className="text-slate-500">
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
