"use client";

import React, { useState, useEffect } from "react";
import MarketPrimaryNav from "@/components/dashboard/market/MarketPrimaryNav";
import MarketStartHereTab from "@/components/dashboard/market/MarketStartHereTab";
import { useMarketLayoutPrefs } from "@/lib/hooks/useMarketLayoutPrefs";
import type { SchedulerHealthViewModel } from "@/lib/market/contracts";

/**
 * MarketClient - Thin orchestrator for Market Robot.
 * Wires hooks, manages active tab state, passes layout prefs.
 * Updated in Phase 4 to use new task-based IA and remove monolith content.
 * Uses shared design tokens for easy global aesthetic unification.
 */

export default function MarketClient({ 
  initialTab = "start-here",
  paperMode = true,
  serverStatus = { status: "unknown", isConfirmed: false, health: null },
  onQuickStart = () => {},
  onStopBot = () => {},
}: {
  initialTab?: string;
  paperMode?: boolean;
  serverStatus?: { status: string; isConfirmed: boolean; health: SchedulerHealthViewModel | null };
  onQuickStart?: () => void;
  onStopBot?: () => void;
}) {
  const layoutPrefs = useMarketLayoutPrefs();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Default to Start Here if tab is invalid
  useEffect(() => {
    const validTabs = layoutPrefs.prefs.tabs.filter(t => t.visible).map(t => t.id);
    if (!validTabs.includes(activeTab)) {
      setActiveTab("start-here");
    }
  }, [layoutPrefs.prefs.tabs, activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Render the correct tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case "start-here":
        return (
          <MarketStartHereTab
            onNavigate={handleTabChange}
            onQuickStart={onQuickStart}
            onStopBot={onStopBot}
            paperMode={paperMode}
            serverStatus={serverStatus.status}
            serverConfirmed={serverStatus.isConfirmed}
            serverHealth={serverStatus.health}
          />
        );
      default:
        return (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <p className="text-lg font-semibold text-slate-200">This tab is not available yet</p>
            <p className="mt-1 text-sm text-slate-400">Switch to another tab to continue.</p>
          </div>
        );
    }
  };

  return (
    <div className="market-client bg-slate-950 text-slate-200">
      <MarketPrimaryNav
        tabs={layoutPrefs.prefs.tabs}
        activeTabId={activeTab}
        onTabChange={handleTabChange}
      />
      <div className="tab-content max-w-full overflow-hidden">
        {renderTabContent()}
      </div>
    </div>
  );
}
