"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useMarketTradeData } from "@/lib/hooks/useMarketTradeData";
import { useMarketBot } from "@/lib/hooks/useMarketBot";
import { useMarketServerStatus } from "@/lib/hooks/useMarketServerStatus";
import { useMarketSystemStatus } from "@/lib/hooks/useMarketSystemStatus";
import MarketPrimaryNav from "@/components/dashboard/market/MarketPrimaryNav";
import MarketAutomationTab from "@/components/dashboard/market/MarketAutomationTab";
import MarketResultsTab from "@/components/dashboard/market/MarketResultsTab";
import MarketLiveWalletTab from "@/components/dashboard/market/MarketLiveWalletTab";
import MarketDashboardSection from "@/components/dashboard/market/MarketDashboardSection";
import MarketMarketsSection from "@/components/dashboard/market/MarketMarketsSection";
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

function normalizeTabId(tabId: string): string {
  if (tabId === "start-here" || tabId === "live-wallet" || tabId === "dashboard") return "dashboard";
  if (tabId === "direct-buy" || tabId === "saved-markets" || tabId === "markets") return "markets";
  return tabId;
}

export default function MarketClient({ layoutPrefs }: MarketClientProps) {
  const visibleTabs = layoutPrefs?.visibleTabs ?? [];
  const [activeTabId, setActiveTabId] = useState("dashboard");
  const [scanBanner, setScanBanner] = useState<ScanBanner | null>(null);
  const logsEnabled = activeTabId === "results";

  // If active tab is hidden, snap to first visible
  useEffect(() => {
    const normalizedVisibleTabs = visibleTabs.map((tab) => ({ ...tab, id: normalizeTabId(tab.id) }));
    if (normalizedVisibleTabs.length > 0 && !normalizedVisibleTabs.find((t) => t.id === activeTabId)) {
      setActiveTabId(normalizedVisibleTabs[0].id);
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
  const systemStatus = useMarketSystemStatus();
  const setPrimaryTab = useCallback((tabId: string) => setActiveTabId(normalizeTabId(tabId)), []);

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

  const refreshTruthSurfaces = useCallback(async () => {
    await fetchTrades();
    await fetchSchedulerHealth();
    await fetchMarketLogs();
    await serverStatus.refresh();
    await systemStatus.refresh();
  }, [fetchMarketLogs, fetchSchedulerHealth, fetchTrades, serverStatus, systemStatus]);

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
        setPrimaryTab("results");
      } else if (scanResult.ok) {
        setScanBanner({ type: "empty", message: `Scan complete — scanned markets but no trades matched your filters right now. The robot will keep scanning automatically.` });
      } else {
        setScanBanner({ type: "error", message: `Scan error: ${scanResult.error ?? "Unknown error"}` });
      }
    })();
  }, [bot, setPrimaryTab]);

  const handleTradePlaced = useCallback(async () => {
    await refreshTruthSurfaces();
    setPrimaryTab("results");
  }, [refreshTruthSurfaces, setPrimaryTab]);

  function renderActiveTab() {
    switch (activeTabId) {
      case "dashboard":
        return (
          <MarketDashboardSection
            trades={trades}
            paperMode={bot.config.paperMode}
            system={systemStatus.system}
            serverStatus={serverStatus}
            onNavigate={setPrimaryTab}
            onApplyRecommendation={handleApplyPlan}
            onQuickStart={bot.handleStartBot}
            onStopBot={bot.handleStopBot}
            walletPanel={
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
            }
          />
        );
      case "markets":
        return (
          <MarketMarketsSection
            paperMode={bot.config.paperMode}
            walletAddress={wallet.address}
            liveChecklist={wallet.liveChecklist}
            onTradePlaced={handleTradePlaced}
            onOpenAutomation={() => setPrimaryTab("automation")}
            onNavigate={setPrimaryTab}
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
                  setPrimaryTab("results");
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
      case "results":
        return (
          <MarketResultsTab
            trades={trades}
            activityLogs={activityLogs}
            onRefresh={refreshTruthSurfaces}
          />
        );
      default:
        return null;
    }
  }
  const normalizedVisibleTabs = visibleTabs.map((tab) => ({ ...tab, id: normalizeTabId(tab.id) }));

  return (
    <div className="space-y-6 text-slate-100">
      <div className="rounded-[32px] border border-cyan-500/20 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.15),transparent_24%),radial-gradient(circle_at_top_right,rgba(249,115,22,0.18),transparent_20%),linear-gradient(180deg,#020617,#0f172a)] px-5 py-6 shadow-[0_24px_80px_rgba(2,6,23,0.5)]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.32em] text-cyan-300/80">Market Robot</p>
          <h1 className="mt-2 text-3xl font-black text-slate-50">Dark terminal shell, beginner-first sections, server-grounded status</h1>
          <p className="mt-2 text-sm text-slate-300">
            Primary navigation is limited to Dashboard, Markets, Automation, and Results. Watchlist now lives under Markets, and wallet/live readiness is reachable from Dashboard.
          </p>
        </div>
      </div>

      <MarketPrimaryNav
        tabs={normalizedVisibleTabs}
        activeTabId={activeTabId}
        onTabChange={setPrimaryTab}
      />

      {/* Scan feedback banner — visible on all tabs */}
      {scanBanner && (
        <div className={`mb-4 flex items-center justify-between rounded-2xl border px-4 py-3 text-sm ${
          scanBanner.type === "success" ? "border-emerald-400/30 bg-emerald-500/10 text-emerald-100" :
          scanBanner.type === "empty" ? "border-amber-400/30 bg-amber-500/10 text-amber-100" :
          "border-rose-400/30 bg-rose-500/10 text-rose-100"
        }`}>
          <span>{scanBanner.message}</span>
          <button onClick={() => setScanBanner(null)} className="ml-3 text-current opacity-60 hover:opacity-100 text-xs font-bold">✕</button>
        </div>
      )}

      {renderActiveTab()}
    </div>
  );
}


