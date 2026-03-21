"use client";

import React, { useState, useEffect } from "react";
import MarketPrimaryNav from "@/components/dashboard/market/MarketPrimaryNav";
import MarketStartHereTab from "@/components/dashboard/market/MarketStartHereTab";
import MarketDirectBuyTab from "@/components/dashboard/market/MarketDirectBuyTab";
import MarketAutomationTab from "@/components/dashboard/market/MarketAutomationTab";
import MarketResultsTab from "@/components/dashboard/market/MarketResultsTab";
import MarketLiveWalletTab from "@/components/dashboard/market/MarketLiveWalletTab";
import MarketSavedTab from "@/components/dashboard/market/MarketSavedTab";
import { useMarketLayoutPrefs } from "@/lib/hooks/useMarketLayoutPrefs";
import { useMarketBot } from "@/lib/hooks/useMarketBot";
import { useMarketTradeData } from "@/lib/hooks/useMarketTradeData";
import { useMarketWalletState } from "@/lib/hooks/useMarketWalletState";
import { useMarketServerStatus } from "@/lib/hooks/useMarketServerStatus";
import { useMarketSystemStatus } from "@/lib/hooks/useMarketSystemStatus";

/**
 * MarketClient - Thin orchestrator for Market Robot.
 * Wires hooks, manages active tab state, passes layout prefs.
 * Updated in Phase 4+5+6+7+8 to use new task-based IA and remove monolith content.
 * Uses shared design tokens for easy global aesthetic unification.
 * V2 Rebuild: Wired with real data hooks to replace dummy data.
 */

export default function MarketClient({ 
  initialTab = "direct-buy"
}: {
  initialTab?: string;
}) {
  const layoutPrefs = useMarketLayoutPrefs();
  const [activeTab, setActiveTab] = useState(initialTab);

  // Fetch real data from hooks — order matters:
  // 1. tradeData first (bot depends on its outputs)
  // 2. bot second (wallet depends on bot.addLog)
  const tradeData = useMarketTradeData();
  const bot = useMarketBot({
    trades: tradeData.trades,
    fetchTrades: tradeData.fetchTrades,
    fetchSummary: tradeData.fetchSummary,
    fetchSchedulerHealth: tradeData.fetchSchedulerHealth,
    fetchMarketLogs: tradeData.fetchMarketLogs,
  });
  const wallet = useMarketWalletState({ addLog: bot.addLog });
  const serverStatus = useMarketServerStatus();
  const systemStatus = useMarketSystemStatus();

  // Default to Start Here if tab is invalid
  useEffect(() => {
    const validTabs = layoutPrefs.prefs.tabs.filter(t => t.visible).map(t => t.id);
    if (!validTabs.includes(activeTab)) {
      setActiveTab("direct-buy");
    }
  }, [layoutPrefs.prefs.tabs, activeTab]);

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
  };

  // Render the correct tab content with real data
  const renderTabContent = () => {
    switch (activeTab) {
      case "start-here":
        return (
          <MarketStartHereTab
            onNavigate={handleTabChange}
            onApplyRecommendation={() => bot.handleStartBot()}
            onQuickStart={() => bot.handleStartBot()}
            onStopBot={() => bot.handleStopBot()}
            paperMode={bot.config.paperMode}
            serverStatus={serverStatus.status}
            serverConfirmed={serverStatus.isConfirmed}
            serverHealth={serverStatus.health}
          />
        );
      case "direct-buy":
        return (
          <MarketDirectBuyTab 
            onNavigate={handleTabChange} 
            paperMode={bot.config.paperMode} 
            liveChecklist={wallet.liveChecklist} 
          />
        );
      case "automation":
        return (
          <MarketAutomationTab 
            onNavigate={handleTabChange} 
            paperMode={bot.config.paperMode} 
            onQuickStart={() => bot.handleStartBot()}
            onStopBot={() => bot.handleStopBot()}
            activePlan={null} 
            onApplyPlan={() => bot.handleStartBot()} 
            onDeletePlan={() => console.log("Delete plan functionality to be implemented")} 
          />
        );
      case "saved-markets":
        return <MarketSavedTab onNavigate={handleTabChange} />;
      case "results":
        return (
          <MarketResultsTab 
            onNavigate={handleTabChange} 
            paperMode={bot.config.paperMode} 
            trades={tradeData.trades} 
            system={systemStatus.system} 
            serverHealth={serverStatus.health} 
            onOpenPositions={() => handleTabChange("live-wallet")} 
            onOpenAutomation={() => handleTabChange("automation")} 
          />
        );
      case "live-wallet":
        return (
          <MarketLiveWalletTab 
            onNavigate={handleTabChange} 
            paperMode={bot.config.paperMode} 
            liveChecklist={wallet.liveChecklist} 
            walletSnapshot={{
              address: wallet.address || "",
              isConnected: wallet.isConnected,
              usdcBalance: wallet.usdcBalance || "0.00",
              maticFormatted: wallet.maticData
                ? `${(Number(wallet.maticData.value) / 10 ** wallet.maticData.decimals).toFixed(4)} ${wallet.maticData.symbol}`
                : "--",
              walletVerified: wallet.walletVerified || false
            }} 
            system={systemStatus.system} 
            onOpenAutomation={() => handleTabChange("automation")} 
          />
        );
      default:
        return <div className="text-slate-200 p-6">Placeholder for {activeTab} tab (under construction)</div>;
    }
  };

  return (
    <div className="market-client bg-zinc-950 text-slate-200">
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
