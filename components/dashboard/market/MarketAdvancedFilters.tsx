"use client";

import React from "react";
import type { MarketSortKey, MktRiskTag } from "@/components/dashboard/market/types";

interface MarketAdvancedFiltersProps {
  minEdge: number;
  onMinEdgeChange: (v: number) => void;
  probMin: number;
  onProbMinChange: (v: number) => void;
  probMax: number;
  onProbMaxChange: (v: number) => void;
  sortBy: MarketSortKey;
  onSortByChange: (v: MarketSortKey) => void;
  category: string;
  onCategoryChange: (v: string) => void;
  availableCategories: string[];
  riskTag: MktRiskTag;
  onRiskTagChange: (v: MktRiskTag) => void;
  minVolume: number;
  onMinVolumeChange: (v: number) => void;
  minLiquidity: number;
  onMinLiquidityChange: (v: number) => void;
  maxSpread: number;
  onMaxSpreadChange: (v: number) => void;
}

function toNumber(value: string, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export default function MarketAdvancedFilters(props: MarketAdvancedFiltersProps) {
  return (
    <div className="border-t border-slate-700 pt-2">
      <p className="text-[11px] text-slate-500 mb-2">
        Extra filters — keep at defaults if new.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <label className="text-[11px] text-slate-400">
          Min edge (%)
          <input type="number" min={0} max={50} step={1} value={props.minEdge}
            onChange={(e) => props.onMinEdgeChange(toNumber(e.target.value, 0))}
            className="mt-0.5 w-full border border-slate-700 bg-slate-900/90 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30" />
        </label>
        <label className="text-[11px] text-slate-400">
          Chance from (%)
          <input type="number" min={0} max={100} step={1} value={props.probMin}
            onChange={(e) => props.onProbMinChange(toNumber(e.target.value, 0))}
            className="mt-0.5 w-full border border-slate-700 bg-slate-900/90 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30" />
        </label>
        <label className="text-[11px] text-slate-400">
          Chance to (%)
          <input type="number" min={0} max={100} step={1} value={props.probMax}
            onChange={(e) => props.onProbMaxChange(toNumber(e.target.value, 100))}
            className="mt-0.5 w-full border border-slate-700 bg-slate-900/90 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30" />
        </label>
        <label className="text-[11px] text-slate-400">
          Min volume ($)
          <input type="number" min={0} step={100} value={props.minVolume}
            onChange={(e) => props.onMinVolumeChange(toNumber(e.target.value, 0))}
            className="mt-0.5 w-full border border-slate-700 bg-slate-900/90 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30" />
        </label>
        <label className="text-[11px] text-slate-400">
          Min liquidity ($)
          <input type="number" min={0} step={100} value={props.minLiquidity}
            onChange={(e) => props.onMinLiquidityChange(toNumber(e.target.value, 0))}
            className="mt-0.5 w-full border border-slate-700 bg-slate-900/90 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30" />
        </label>
        <label className="text-[11px] text-slate-400">
          Max spread (%)
          <input type="number" min={0} max={100} step={1} value={props.maxSpread}
            onChange={(e) => props.onMaxSpreadChange(toNumber(e.target.value, 100))}
            className="mt-0.5 w-full border border-slate-700 bg-slate-900/90 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30" />
        </label>
        <label className="text-[11px] text-slate-400">
          Style
          <select value={props.riskTag} onChange={(e) => props.onRiskTagChange(e.target.value as MktRiskTag)}
            className="mt-0.5 w-full border border-slate-700 bg-slate-900/90 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30">
            <option value="all">Any</option>
            <option value="hot">Trending</option>
            <option value="high-potential">Potential value</option>
            <option value="high-risk">Higher risk</option>
            <option value="construction">Construction</option>
            <option value="none">No tag</option>
          </select>
        </label>
        <label className="text-[11px] text-slate-400">
          Topic
          <select value={props.category} onChange={(e) => props.onCategoryChange(e.target.value)}
            className="mt-0.5 w-full border border-slate-700 bg-slate-900/90 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30">
            <option value="all">All topics</option>
            {props.availableCategories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </label>
        <label className="text-[11px] text-slate-400">
          Sort
          <select value={props.sortBy} onChange={(e) => props.onSortByChange(e.target.value as MarketSortKey)}
            className="mt-0.5 w-full border border-slate-700 bg-slate-900/90 rounded-md px-2 py-1.5 text-xs text-slate-100 focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30">
            <option value="edge">Best value</option>
            <option value="volume">Most active</option>
            <option value="probability">Most likely</option>
            <option value="endDate">Ending soon</option>
            <option value="title">Name A-Z</option>
          </select>
        </label>
      </div>
    </div>
  );
}
