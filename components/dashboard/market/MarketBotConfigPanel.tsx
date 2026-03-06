"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import { FOCUS_AREAS } from "@/components/dashboard/market/market-constants";
import type { BotConfig } from "@/components/dashboard/market/types";

interface MarketBotConfigPanelProps {
  config: BotConfig;
  appliedConfig: Record<string, unknown> | null;
  trades: { id: string }[];
  onApplyPreset: (p: "starter" | "balanced" | "active") => void;
  onPaperModeToggle: () => void;
  onSaveSimRun: () => void;
  onCapitalChange: (v: number) => void;
  onMaxPositionsChange: (v: number) => void;
  onMinEdgeChange: (v: number) => void;
  onMinVolumeChange: (v: number) => void;
  onMinProbLowChange: (v: number) => void;
  onMinProbHighChange: (v: number) => void;
  onRiskMixChange: (v: "conservative" | "balanced" | "aggressive") => void;
  onWhaleFollowToggle: () => void;
  onToggleFocus: (area: string) => void;
  onStartBot: () => void;
  onPauseBot: () => void;
  onStopBot: () => void;
  onRunScan: () => void;
}

export default function MarketBotConfigPanel({
  config,
  appliedConfig,
  trades,
  onApplyPreset,
  onPaperModeToggle,
  onSaveSimRun,
  onCapitalChange,
  onMaxPositionsChange,
  onMinEdgeChange,
  onMinVolumeChange,
  onMinProbLowChange,
  onMinProbHighChange,
  onRiskMixChange,
  onWhaleFollowToggle,
  onToggleFocus,
  onStartBot,
  onPauseBot,
  onStopBot,
  onRunScan,
}: MarketBotConfigPanelProps) {
  const { paperMode, botRunning, botPaused, scanning, capitalAlloc, maxPositions, minEdge,
    minVolume, minProbLow, minProbHigh, riskMix, whaleFollow, focusAreas } = config;

  return (
    <div className="space-y-4">
      {/* Bot Controls */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
        <h3 className="font-semibold text-xs text-gray-400 uppercase tracking-widest">Bot Controls</h3>
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
            <p className="text-[10px] text-gray-500">Mode</p>
            <p className="text-xs font-semibold text-gray-900">{paperMode ? "Paper" : "Live"}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
            <p className="text-[10px] text-gray-500">Bot</p>
            <p className="text-xs font-semibold text-gray-900">{botRunning ? (botPaused ? "Paused" : "Running") : "Stopped"}</p>
          </div>
          <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
            <p className="text-[10px] text-gray-500">Scan</p>
            <p className="text-xs font-semibold text-gray-900">{scanning ? "Active" : "Idle"}</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {!botRunning ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={onStartBot} className="flex-1 bg-[#FF4D00] hover:bg-orange-600 text-white py-2 rounded-lg text-sm font-bold transition">▶ Start Autopilot</button>
              </TooltipTrigger>
              <TooltipContent>Start the market scanning bot with current settings.</TooltipContent>
            </Tooltip>
          ) : (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onPauseBot} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg text-sm font-bold transition">
                    {botPaused ? "▶ Resume" : "⏸ Pause"}
                  </button>
                </TooltipTrigger>
                <TooltipContent>Pause or resume the bot without losing its state.</TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button onClick={onStopBot} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold transition">⛔ Stop</button>
                </TooltipTrigger>
                <TooltipContent>Stop the bot completely.</TooltipContent>
              </Tooltip>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onRunScan} disabled={scanning}
                className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50">
                {scanning ? "🔍 Scanning…" : "🔍 Run One Scan"}
              </button>
            </TooltipTrigger>
            <TooltipContent>Run a one-time scan immediately.</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 flex items-center">Paper Mode <HelpTip content="Paper mode simulates trades without spending real money." /></span>
          <button onClick={onPaperModeToggle} className={`relative w-10 h-5 rounded-full transition ${paperMode ? "bg-purple-600" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${paperMode ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        {trades.length > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button onClick={onSaveSimRun} className="w-full bg-gray-100 hover:bg-gray-200 border border-gray-200 py-2 rounded-lg text-sm text-gray-700 transition">
                💾 Save This Simulation Run
              </button>
            </TooltipTrigger>
            <TooltipContent>Save a snapshot of the current P/L chart and settings for comparison later.</TooltipContent>
          </Tooltip>
        )}
      </div>

      {/* Bot Configuration */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h3 className="font-semibold text-xs text-gray-400 uppercase tracking-widest">Configuration</h3>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">Safe preset defaults</span>
        </div>
        <div>
          <label className="flex items-center text-xs text-gray-500 mb-2">Quick Setup <HelpTip content="Choose a preset to configure position count, filters, and risk in one click." /></label>
          <div className="grid grid-cols-3 gap-1">
            {(["starter", "balanced", "active"] as const).map(p => (
              <button key={p} onClick={() => onApplyPreset(p)} className="py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition capitalize">{p}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="flex items-center text-xs text-gray-500 mb-1">Session Budget ($) <HelpTip content="Total paper/live budget used by the bot for this session." /></label>
          <div className="flex items-center gap-2">
            <input type="range" min={50} max={5000} step={50} value={capitalAlloc} onChange={e => onCapitalChange(+e.target.value)} className="flex-1 accent-[#FF4D00]" />
            <span className="text-sm font-mono text-gray-900 w-16 text-right">${capitalAlloc}</span>
          </div>
        </div>
        <div>
          <label className="flex items-center text-xs text-gray-500 mb-1">Max Open Positions <HelpTip content="Maximum number of simultaneous open bets." /></label>
          <div className="flex items-center gap-2">
            <input type="range" min={1} max={20} value={maxPositions} onChange={e => onMaxPositionsChange(+e.target.value)} className="flex-1 accent-[#FF4D00]" />
            <span className="text-sm font-mono text-gray-900 w-8 text-right">{maxPositions}</span>
          </div>
        </div>
        <div>
          <label className="flex items-center text-xs text-gray-500 mb-1">Min Deal Advantage <HelpTip content="Higher values mean the bot only takes stronger opportunities." /></label>
          <div className="flex items-center gap-2">
            <input type="range" min={1} max={20} value={minEdge} onChange={e => onMinEdgeChange(+e.target.value)} className="flex-1 accent-[#FF4D00]" />
            <span className="text-sm font-mono text-gray-900 w-10 text-right">{minEdge}%</span>
          </div>
        </div>
        <div>
          <label className="flex items-center text-xs text-gray-500 mb-1">Min Market Activity ($/24h) <HelpTip content="Higher values avoid thin markets." /></label>
          <div className="flex items-center gap-2">
            <input type="range" min={1000} max={500000} step={1000} value={minVolume} onChange={e => onMinVolumeChange(+e.target.value)} className="flex-1 accent-[#FF4D00]" />
            <span className="text-xs font-mono text-gray-900 w-20 text-right">${minVolume.toLocaleString()}</span>
          </div>
        </div>
        <div>
          <label className="flex items-center text-xs text-gray-500 mb-1">Probability Range: {minProbLow}% – {minProbHigh}% <HelpTip content="Only trade markets where YES probability is within this range." /></label>
          <div className="flex gap-2">
            <input type="range" min={0} max={50} value={minProbLow} onChange={e => onMinProbLowChange(+e.target.value)} className="flex-1 accent-[#FF4D00]" />
            <input type="range" min={50} max={100} value={minProbHigh} onChange={e => onMinProbHighChange(+e.target.value)} className="flex-1 accent-[#FF4D00]" />
          </div>
        </div>
        <div>
          <label className="flex items-center text-xs text-gray-500 mb-2">Risk Style <HelpTip content="Adjusts the bot's appetite for risk." /></label>
          <div className="flex gap-1">
            {(["conservative", "balanced", "aggressive"] as const).map(r => (
              <button key={r} onClick={() => onRiskMixChange(r)}
                className={`flex-1 py-1 text-xs rounded-lg font-medium transition ${riskMix === r ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                {r === "conservative" ? "Safe" : r === "balanced" ? "Balanced" : "Aggressive"}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700 flex items-center">Follow Whale Wallets <HelpTip content="Mirror large ($5k+) trades from sophisticated market participants." /></span>
          <button onClick={onWhaleFollowToggle} className={`relative w-10 h-5 rounded-full transition ${whaleFollow ? "bg-[#1E3A8A]" : "bg-gray-300"}`}>
            <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${whaleFollow ? "translate-x-5" : "translate-x-0.5"}`} />
          </button>
        </div>
        <div>
          <label className="flex items-center text-xs text-gray-500 mb-2">Focus Areas <HelpTip content="Restrict the bot to markets in these categories." /></label>
          <div className="flex flex-wrap gap-1">
            {FOCUS_AREAS.map(area => (
              <button key={area} onClick={() => onToggleFocus(area)}
                className={`px-2 py-0.5 text-xs rounded-full transition ${focusAreas.includes(area) ? "bg-[#1E3A8A] text-blue-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                {area}
              </button>
            ))}
          </div>
        </div>
        {appliedConfig && (
          <details className="rounded-xl border border-gray-200 bg-gray-50 p-3 group">
            <summary className="text-[11px] font-semibold text-gray-700 cursor-pointer list-none flex items-center justify-between">
              Applied by backend <span className="text-[10px] text-gray-400 group-open:rotate-180 transition">⌃</span>
            </summary>
            <pre className="mt-2 text-[10px] text-gray-600 whitespace-pre-wrap break-words">{JSON.stringify(appliedConfig, null, 2)}</pre>
          </details>
        )}
      </div>
    </div>
  );
}
