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
  "dashboard": "⌁",
  "markets": "◈",
  "automation": "⚙️",
  "results": "▣",
};

interface MarketPrimaryNavProps {
  tabs: MarketTabPref[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

export default function MarketPrimaryNav({ tabs, activeTabId, onTabChange }: MarketPrimaryNavProps) {
  return (
    <div className="mb-6 flex flex-wrap gap-2 rounded-[28px] border border-cyan-500/20 bg-slate-950/80 p-2 shadow-[0_18px_40px_rgba(2,6,23,0.35)]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-2 rounded-[20px] px-4 py-2.5 text-sm font-semibold transition ${
            activeTabId === tab.id
              ? "bg-cyan-400/15 text-cyan-100 shadow-[inset_0_0_0_1px_rgba(34,211,238,0.28)]"
              : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
          }`}
        >
          <span className="text-base">{TAB_ICONS[tab.id] ?? "⌘"}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
