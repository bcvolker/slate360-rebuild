"use client";

import React, { useState, useEffect, useCallback } from "react";
import { StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import { useMarketTradeData } from "@/lib/hooks/useMarketTradeData";
import { useMarketBot } from "@/lib/hooks/useMarketBot";
import { useMarketServerStatus } from "@/lib/hooks/useMarketServerStatus";
import MarketPrimaryNav from "@/components/dashboard/market/MarketPrimaryNav";
import MarketStartHereTab from "@/components/dashboard/market/MarketStartHereTab";
import MarketDirectBuyTab from "@/components/dashboard/market/MarketDirectBuyTab";
import MarketAutomationTab from "@/components/dashboard/market/MarketAutomationTab";
import MarketResultsTab from "@/components/dashboard/market/MarketResultsTab";
import MarketLiveWalletTab from "@/components/dashboard/market/MarketLiveWalletTab";
import MarketSavedMarketsTab from "@/components/dashboard/market/MarketSavedMarketsTab";
import MarketTopOverview from "@/components/dashboard/market/MarketTopOverview";
import { useMarketWalletState } from "@/lib/hooks/useMarketWalletState";
import { normalizeFocusAreas } from "@/lib/market/runtime-config";
import { syncAutomationPlan, ensureBotRunning } from "@/lib/market/sync-automation-plan";
import type { MarketShellContext } from "@/components/dashboard/market/MarketRouteShell";
import type { AutomationPlan } from "@/components/dashboard/market/types";

interface MarketClientProps {
  layoutPrefs?: MarketShellContext;
}

const STUB_TABS: Record<string, React.ComponentType> = {};

export default function MarketClient({ layoutPrefs }: MarketClientProps) {
  const visibleTabs = layoutPrefs?.visibleTabs ?? [];
  const [activeTabId, setActiveTabId] = useState("start-here");
  const logsEnabled = activeTabId === "start-here" || activeTabId === "automation" || activeTabId === "results";

  // If active tab is hidden, snap to first visible
  useEffect(() => {
    if (visibleTabs.length > 0 && !visibleTabs.find((t) => t.id === activeTabId)) {
      setActiveTabId(visibleTabs[0].id);
    }
  }, [visibleTabs, activeTabId]);

  const td = useMarketTradeData(logsEnabled);
  const { fetchTrades, fetchSummary, fetchSchedulerHealth, fetchMarketLogs, trades, activityLogs } = td;
  const bot = useMarketBot({
    trades,
    fetchTrades,
    fetchSummary,
    fetchSchedulerHealth,
  });
  const wallet = useMarketWalletState({ addLog: bot.addLog });
  const serverStatus = useMarketServerStatus();

  useEffect(() => {
    fetchTrades();
    fetchSummary();
    fetchSchedulerHealth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (activeTabId === "results" || activeTabId === "start-here") {
      void fetchTrades();
      void fetchSummary();
      void fetchSchedulerHealth();
      void fetchMarketLogs();
    }
  }, [activeTabId, fetchTrades, fetchSummary, fetchSchedulerHealth, fetchMarketLogs]);

  const handleApplyPlan = useCallback((plan: AutomationPlan) => {
    void (async () => {
      const focusAreas = normalizeFocusAreas(plan.categories);
      const paperMode = plan.mode === "practice";
      const scanConfig = {
        paperMode,
        capitalAlloc: plan.budget,
        maxTradesPerDay: plan.maxTradesPerDay,
        maxPositions: plan.maxOpenPositions,
        minVolume: plan.minimumLiquidity,
        riskMix: plan.riskLevel,
        whaleFollow: plan.largeTraderSignals,
        focusAreas,
      };

      bot.setCapitalAlloc(plan.budget);
      bot.setMaxTradesPerDay(plan.maxTradesPerDay);
      bot.setMaxPositions(plan.maxOpenPositions);
      bot.setMinVolume(plan.minimumLiquidity);
      bot.setRiskMix(plan.riskLevel);
      bot.setWhaleFollow(plan.largeTraderSignals);
      bot.setFocusAreas(focusAreas);
      bot.setPaperMode(paperMode);
      bot.addLog(`📋 Plan "${plan.name}" applied to bot`);

      // 1. Sync directive to DB so the scheduler has the config
      try {
        const result = await syncAutomationPlan(plan);
        if (result.ok) {
          bot.addLog(`🗂 Synced "${plan.name}" to server (directive ${result.directiveId ?? "created"})`);
        } else {
          bot.addLog(`⚠️ Server sync failed: ${result.error ?? `HTTP ${result.status}`}. Bot will use local config for manual scans.`);
        }
      } catch (error) {
        bot.addLog(`⚠️ Server sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
      }

      // 2. Set bot status to paper/running so the scheduler picks this user up
      const statusSet = await ensureBotRunning(paperMode);
      if (statusSet) {
        bot.addLog(`🟢 Bot status set to ${paperMode ? "practice" : "running"} — scheduler will pick up trades`);
      } else {
        bot.addLog(`⚠️ Failed to set bot status on server — scheduler may not run`);
      }

      bot.setBotRunning(true);
      bot.setBotPaused(false);
      await bot.runScan(scanConfig);
    })();
  }, [bot]);

  const handleQuickStartPaper = useCallback(() => {
    const defaultPlan: AutomationPlan = {
      id: `quick-${Date.now()}`,
      name: "Quick Start (Practice)",
      budget: 200,
      riskLevel: "conservative",
      categories: ["General", "Politics"],
      scanMode: "balanced",
      maxTradesPerDay: 5,
      mode: "practice",
      maxDailyLoss: 24,
      maxOpenPositions: 5,
      maxPctPerTrade: 15,
      feeAlertThreshold: 5,
      cooldownAfterLossStreak: 3,
      largeTraderSignals: false,
      closingSoonFocus: false,
      slippage: 2,
      minimumLiquidity: 5000,
      maximumSpread: 10,
      fillPolicy: "conservative",
      exitRules: "auto",
      isDefault: false,
      isArchived: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    handleApplyPlan(defaultPlan);
  }, [handleApplyPlan]);

  const handleStopBot = useCallback(() => {
    void (async () => {
      bot.setBotRunning(false);
      bot.setBotPaused(false);
      bot.addLog("⏹ Robot stopped");
      await fetch("/api/market/bot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "stopped" }),
      });
      await serverStatus.refresh?.();
    })();
  }, [bot, serverStatus]);

  const handleTradePlaced = useCallback(async () => {
    await fetchTrades();
    await fetchSummary();
    await fetchSchedulerHealth();
    setActiveTabId("results");
  }, [fetchSchedulerHealth, fetchSummary, fetchTrades]);

  function renderActiveTab() {
    switch (activeTabId) {
      case "start-here":
        return (
          <MarketStartHereTab
            onNavigate={setActiveTabId}
            onApplyRecommendation={(plan) => { handleApplyPlan(plan); }}
            onQuickStart={handleQuickStartPaper}
            onStopBot={handleStopBot}
            paperMode={bot.config.paperMode}
            serverStatus={serverStatus.status}
            serverConfirmed={serverStatus.isConfirmed}
            serverHealth={serverStatus.health}
          />
        );
      case "direct-buy":
        return (
          <MarketDirectBuyTab
            paperMode={bot.config.paperMode}
            walletAddress={wallet.address}
            liveChecklist={wallet.liveChecklist}
            onTradePlaced={handleTradePlaced}
          />
        );
      case "automation":
        return (
          <MarketAutomationTab
            botConfig={bot.config}
            onApplyPlan={handleApplyPlan}
            onStopBot={handleStopBot}
            onNavigate={setActiveTabId}
          />
        );
      case "saved-markets":
        return <MarketSavedMarketsTab onNavigate={setActiveTabId} />;
      case "results":
        return (
          <MarketResultsTab
            trades={trades}
            activityLogs={activityLogs}
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

  // Derive display status from server-confirmed state (not local botRunning)
  const displayStatus = serverStatus.isConfirmed ? serverStatus.status : "unknown";
  const displayStatusLabel =
    displayStatus === "running" ? "Running" :
    displayStatus === "paused" ? "Paused" :
    displayStatus === "paper" ? "Practice" :
    displayStatus === "stopped" ? "Stopped" :
    "Checking…";

  return (
    <div className="text-gray-900">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 flex-wrap">
            Market Robot{" "}
            <StatusBadge status={displayStatus === "unknown" ? "idle" : displayStatus} />
            {!serverStatus.isConfirmed && !serverStatus.isLoading && (
              <span className="text-[10px] text-gray-400 font-normal">(unconfirmed)</span>
            )}
            {bot.config.paperMode && (
              <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">
                Practice Mode
              </span>
            )}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            AI-powered prediction market bot
            {serverStatus.isConfirmed && (
              <> — Server: <strong className="text-gray-700">{displayStatusLabel}</strong></>
            )}
            {serverStatus.health?.lastRunIso && (
              <> · Last run: {new Date(serverStatus.health.lastRunIso).toLocaleTimeString()}</>
            )}
            {serverStatus.health && (
              <> · {serverStatus.health.tradesToday} trade{serverStatus.health.tradesToday !== 1 ? "s" : ""} today</>
            )}
          </p>
        </div>
      </div>

      <MarketPrimaryNav
        tabs={visibleTabs}
        activeTabId={activeTabId}
        onTabChange={setActiveTabId}
      />

      <MarketTopOverview
        trades={trades}
        botConfig={bot.config}
        onOpenResults={() => setActiveTabId("results")}
        onOpenAutomation={() => setActiveTabId("automation")}
      />

      {renderActiveTab()}
    </div>
  );
}


