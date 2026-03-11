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
import type { ScanResult } from "@/lib/hooks/useMarketBot";

interface ScanBanner { type: "success" | "empty" | "error"; message: string }

interface MarketClientProps {
  layoutPrefs?: MarketShellContext;
}

export default function MarketClient({ layoutPrefs }: MarketClientProps) {
  const visibleTabs = layoutPrefs?.visibleTabs ?? [];
  const [activeTabId, setActiveTabId] = useState("start-here");
  const [scanBanner, setScanBanner] = useState<ScanBanner | null>(null);
  const logsEnabled = activeTabId === "results";

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
    fetchMarketLogs,
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
    if (activeTabId === "results") {
      void fetchTrades();
      void fetchSummary();
      void fetchSchedulerHealth();
      void fetchMarketLogs();
    }
  }, [activeTabId, fetchTrades, fetchSummary, fetchSchedulerHealth, fetchMarketLogs]);

  const handleApplyPlan = useCallback((plan: AutomationPlan) => {
    void (async () => {
      setScanBanner(null);
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

      // 1. Sync plan to market_plans table (canonical source of truth)
      try {
        const result = await syncAutomationPlan(plan);
        if (result.ok) {
          bot.addLog(`🗂 Synced "${plan.name}" to server (plan ${result.planId ?? "created"})`);
        } else {
          bot.addLog(`⚠️ Server sync failed: ${result.error ?? `HTTP ${result.status}`}. Bot will use local config for manual scans.`);
        }
      } catch (error) {
        bot.addLog(`⚠️ Server sync failed: ${error instanceof Error ? error.message : "unknown error"}`);
      }

      // 2. Set bot status to paper/running so the scheduler picks this user up
      const statusSet = await ensureBotRunning(paperMode);
      if (statusSet) {
        bot.addLog(`🟢 Bot status set to ${paperMode ? "paper" : "running"} — scheduler will pick up trades`);
      } else {
        bot.addLog(`⚠️ Failed to set bot status on server — scheduler may not run`);
      }

      bot.setBotRunning(true);
      bot.setBotPaused(false);

      // 3. Run scan and surface the result
      const scanResult: ScanResult = await bot.runScan(scanConfig);

      if (scanResult.tradesPlaced > 0) {
        setScanBanner({ type: "success", message: `Robot placed ${scanResult.tradesPlaced} trade${scanResult.tradesPlaced !== 1 ? "s" : ""}. Check History for details.` });
        setActiveTabId("results");
      } else if (scanResult.ok) {
        setScanBanner({ type: "empty", message: `Scan complete — scanned markets but no trades matched your filters right now. The robot will keep scanning automatically.` });
      } else {
        setScanBanner({ type: "error", message: `Scan error: ${scanResult.error ?? "Unknown error"}` });
      }
    })();
  }, [bot]);

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
            onApplyRecommendation={handleApplyPlan}
            onQuickStart={bot.handleStartBot}
            onStopBot={bot.handleStopBot}
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
            onOpenAutomation={() => setActiveTabId("automation")}
          />
        );
      case "automation":
        return (
          <MarketAutomationTab
            botConfig={bot.config}
            onApplyPlan={handleApplyPlan}
            onRunNow={() => {
              void (async () => {
                setScanBanner(null);
                const result = await bot.runScan();
                if (result.tradesPlaced > 0) {
                  setScanBanner({ type: "success", message: `Scan placed ${result.tradesPlaced} trade${result.tradesPlaced !== 1 ? "s" : ""}.` });
                  setActiveTabId("results");
                } else if (result.ok) {
                  setScanBanner({ type: "empty", message: `Scan complete — no opportunities matched filters right now.` });
                } else {
                  setScanBanner({ type: "error", message: `Scan error: ${result.error ?? "Unknown error"}` });
                }
              })();
            }}
            onStopBot={() => { void bot.handleStopBot(); }}
            serverStatus={serverStatus.status}
            serverHealth={serverStatus.health}
            scanLog={bot.scanLog}
          />
        );
      case "saved-markets":
        return <MarketSavedMarketsTab onNavigate={setActiveTabId} />;
      case "results":
        return (
          <MarketResultsTab
            trades={trades}
            activityLogs={activityLogs}
            onRefresh={async () => {
              await fetchTrades();
              await fetchSummary();
              await fetchSchedulerHealth();
              await fetchMarketLogs();
            }}
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
      default:
        return null;
    }
  }

  const displayStatus = serverStatus.isConfirmed ? serverStatus.status : "unknown";
  const statusLabels: Record<string, string> = { running: "Running", paused: "Paused", paper: "Paper", stopped: "Stopped" };
  const displayStatusLabel = statusLabels[displayStatus] ?? "Checking…";

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
                Paper Mode
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

      {/* Scan feedback banner — visible on all tabs */}
      {scanBanner && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm flex items-center justify-between ${
          scanBanner.type === "success" ? "bg-green-50 border-green-200 text-green-800" :
          scanBanner.type === "empty" ? "bg-amber-50 border-amber-200 text-amber-800" :
          "bg-red-50 border-red-200 text-red-800"
        }`}>
          <span>{scanBanner.message}</span>
          <button onClick={() => setScanBanner(null)} className="ml-3 text-current opacity-60 hover:opacity-100 text-xs font-bold">✕</button>
        </div>
      )}

      {renderActiveTab()}
    </div>
  );
}


