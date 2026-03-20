"use client";

import React, { useState, useEffect } from "react";
import MarketPrimaryNav from "@/components/dashboard/market/MarketPrimaryNav";
import MarketStartHereTab from "@/components/dashboard/market/MarketStartHereTab";
import MarketDirectBuyTab from "@/components/dashboard/market/MarketDirectBuyTab";
import MarketAutomationTab from "@/components/dashboard/market/MarketAutomationTab";
import MarketResultsTab from "@/components/dashboard/market/MarketResultsTab";
import MarketLiveWalletTab from "@/components/dashboard/market/MarketLiveWalletTab";
import { useMarketLayoutPrefs } from "@/lib/hooks/useMarketLayoutPrefs";

/**
 * MarketClient - Thin orchestrator for Market Robot.
 * Wires hooks, manages active tab state, passes layout prefs.
 * Updated in Phase 4+5+6+7 to use new task-based IA and remove monolith content.
 * Uses shared design tokens for easy global aesthetic unification.
 */

export default function MarketClient({ 
  initialTab = "start-here",
  paperMode = true,
  serverStatus = { status: "unknown", isConfirmed: false, health: null },
  onQuickStart = () => console.log("Quick start triggered"),
  onStopBot = () => console.log("Stop bot triggered"),
}: {
  initialTab?: string;
  paperMode?: boolean;
  serverStatus?: { status: string; isConfirmed: boolean; health: any };
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
            onApplyRecommendation={() => console.log("Apply recommendation triggered")}
            onQuickStart={onQuickStart}
            onStopBot={onStopBot}
            paperMode={paperMode}
            serverStatus={serverStatus.status}
            serverConfirmed={serverStatus.isConfirmed}
            serverHealth={serverStatus.health}
          />
        );
      case "direct-buy":
        return <MarketDirectBuyTab onNavigate={handleTabChange} />;
      case "automation":
        return <MarketAutomationTab onNavigate={handleTabChange} />;
      case "results":
        return <MarketResultsTab onNavigate={handleTabChange} />;
      case "live-wallet":
        return <MarketLiveWalletTab onNavigate={handleTabChange} />;
      default:
        return <div className="text-slate-200 p-6">Placeholder for {activeTab} tab (under construction)</div>;
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
