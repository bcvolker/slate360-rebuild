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
    <div className="border-t border-gray-100 pt-3">
      <p className="text-xs text-gray-500 mb-3">
        Extra filters for experienced users. If you are new, keep these at default values.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <label className="text-xs text-gray-600">
          Minimum value edge (%)
          <input
            type="number"
            min={0}
            max={50}
            step={1}
            value={props.minEdge}
            onChange={(e) => props.onMinEdgeChange(toNumber(e.target.value, 0))}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
          />
        </label>

        <label className="text-xs text-gray-600">
          Chance range (% from)
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={props.probMin}
            onChange={(e) => props.onProbMinChange(toNumber(e.target.value, 0))}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
          />
        </label>

        <label className="text-xs text-gray-600">
          Chance range (% to)
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={props.probMax}
            onChange={(e) => props.onProbMaxChange(toNumber(e.target.value, 100))}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
          />
        </label>

        <label className="text-xs text-gray-600">
          Minimum daily volume (USD)
          <input
            type="number"
            min={0}
            step={100}
            value={props.minVolume}
            onChange={(e) => props.onMinVolumeChange(toNumber(e.target.value, 0))}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
          />
        </label>

        <label className="text-xs text-gray-600">
          Minimum liquidity (USD)
          <input
            type="number"
            min={0}
            step={100}
            value={props.minLiquidity}
            onChange={(e) => props.onMinLiquidityChange(toNumber(e.target.value, 0))}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
          />
        </label>

        <label className="text-xs text-gray-600">
          Maximum spread (%)
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={props.maxSpread}
            onChange={(e) => props.onMaxSpreadChange(toNumber(e.target.value, 100))}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
          />
        </label>

        <label className="text-xs text-gray-600">
          Market style
          <select
            value={props.riskTag}
            onChange={(e) => props.onRiskTagChange(e.target.value as MktRiskTag)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
          >
            <option value="all">Any</option>
            <option value="hot">Trending</option>
            <option value="high-potential">Potential value</option>
            <option value="high-risk">Higher risk</option>
            <option value="construction">Construction related</option>
            <option value="none">No special tag</option>
          </select>
        </label>

        <label className="text-xs text-gray-600">
          Topic (advanced)
          <select
            value={props.category}
            onChange={(e) => props.onCategoryChange(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#FF4D00]/30"
          >
            <option value="all">All topics</option>
            {props.availableCategories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>

        <label className="text-xs text-gray-600">
          Sort (advanced)
          <select
            value={props.sortBy}
            onChange={(e) => props.onSortByChange(e.target.value as MarketSortKey)}
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
    </div>
  );
}
