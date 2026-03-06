"use client";

import React, { useState, useEffect } from "react";
import { StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import { useMarketTradeData } from "@/lib/hooks/useMarketTradeData";
import { useMarketBot } from "@/lib/hooks/useMarketBot";
import { useMarketDirectives } from "@/lib/hooks/useMarketDirectives";
import MarketPrimaryNav from "@/components/dashboard/market/MarketPrimaryNav";
import MarketStartHereStub from "@/components/dashboard/market/MarketStartHereStub";
import MarketDirectBuyStub from "@/components/dashboard/market/MarketDirectBuyStub";
import MarketAutomationStub from "@/components/dashboard/market/MarketAutomationStub";
import MarketSavedMarketsStub from "@/components/dashboard/market/MarketSavedMarketsStub";
import MarketResultsStub from "@/components/dashboard/market/MarketResultsStub";
import MarketLiveWalletStub from "@/components/dashboard/market/MarketLiveWalletStub";
import type { MarketShellContext } from "@/components/dashboard/market/MarketRouteShell";

interface MarketClientProps {
  layoutPrefs?: MarketShellContext;
}

const TAB_COMPONENTS: Record<string, React.ComponentType> = {
  "start-here": MarketStartHereStub,
  "direct-buy": MarketDirectBuyStub,
  "automation": MarketAutomationStub,
  "saved-markets": MarketSavedMarketsStub,
  "results": MarketResultsStub,
  "live-wallet": MarketLiveWalletStub,
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

  const ActiveComponent = TAB_COMPONENTS[activeTabId];

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

      {ActiveComponent ? <ActiveComponent /> : null}
    </div>
  );
}


