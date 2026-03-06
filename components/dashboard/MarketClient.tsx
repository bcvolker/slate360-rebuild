"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import { useMarketTradeData } from "@/lib/hooks/useMarketTradeData";
import { useMarketBot } from "@/lib/hooks/useMarketBot";
import { useMarketDirectives } from "@/lib/hooks/useMarketDirectives";
import MarketPrimaryNav from "@/components/dashboard/market/MarketPrimaryNav";
import MarketStartHereTab from "@/components/dashboard/market/MarketStartHereTab";
import MarketDirectBuyTab from "@/components/dashboard/market/MarketDirectBuyTab";
import MarketAutomationTab from "@/components/dashboard/market/MarketAutomationTab";
import MarketResultsTab from "@/components/dashboard/market/MarketResultsTab";
import MarketLiveWalletTab from "@/components/dashboard/market/MarketLiveWalletTab";
import MarketSavedMarketsStub from "@/components/dashboard/market/MarketSavedMarketsStub";
import { useMarketWalletState } from "@/lib/hooks/useMarketWalletState";
import type { MarketShellContext } from "@/components/dashboard/market/MarketRouteShell";
import type { AutomationPlan } from "@/components/dashboard/market/types";

interface MarketClientProps {
  layoutPrefs?: MarketShellContext;
}

// Stubs for tabs not yet built — replaced per batch
const STUB_TABS: Record<string, React.ComponentType> = {
  "saved-markets": MarketSavedMarketsStub,
};

export default function MarketClient({ layoutPrefs }: MarketClientProps) {
  const visibleTabs = layoutPrefs?.visibleTabs ?? [];
  const [activeTabId, setActiveTabId] = useState("start-here");

  // If active tab is hidden, snap to first visible
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find((t) => t.id === activeTabId)) {
      setActiveTabId(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTabId]);

  const td = useMarketTradeData();
  const bot = useMarketBot({
    fetchTrades: td.fetchTrades,
    fetchSummary: td.fetchSummary,
    fetchSchedulerHealth: td.fetchSchedulerHealth,
  });
  const wallet = useMarketWalletState({ addLog: bot.addLog });
  const dir = useMarketDirectives({
    botSetters: {
      setCapitalAlloc: bot.setCapitalAlloc,
      setRiskMix: bot.setRiskMix,
      setWhaleFollow: bot.setWhaleFollow,
      setFocusAreas: bot.setFocusAreas,
      setPaperMode: bot.setPaperMode,
      setBotRunning: bot.setBotRunning,
      setBotPaused: bot.setBotPaused,
    },
    runScan: bot.runScan,
    addLog: bot.addLog,
    onSetActiveTab: setActiveTabId,
  });

  useEffect(() => {
    td.fetchTrades();
    td.fetchSummary();
    td.fetchSchedulerHealth();
    td.fetchMarketLogs();
    dir.loadDirectives();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleApplyPlan = useCallback((plan: AutomationPlan) => {
    bot.setCapitalAlloc(plan.budget);
    bot.setRiskMix(plan.riskLevel);
    bot.setFocusAreas(plan.categories);
    bot.setPaperMode(plan.mode === "practice");
    bot.addLog(`📋 Plan "${plan.name}" applied to bot`);
    bot.setBotRunning(true);
    bot.setBotPaused(false);
    bot.runScan();
  }, [bot]);

  function renderActiveTab() {
    switch (activeTabId) {
      case "start-here":
        return (
          <MarketStartHereTab
            onNavigate={setActiveTabId}
            paperMode={bot.config.paperMode}
            botRunning={bot.config.botRunning}
            lastScan={bot.config.lastScan}
          />
        );
      case "direct-buy":
        return <MarketDirectBuyTab paperMode={bot.config.paperMode} />;
      case "automation":
        return (
          <MarketAutomationTab
            botConfig={bot.config}
            onApplyPlan={handleApplyPlan}
          />
        );
      case "results":
        return (
          <MarketResultsTab
            trades={td.trades}
            activityLogs={td.activityLogs}
          />
        );
      case "live-wallet":
        return (
          <MarketLiveWalletTab
            address={wallet.address}
            isConnected={wallet.isConnected}
            chain={wallet.chain as { id: number; name: string } | undefined}
            isConnecting={wallet.isConnecting}
            isApproving={wallet.isApproving}
            waitingApproveReceipt={wallet.waitingApproveReceipt}
            approveSuccess={wallet.approveSuccess}
            usdcBalance={wallet.usdcBalance}
            maticData={wallet.maticData as { formatted: string; symbol: string } | undefined}
            walletVerified={wallet.walletVerified}
            walletError={wallet.walletError}
            walletChoice={wallet.walletChoice}
            setWalletChoice={wallet.setWalletChoice}
            liveChecklist={wallet.liveChecklist}
            handleConnectWallet={wallet.handleConnectWallet}
            handleApproveUsdc={wallet.handleApproveUsdc}
            disconnect={wallet.disconnect}
            paperMode={bot.config.paperMode}
          />
        );
      default: {
        const Stub = STUB_TABS[activeTabId];
        return Stub ? <Stub /> : null;
      }
    }
  }

  return (
    <div className="text-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 flex-wrap">
            Market Robot{" "}
            <StatusBadge status={bot.config.botRunning ? (bot.config.botPaused ? "idle" : "running") : "idle"} />
            {bot.config.paperMode && (
              <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                Paper Mode
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            AI-powered prediction market bot —{" "}
            {bot.config.lastScan
              ? `Last scan: ${new Date(bot.config.lastScan).toLocaleTimeString()}`
              : "Not scanned yet"}
          </p>
        </div>
      </div>

      <MarketPrimaryNav
        tabs={visibleTabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
      />

      {renderActiveTab()}
    </div>
  );
}


