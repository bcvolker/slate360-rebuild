"use client";

import React from "react";
import type { MarketTabPref } from "@/lib/market/layout-presets";

export const MARKET_TASK_TABS = [
  "Dashboard",
  "Markets",
  "Automation",
  "Results",
] as const;

export type MarketTaskTab = (typeof MARKET_TASK_TABS)[number];

const TAB_ICONS: Record<string, string> = {
  "dashboard": "◉",
  "markets": "◈",
  "automation": "⚙",
  "results": "▦",
};

interface MarketPrimaryNavProps {
  tabs: MarketTabPref[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

export default function MarketPrimaryNav({ tabs, activeTabId, onTabChange }: MarketPrimaryNavProps) {
  return (
    <div className="mb-8 flex border-b border-slate-800">
      {tabs.map((tab) => {
        const isActive = activeTabId === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`group flex items-center gap-3 px-8 py-5 text-sm font-medium border-b-2 transition-all ${
              isActive
                ? "border-orange-500 text-white"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <span className={`text-xl transition-colors ${
              isActive ? "text-orange-400" : "text-slate-500 group-hover:text-slate-400"
            }`}>
              {TAB_ICONS[tab.id] ?? "⌘"}
            </span>
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
