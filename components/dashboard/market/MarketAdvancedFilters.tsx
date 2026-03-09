"use client";

import React from "react";
import { HelpTip } from "@/components/dashboard/market/MarketSharedUi";
import type { MarketSortKey, MktRiskTag } from "@/components/dashboard/market/types";

const SORT_OPTIONS: { key: MarketSortKey; label: string }[] = [
  { key: "edge", label: "Best Edge" },
  { key: "volume", label: "Highest Volume" },
  { key: "probability", label: "Probability" },
  { key: "endDate", label: "Ending Soonest" },
  { key: "title", label: "A → Z" },
];

const RISK_OPTIONS: { key: MktRiskTag; label: string }[] = [
  { key: "all", label: "All" },
  { key: "hot", label: "Hot" },
  { key: "high-risk", label: "High-Risk" },
  { key: "construction", label: "Construction" },
  { key: "high-potential", label: "High-Potential" },
  { key: "none", label: "None" },
];

const fmtVol = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : `${v}`);

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

export default function MarketAdvancedFilters(props: MarketAdvancedFiltersProps) {
  return (
    <div className="border-t border-gray-100 pt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
      {/* Min Edge */}
      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Minimum Deal Advantage
          <HelpTip content="The deal advantage is the estimated pricing advantage over fair value. Higher can mean a better entry. Set it to 0 to show every market." />
        </label>
        <input
          type="range" min={0} max={30} step={1} value={props.minEdge}
          onChange={e => props.onMinEdgeChange(+e.target.value)}
          className="w-full accent-[#FF4D00]"
        />
        <p className="text-[11px] text-gray-400">{props.minEdge}%+</p>
      </div>

      {/* Prob min */}
      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Minimum Chance
          <HelpTip content="Hide very unlikely markets below this implied probability." />
        </label>
        <input
          type="range" min={0} max={100} step={5} value={props.probMin}
          onChange={e => props.onProbMinChange(+e.target.value)}
          className="w-full accent-[#FF4D00]"
        />
        <p className="text-[11px] text-gray-400">{props.probMin}%</p>
      </div>

      {/* Prob max */}
      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Maximum Chance
          <HelpTip content="Hide heavy favorites above this implied probability." />
        </label>
        <input
          type="range" min={0} max={100} step={5} value={props.probMax}
          onChange={e => props.onProbMaxChange(+e.target.value)}
          className="w-full accent-[#FF4D00]"
        />
        <p className="text-[11px] text-gray-400">{props.probMax}%</p>
      </div>

      {/* Sort by */}
      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Sort by
          <HelpTip content="Controls the default order markets appear. You can also click the table headers for Market, Prob, Edge, Volume, and Ends to sort directly from the results." />
        </label>
        <select
          value={props.sortBy}
          onChange={e => props.onSortByChange(e.target.value as MarketSortKey)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30"
        >
          {SORT_OPTIONS.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Category */}
      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Market Category
          <HelpTip content="Browse a cleaner set of topics like Construction, Weather, Economy, and Entertainment." />
        </label>
        <select
          value={props.category}
          onChange={e => props.onCategoryChange(e.target.value)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30"
        >
          <option value="all">All categories</option>
          {props.availableCategories.map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {/* Risk tag */}
      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Opportunity Tag
          <HelpTip content="Highlights markets that look hotter, riskier, or more specialized than the rest." />
        </label>
        <select
          value={props.riskTag}
          onChange={e => props.onRiskTagChange(e.target.value as MktRiskTag)}
          className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-[#FF4D00]/30"
        >
          {RISK_OPTIONS.map(o => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Min Volume */}
      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Minimum 24h Volume
          <HelpTip content="Higher volume usually means a more active market and easier fills." />
        </label>
        <input
          type="range" min={0} max={100000} step={1000} value={props.minVolume}
          onChange={e => props.onMinVolumeChange(+e.target.value)}
          className="w-full accent-[#FF4D00]"
        />
        <p className="text-[11px] text-gray-400">${fmtVol(props.minVolume)}+</p>
      </div>

      {/* Min Liquidity */}
      <div>
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Minimum Liquidity
          <HelpTip content="Higher liquidity means your trade is more likely to fill near the listed price." />
        </label>
        <input
          type="range" min={0} max={500000} step={5000} value={props.minLiquidity}
          onChange={e => props.onMinLiquidityChange(+e.target.value)}
          className="w-full accent-[#FF4D00]"
        />
        <p className="text-[11px] text-gray-400">${fmtVol(props.minLiquidity)}+</p>
      </div>

      {/* Max Spread */}
      <div className="col-span-2 sm:col-span-4">
        <label className="text-xs text-gray-500 mb-1 flex items-center">
          Maximum Price Gap
          <HelpTip content="Filters out markets with wider pricing gaps. Lower values usually mean cleaner execution." />
        </label>
        <input
          type="range" min={0} max={50} step={1} value={props.maxSpread}
          onChange={e => props.onMaxSpreadChange(+e.target.value)}
          className="w-full accent-[#FF4D00]"
        />
        <p className="text-[11px] text-gray-400">{props.maxSpread}%</p>
      </div>
    </div>
  );
}
