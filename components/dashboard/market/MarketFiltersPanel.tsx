"use client";

import React from "react";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import { FOCUS_AREAS } from "@/components/dashboard/market/market-constants";
import type { MktTimeframe, MktRiskTag, MarketSortKey } from "@/components/dashboard/market/types";

type QuickPreset = "construction" | "high-volume" | "mispriced" | "closing-soon" | "crypto";

interface MarketFiltersPanelProps {
  marketSearch: string;
  mktTimeframe: MktTimeframe;
  mktCategory: string;
  mktProbMin: number;
  mktProbMax: number;
  mktMinVol: number;
  mktMinEdge: number;
  mktRiskTag: MktRiskTag;
  mktSortBy: MarketSortKey;
  mktSortDir: "asc" | "desc";
  filtersExpanded: boolean;
  wsConnected: boolean;
  marketsLoaded: boolean;
  loadingMarkets: boolean;
  filteredMarketsCount: number;
  previewSummary: { marketsScanned: number; opportunitiesFound: number; decisions: number } | null;
  onSearchChange: (q: string) => void;
  onSearch: (kw?: string) => void;
  onTimeframeChange: (tf: MktTimeframe) => void;
  onCategoryChange: (c: string) => void;
  onProbMinChange: (v: number) => void;
  onProbMaxChange: (v: number) => void;
  onMinVolChange: (v: number) => void;
  onMinEdgeChange: (v: number) => void;
  onRiskTagChange: (t: MktRiskTag) => void;
  onSortByChange: (k: MarketSortKey) => void;
  onFiltersToggle: () => void;
  onApplyPreset: (p: QuickPreset) => void;
  onClearMarkets: () => void;
}

const TIMEFRAME_OPTIONS = [
  { key: "hour", label: "Next Hour" },
  { key: "day", label: "Next Day" },
  { key: "week", label: "Next Week" },
  { key: "month", label: "Next Month" },
  { key: "year", label: "Next Year" },
  { key: "today", label: "Ends Today" },
  { key: "tomorrow", label: "Ends Tomorrow" },
  { key: "all", label: "All Time" },
] as const;

const RISK_TAG_OPTIONS = [
  { value: "all", label: "All" },
  { value: "hot", label: "🔥 Hot" },
  { value: "high-potential", label: "📈 High Potential" },
  { value: "high-risk", label: "⚠️ High Risk" },
  { value: "construction", label: "🏗️ Construction" },
  { value: "none", label: "No Tag" },
] as const;

const SORT_OPTIONS = [
  { key: "volume" as const, label: "Volume" },
  { key: "edge" as const, label: "Advantage %" },
  { key: "probability" as const, label: "Probability" },
  { key: "title" as const, label: "A→Z" },
  { key: "endDate" as const, label: "End Date" },
];

const QUICK_PRESETS = [
  { key: "construction" as QuickPreset, label: "Construction", icon: "🏗️" },
  { key: "high-volume" as QuickPreset, label: "High Volume", icon: "💧" },
  { key: "mispriced" as QuickPreset, label: "Mispriced", icon: "⚖️" },
  { key: "closing-soon" as QuickPreset, label: "Closing Soon", icon: "⏳" },
  { key: "crypto" as QuickPreset, label: "Crypto", icon: "₿" },
];

export default function MarketFiltersPanel({
  marketSearch, mktTimeframe, mktCategory, mktProbMin, mktProbMax,
  mktMinVol, mktMinEdge, mktRiskTag, mktSortBy, mktSortDir, filtersExpanded,
  wsConnected, marketsLoaded, loadingMarkets, filteredMarketsCount, previewSummary,
  onSearchChange, onSearch, onTimeframeChange, onCategoryChange,
  onProbMinChange, onProbMaxChange, onMinVolChange, onMinEdgeChange,
  onRiskTagChange, onSortByChange, onFiltersToggle, onApplyPreset, onClearMarkets,
}: MarketFiltersPanelProps) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
      <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-1">
        Markets Explorer
        <HelpTip content="Search live Polymarket markets. Enter a keyword and click Search, then filter results." />
        {wsConnected && (
          <span className="ml-2 flex items-center gap-1 text-[10px] text-green-600 font-medium">
            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />Live
          </span>
        )}
      </h3>

      {/* Timeframe chips */}
      <div className="flex flex-wrap gap-1.5">
        {TIMEFRAME_OPTIONS.map(t => (
          <button key={t.key} onClick={() => onTimeframeChange(t.key as MktTimeframe)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mktTimeframe === t.key ? "bg-[#FF4D00] text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D00]/40 hover:text-[#FF4D00]"}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Search row */}
      <div className="flex gap-2">
        <input type="text" placeholder="Search markets — e.g. Bitcoin, construction, election…"
          value={marketSearch} onChange={e => onSearchChange(e.target.value)}
          onKeyDown={e => e.key === "Enter" && onSearch()}
          className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#FF4D00] focus:ring-2 focus:ring-[#FF4D00]/10 transition-all" />
        <button onClick={() => onSearch()} disabled={loadingMarkets}
          className="bg-[#FF4D00] hover:bg-orange-600 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 whitespace-nowrap">
          {loadingMarkets ? "Searching…" : "Search"}
        </button>
      </div>

      {marketsLoaded && (
        <div className="space-y-3 pt-1 border-t border-gray-100">
          {/* Quick presets */}
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PRESETS.map(p => (
              <button key={p.key} onClick={() => onApplyPreset(p.key)}
                className="px-3 py-1.5 rounded-full bg-white border border-gray-200 text-gray-700 text-xs font-semibold hover:border-[#FF4D00] hover:text-[#FF4D00] hover:bg-[#FF4D00]/5 transition-all flex items-center gap-1.5">
                <span>{p.icon}</span>{p.label}
              </button>
            ))}
          </div>

          {/* Active filter pills */}
          <div className="flex flex-wrap items-center gap-1.5">
            {mktTimeframe !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[11px] font-semibold border border-indigo-200">
                {mktTimeframe} <button onClick={() => onTimeframeChange("all")} className="ml-0.5 hover:text-red-600">×</button>
              </span>
            )}
            {mktCategory !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#1E3A8A]/10 text-[#1E3A8A] text-[11px] font-semibold border border-[#1E3A8A]/20">
                {mktCategory} <button onClick={() => onCategoryChange("all")} className="ml-0.5 hover:text-red-600">×</button>
              </span>
            )}
            {mktRiskTag !== "all" && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#FF4D00]/10 text-[#FF4D00] text-[11px] font-semibold border border-[#FF4D00]/20">
                {mktRiskTag.replace("-", " ")} <button onClick={() => onRiskTagChange("all")} className="ml-0.5 hover:text-red-600">×</button>
              </span>
            )}
            {mktMinVol > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold border border-gray-200">
                Vol ≥ ${(mktMinVol/1000).toFixed(0)}k <button onClick={() => onMinVolChange(0)} className="ml-0.5 hover:text-red-600">×</button>
              </span>
            )}
            {mktMinEdge > 0 && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold border border-gray-200">
                Edge ≥ {mktMinEdge}% <button onClick={() => onMinEdgeChange(0)} className="ml-0.5 hover:text-red-600">×</button>
              </span>
            )}
            {(mktProbMin > 0 || mktProbMax < 100) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-[11px] font-semibold border border-gray-200">
                Prob {mktProbMin}–{mktProbMax}% <button onClick={() => { onProbMinChange(0); onProbMaxChange(100); }} className="ml-0.5 hover:text-red-600">×</button>
              </span>
            )}
            <button onClick={onFiltersToggle}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${filtersExpanded ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-200"}`}>
              {filtersExpanded ? "Hide Filters ▲" : "More Filters ▼"}
            </button>
          </div>

          {filtersExpanded && (
            <div className="bg-gray-50/80 rounded-xl border border-gray-100 p-4 space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-semibold">Category</label>
                <div className="flex flex-wrap gap-1.5">
                  {["all", ...FOCUS_AREAS.map(a => a.toLowerCase())].map(cat => (
                    <button key={cat} onClick={() => onCategoryChange(cat)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mktCategory === cat ? "bg-[#1E3A8A] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-[#1E3A8A]/40 hover:text-[#1E3A8A]"}`}>
                      {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-semibold">Risk Classification</label>
                <div className="flex flex-wrap gap-1.5">
                  {RISK_TAG_OPTIONS.map(tag => (
                    <button key={tag.value} onClick={() => onRiskTagChange(tag.value as MktRiskTag)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${mktRiskTag === tag.value ? "bg-[#FF4D00] text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-[#FF4D00]/40 hover:text-[#FF4D00]"}`}>
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-2 block font-semibold">Sort By</label>
                <div className="flex flex-wrap gap-1.5">
                  {SORT_OPTIONS.map(s => (
                    <button key={s.key} onClick={() => onSortByChange(s.key)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${mktSortBy === s.key ? "bg-gray-900 text-white shadow-sm" : "bg-white border border-gray-200 text-gray-600 hover:border-gray-400"}`}>
                      {s.label} {mktSortBy === s.key && (mktSortDir === "asc" ? "↑" : "↓")}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 font-semibold">Min Advantage: {mktMinEdge}%</label>
                  <input type="range" min={0} max={30} value={mktMinEdge} onChange={e => onMinEdgeChange(+e.target.value)} className="w-full accent-[#FF4D00]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 font-semibold">Min Volume: ${mktMinVol.toLocaleString()}</label>
                  <input type="range" min={0} max={100000} step={1000} value={mktMinVol} onChange={e => onMinVolChange(+e.target.value)} className="w-full accent-[#FF4D00]" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 flex items-center gap-1 font-semibold">Probability: {mktProbMin}%–{mktProbMax}%</label>
                  <div className="flex items-center gap-2">
                    <input type="range" min={0} max={100} value={mktProbMin} onChange={e => onProbMinChange(Math.min(+e.target.value, mktProbMax - 1))} className="w-full accent-[#FF4D00]" />
                    <input type="range" min={0} max={100} value={mktProbMax} onChange={e => onProbMaxChange(Math.max(+e.target.value, mktProbMin + 1))} className="w-full accent-[#FF4D00]" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {marketsLoaded && (
        <div className="flex gap-3 items-center text-xs text-gray-400">
          <span>{filteredMarketsCount} results</span>
          {previewSummary && (
            <span className="text-gray-500">Preview: {previewSummary.opportunitiesFound} edges, {previewSummary.decisions} candidate deals</span>
          )}
          <button onClick={() => onSearch()} className="text-gray-500 hover:text-gray-900 transition">↻ Refresh</button>
          <button onClick={onClearMarkets} className="text-gray-400 hover:text-gray-500 transition">Clear</button>
        </div>
      )}
    </div>
  );
}
