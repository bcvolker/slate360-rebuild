"use client";

import React, { useEffect, useState } from "react";
import type { SchedulerHealthViewModel } from "@/lib/market/contracts";
import type { ServerBotStatus } from "@/lib/hooks/useMarketServerStatus";

type Mode = "practice" | "real";
type PathChoice = "recommendations" | "direct-buy" | "automation";

interface MarketStartHereTabProps {
  onNavigate: (tabId: string) => void;
  paperMode: boolean;
  serverStatus: ServerBotStatus;
  serverConfirmed: boolean;
  serverHealth: SchedulerHealthViewModel | null;
}

interface RecommendationPreset {
  id: string;
  emoji: string;
  title: string;
  subtitle: string;
  why: string;
  budget: number;
  risk: string;
  mode: "practice" | "real";
  activity: "low" | "medium" | "high";
  categories: string[];
}

const RECOMMENDATIONS: RecommendationPreset[] = [
  { id: "small-wallet", emoji: "💼", title: "Best for $100–$300 wallet", subtitle: "Start small with conservative settings", why: "Low position sizes protect your capital while you learn. Makes 1–3 trades per day with tight loss limits.", budget: 200, risk: "conservative", mode: "practice", activity: "low", categories: ["General", "Politics"] },
  { id: "safer-starter", emoji: "🛡️", title: "Safer starter plan", subtitle: "Balanced risk, practice mode recommended", why: "Focuses on high-liquidity markets where fills are predictable. Limits exposure to any single outcome.", budget: 300, risk: "conservative", mode: "practice", activity: "low", categories: ["General", "Economy"] },
  { id: "hands-off", emoji: "🤖", title: "Hands-off weekly scan", subtitle: "Set it up once and let it run", why: "Scans once per hour, up to 5 trades per day. Diversified across categories — check in once a week.", budget: 500, risk: "balanced", mode: "practice", activity: "medium", categories: ["General", "Economy", "Politics", "Crypto"] },
  { id: "short-markets", emoji: "⏳", title: "Short-lived market focus", subtitle: "Markets expiring within 24 hours", why: "Faster resolution gives quicker feedback. Ideal for testing whether the robot is making good calls.", budget: 250, risk: "balanced", mode: "practice", activity: "high", categories: ["General", "Sports"] },
  { id: "construction-niche", emoji: "🏗️", title: "Construction & economy niche", subtitle: "Specialized focus on industry-relevant markets", why: "Your domain knowledge gives a natural edge on construction, infrastructure, and economic policy markets.", budget: 400, risk: "aggressive", mode: "practice", activity: "medium", categories: ["Construction", "Economy", "Infrastructure"] },
  { id: "micro-test", emoji: "🔬", title: "Micro budget test ($50)", subtitle: "Most beginner-friendly — minimal risk", why: "The cheapest way to understand YES/NO buying. Paper mode by default. Upgrade whenever you're ready.", budget: 50, risk: "conservative", mode: "practice", activity: "low", categories: ["General"] },
];

export default function MarketStartHereTab({ onNavigate, paperMode, serverStatus, serverConfirmed, serverHealth }: MarketStartHereTabProps) {
  const [mode, setMode] = useState<Mode>("practice");
  const [showStepper, setShowStepper] = useState(false);
  const [activePath, setActivePath] = useState<PathChoice>("recommendations");
  const [explainerOpen, setExplainerOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const savedMode = localStorage.getItem("market_mode_pref");
    if (savedMode === "practice" || savedMode === "real") {
      setMode(savedMode);
    }
    setShowStepper(!localStorage.getItem("market_onboarded"));
  }, []);

  const handleModeChange = (m: Mode) => {
    setMode(m);
    if (typeof window !== "undefined") localStorage.setItem("market_mode_pref", m);
  };

  const dismissStepper = () => {
    if (typeof window !== "undefined") localStorage.setItem("market_onboarded", "1");
    setShowStepper(false);
  };

  const PATHS = [
    { id: "recommendations" as PathChoice, emoji: "🤖", title: "Use Recommendations", desc: "Let the robot suggest a ready-to-go setup based on your wallet and goals." },
    { id: "direct-buy" as PathChoice, emoji: "🔍", title: "Browse & Buy Directly", desc: "Search live markets and place a manual buy on any YES/NO outcome." },
    { id: "automation" as PathChoice, emoji: "⚙️", title: "Set Up Automation", desc: "Configure the robot to scan and trade automatically in the background." },
  ];

  return (
    <div className="space-y-5">
      {/* First-run banner */}
      {showStepper && (
        <div className="rounded-xl bg-gradient-to-r from-[#FF4D00]/10 to-orange-50 border border-[#FF4D00]/20 p-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gray-900">Welcome to Market Robot 👋</p>
            <p className="text-xs text-gray-600 mt-1">
              Start in <strong>Practice Mode</strong> to test the robot without spending real money.
              When ready, switch to <strong>Real Money</strong> and complete wallet setup.
            </p>
          </div>
          <button onClick={dismissStepper} className="text-gray-400 hover:text-gray-700 text-xl leading-none shrink-0 mt-0.5">×</button>
        </div>
      )}

      {/* Bot status bar — server-confirmed */}
      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
        {serverConfirmed ? (
          <span className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium ${
            serverStatus === "running" ? "bg-orange-50 border-orange-200 text-orange-700" :
            serverStatus === "paused" ? "bg-amber-50 border-amber-200 text-amber-700" :
            serverStatus === "paper" ? "bg-purple-50 border-purple-200 text-purple-700" :
            "bg-gray-100 border-gray-200 text-gray-500"
          }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${
              serverStatus === "running" ? "bg-orange-500 animate-pulse" :
              serverStatus === "paused" ? "bg-amber-500" :
              serverStatus === "paper" ? "bg-purple-500 animate-pulse" :
              "bg-gray-400"
            }`} />
            {serverStatus === "running" ? "Robot running (server confirmed)" :
             serverStatus === "paused" ? "Robot paused (server confirmed)" :
             serverStatus === "paper" ? "Robot running — paper mode (server confirmed)" :
             "Robot stopped"}
          </span>
        ) : (
          <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border font-medium bg-gray-100 border-gray-200 text-gray-400">
            <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
            Checking server status…
          </span>
        )}
        {paperMode && (
          <span className="px-2.5 py-1 rounded-full border bg-purple-50 border-purple-200 text-purple-700 font-medium">Paper mode</span>
        )}
        {serverHealth?.lastRunIso && (
          <span className="text-gray-400">
            Last run: {new Date(serverHealth.lastRunIso).toLocaleTimeString()}
          </span>
        )}
        {serverHealth && serverHealth.tradesToday > 0 && (
          <span className="text-gray-400">
            {serverHealth.tradesToday} trade{serverHealth.tradesToday !== 1 ? "s" : ""} today
          </span>
        )}
        {serverHealth?.lastError && (
          <span className="text-red-500 text-[11px]" title={serverHealth.lastError}>
            ⚠ Last error: {serverHealth.lastError.slice(0, 60)}
          </span>
        )}
      </div>

      {/* Mode selector */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Your mode</p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => handleModeChange("practice")}
            className={`rounded-xl border-2 p-3 text-left transition ${mode === "practice" ? "border-purple-500 bg-purple-50" : "border-gray-200 hover:border-gray-300"}`}
          >
            <p className="font-semibold text-gray-900 text-sm">🧪 Practice Mode</p>
            <p className="text-xs text-gray-500 mt-0.5">No real money. Learn and test strategies safely.</p>
          </button>
          <button
            onClick={() => handleModeChange("real")}
            className={`rounded-xl border-2 p-3 text-left transition ${mode === "real" ? "border-green-500 bg-green-50" : "border-gray-200 hover:border-gray-300"}`}
          >
            <p className="font-semibold text-gray-900 text-sm">💵 Real Money</p>
            <p className="text-xs text-gray-500 mt-0.5">Live trades on Polymarket. Requires a wallet.</p>
          </button>
        </div>
        {mode === "real" && (
          <p className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            ⚠️ Set up your wallet first in the{" "}
            <button onClick={() => onNavigate("live-wallet")} className="underline font-semibold">Live Wallet tab</button>
            {" "}before placing real trades.
          </p>
        )}
      </div>

      {/* Path selection */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">What would you like to do?</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {PATHS.map(path => (
            <button
              key={path.id}
              onClick={() => {
                if (path.id === "direct-buy" || path.id === "automation") {
                  onNavigate(path.id);
                } else {
                  setActivePath(path.id);
                }
              }}
              className={`p-4 rounded-xl border-2 text-left transition hover:shadow-sm ${
                activePath === path.id && path.id === "recommendations"
                  ? "border-[#FF4D00] bg-orange-50"
                  : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
              }`}
            >
              <p className="text-2xl mb-2">{path.emoji}</p>
              <p className="font-semibold text-gray-900 text-sm">{path.title}</p>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">{path.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Recommendations grid */}
      {activePath === "recommendations" && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommended plans for you</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {RECOMMENDATIONS.map(rec => (
              <div key={rec.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex flex-col">
                <p className="text-2xl mb-2">{rec.emoji}</p>
                <p className="font-semibold text-gray-900 text-sm leading-snug">{rec.title}</p>
                <p className="text-xs text-gray-500 mt-0.5 mb-2">{rec.subtitle}</p>
                <p className="text-[11px] text-gray-400 leading-relaxed flex-1">{rec.why}</p>
                <div className="flex flex-wrap gap-1 mt-3 mb-3">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">${rec.budget} budget</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{rec.risk}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
                    {rec.mode === "practice" ? "Practice first" : "Live ready"}
                  </span>
                </div>
                <button
                  onClick={() => onNavigate("automation")}
                  className="w-full py-2 rounded-lg bg-[#FF4D00] text-white text-xs font-semibold hover:bg-[#e04400] transition"
                >
                  Apply this plan →
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* YES/NO explainer accordion */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <button
          onClick={() => setExplainerOpen(v => !v)}
          className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition"
        >
          <span>ℹ️ What does YES / NO mean?</span>
          <span className="text-gray-400 text-xs">{explainerOpen ? "▲ Hide" : "▼ Show"}</span>
        </button>
        {explainerOpen && (
          <div className="px-4 pb-4 space-y-2.5 text-xs text-gray-600 border-t border-gray-100 pt-3">
            <p><strong>YES</strong> — you believe the event will happen. Pays out $1 per share if the market resolves YES.</p>
            <p><strong>NO</strong> — you believe it won&apos;t happen. Pays out $1 per share if the market resolves NO.</p>
            <p>Prices are in cents (0–99¢). A YES price of 60¢ implies a 60% probability the event happens.</p>
            <p>Your <strong>max loss</strong> is always the amount you spend. Your <strong>max payout</strong> = shares × $1.</p>
            <button
              onClick={() => onNavigate("direct-buy")}
              className="mt-1 text-[#FF4D00] font-semibold underline"
            >
              Browse live markets and try it →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
