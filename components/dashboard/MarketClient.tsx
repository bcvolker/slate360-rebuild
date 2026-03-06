"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  useAccount, useConnect, useDisconnect, useSignMessage, useBalance,
  useReadContract, useWriteContract, useWaitForTransactionReceipt,
} from "wagmi";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import MarketTabBar, { loadTabPrefs, saveTabPrefs, DEFAULT_MARKET_TABS } from "@/components/dashboard/market/MarketTabBar";
import { StatusBadge } from "@/components/dashboard/market/MarketSharedUi";
import { useMarketTradeData } from "@/lib/hooks/useMarketTradeData";
import { useMarketBot } from "@/lib/hooks/useMarketBot";
import { useMarketsExplorer } from "@/lib/hooks/useMarketsExplorer";
import { useMarketDirectives } from "@/lib/hooks/useMarketDirectives";
import MarketDashboardTab from "@/components/dashboard/market/MarketDashboardTab";
import MarketWalletPerformanceTab from "@/components/dashboard/market/MarketWalletPerformanceTab";
import MarketExplorerTab from "@/components/dashboard/market/MarketExplorerTab";
import MarketHotOppsTab from "@/components/dashboard/market/MarketHotOppsTab";
import MarketWhaleWatchTab from "@/components/dashboard/market/MarketWhaleWatchTab";
import MarketSimCompareTab from "@/components/dashboard/market/MarketSimCompareTab";
import MarketDirectivesTab from "@/components/dashboard/market/MarketDirectivesTab";
import type { MarketTab } from "@/components/dashboard/market/MarketTabBar";
import type { MarketListing, SimRun } from "@/components/dashboard/market/types";

const USDC_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as const;
const BAL_ABI = [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const;
const ALLOW_ABI = [{ name: "allowance", type: "function", stateMutability: "view", inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const;
const APPROVE_ABI = [{ name: "approve", type: "function", stateMutability: "nonpayable", inputs: [{ name: "spender", type: "address" }, { name: "value", type: "uint256" }], outputs: [{ name: "", type: "bool" }] }] as const;
const MAX_UINT256 = BigInt("115792089237316195423570985008687907853269984665640564039457584007913129639935");

export default function MarketClient() {
  // ── Wagmi ──
  const { address, isConnected, chain } = useAccount();
  const { connect, connectors, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  const { writeContract, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isLoading: waitingApproveReceipt, isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });
  const { data: maticData } = useBalance({ address, chainId: 137, query: { enabled: isConnected && !!address } });
  const POLYMARKET_SPENDER = process.env.NEXT_PUBLIC_POLYMARKET_SPENDER ?? "";
  const { data: usdcRaw } = useReadContract({ address: USDC_POLYGON, abi: BAL_ABI, functionName: "balanceOf", args: address ? [address] : undefined, chainId: 137, query: { enabled: isConnected && !!address } });
  const usdcBalance = usdcRaw != null ? (Number(usdcRaw) / 1e6).toFixed(2) : null;
  const { data: usdcAllowanceRaw } = useReadContract({ address: USDC_POLYGON, abi: ALLOW_ABI, functionName: "allowance", args: address && POLYMARKET_SPENDER ? [address, POLYMARKET_SPENDER as `0x${string}`] : undefined, chainId: 137, query: { enabled: isConnected && !!address && !!POLYMARKET_SPENDER } });
  const usdcAllowance = usdcAllowanceRaw != null ? Number(usdcAllowanceRaw) / 1e6 : 0;

  // ── Domain hooks ──
  const td = useMarketTradeData();
  const [activeTab, setActiveTab] = useState("Dashboard");
  const bot = useMarketBot({ fetchTrades: td.fetchTrades, fetchSummary: td.fetchSummary, fetchSchedulerHealth: td.fetchSchedulerHealth });
  const exp = useMarketsExplorer({ activeTab, botConfig: bot.config, runPreviewScan: bot.runPreviewScan });
  const dir = useMarketDirectives({
    botSetters: { setCapitalAlloc: bot.setCapitalAlloc, setRiskMix: bot.setRiskMix, setWhaleFollow: bot.setWhaleFollow, setFocusAreas: bot.setFocusAreas, setPaperMode: bot.setPaperMode, setBotRunning: bot.setBotRunning, setBotPaused: bot.setBotPaused },
    runScan: bot.runScan, addLog: bot.addLog, onSetActiveTab: setActiveTab,
  });

  // ── Local state ──
  const [tabPrefs, setTabPrefs] = useState<MarketTab[]>(DEFAULT_MARKET_TABS);
  const logRef = useRef<HTMLDivElement>(null);
  const [walletVerified, setWalletVerified] = useState(false);
  const [walletError, setWalletError] = useState("");
  const [walletChoice, setWalletChoice] = useState<"metamask" | "coinbase" | "trust">("metamask");
  const [buyMarket, setBuyMarket] = useState<MarketListing | null>(null);
  const [buyOutcome, setBuyOutcome] = useState<"YES" | "NO">("YES");
  const [buyAmount, setBuyAmount] = useState(25);
  const [buyPaper, setBuyPaper] = useState(true);
  const [buyTakeProfitPct, setBuyTakeProfitPct] = useState(20);
  const [buyStopLossPct, setBuyStopLossPct] = useState(10);
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buySuccess, setBuySuccess] = useState("");
  const [simRuns, setSimRuns] = useState<SimRun[]>([]);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [fxRates, setFxRates] = useState<Record<string, number>>({ USD: 1 });
  const [loadingFx, setLoadingFx] = useState(false);

  // ── Init + effects ──
  useEffect(() => {
    td.fetchTrades(); td.fetchSummary(); td.fetchSchedulerHealth(); td.fetchMarketLogs();
    dir.loadDirectives();
    try { const s = localStorage.getItem("slate360_sim_runs"); if (s) setSimRuns(JSON.parse(s)); } catch { /* ignore */ }
    setTabPrefs(loadTabPrefs());
    fetch("/api/market/tab-prefs").then(r => r.json())
      .then((d: { tabs?: MarketTab[] }) => { if (d?.tabs?.length) setTabPrefs(d.tabs); })
      .catch(() => { /* non-critical */ });
    try { const c = localStorage.getItem("slate360_market_currency"); if (c) setDisplayCurrency(c); } catch { /* ignore */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => { try { localStorage.setItem("slate360_market_currency", displayCurrency); } catch { /* ignore */ } }, [displayCurrency]);
  useEffect(() => {
    if (displayCurrency === "USD") { setFxRates(p => ({ ...p, USD: 1 })); return; }
    setLoadingFx(true);
    fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" }).then(r => r.json()).then((d: { rates?: Record<string, number> }) => { if (d.rates) setFxRates(p => ({ ...p, ...d.rates, USD: 1 })); }).catch(() => {}).finally(() => setLoadingFx(false));
  }, [displayCurrency]);
  useEffect(() => { if (activeTab !== "Wallet & Performance") return; const id = setInterval(() => { void td.settleAndRefresh(); }, 5 * 60 * 1000); return () => clearInterval(id); }, [activeTab, td]);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [bot.scanLog]);

  const handleConnectWallet = async () => {
    setWalletError("");
    try {
      if (!isConnected) {
        const pref = connectors.find(c => { const id = c.id.toLowerCase(); if (walletChoice === "coinbase") return id.includes("coinbase"); if (walletChoice === "trust") return id.includes("walletconnect"); return id.includes("meta") || id.includes("injected"); }) ?? connectors[0];
        if (!pref) { setWalletError("No wallet connector available."); return; }
        connect({ connector: pref }); return;
      }
      const message = `Slate360 Market Robot verification: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/market/wallet-connect", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ address, signature, message }) });
      if (res.ok) { setWalletVerified(true); bot.addLog(`✅ Wallet verified: ${address}`); }
      else { const e = await res.json(); setWalletError(e.error || "Verification failed"); }
    } catch (e: unknown) { setWalletError((e as Error).message || "Connection failed"); }
  };

  const handleApproveUsdc = () => {
    if (!address || !POLYMARKET_SPENDER) { setWalletError("Missing wallet address or spender env."); return; }
    try {
      writeContract({ address: USDC_POLYGON, abi: APPROVE_ABI, functionName: "approve", args: [POLYMARKET_SPENDER as `0x${string}`, MAX_UINT256], chainId: 137 });
      bot.addLog("🧾 Sent USDC approval transaction.");
    } catch (e: unknown) { setWalletError((e as Error).message || "USDC approval failed"); }
  };

  const openBuyPanel = (market: MarketListing, outcome: "YES" | "NO" = "YES") => {
    setBuyMarket(market); setBuyOutcome(outcome); setBuyAmount(25);
    setBuyTakeProfitPct(dir.directiveState.directiveTakeProfitPct);
    setBuyStopLossPct(dir.directiveState.directiveStopLossPct);
    setBuySuccess(""); setBuyPaper(bot.config.paperMode);
  };

  const buyPayloadIssues = useMemo(() => {
    if (!buyMarket) return [] as string[];
    const issues: string[] = [];
    const rawPrice = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
    const fallback = Number(buyMarket.probabilityPct) / 100;
    const price = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : Number.isFinite(fallback) && fallback > 0 ? fallback : NaN;
    if (!String(buyMarket.id ?? "").trim()) issues.push("market_id missing");
    if (!Number.isFinite(Number(buyAmount)) || Number(buyAmount) <= 0) issues.push("amount invalid");
    if (!Number.isFinite(price) || price <= 0) issues.push("price invalid");
    return issues;
  }, [buyAmount, buyMarket, buyOutcome]);
  const buyPayloadReady = buyPayloadIssues.length === 0;

  const handleDirectBuy = async () => {
    if (!buyMarket) return;
    setBuySubmitting(true); setBuySuccess("");
    try {
      const marketId = String(buyMarket.id ?? "").trim();
      const marketTitle = String(buyMarket.title ?? "").trim() || `${buyMarket.category || "General"} market`;
      const rawPrice = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
      const fallback = Number(buyMarket.probabilityPct) / 100;
      const avgPrice = Number.isFinite(rawPrice) && rawPrice > 0 ? rawPrice : Number.isFinite(fallback) && fallback > 0 ? fallback : NaN;
      if (!buyPayloadReady) { setBuySuccess(`❌ Invalid (${buyPayloadIssues.join(", ")})`); return; }
      const res = await fetch("/api/market/buy", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_id: marketId, market_title: marketTitle, outcome: buyOutcome, amount: Number(buyAmount), avg_price: avgPrice, category: buyMarket.category, probability: buyMarket.probabilityPct, paper_mode: buyPaper, wallet_address: address ?? null, token_id: buyOutcome === "YES" ? (buyMarket.tokenIdYes ?? null) : (buyMarket.tokenIdNo ?? null), take_profit_pct: buyTakeProfitPct, stop_loss_pct: buyStopLossPct, idempotency_key: crypto.randomUUID() }),
      });
      const data = await res.json();
      if (res.ok) {
        setBuySuccess(`✅ ${buyPaper ? "Paper " : ""}Buy — ${(Number(buyAmount) / avgPrice).toFixed(1)} shares ${buyOutcome} @ $${avgPrice.toFixed(3)}`);
        bot.addLog(`🛒 Bought ${buyOutcome} on "${marketTitle.slice(0, 40)}…" — $${buyAmount} ${buyPaper ? "(paper)" : "(live)"}`);
        await td.settleAndRefresh(); setTimeout(() => setBuyMarket(null), 2500);
      } else {
        const missing = Array.isArray(data?.missingFields) ? ` (${data.missingFields.join(", ")})` : "";
        setBuySuccess(`❌ ${data.error || "Buy failed"}${missing}`);
      }
    } catch (e: unknown) { setBuySuccess(`❌ ${(e as Error).message}`); }
    finally { setBuySubmitting(false); }
  };

  const saveCurrentSimRun = () => {
    const name = `Sim ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    const run: SimRun = {
      id: Date.now().toString(), name, created_at: new Date().toISOString(),
      config: { name, amount: bot.config.capitalAlloc, timeframe: "current", buys_per_day: bot.config.maxPositions, risk_mix: bot.config.riskMix, whale_follow: bot.config.whaleFollow, focus_areas: bot.config.focusAreas, profit_strategy: "arbitrage", paper_mode: bot.config.paperMode },
      pnl_data: td.pnlChart.map(p => ({ label: p.label, pnl: p.cumPnl })),
      total_pnl: td.pnlChart.length > 0 ? td.pnlChart[td.pnlChart.length - 1].cumPnl : 0,
      win_rate: td.trades.length > 0 ? parseFloat(((td.trades.filter(t => t.pnl > 0).length / td.trades.length) * 100).toFixed(1)) : 0,
      trade_count: td.trades.length,
    };
    const updated = [run, ...simRuns].slice(0, 10);
    localStorage.setItem("slate360_sim_runs", JSON.stringify(updated));
    setSimRuns(updated); bot.addLog(`💾 Sim saved: "${name}"`);
  };

  const summaryMode = td.summary?.mode ?? (bot.config.paperMode ? "paper" : "live");
  const liveChecklist = { walletConnected: isConnected, polygonSelected: chain?.id === 137, usdcFunded: Number(usdcBalance ?? 0) > 0, signatureVerified: walletVerified, usdcApproved: usdcAllowance > 0 };
  const compareRunA = simRuns.find(r => r.id === compareA);
  const compareRunB = simRuns.find(r => r.id === compareB);
  const compareChartData = (() => { if (!compareRunA && !compareRunB) return []; const len = Math.max(compareRunA?.pnl_data.length || 0, compareRunB?.pnl_data.length || 0); return Array.from({ length: len }, (_, i) => ({ label: `T${i + 1}`, a: compareRunA?.pnl_data[i]?.pnl ?? null, b: compareRunB?.pnl_data[i]?.pnl ?? null })); })();
  const formatMoney = (usd: number) => { const v = usd * (fxRates[displayCurrency] ?? 1); return new Intl.NumberFormat(undefined, { style: "currency", currency: displayCurrency, maximumFractionDigits: 2 }).format(v); };

  // ── Shared prop groups ──
  const buyProps = { buyMarket, buyOutcome, buyAmount, buyTakeProfitPct, buyStopLossPct, buyPaper, buySubmitting, buySuccess, liveChecklist, buyPayloadReady, buyPayloadIssues, formatMoney, onBuyMarketClose: () => setBuyMarket(null), onBuyOutcomeChange: setBuyOutcome, onBuyAmountChange: setBuyAmount, onBuyTakeProfitChange: setBuyTakeProfitPct, onBuyStopLossChange: setBuyStopLossPct, onBuyPaperToggle: () => setBuyPaper(p => !p), onBuySubmit: handleDirectBuy } as const;
  const ds = dir.directiveState; const dx = dir.directiveSetters;
  const dirProps = { editingDirective: dir.editingDirective, directives: dir.directives, formatMoney, directiveName: ds.directiveName, directiveAmount: ds.directiveAmount, directiveTimeframe: ds.directiveTimeframe, directiveBuysPerDay: ds.directiveBuysPerDay, directiveRisk: ds.directiveRisk, directiveWhale: ds.directiveWhale, directiveFocus: ds.directiveFocus, directiveStrategy: ds.directiveStrategy, directivePaper: ds.directivePaper, directiveDailyLossCap: ds.directiveDailyLossCap, directiveMoonshot: ds.directiveMoonshot, directiveTotalLossCap: ds.directiveTotalLossCap, directiveAutoPauseDays: ds.directiveAutoPauseDays, directiveTargetProfitMonthly: ds.directiveTargetProfitMonthly, directiveTakeProfitPct: ds.directiveTakeProfitPct, directiveStopLossPct: ds.directiveStopLossPct, onDirectiveNameChange: dx.setDirectiveName, onDirectiveAmountChange: dx.setDirectiveAmount, onDirectiveTimeframeChange: dx.setDirectiveTimeframe, onDirectiveBuysPerDayChange: dx.setDirectiveBuysPerDay, onDirectiveRiskChange: dx.setDirectiveRisk, onDirectiveWhaleToggle: () => dx.setDirectiveWhale(!ds.directiveWhale), onDirectiveFocusToggle: (area: string) => dx.setDirectiveFocus(ds.directiveFocus.includes(area) ? ds.directiveFocus.filter(a => a !== area) : [...ds.directiveFocus, area]), onDirectiveStrategyChange: dx.setDirectiveStrategy, onDirectivePaperToggle: () => dx.setDirectivePaper(!ds.directivePaper), onDirectiveDailyLossCapChange: dx.setDirectiveDailyLossCap, onDirectiveMoonshotToggle: () => dx.setDirectiveMoonshot(!ds.directiveMoonshot), onDirectiveTotalLossCapChange: dx.setDirectiveTotalLossCap, onDirectiveAutoPauseDaysChange: dx.setDirectiveAutoPauseDays, onDirectiveTargetProfitMonthlyChange: dx.setDirectiveTargetProfitMonthly, onDirectiveTakeProfitPctChange: dx.setDirectiveTakeProfitPct, onDirectiveStopLossPctChange: dx.setDirectiveStopLossPct, onSaveDirective: dir.handleSaveDirective, onResetDirectiveForm: dir.resetDirectiveForm, onApplyDirective: dir.applyDirective, onStartEditDirective: dir.startEditDirective, onDeleteDirective: dir.deleteDirective } as const;

  return (
    <div className="text-gray-900">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-gray-900 flex items-center gap-2 flex-wrap">
            Market Robot <StatusBadge status={bot.config.botRunning ? (bot.config.botPaused ? "idle" : "running") : "idle"} />
            {bot.config.paperMode && <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Paper Mode</span>}
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">AI-powered prediction market bot — {bot.config.lastScan ? `Last scan: ${new Date(bot.config.lastScan).toLocaleTimeString()}` : "Not scanned yet"}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg px-2 py-1">
            <span className="text-[10px] text-gray-500">Display</span>
            <select value={displayCurrency} onChange={e => setDisplayCurrency(e.target.value)} className="bg-transparent text-xs text-gray-700 outline-none">
              {["USD", "EUR", "GBP", "CAD", "AUD", "JPY"].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {loadingFx && <span className="text-[10px] text-gray-400">…</span>}
          </div>
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded-lg">{address?.slice(0, 6)}…{address?.slice(-4)}</span>
              {walletVerified ? <span className="text-xs text-green-600 font-medium">✓ Verified</span> : <button onClick={handleConnectWallet} className="text-xs bg-[#FF4D00] hover:bg-orange-600 px-3 py-1 rounded font-medium transition">Verify</button>}
              <button onClick={() => { disconnect(); setWalletVerified(false); }} className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition">Disconnect</button>
            </div>
          ) : (
            <div className="flex items-center gap-2 flex-wrap">
              <select value={walletChoice} onChange={e => setWalletChoice(e.target.value as typeof walletChoice)} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-2 text-xs text-gray-700">
                <option value="metamask">MetaMask</option><option value="coinbase">Coinbase Wallet</option><option value="trust">Trust Wallet</option>
              </select>
              <Tooltip><TooltipTrigger asChild><button onClick={handleConnectWallet} disabled={isConnecting} className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50">🔐 {isConnecting ? "Connecting…" : `Connect ${walletChoice === "metamask" ? "MetaMask" : walletChoice === "coinbase" ? "Coinbase" : "Trust"}`}</button></TooltipTrigger><TooltipContent>Connect wallet. Paper mode works without.</TooltipContent></Tooltip>
            </div>
          )}
          {walletError && <p className="text-xs text-red-600">{walletError}</p>}
        </div>
      </div>

      <MarketTabBar tabs={tabPrefs} activeTab={activeTab}
        onTabChange={tab => { setActiveTab(tab); if (tab === "Whale Watch" && exp.whaleData.length === 0) exp.fetchWhales(); if (tab === "Wallet & Performance") { void td.settleAndRefresh(); td.fetchSchedulerHealth(); } }}
        onTabsChange={next => { setTabPrefs(next); saveTabPrefs(next); }} />

      {activeTab === "Dashboard" && (
        <MarketDashboardTab
          config={bot.config} appliedConfig={bot.appliedConfig}
          onApplyPreset={bot.applyBeginnerBotPreset} onPaperModeToggle={() => bot.setPaperMode(!bot.config.paperMode)} onSaveSimRun={saveCurrentSimRun}
          onCapitalChange={bot.setCapitalAlloc} onMaxPositionsChange={bot.setMaxPositions} onMinEdgeChange={bot.setMinEdge} onMinVolumeChange={bot.setMinVolume}
          onMinProbLowChange={bot.setMinProbLow} onMinProbHighChange={bot.setMinProbHigh} onRiskMixChange={bot.setRiskMix} onWhaleFollowToggle={() => bot.setWhaleFollow(!bot.config.whaleFollow)} onToggleFocus={bot.toggleFocus}
          onStartBot={bot.handleStartBot} onPauseBot={bot.handlePauseBot} onStopBot={bot.handleStopBot} onRunScan={bot.runScan}
          trades={td.trades} openTrades={td.openTrades} pnlChart={td.pnlChart} loadingTrades={td.loadingTrades} totalPnl={td.totalPnl} winRate={td.winRate}
          summary={td.summary} loadingSummary={td.loadingSummary} summaryError={td.summaryError}
          schedulerHealth={td.schedulerHealth} loadingSchedulerHealth={td.loadingSchedulerHealth} schedulerHealthError={td.schedulerHealthError} schedulerStatus={td.schedulerStatus} schedulerStatusTone={td.schedulerStatusTone}
          activityLogs={td.activityLogs} scanLog={bot.scanLog} logRef={logRef} formatMoney={formatMoney}
          onFetchTrades={td.fetchTrades} onFetchSummary={td.fetchSummary} onFetchSchedulerHealth={td.fetchSchedulerHealth}
          onOpenWalletTab={async () => { await Promise.all([td.fetchSummary(), td.fetchSchedulerHealth()]); setActiveTab("Wallet & Performance"); }}
          isConnected={isConnected} address={address} chain={chain} usdcBalance={usdcBalance} maticData={maticData}
          isConnecting={isConnecting} isApproving={isApproving} waitingApproveReceipt={waitingApproveReceipt} approveSuccess={approveSuccess}
          walletVerified={walletVerified} walletChoice={walletChoice} liveChecklist={liveChecklist} polymarketSpender={POLYMARKET_SPENDER}
          onConnectWallet={handleConnectWallet} onApproveUsdc={handleApproveUsdc} onDisconnect={disconnect} onClearVerified={() => setWalletVerified(false)}
        />
      )}

      {activeTab === "Wallet & Performance" && (
        <MarketWalletPerformanceTab summaryMode={summaryMode} botRunning={bot.config.botRunning} botPaused={bot.config.botPaused} isConnected={isConnected} usdcBalance={usdcBalance}
          summaryError={td.summaryError} summary={td.summary} loadingSummary={td.loadingSummary} recentOutcomes={td.recentOutcomes} activityLogs={td.activityLogs} scanLog={bot.scanLog} formatMoney={formatMoney} onRefreshSummary={td.fetchSummary} />
      )}

      {activeTab === "Markets" && (
        <MarketExplorerTab
          pagedMarkets={exp.pagedMarkets} filteredMarketsCount={exp.filteredMarkets.length} marketsLoaded={exp.marketsLoaded} loadingMarkets={exp.loadingMarkets}
          marketsPage={exp.marketsPage} marketsTotalPages={exp.marketsTotalPages} wsConnected={exp.wsConnected} bookmarks={exp.bookmarks} watchlist={exp.watchlist} previewSummary={exp.previewSummary}
          marketSearch={exp.marketSearch} mktTimeframe={exp.mktTimeframe} mktCategory={exp.mktCategory} mktProbMin={exp.mktProbMin} mktProbMax={exp.mktProbMax} mktMinVol={exp.mktMinVol} mktMinEdge={exp.mktMinEdge}
          mktRiskTag={exp.mktRiskTag} mktSortBy={exp.mktSortBy} mktSortDir={exp.mktSortDir} filtersExpanded={exp.filtersExpanded}
          {...buyProps}
          onSearchChange={exp.setMarketSearch} onSearch={exp.fetchMarkets} onTimeframeChange={exp.setMktTimeframe} onCategoryChange={exp.setMktCategory}
          onProbMinChange={exp.setMktProbMin} onProbMaxChange={exp.setMktProbMax} onMinVolChange={exp.setMktMinVol} onMinEdgeChange={exp.setMktMinEdge}
          onRiskTagChange={exp.setMktRiskTag} onSortByChange={exp.setSortBy} onFiltersToggle={() => exp.setFiltersExpanded(p => !p)} onApplyPreset={exp.applyQuickMarketPreset}
          onClearMarkets={exp.clearMarkets} onPageChange={exp.setMarketsPage}
          onToggleBookmark={exp.toggleBookmark} onToggleWatchlist={exp.toggleWatchlist} onExclude={(id: string) => exp.setExcludedMarketIds(p => { const n = new Set(p); n.add(id); return n; })} onOpenBuyPanel={openBuyPanel}
        />
      )}

      {activeTab === "Hot Opps" && (
        <MarketHotOppsTab
          markets={exp.markets} hotFiltered={exp.hotFiltered} hotTab={exp.hotTab} loadingMarkets={exp.loadingMarkets} bookmarks={exp.bookmarks} watchlist={exp.watchlist}
          {...buyProps}
          onHotTabChange={exp.setHotTab} onToggleBookmark={exp.toggleBookmark} onToggleWatchlist={exp.toggleWatchlist} onOpenBuyPanel={openBuyPanel}
        />
      )}

      {activeTab === "Whale Watch" && (
        <MarketWhaleWatchTab whaleData={exp.whaleData} loadingWhales={exp.loadingWhales} whaleFilter={exp.whaleFilter} paperMode={bot.config.paperMode}
          onFilterChange={exp.setWhaleFilter} onRefresh={exp.fetchWhales} onCopyTrade={w => bot.addLog(`📋 Copy-traded whale ${w.whaleAddress.slice(0, 8)}… — ${w.outcome} on ${w.marketTitle}`)} />
      )}

      {activeTab === "Sim Compare" && (
        <MarketSimCompareTab simRuns={simRuns} compareA={compareA} compareB={compareB} compareRunA={compareRunA} compareRunB={compareRunB} compareChartData={compareChartData}
          hasTrades={td.trades.length > 0} onCompareAChange={setCompareA} onCompareBChange={setCompareB} onSaveCurrentSim={saveCurrentSimRun}
          onDeleteRun={(id: string) => { const next = simRuns.filter(r => r.id !== id); setSimRuns(next); localStorage.setItem("slate360_sim_runs", JSON.stringify(next)); }} />
      )}

      {activeTab === "Directives" && <MarketDirectivesTab {...dirProps} />}
    </div>
  );
}
