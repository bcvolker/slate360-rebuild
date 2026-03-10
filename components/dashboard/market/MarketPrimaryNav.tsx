"use client";

import React from "react";
import type { MarketTabPref } from "@/lib/market/layout-presets";

export const MARKET_TASK_TABS = [
  "Start Here",
  "Direct Buy",
  "Automation",
  "Saved Markets",
  "Results",
  "Live Wallet",
] as const;

export type MarketTaskTab = (typeof MARKET_TASK_TABS)[number];

const TAB_ICONS: Record<string, string> = {
  "start-here": "🏠",
  "direct-buy": "🔍",
  "automation": "⚙️",
  "saved-markets": "🔖",
  "results": "📈",
  "live-wallet": "⚡",
};

interface MarketPrimaryNavProps {
  tabs: MarketTabPref[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
}

export default function MarketPrimaryNav({ tabs, activeTabId, onTabChange }: MarketPrimaryNavProps) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-gray-200 mb-6 pb-1">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onTabChange(tab.id)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-t-md transition-colors ${
            activeTabId === tab.id
              ? "bg-[#FF4D00] text-white"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <span>{TAB_ICONS[tab.id] ?? "📋"}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
