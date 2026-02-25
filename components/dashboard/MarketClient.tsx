"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
  useBalance,
  useReadContract,
} from "wagmi";
import { injected } from "wagmi/connectors";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  Legend,
  AreaChart,
  Area,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { createClient } from "@/lib/supabase/client";
import type {
  ApiEnvelope,
  MarketViewModel,
  MarketSummaryViewModel,
  SchedulerHealthViewModel,
  TradeViewModel,
  WhaleActivityViewModel,
} from "@/lib/market/contracts";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketTrade extends TradeViewModel {
  category?: string;
  probability?: number;
  volume?: number;
}

interface BuyDirective {
  id?: string;
  name: string;
  amount: number;
  timeframe: string;
  buys_per_day: number;
  risk_mix: "conservative" | "balanced" | "aggressive";
  whale_follow: boolean;
  focus_areas: string[];
  profit_strategy: "arbitrage" | "market-making" | "whale-copy" | "longshot";
  paper_mode: boolean;
  created_at?: string;
}

interface SimRun {
  id: string;
  name: string;
  created_at: string;
  config: BuyDirective;
  pnl_data: { label: string; pnl: number }[];
  total_pnl: number;
  win_rate: number;
  trade_count: number;
}

type WhaleActivity = WhaleActivityViewModel;

interface MarketListing extends MarketViewModel {
  bookmarked: boolean;
  endDateLabel?: string;
  liquidity?: number;
}

type MarketSortKey = "volume" | "edge" | "probability" | "title" | "endDate";

// ─── Constants ────────────────────────────────────────────────────────────────

const FOCUS_AREAS = [
  "Construction", "Real Estate", "Economy", "Politics", "Sports",
  "Crypto", "Finance", "Science", "Tech", "Entertainment"
];

const RISK_COLORS = {
  hot: "#FF4D00",
  "high-risk": "#ef4444",
  "high-potential": "#22c55e",
  construction: "#1E3A8A",
};

const TABS = ["Dashboard", "Wallet & Performance", "Markets", "Hot Opps", "Directives", "Whale Watch", "Sim Compare"];

// ─── Helper ───────────────────────────────────────────────────────────────────

function HelpTip({ content }: { content: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-300 text-gray-700 text-[10px] cursor-help ml-1 select-none">?</span>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {content}
      </TooltipContent>
    </Tooltip>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    open: "bg-green-100 text-green-700 border border-green-200",
    closed: "bg-gray-200 text-gray-500",
    paper: "bg-purple-100 text-purple-700 border border-purple-200",
    connected: "bg-green-100 text-green-700 border border-green-200",
    disconnected: "bg-gray-200 text-gray-500",
    running: "bg-orange-100 text-orange-700 border border-orange-200",
    idle: "bg-gray-200 text-gray-500",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] || colors.idle}`}>
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MarketClient() {
  const pathname = usePathname();
  const isStandalonePage = pathname === "/market";

  // Wagmi
  const { address, isConnected, chain } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();
  // Native balance (MATIC on Polygon)
  const { data: maticData } = useBalance({
    address,
    chainId: 137,
    query: { enabled: isConnected && !!address },
  });

  // USDC balance via ERC-20 balanceOf (wagmi v3 useReadContract)
  const USDC_POLYGON = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" as const; // native USDC on Polygon
  const { data: usdcRaw } = useReadContract({
    address: USDC_POLYGON,
    abi: [{ name: "balanceOf", type: "function", stateMutability: "view", inputs: [{ name: "account", type: "address" }], outputs: [{ name: "", type: "uint256" }] }] as const,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: 137,
    query: { enabled: isConnected && !!address },
  });
  const usdcBalance = usdcRaw != null ? (Number(usdcRaw) / 1e6).toFixed(2) : null; // USDC has 6 decimals

  // Tabs
  const [activeTab, setActiveTab] = useState("Dashboard");

  // Bot state
  const [botRunning, setBotRunning] = useState(false);
  const [botPaused, setBotPaused] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);
  const [appliedConfig, setAppliedConfig] = useState<Record<string, unknown> | null>(null);

  // Config
  const [paperMode, setPaperMode] = useState(true);
  const [maxPositions, setMaxPositions] = useState(5);
  const [capitalAlloc, setCapitalAlloc] = useState(500);
  const [minEdge, setMinEdge] = useState(3);
  const [minVolume, setMinVolume] = useState(10000);
  const [minProbLow, setMinProbLow] = useState(10);
  const [minProbHigh, setMinProbHigh] = useState(90);
  const [whaleFollow, setWhaleFollow] = useState(false);
  const [riskMix, setRiskMix] = useState<"conservative" | "balanced" | "aggressive">("balanced");
  const [focusAreas, setFocusAreas] = useState<string[]>(["Construction"]);

  // Wallet
  const [walletVerified, setWalletVerified] = useState(false);
  const [walletError, setWalletError] = useState("");

  // Trades & chart
  const [trades, setTrades] = useState<MarketTrade[]>([]);
  const [pnlChart, setPnlChart] = useState<{ label: string; pnl: number; cumPnl: number }[]>([]);
  const [loadingTrades, setLoadingTrades] = useState(false);
  const [summary, setSummary] = useState<MarketSummaryViewModel | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [summaryError, setSummaryError] = useState<string | null>(null);
  const [schedulerHealth, setSchedulerHealth] = useState<SchedulerHealthViewModel | null>(null);
  const [loadingSchedulerHealth, setLoadingSchedulerHealth] = useState(false);
  const [schedulerHealthError, setSchedulerHealthError] = useState<string | null>(null);

  // Whale watch
  const [whaleData, setWhaleData] = useState<WhaleActivity[]>([]);
  const [loadingWhales, setLoadingWhales] = useState(false);
  const [whaleFilter, setWhaleFilter] = useState("all");

  // Markets Explorer
  const [markets, setMarkets] = useState<MarketListing[]>([]);
  const [marketsLoaded, setMarketsLoaded] = useState(false);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [marketSearch, setMarketSearch] = useState("");
  const [mktCategory, setMktCategory] = useState("all");
  const [mktProbMin, setMktProbMin] = useState(0);
  const [mktProbMax, setMktProbMax] = useState(100);
  const [mktMinVol, setMktMinVol] = useState(0);
  const [mktMinEdge, setMktMinEdge] = useState(0);
  const [mktRiskTag, setMktRiskTag] = useState<"all" | "hot" | "high-risk" | "construction" | "high-potential" | "none">("all");
  const [mktSortBy, setMktSortBy] = useState<MarketSortKey>("volume");
  const [mktSortDir, setMktSortDir] = useState<"asc" | "desc">("desc");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [excludedMarketIds, setExcludedMarketIds] = useState<Set<string>>(new Set());
  const [marketsPage, setMarketsPage] = useState(1);
  const MARKETS_PAGE_SIZE = 50;

  // Buy panel
  const [buyMarket, setBuyMarket] = useState<MarketListing | null>(null);
  const [buyOutcome, setBuyOutcome] = useState<"YES" | "NO">("YES");
  const [buyAmount, setBuyAmount] = useState(25);
  const [buyPaper, setBuyPaper] = useState(true);
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buySuccess, setBuySuccess] = useState("");

  // Hot Opps tab
  const [hotTab, setHotTab] = useState("All");

  // Saved Directives
  const [directives, setDirectives] = useState<BuyDirective[]>([]);
  const [editingDirective, setEditingDirective] = useState<BuyDirective | null>(null);
  const [directiveName, setDirectiveName] = useState("");
  const [directiveAmount, setDirectiveAmount] = useState(100);
  const [directiveTimeframe, setDirectiveTimeframe] = useState("1w");
  const [directiveBuysPerDay, setDirectiveBuysPerDay] = useState(3);
  const [directiveRisk, setDirectiveRisk] = useState<BuyDirective["risk_mix"]>("balanced");
  const [directiveWhale, setDirectiveWhale] = useState(false);
  const [directiveFocus, setDirectiveFocus] = useState<string[]>(["Construction"]);
  const [directiveStrategy, setDirectiveStrategy] = useState<BuyDirective["profit_strategy"]>("arbitrage");
  const [directivePaper, setDirectivePaper] = useState(true);

  // Sim runs
  const [simRuns, setSimRuns] = useState<SimRun[]>([]);
  const [compareA, setCompareA] = useState<string | null>(null);
  const [compareB, setCompareB] = useState<string | null>(null);

  // Display currency (amount math still executed in USD/USDC)
  const [displayCurrency, setDisplayCurrency] = useState("USD");
  const [fxRates, setFxRates] = useState<Record<string, number>>({ USD: 1 });
  const [loadingFx, setLoadingFx] = useState(false);

  // WebSocket live prices
  const wsRef = useRef<WebSocket | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const livePricesRef = useRef<Map<string, { yes: number; no: number }>>(new Map());

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchTrades();
    void fetchSummary();
    void fetchSchedulerHealth();
    // Markets are NOT auto-loaded — user triggers search
    void loadDirectives();
    loadSimRuns();
  }, []);

  useEffect(() => {
    try {
      const savedCurrency = localStorage.getItem("slate360_market_currency");
      if (savedCurrency) {
        setDisplayCurrency(savedCurrency);
      }
    } catch {
      // ignore storage failures
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("slate360_market_currency", displayCurrency);
    } catch {
      // ignore storage failures
    }
  }, [displayCurrency]);

  useEffect(() => {
    if (displayCurrency === "USD") {
      setFxRates((prev) => ({ ...prev, USD: 1 }));
      return;
    }

    const run = async () => {
      setLoadingFx(true);
      try {
        const res = await fetch("https://open.er-api.com/v6/latest/USD", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json() as { rates?: Record<string, number> };
        if (data.rates) {
          setFxRates((prev) => ({ ...prev, ...data.rates, USD: 1 }));
        }
      } catch {
        // keep previous rates
      } finally {
        setLoadingFx(false);
      }
    };

    void run();
  }, [displayCurrency]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [scanLog]);

  useEffect(() => {
    // Build cumulative PNL chart from trades
    const sorted = [...trades].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
    let cum = 0;
    const pts = sorted.map((t, i) => {
      cum += t.pnl || 0;
      return {
        label: `Trade ${i + 1}`,
        pnl: t.pnl || 0,
        cumPnl: parseFloat(cum.toFixed(2)),
      };
    });
    setPnlChart(pts);
  }, [trades]);

  // ── WebSocket for live price updates ───────────────────────────────────────

  const subscribeToMarkets = useCallback((marketIds: string[]) => {
    // Close any existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    if (marketIds.length === 0) return;

    try {
      const ws = new WebSocket("wss://ws-subscriptions-clob.polymarket.com/ws/market");
      wsRef.current = ws;

      ws.onopen = () => {
        setWsConnected(true);
        // Subscribe to price changes for loaded markets
        // Polymarket WS expects: { type: "market", market: "<conditionId>" }
        for (const id of marketIds.slice(0, 20)) {
          ws.send(JSON.stringify({ type: "market", market: id }));
        }
        addLog("📡 Live price feed connected");
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          // Polymarket WS sends price_change events with asset_id and price
          if (msg && msg.market) {
            const marketId = msg.market;
            const changes = Array.isArray(msg.data) ? msg.data : msg.data ? [msg.data] : [];
            for (const change of changes) {
              if (change.price != null) {
                const existing = livePricesRef.current.get(marketId) || { yes: 0, no: 0 };
                if (change.outcome === "Yes" || change.side === "BUY") {
                  existing.yes = parseFloat(change.price);
                  existing.no = 1 - existing.yes;
                } else if (change.outcome === "No" || change.side === "SELL") {
                  existing.no = parseFloat(change.price);
                  existing.yes = 1 - existing.no;
                }
                livePricesRef.current.set(marketId, existing);
              }
            }

            // Batch-update markets state every message (debounce handled by React batching)
            setMarkets(prev => prev.map(m => {
              const live = livePricesRef.current.get(m.id);
              if (!live || (live.yes === 0 && live.no === 0)) return m;
              return {
                ...m,
                yesPrice: live.yes,
                noPrice: live.no,
                probabilityPct: parseFloat((live.yes * 100).toFixed(1)),
              };
            }));
          }
        } catch {
          // Ignore parse errors from non-JSON messages
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
        wsRef.current = null;
      };
    } catch {
      // WebSocket not available or blocked
      setWsConnected(false);
    }
  }, []);

  // Auto-subscribe when markets are loaded and tab is Markets or Hot Opps
  useEffect(() => {
    if (marketsLoaded && markets.length > 0 && (activeTab === "Markets" || activeTab === "Hot Opps")) {
      const ids = markets.slice(0, 20).map(m => m.id);
      subscribeToMarkets(ids);
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [marketsLoaded, markets, activeTab, subscribeToMarkets]);

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchTrades = async () => {
    setLoadingTrades(true);
    try {
      const res = await fetch("/api/market/trades");
      if (res.ok) {
        const payload = await res.json() as ApiEnvelope<{ trades: TradeViewModel[] }>;
        setTrades(payload.data?.trades ?? []);
      }
    } catch (e) {
      console.error("fetchTrades", e);
    } finally {
      setLoadingTrades(false);
    }
  };

  const fetchMarkets = async (keyword?: string) => {
    setLoadingMarkets(true);
    try {
      const kw = keyword ?? marketSearch;
      const params = new URLSearchParams({
        limit: "200",
        active: "true",
        closed: "false",
        order: "volume24hr",
        ascending: "false",
      });

      let cursor: string | undefined;
      let pageCount = 0;
      const merged: MarketViewModel[] = [];

      do {
        const pageParams = new URLSearchParams(params);
        if (cursor) pageParams.set("cursor", cursor);

        const res = await fetch(`/api/market/polymarket?${pageParams.toString()}`, { cache: "no-store" });
        if (!res.ok) break;

        const payload = await res.json() as ApiEnvelope<{ markets: MarketViewModel[]; nextCursor?: string }>;
        const pageMarkets = payload.data?.markets ?? [];
        merged.push(...pageMarkets);
        cursor = payload.data?.nextCursor;
        pageCount += 1;
      } while (cursor && pageCount < 3);

      const query = kw.trim().toLowerCase();
      const mapped: MarketListing[] = merged
        .filter((market) => {
          if (!query) return true;
          return market.title.toLowerCase().includes(query) || market.category.toLowerCase().includes(query);
        })
        .map((market) => ({
          ...market,
          bookmarked: bookmarks.has(market.id),
          endDateLabel: market.endDate ? new Date(market.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : undefined,
          liquidity: market.liquidityUsd,
        }));

      setMarkets(mapped);
      setMarketsPage(1);
      setMarketsLoaded(true);
    } catch (e) {
      console.error("fetchMarkets", e);
    } finally {
      setLoadingMarkets(false);
    }
  };

  const fetchWhales = async () => {
    setLoadingWhales(true);
    try {
      const res = await fetch("/api/market/whales", { cache: "no-store" });
      if (res.ok) {
        const payload = await res.json() as ApiEnvelope<{ whales: WhaleActivityViewModel[] }>;
        setWhaleData(payload.data?.whales ?? []);
      }
    } catch (e) {
      console.error("fetchWhales", e);
    } finally {
      setLoadingWhales(false);
    }
  };

  const fetchSummary = async () => {
    setLoadingSummary(true);
    setSummaryError(null);
    try {
      const res = await fetch("/api/market/summary", { cache: "no-store" });
      const payload = await res.json() as ApiEnvelope<MarketSummaryViewModel>;
      if (!res.ok || !payload.ok) {
        setSummaryError(payload.error?.message ?? "Failed to load wallet and performance summary");
        return;
      }
      setSummary(payload.data ?? null);
    } catch (e) {
      setSummaryError(e instanceof Error ? e.message : "Failed to load wallet and performance summary");
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchSchedulerHealth = async () => {
    setLoadingSchedulerHealth(true);
    setSchedulerHealthError(null);
    try {
      const res = await fetch("/api/market/scheduler/health", { cache: "no-store" });
      const payload = await res.json() as ApiEnvelope<SchedulerHealthViewModel>;
      if (!res.ok || !payload.ok) {
        setSchedulerHealthError(payload.error?.message ?? "Failed to load scheduler health");
        return;
      }
      setSchedulerHealth(payload.data ?? null);
    } catch (e) {
      setSchedulerHealthError(e instanceof Error ? e.message : "Failed to load scheduler health");
    } finally {
      setLoadingSchedulerHealth(false);
    }
  };

  // ── Wallet ─────────────────────────────────────────────────────────────────

  const handleConnectWallet = async () => {
    setWalletError("");
    try {
      if (!isConnected) {
        connect({ connector: injected() });
        return;
      }
      // Sign nonce to verify ownership
      const message = `Slate360 Market Robot verification: ${Date.now()}`;
      const signature = await signMessageAsync({ message });
      const res = await fetch("/api/market/wallet-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, message }),
      });
      if (res.ok) {
        setWalletVerified(true);
        addLog(`✅ Wallet verified: ${address}`);
      } else {
        const e = await res.json();
        setWalletError(e.error || "Verification failed");
      }
    } catch (e: unknown) {
      setWalletError((e as Error).message || "Connection failed");
    }
  };

  // ── Bot controls ───────────────────────────────────────────────────────────

  const addLog = (msg: string) => {
    const ts = new Date().toLocaleTimeString();
    setScanLog(prev => [`[${ts}] ${msg}`, ...prev].slice(0, 100));
  };

  const runScan = async () => {
    setScanning(true);
    addLog("🔍 Scanning Polymarket for opportunities…");
    try {
      const res = await fetch("/api/market/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paper_mode: paperMode,
          max_positions: maxPositions,
          capital_per_trade: capitalAlloc / maxPositions,
          min_edge: minEdge / 100,
          min_volume: minVolume,
          min_probability: minProbLow / 100,
          max_probability: minProbHigh / 100,
          whale_follow: whaleFollow,
          risk_mix: riskMix,
          focus_areas: focusAreas,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        const scanPayload = data as ApiEnvelope<{
          executed: TradeViewModel[];
          appliedConfig?: Record<string, unknown>;
        }>;
        const scanTrades = scanPayload.data?.executed ?? [];
        const executedCount = scanTrades.length;
        addLog(`✅ Scan complete — ${executedCount} trades executed`);
        if (scanTrades.length > 0) {
          scanTrades.forEach((t) => {
            addLog(`  → ${t.outcome} on "${t.marketTitle?.slice(0, 40)}…" @ $${t.avgPrice?.toFixed(3)}`);
          });
        }
        setAppliedConfig(scanPayload.data?.appliedConfig ?? null);
        setLastScan(new Date().toISOString());
        await fetchTrades();
        await fetchSummary();
        await fetchSchedulerHealth();
      } else {
        const errorMessage = (data as ApiEnvelope<unknown>)?.error?.message ?? "Unknown error";
        addLog(`❌ Scan failed: ${errorMessage}`);
      }
    } catch (e: unknown) {
      addLog(`❌ Error: ${(e as Error).message}`);
    } finally {
      setScanning(false);
    }
  };

  const handleStartBot = async () => {
    if (!paperMode && !walletVerified) {
      addLog("⚠️ Wallet not verified — switching to paper mode");
      setPaperMode(true);
    }
    setBotRunning(true);
    setBotPaused(false);
    addLog(`🤖 Bot started in ${paperMode ? "PAPER" : "LIVE"} mode`);
    
    // Update user metadata so the server knows the bot is running
    try {
      await fetch("/api/market/bot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "running" }),
      });
      await fetchSchedulerHealth();
    } catch (e) {
      console.error("Failed to update bot status", e);
    }

    await runScan();
  };

  const handlePauseBot = async () => {
    const newPaused = !botPaused;
    setBotPaused(newPaused);
    addLog(newPaused ? "⏸ Bot paused" : "▶️ Bot resumed");
    
    try {
      await fetch("/api/market/bot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newPaused ? "paused" : "running" }),
      });
      await fetchSchedulerHealth();
    } catch (e) {
      console.error("Failed to update bot status", e);
    }
  };

  const handleStopBot = async () => {
    setBotRunning(false);
    setBotPaused(false);
    addLog("⛔ Bot stopped");
    
    try {
      await fetch("/api/market/bot-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "stopped" }),
      });
      await fetchSchedulerHealth();
    } catch (e) {
      console.error("Failed to update bot status", e);
    }
  };

  // ── Focus areas toggle ─────────────────────────────────────────────────────

  const toggleFocus = (area: string) => {
    setFocusAreas(prev =>
      prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area]
    );
  };

  // ── Bookmarks ──────────────────────────────────────────────────────────────

  const toggleBookmark = (id: string) => {
    setBookmarks(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  // ── Direct Buy ─────────────────────────────────────────────────────────────

  const openBuyPanel = (market: MarketListing, outcome: "YES" | "NO" = "YES") => {
    setBuyMarket(market);
    setBuyOutcome(outcome);
    setBuyAmount(25);
    setBuySuccess("");
    setBuyPaper(paperMode);
  };

  const defaultSortDirection = (key: MarketSortKey): "asc" | "desc" => {
    if (key === "title" || key === "endDate") return "asc";
    return "desc";
  };

  const setSortBy = (key: MarketSortKey) => {
    if (mktSortBy === key) {
      setMktSortDir(prev => (prev === "asc" ? "desc" : "asc"));
      return;
    }
    setMktSortBy(key);
    setMktSortDir(defaultSortDirection(key));
  };

  const applyQuickMarketPreset = (preset: "construction" | "high-volume" | "mispriced" | "closing-soon" | "crypto") => {
    if (preset === "construction") {
      setMarketSearch("construction");
      setMktCategory("all");
      setMktRiskTag("construction");
      setMktMinVol(5000);
      setMktMinEdge(3);
      setMktSortBy("edge");
      setMktSortDir("desc");
      return;
    }
    if (preset === "high-volume") {
      setMktMinVol(25000);
      setMktMinEdge(0);
      setMktRiskTag("all");
      setMktSortBy("volume");
      setMktSortDir("desc");
      return;
    }
    if (preset === "mispriced") {
      setMktMinEdge(10);
      setMktProbMin(20);
      setMktProbMax(80);
      setMktSortBy("edge");
      setMktSortDir("desc");
      return;
    }
    if (preset === "closing-soon") {
      setMktSortBy("endDate");
      setMktSortDir("asc");
      setMktMinVol(1000);
      return;
    }
    if (preset === "crypto") {
      setMarketSearch("crypto bitcoin ethereum");
      setMktCategory("all");
      setMktRiskTag("all");
      setMktSortBy("volume");
      setMktSortDir("desc");
    }
  };

  const applyBeginnerBotPreset = (preset: "starter" | "balanced" | "active") => {
    if (preset === "starter") {
      setPaperMode(true);
      setCapitalAlloc(250);
      setMaxPositions(3);
      setMinEdge(5);
      setMinVolume(25000);
      setMinProbLow(20);
      setMinProbHigh(80);
      setRiskMix("conservative");
      setWhaleFollow(false);
      addLog("🧭 Preset applied: Starter (safe paper setup)");
      return;
    }

    if (preset === "balanced") {
      setPaperMode(true);
      setCapitalAlloc(500);
      setMaxPositions(5);
      setMinEdge(3);
      setMinVolume(10000);
      setMinProbLow(10);
      setMinProbHigh(90);
      setRiskMix("balanced");
      setWhaleFollow(false);
      addLog("🧭 Preset applied: Balanced");
      return;
    }

    setPaperMode(true);
    setCapitalAlloc(900);
    setMaxPositions(10);
    setMinEdge(2);
    setMinVolume(5000);
    setMinProbLow(5);
    setMinProbHigh(95);
    setRiskMix("aggressive");
    setWhaleFollow(true);
    addLog("🧭 Preset applied: Active (higher volume paper setup)");
  };

  const handleDirectBuy = async () => {
    if (!buyMarket) return;
    setBuySubmitting(true);
    setBuySuccess("");
    try {
      const marketId = String(buyMarket.id ?? "").trim();
      const marketTitle = String(buyMarket.title ?? "").trim() || `${buyMarket.category || "General"} market`;
      const normalizedAmount = Number(buyAmount);
      const rawPrice = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
      const fallbackPrice = Number(buyMarket.probabilityPct) / 100;
      const avgPrice = Number.isFinite(rawPrice) && rawPrice > 0
        ? rawPrice
        : Number.isFinite(fallbackPrice) && fallbackPrice > 0
          ? fallbackPrice
          : NaN;

      if (!buyPayloadReady) {
        setBuySuccess(`❌ Buy payload invalid (${buyPayloadIssues.join(", ")}). Refresh markets and try again.`);
        return;
      }

      const res = await fetch("/api/market/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_id:      marketId,
          market_title:   marketTitle,
          outcome:        buyOutcome,
          amount:         normalizedAmount,
          avg_price:      avgPrice,
          category:       buyMarket.category,
          probability:    buyMarket.probabilityPct,
          paper_mode:     buyPaper,
          wallet_address: address ?? null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBuySuccess(`✅ ${buyPaper ? "Paper " : ""}Buy saved — ${(normalizedAmount / avgPrice).toFixed(1)} shares ${buyOutcome} @ $${avgPrice.toFixed(3)}`);
        addLog(`🛒 Bought ${buyOutcome} on "${marketTitle.slice(0, 40)}…" — $${normalizedAmount} ${buyPaper ? "(paper)" : "(live)"}`);
        await fetchTrades();
        setTimeout(() => setBuyMarket(null), 2500);
      } else {
        const missing = Array.isArray(data?.missingFields) ? ` (${data.missingFields.join(", ")})` : "";
        setBuySuccess(`❌ ${data.error || "Buy failed"}${missing}`);
      }
    } catch (e: unknown) {
      setBuySuccess(`❌ ${(e as Error).message}`);
    } finally {
      setBuySubmitting(false);
    }
  };

  // ── Directives CRUD ────────────────────────────────────────────────────────

  async function loadDirectives() {
    try {
      const res = await fetch("/api/market/directives", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json() as { directives?: BuyDirective[] };
        setDirectives(data.directives ?? []);
        return;
      }
    } catch {
      // fallback below
    }

    try {
      const saved = localStorage.getItem("slate360_directives");
      if (saved) {
        setDirectives(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }

  const saveDirectives = (list: BuyDirective[]) => {
    localStorage.setItem("slate360_directives", JSON.stringify(list));
    setDirectives(list);
  };

  const handleSaveDirective = async () => {
    if (!directiveName.trim()) return;

    const d: BuyDirective = {
      id: editingDirective?.id || Date.now().toString(),
      name: directiveName,
      amount: directiveAmount,
      timeframe: directiveTimeframe,
      buys_per_day: directiveBuysPerDay,
      risk_mix: directiveRisk,
      whale_follow: directiveWhale,
      focus_areas: directiveFocus,
      profit_strategy: directiveStrategy,
      paper_mode: directivePaper,
      created_at: new Date().toISOString(),
    };

    try {
      const method = editingDirective ? "PATCH" : "POST";
      const res = await fetch("/api/market/directives", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(d),
      });

      if (res.ok) {
        const data = await res.json() as { directive?: BuyDirective };
        if (data.directive) {
          const existing = directives.filter((x) => x.id !== data.directive?.id);
          setDirectives([data.directive, ...existing]);
          localStorage.setItem("slate360_directives", JSON.stringify([data.directive, ...existing]));
        }
      } else {
        const existing = directives.filter((x) => x.id !== d.id);
        saveDirectives([d, ...existing]);
      }
    } catch {
      const existing = directives.filter((x) => x.id !== d.id);
      saveDirectives([d, ...existing]);
    }

    resetDirectiveForm();
    addLog(`💾 Directive "${d.name}" saved`);
  };

  const applyDirective = (d: BuyDirective) => {
    setDirectiveAmount(d.amount);
    setCapitalAlloc(d.amount);
    setDirectiveBuysPerDay(d.buys_per_day);
    setDirectiveRisk(d.risk_mix);
    setRiskMix(d.risk_mix);
    setDirectiveWhale(d.whale_follow);
    setWhaleFollow(d.whale_follow);
    setDirectiveFocus(d.focus_areas);
    setFocusAreas(d.focus_areas);
    setDirectiveStrategy(d.profit_strategy);
    setDirectivePaper(d.paper_mode);
    setPaperMode(d.paper_mode);
    addLog(`📋 Directive "${d.name}" applied to bot`);
    setActiveTab("Dashboard");
  };

  const deleteDirective = async (id: string) => {
    const prev = directives;
    const next = directives.filter((d) => d.id !== id);
    setDirectives(next);
    localStorage.setItem("slate360_directives", JSON.stringify(next));

    try {
      const res = await fetch(`/api/market/directives?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) {
        setDirectives(prev);
        localStorage.setItem("slate360_directives", JSON.stringify(prev));
      }
    } catch {
      setDirectives(prev);
      localStorage.setItem("slate360_directives", JSON.stringify(prev));
    }
  };

  const resetDirectiveForm = () => {
    setEditingDirective(null);
    setDirectiveName("");
    setDirectiveAmount(100);
    setDirectiveTimeframe("1w");
    setDirectiveBuysPerDay(3);
    setDirectiveRisk("balanced");
    setDirectiveWhale(false);
    setDirectiveFocus(["Construction"]);
    setDirectiveStrategy("arbitrage");
    setDirectivePaper(true);
  };

  // ── Sim runs ───────────────────────────────────────────────────────────────

  function loadSimRuns() {
    try {
      const saved = localStorage.getItem("slate360_sim_runs");
      if (saved) setSimRuns(JSON.parse(saved));
    } catch {}
  }

  const saveCurrentSimRun = () => {
    const runName = `Sim ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`;
    const run: SimRun = {
      id: Date.now().toString(),
      name: runName,
      created_at: new Date().toISOString(),
      config: {
        name: runName,
        amount: capitalAlloc,
        timeframe: "current",
        buys_per_day: maxPositions,
        risk_mix: riskMix,
        whale_follow: whaleFollow,
        focus_areas: focusAreas,
        profit_strategy: "arbitrage",
        paper_mode: paperMode,
      },
      pnl_data: pnlChart.map(p => ({ label: p.label, pnl: p.cumPnl })),
      total_pnl: pnlChart.length > 0 ? pnlChart[pnlChart.length - 1].cumPnl : 0,
      win_rate: trades.length > 0
        ? parseFloat(((trades.filter(t => t.pnl > 0).length / trades.length) * 100).toFixed(1))
        : 0,
      trade_count: trades.length,
    };
    const existing = JSON.parse(localStorage.getItem("slate360_sim_runs") || "[]");
    const updated = [run, ...existing].slice(0, 10);
    localStorage.setItem("slate360_sim_runs", JSON.stringify(updated));
    setSimRuns(updated);
    addLog(`💾 Sim run saved: "${runName}"`);
  };

  // ── Computed ───────────────────────────────────────────────────────────────

  const totalPnl = trades.reduce((s, t) => s + (t.pnl || 0), 0);
  const openTrades = trades.filter(t => t.status === "open");
  const winRate = trades.length > 0
    ? ((trades.filter(t => t.pnl > 0).length / trades.length) * 100).toFixed(1)
    : "0";
  const recentOutcomes = trades.slice(0, 8);
  const summaryMode = summary?.mode ?? (paperMode ? "paper" : "live");
  const schedulerStatus = schedulerHealth?.status ?? "stopped";
  const schedulerStatusTone =
    schedulerStatus === "running"
      ? "bg-green-100 text-green-700 border-green-200"
      : schedulerStatus === "paper"
        ? "bg-purple-100 text-purple-700 border-purple-200"
        : schedulerStatus === "paused"
          ? "bg-amber-100 text-amber-700 border-amber-200"
          : "bg-gray-100 text-gray-600 border-gray-200";

  const filteredMarkets = (() => {
    const q = marketSearch.toLowerCase();
    const filtered = markets.filter(m => {
      if (excludedMarketIds.has(m.id)) return false;
      if (q && !m.title.toLowerCase().includes(q) && !m.category.toLowerCase().includes(q)) return false;
      if (mktCategory !== "all" && m.category.toLowerCase() !== mktCategory.toLowerCase()) return false;
      if (m.probabilityPct < mktProbMin || m.probabilityPct > mktProbMax) return false;
      if (m.volume24hUsd < mktMinVol) return false;
      if (m.edgePct < mktMinEdge) return false;
      if (mktRiskTag === "none" && m.riskTag !== null) return false;
      if (mktRiskTag !== "all" && mktRiskTag !== "none" && m.riskTag !== mktRiskTag) return false;
      return true;
    });
    const sorted = filtered.sort((a, b) => {
      switch (mktSortBy) {
        case "edge": return a.edgePct - b.edgePct;
        case "probability": return a.probabilityPct - b.probabilityPct;
        case "title": return a.title.localeCompare(b.title);
        case "endDate": return new Date(a.endDate || 0).getTime() - new Date(b.endDate || 0).getTime();
        default: return a.volume24hUsd - b.volume24hUsd;
      }
    });

    return mktSortDir === "asc" ? sorted : sorted.reverse();
  })();

  const marketsTotalPages = Math.max(1, Math.ceil(filteredMarkets.length / MARKETS_PAGE_SIZE));
  const pagedMarkets = filteredMarkets.slice((marketsPage - 1) * MARKETS_PAGE_SIZE, marketsPage * MARKETS_PAGE_SIZE);

  useEffect(() => {
    if (marketsPage > marketsTotalPages) {
      setMarketsPage(marketsTotalPages);
    }
  }, [marketsPage, marketsTotalPages]);

  const buyPayloadIssues = useMemo(() => {
    if (!buyMarket) return [] as string[];
    const issues: string[] = [];
    const marketId = String(buyMarket.id ?? "").trim();
    const normalizedAmount = Number(buyAmount);
    const rawPrice = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
    const fallbackPrice = Number(buyMarket.probabilityPct) / 100;
    const avgPrice = Number.isFinite(rawPrice) && rawPrice > 0
      ? rawPrice
      : Number.isFinite(fallbackPrice) && fallbackPrice > 0
        ? fallbackPrice
        : NaN;

    if (!marketId) issues.push("market_id missing");
    if (!Number.isFinite(normalizedAmount) || normalizedAmount <= 0) issues.push("amount invalid");
    if (!Number.isFinite(avgPrice) || avgPrice <= 0) issues.push("price invalid");
    return issues;
  }, [buyAmount, buyMarket, buyOutcome]);

  const buyPayloadReady = buyPayloadIssues.length === 0;

  const hotOppTabs = ["All", "High Potential", "High Risk-High Reward", "Bookmarked", "Construction"];
  const hotFiltered = markets.filter(m => {
    if (excludedMarketIds.has(m.id)) return false;
    if (hotTab === "All") return true;
    if (hotTab === "High Potential") return m.riskTag === "high-potential";
    if (hotTab === "High Risk-High Reward") return m.riskTag === "high-risk";
    if (hotTab === "Bookmarked") return bookmarks.has(m.id);
    if (hotTab === "Construction") return m.riskTag === "construction" || m.category.toLowerCase().includes("construction");
    return true;
  });

  const compareRunA = simRuns.find(r => r.id === compareA);
  const compareRunB = simRuns.find(r => r.id === compareB);

  const compareChartData = (() => {
    if (!compareRunA && !compareRunB) return [];
    const len = Math.max(
      compareRunA?.pnl_data.length || 0,
      compareRunB?.pnl_data.length || 0
    );
    return Array.from({ length: len }, (_, i) => ({
      label: `T${i + 1}`,
      a: compareRunA?.pnl_data[i]?.pnl ?? null,
      b: compareRunB?.pnl_data[i]?.pnl ?? null,
    }));
  })();

  const convertFromUsd = (usd: number) => {
    const rate = fxRates[displayCurrency] ?? 1;
    return usd * rate;
  };

  const formatMoney = (usd: number) => {
    const value = convertFromUsd(usd);
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency: displayCurrency,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="text-gray-900">
      {/* ── Back to Dashboard (standalone page only) ── */}
      {isStandalonePage && (
        <div className="mb-4 px-1">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#FF4D00] transition group font-medium"
          >
            <span className="group-hover:-translate-x-0.5 transition-transform">←</span>
            Back to Dashboard
          </Link>
        </div>
      )}

      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-gray-900 flex items-center gap-2">
            Market Robot
            <StatusBadge status={botRunning ? (botPaused ? "idle" : "running") : "idle"} />
            {paperMode && <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Paper Mode</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            AI-powered prediction market bot — {lastScan ? `Last scan: ${new Date(lastScan).toLocaleTimeString()}` : "Not scanned yet"}
          </p>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-1 bg-gray-100 border border-gray-200 rounded-lg px-2 py-1">
            <span className="text-[10px] text-gray-500">Display</span>
            <select
              value={displayCurrency}
              onChange={(e) => setDisplayCurrency(e.target.value)}
              className="bg-transparent text-xs text-gray-700 outline-none"
            >
              {(["USD", "EUR", "GBP", "CAD", "AUD", "JPY"] as const).map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
            {loadingFx && <span className="text-[10px] text-gray-400">…</span>}
          </div>
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded-lg">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
              {walletVerified
                ? <span className="text-xs text-green-600 font-medium">✓ Verified</span>
                : <button onClick={handleConnectWallet} className="text-xs bg-[#FF4D00] hover:bg-orange-600 px-3 py-1 rounded font-medium transition">Verify Signature</button>
              }
              <button onClick={() => { disconnect(); setWalletVerified(false); }} className="text-xs text-gray-500 hover:text-gray-800 px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 transition">Disconnect</button>
            </div>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleConnectWallet}
                  disabled={isConnecting}
                  className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  🦊 {isConnecting ? "Connecting…" : "Connect MetaMask"}
                </button>
              </TooltipTrigger>
              <TooltipContent>Connect your MetaMask wallet to enable live trading. Paper mode works without a wallet.</TooltipContent>
            </Tooltip>
          )}
          {walletError && <p className="text-xs text-red-600">{walletError}</p>}
        </div>
      </div>

      {/* ── Tabs ── */}
      <div className="flex gap-1 mb-6 border-b border-gray-200 overflow-x-auto pb-px">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => {
              setActiveTab(tab);
              if (tab === "Whale Watch" && whaleData.length === 0) fetchWhales();
              if (tab === "Wallet & Performance") {
                fetchSummary();
                fetchSchedulerHealth();
              }
            }}
            className={`px-4 py-2.5 text-sm font-semibold whitespace-nowrap transition-all border-b-2 -mb-px rounded-t-lg ${
              activeTab === tab
                ? "border-[#FF4D00] text-[#FF4D00] bg-orange-50/50"
                : "border-transparent text-gray-500 hover:text-gray-900 hover:bg-gray-50"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

        {/* ════════════════════════════════════════════
          TAB: DASHBOARD
        ════════════════════════════════════════════ */}
        {activeTab === "Dashboard" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Config + Controls */}
          <div className="xl:col-span-1 space-y-4">

            {/* Bot Controls */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
              <h3 className="font-semibold text-xs text-gray-400 uppercase tracking-widest">Bot Controls</h3>

              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                  <p className="text-[10px] text-gray-500">Mode</p>
                  <p className="text-xs font-semibold text-gray-900">{paperMode ? "Paper" : "Live"}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                  <p className="text-[10px] text-gray-500">Bot</p>
                  <p className="text-xs font-semibold text-gray-900">{botRunning ? (botPaused ? "Paused" : "Running") : "Stopped"}</p>
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-2 py-1.5">
                  <p className="text-[10px] text-gray-500">Last Scan</p>
                  <p className="text-xs font-semibold text-gray-900">{lastScan ? new Date(lastScan).toLocaleTimeString() : "—"}</p>
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {!botRunning ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={handleStartBot} className="flex-1 bg-[#FF4D00] hover:bg-orange-600 py-2 rounded-lg text-sm font-bold transition">
                        ▶ Start Autopilot
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Start the market scanning bot with current settings.</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={handlePauseBot} className="flex-1 bg-yellow-600 hover:bg-yellow-500 text-white py-2 rounded-lg text-sm font-bold transition">
                          {botPaused ? "▶ Resume" : "⏸ Pause"}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Pause or resume the bot without losing its state.</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={handleStopBot} className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg text-sm font-bold transition">
                          ⛔ Stop
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Stop the bot completely.</TooltipContent>
                    </Tooltip>
                  </>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={runScan}
                      disabled={scanning}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50"
                    >
                      {scanning ? "🔍 Scanning…" : "🔍 Run One Scan"}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Run a one-time scan immediately using current settings. Does not start the continuous bot.</TooltipContent>
                </Tooltip>
              </div>

              {/* Paper Mode */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex items-center">
                  Paper Mode
                  <HelpTip content="Paper mode simulates trades without spending real money. Safe for testing strategies." />
                </span>
                <button
                  onClick={() => setPaperMode(p => !p)}
                  className={`relative w-10 h-5 rounded-full transition ${paperMode ? "bg-purple-600" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${paperMode ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Save Sim Button */}
              {trades.length > 0 && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={saveCurrentSimRun}
                      className="w-full bg-gray-100 hover:bg-gray-200 border border-gray-200 py-2 rounded-lg text-sm text-gray-700 transition"
                    >
                      💾 Save This Simulation Run
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Save a snapshot of the current profit/loss chart and settings for comparison later.</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Bot Configuration */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-xs text-gray-400 uppercase tracking-widest">Configuration</h3>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">Safe preset defaults</span>
              </div>

              <div>
                <label className="flex items-center text-xs text-gray-500 mb-2">
                  Quick Setup
                  <HelpTip content="Choose a preset to configure position count, filters, and risk in one click." />
                </label>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    onClick={() => applyBeginnerBotPreset("starter")}
                    className="py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
                  >
                    Starter
                  </button>
                  <button
                    onClick={() => applyBeginnerBotPreset("balanced")}
                    className="py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
                  >
                    Balanced
                  </button>
                  <button
                    onClick={() => applyBeginnerBotPreset("active")}
                    className="py-1.5 text-xs rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium transition"
                  >
                    Active
                  </button>
                </div>
              </div>

              {/* Capital */}
              <div>
                <label className="flex items-center text-xs text-gray-500 mb-1">
                  Session Budget ($)
                  <HelpTip content="Total paper/live budget used by the bot for this session." />
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={50} max={5000} step={50}
                    value={capitalAlloc}
                    onChange={e => setCapitalAlloc(+e.target.value)}
                    className="flex-1 accent-[#FF4D00]"
                  />
                  <span className="text-sm font-mono text-gray-900 w-16 text-right">${capitalAlloc}</span>
                </div>
              </div>

              {/* Max Positions */}
              <div>
                <label className="flex items-center text-xs text-gray-500 mb-1">
                  Max Open Positions
                  <HelpTip content="Maximum number of simultaneous open bets. Capital is divided evenly." />
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={1} max={20}
                    value={maxPositions}
                    onChange={e => setMaxPositions(+e.target.value)}
                    className="flex-1 accent-[#FF4D00]"
                  />
                  <span className="text-sm font-mono text-gray-900 w-8 text-right">{maxPositions}</span>
                </div>
              </div>

              {/* Min Edge */}
              <div>
                <label className="flex items-center text-xs text-gray-500 mb-1">
                  Minimum Estimated Advantage %
                  <HelpTip content="Only enter trades where the bot detects at least this estimated advantage over current market pricing." />
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={1} max={20}
                    value={minEdge}
                    onChange={e => setMinEdge(+e.target.value)}
                    className="flex-1 accent-[#FF4D00]"
                  />
                  <span className="text-sm font-mono text-gray-900 w-10 text-right">{minEdge}%</span>
                </div>
              </div>

              {/* Min Volume */}
              <div>
                <label className="flex items-center text-xs text-gray-500 mb-1">
                  Min 24h Volume ($)
                  <HelpTip content="Ignore markets with low liquidity. Higher volume = easier to enter/exit positions." />
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="range" min={1000} max={500000} step={1000}
                    value={minVolume}
                    onChange={e => setMinVolume(+e.target.value)}
                    className="flex-1 accent-[#FF4D00]"
                  />
                  <span className="text-xs font-mono text-gray-900 w-20 text-right">${minVolume.toLocaleString()}</span>
                </div>
              </div>

              {/* Probability range */}
              <div>
                <label className="flex items-center text-xs text-gray-500 mb-1">
                  Probability Range: {minProbLow}% – {minProbHigh}%
                  <HelpTip content="Only trade markets where YES probability is within this range. Avoids near-certain outcomes with no value." />
                </label>
                <div className="flex gap-2">
                  <input type="range" min={0} max={50} value={minProbLow} onChange={e => setMinProbLow(+e.target.value)} className="flex-1 accent-[#FF4D00]" />
                  <input type="range" min={50} max={100} value={minProbHigh} onChange={e => setMinProbHigh(+e.target.value)} className="flex-1 accent-[#FF4D00]" />
                </div>
              </div>

              {/* Risk Mix */}
              <div>
                <label className="flex items-center text-xs text-gray-500 mb-2">
                  Risk Mix
                  <HelpTip content="Adjusts the bot's appetite for risk. Conservative = safer but lower return. Aggressive = higher upside with more losses." />
                </label>
                <div className="flex gap-1">
                  {(["conservative", "balanced", "aggressive"] as const).map(r => (
                    <button
                      key={r}
                      onClick={() => setRiskMix(r)}
                      className={`flex-1 py-1 text-xs rounded-lg font-medium transition ${riskMix === r ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >
                      {r.charAt(0).toUpperCase() + r.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Whale Follow */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex items-center">
                  Follow Whale Wallets
                  <HelpTip content="Mirror large ($5k+) trades from sophisticated market participants detected on-chain." />
                </span>
                <button
                  onClick={() => setWhaleFollow(w => !w)}
                  className={`relative w-10 h-5 rounded-full transition ${whaleFollow ? "bg-[#1E3A8A]" : "bg-gray-300"}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${whaleFollow ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>

              {/* Focus Areas */}
              <div>
                <label className="flex items-center text-xs text-gray-500 mb-2">
                  Focus Areas
                  <HelpTip content="Restrict the bot to markets in these categories. Construction is your primary domain." />
                </label>
                <div className="flex flex-wrap gap-1">
                  {FOCUS_AREAS.map(area => (
                    <button
                      key={area}
                      onClick={() => toggleFocus(area)}
                      className={`px-2 py-0.5 text-xs rounded-full transition ${focusAreas.includes(area) ? "bg-[#1E3A8A] text-blue-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}
                    >
                      {area}
                    </button>
                  ))}
                </div>
              </div>

              {appliedConfig && (
                <details className="rounded-xl border border-gray-200 bg-gray-50 p-3 group">
                  <summary className="text-[11px] font-semibold text-gray-700 cursor-pointer list-none flex items-center justify-between">
                    Applied by backend
                    <span className="text-[10px] text-gray-400 group-open:rotate-180 transition">⌃</span>
                  </summary>
                  <pre className="mt-2 text-[10px] text-gray-600 whitespace-pre-wrap break-words">{JSON.stringify(appliedConfig, null, 2)}</pre>
                </details>
              )}
            </div>
          </div>

          {/* Right: Stats + Chart + Log */}
          <div className="xl:col-span-2 space-y-4">
            <div className="bg-gradient-to-r from-gray-50 to-white border border-gray-200 rounded-2xl shadow-sm p-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-900 flex items-center">
                  Control Center
                  <HelpTip content="Command summary for current bot mode, performance, and scheduler state." />
                </p>
                <p className="text-xs text-gray-500 mt-1">Core performance + scheduler health in one place.</p>
                <div className="mt-2 flex items-center gap-4 text-[11px] text-gray-500">
                  <span className="flex items-center gap-1">Today P/L<HelpTip content="Net realized and unrealized profit/loss for today in your selected display currency." />: <span className={`font-semibold ${(summary?.todayProfitLossUsd ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{summary ? formatMoney(summary.todayProfitLossUsd) : "—"}</span></span>
                  <span className="flex items-center gap-1">Win Rate<HelpTip content="Percentage of trades with positive profit/loss." />: <span className="font-semibold text-gray-800">{summary ? `${summary.winRatePct.toFixed(1)}%` : "—"}</span></span>
                  <span className="flex items-center gap-1">Balance<HelpTip content="Starting balance plus cumulative profit/loss." />: <span className="font-semibold text-gray-900">{summary ? formatMoney(summary.currentBalanceUsd) : "—"}</span></span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    await Promise.all([fetchSummary(), fetchSchedulerHealth()]);
                    setActiveTab("Wallet & Performance");
                  }}
                  className="bg-[#1E3A8A] hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg transition"
                >
                  Open Wallet & Performance
                </button>
                <button
                  onClick={() => {
                    fetchSummary();
                    fetchSchedulerHealth();
                  }}
                  className="text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg px-3 py-2 transition"
                >
                  Refresh Overview
                </button>
              </div>
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-gray-800 flex items-center">
                    Scheduler Health
                    <HelpTip content="Server-side automation heartbeat for directive-driven scans and execution." />
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">Autopilot cadence, daily run totals, and latest runtime state.</p>
                </div>
                <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${schedulerStatusTone}`}>
                  {schedulerStatus.toUpperCase()}
                </span>
              </div>

              {schedulerHealthError ? (
                <p className="text-xs text-red-600 mt-3">{schedulerHealthError}</p>
              ) : loadingSchedulerHealth && !schedulerHealth ? (
                <p className="text-xs text-gray-400 mt-3">Loading scheduler health…</p>
              ) : (
                <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-500 flex items-center">Runs Today <HelpTip content="How many scheduler cycles were attempted today for this user." /></p>
                    <p className="text-lg font-semibold text-gray-900">{schedulerHealth?.runsToday ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-500 flex items-center">Trades Today <HelpTip content="Number of trades executed by scheduler automation today." /></p>
                    <p className="text-lg font-semibold text-gray-900">{schedulerHealth?.tradesToday ?? 0}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-500 flex items-center">Target Frequency <HelpTip content="Planned interval between scheduler runs, derived from buys/day and global limits." /></p>
                    <p className="text-lg font-semibold text-gray-900">{schedulerHealth?.runFrequencySeconds ?? 0}s</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-[11px] text-gray-500 flex items-center">Next Eligible Run <HelpTip content="Earliest time the scheduler can execute again without violating run interval constraints." /></p>
                    <p className="text-sm font-semibold text-gray-900">
                      {schedulerHealth?.nextEligibleRunIso
                        ? new Date(schedulerHealth.nextEligibleRunIso).toLocaleTimeString()
                        : "—"}
                    </p>
                  </div>
                </div>
              )}

              {schedulerHealth?.lastError && (
                <p className="mt-3 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  Last error: {schedulerHealth.lastError}
                </p>
              )}
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Profit / Loss", value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "text-green-600" : "text-red-600" },
                { label: "Open Positions", value: openTrades.length, color: "text-gray-900" },
                { label: "Win Rate", value: `${winRate}%`, color: parseFloat(winRate) >= 50 ? "text-green-600" : "text-red-600" },
                { label: "Total Trades", value: trades.length, color: "text-gray-900" },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Profit and loss chart */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-800">
                  Profit and Loss Over Time
                  <HelpTip content="Running total of profits and losses over time." />
                </h3>
                <button onClick={fetchTrades} className="text-xs text-gray-400 hover:text-gray-700 transition">↻ Refresh</button>
              </div>
              {pnlChart.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={pnlChart} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="pnlGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#FF4D00" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#FF4D00" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} />
                    <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={v => `$${v}`} />
                    <RechartsTooltip
                      contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, color: "#111827" }}
                      formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, "Profit / Loss"]}
                    />
                    <Area type="monotone" dataKey="cumPnl" stroke="#FF4D00" fill="url(#pnlGrad)" strokeWidth={2} dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">
                  {loadingTrades ? "Loading trade data…" : "No trades yet — run a scan to populate this chart"}
                </div>
              )}
            </div>

            {/* Wallet Management */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
              <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-1">
                🦊 Wallet
                <HelpTip content="Connect MetaMask to trade live on Polymarket using real USDC. Paper mode works without a wallet." />
              </h3>
              {!isConnected ? (
                <div className="space-y-2">
                  <p className="text-[11px] text-gray-400 leading-relaxed">Connect your MetaMask wallet on Polygon to enable live trades. Paper mode doesn&apos;t require a wallet.</p>
                  <button onClick={handleConnectWallet} disabled={isConnecting}
                    className="w-full bg-[#1E3A8A] hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-bold transition disabled:opacity-50">
                    🦊 {isConnecting ? "Connecting…" : "Connect MetaMask"}
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">Address</span>
                    <span className="font-mono text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded">{address?.slice(0,6)}…{address?.slice(-4)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-500">USDC (Polygon)</span>
                    {usdcBalance != null ? (
                      <span className="font-mono text-xs text-green-600 font-semibold">${usdcBalance}</span>
                    ) : (
                      <a href={`https://polygonscan.com/address/${address}#tokentxns`}
                        target="_blank" rel="noopener noreferrer"
                        className="text-xs text-[#1E3A8A] underline underline-offset-2">View on Polygonscan ↗</a>
                    )}
                  </div>
                  {maticData && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">MATIC (gas)</span>
                      <span className="font-mono text-xs text-gray-600">{(Number(maticData.value) / 10 ** maticData.decimals).toFixed(4)} MATIC</span>
                    </div>
                  )}
                  {isConnected && chain?.id !== 137 && (
                    <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-2 py-1">⚠️ Switch MetaMask to Polygon network to see balances</p>
                  )}
                  <div className="flex gap-1.5 pt-1">
                    {!walletVerified ? (
                      <button onClick={handleConnectWallet}
                        className="flex-1 bg-[#FF4D00] hover:bg-orange-600 text-white text-xs py-2 rounded-lg font-bold transition">
                        ✍️ Verify Sign
                      </button>
                    ) : (
                      <span className="flex-1 text-center text-xs text-green-600 font-semibold py-2 bg-green-50 border border-green-200 rounded-lg">✓ Verified</span>
                    )}
                    <a href="https://global.transak.com/?defaultCryptoCurrency=USDC&network=polygon" target="_blank" rel="noopener noreferrer"
                      className="flex-1 text-center bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs py-2 rounded-lg font-bold transition">
                      💳 Buy USDC
                    </a>
                    <button onClick={() => { disconnect(); setWalletVerified(false); }}
                      className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition">Disc.</button>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">What the Bot Is Doing</h3>
              <div ref={logRef} className="bg-gray-50 border border-gray-100 rounded-lg p-3 h-48 overflow-y-auto font-mono text-xs space-y-0.5">
                {scanLog.length === 0
                  ? <span className="text-gray-400">No actions yet. Start the bot or run a test scan.</span>
                  : scanLog.map((l, i) => (
                    <div key={i} className={`${l.includes("✅") ? "text-green-600" : l.includes("❌") ? "text-red-600" : l.includes("⚠️") ? "text-yellow-600" : "text-gray-500"}`}>
                      {l}
                    </div>
                  ))}
              </div>
            </div>

            {openTrades.length > 0 && (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
                <h3 className="font-semibold text-sm text-gray-700 mb-3">Open Positions</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-200">
                        <th className="pb-2 text-left font-medium">Market</th>
                        <th className="pb-2 text-left font-medium">Outcome</th>
                        <th className="pb-2 text-right font-medium">Shares</th>
                        <th className="pb-2 text-right font-medium">Avg Price</th>
                        <th className="pb-2 text-right font-medium">Current</th>
                        <th className="pb-2 text-right font-medium">Profit / Loss</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openTrades.map(t => (
                        <tr key={t.id} className="border-b border-gray-200/50">
                          <td className="py-2 pr-2 max-w-[180px] truncate text-gray-700">{t.marketTitle}</td>
                          <td className="py-2 pr-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.outcome === "YES" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{t.outcome}</span>
                          </td>
                          <td className="py-2 text-right font-mono">{Number(t.shares).toFixed(1)}</td>
                          <td className="py-2 text-right font-mono">${Number(t.avgPrice).toFixed(3)}</td>
                          <td className="py-2 text-right font-mono">${Number(t.currentPrice).toFixed(3)}</td>
                          <td className={`py-2 text-right font-mono font-bold ${t.pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {t.pnl >= 0 ? "+" : ""}${Number(t.pnl).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: WALLET & PERFORMANCE
      ════════════════════════════════════════════ */}
      {activeTab === "Wallet & Performance" && (
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[11px] px-2.5 py-1 rounded-full border font-semibold ${summaryMode === "paper" ? "bg-purple-100 text-purple-700 border-purple-200" : "bg-green-100 text-green-700 border-green-200"}`}>
                  {summaryMode === "paper" ? "Paper Mode" : "Live Mode"}
                </span>
                <StatusBadge status={botPaused ? "idle" : botRunning ? "running" : "idle"} />
              </div>
              <p className="text-sm font-medium text-gray-800">
                {summaryMode === "paper" ? "Paper trading: safe practice" : "Live trading: connected"}
              </p>
              {summaryMode === "live" && (!isConnected || usdcBalance == null) && (
                <p className="text-xs text-amber-600 mt-1">Live balance not connected yet.</p>
              )}
            </div>
            <button onClick={fetchSummary} className="text-xs text-gray-500 hover:text-gray-800 border border-gray-200 rounded-lg px-3 py-1.5">
              ↻ Refresh Summary
            </button>
          </div>

          {summaryError && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
              {summaryError}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Wallet Snapshot</h3>
              {loadingSummary && !summary ? (
                <p className="text-sm text-gray-400">Loading wallet snapshot…</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Starting Balance</p>
                    <p className="text-lg font-semibold text-gray-900">{formatMoney(summary?.startingBalanceUsd ?? 0)}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Current Balance</p>
                    <p className="text-lg font-semibold text-gray-900">{formatMoney(summary?.currentBalanceUsd ?? 0)}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Available Cash</p>
                    <p className="text-lg font-semibold text-gray-900">{formatMoney(summary?.availableCashUsd ?? 0)}</p>
                  </div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                    <p className="text-xs text-gray-500">Total Profit / Loss</p>
                    <p className={`text-lg font-semibold ${(summary?.totalProfitLossUsd ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                      {(summary?.totalProfitLossUsd ?? 0) >= 0 ? "+" : ""}{formatMoney(summary?.totalProfitLossUsd ?? 0)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
              <h3 className="text-sm font-semibold text-gray-800">Performance Metrics</h3>
              {loadingSummary && !summary ? (
                <p className="text-sm text-gray-400">Loading performance metrics…</p>
              ) : (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs text-gray-500">Today Profit / Loss</p><p className={`font-semibold ${(summary?.todayProfitLossUsd ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>{formatMoney(summary?.todayProfitLossUsd ?? 0)}</p></div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs text-gray-500">Open Positions</p><p className="font-semibold text-gray-900">{summary?.openPositions ?? 0}</p></div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs text-gray-500">Total Trades</p><p className="font-semibold text-gray-900">{summary?.totalTrades ?? 0}</p></div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs text-gray-500">Win Rate</p><p className="font-semibold text-gray-900">{(summary?.winRatePct ?? 0).toFixed(1)}%</p></div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs text-gray-500">Average Trade Size</p><p className="font-semibold text-gray-900">{formatMoney(summary?.averageTradeUsd ?? 0)}</p></div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs text-gray-500">Average Profit per Trade</p><p className="font-semibold text-gray-900">{formatMoney(summary?.averageProfitUsd ?? 0)}</p></div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs text-gray-500">Best Day</p><p className="font-semibold text-green-600">{formatMoney(summary?.bestDayUsd ?? 0)}</p></div>
                  <div className="rounded-xl border border-gray-100 bg-gray-50 p-3"><p className="text-xs text-gray-500">Worst Day</p><p className="font-semibold text-red-600">{formatMoney(summary?.worstDayUsd ?? 0)}</p></div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">Recent Outcomes</h3>
              {recentOutcomes.length === 0 ? (
                <p className="text-sm text-gray-400">No trades yet.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-gray-400 border-b border-gray-200">
                        <th className="pb-2 text-left font-medium">Market</th>
                        <th className="pb-2 text-left font-medium">Result</th>
                        <th className="pb-2 text-right font-medium">Profit / Loss</th>
                        <th className="pb-2 text-right font-medium">When</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOutcomes.map((trade) => (
                        <tr key={trade.id} className="border-b border-gray-100">
                          <td className="py-2 pr-2 max-w-[220px] truncate text-gray-700">{trade.marketTitle}</td>
                          <td className="py-2 pr-2 text-gray-600">{trade.status === "closed" ? "Closed" : "Open"}</td>
                          <td className={`py-2 text-right font-mono ${(trade.pnl ?? 0) >= 0 ? "text-green-600" : "text-red-600"}`}>
                            {(trade.pnl ?? 0) >= 0 ? "+" : ""}{formatMoney(trade.pnl ?? 0)}
                          </td>
                          <td className="py-2 text-right text-gray-400">{new Date(trade.createdAt).toLocaleString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <h3 className="text-sm font-semibold text-gray-800 mb-3">What the Bot Did Recently</h3>
              <div className="bg-gray-50 border border-gray-100 rounded-lg p-3 h-56 overflow-y-auto font-mono text-xs space-y-1">
                {scanLog.length === 0
                  ? <span className="text-gray-400">No recent bot actions yet.</span>
                  : scanLog.slice(0, 12).map((line, index) => (
                    <div key={index} className={`${line.includes("✅") ? "text-green-600" : line.includes("❌") ? "text-red-600" : line.includes("⚠️") ? "text-yellow-600" : "text-gray-500"}`}>
                      {line}
                    </div>
                  ))}
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-gray-600">
                  Last Run: {summary?.lastRunIso ? new Date(summary.lastRunIso).toLocaleString() : "Not available"}
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 px-3 py-2 text-gray-600">
                  Run Frequency: {summary?.runFrequencySeconds != null ? `${summary.runFrequencySeconds}s` : "Not enough history"}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: MARKETS EXPLORER
      ════════════════════════════════════════════ */}
      {activeTab === "Markets" && (
        <div className="space-y-4">

          {/* ── Buy Panel (slides in when a market is selected) ── */}
          {buyMarket && (
            <div className="bg-white border-2 border-[#FF4D00]/40 rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Buying on</p>
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{buyMarket.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{buyMarket.category}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">Prob: {buyMarket.probabilityPct}%</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className={`text-xs font-bold ${buyMarket.edgePct > 10 ? "text-[#FF4D00]" : "text-gray-500"}`}>Advantage: {buyMarket.edgePct}%</span>
                  </div>
                </div>
                <button onClick={() => setBuyMarket(null)} className="text-gray-400 hover:text-gray-800 text-lg leading-none transition">×</button>
              </div>

              {/* YES / NO toggle */}
              <div>
                <label className="text-xs text-gray-500 mb-2 block">Outcome</label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setBuyOutcome("YES")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${buyOutcome === "YES" ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    YES &nbsp;
                    <span className="font-mono text-xs opacity-80">@ {(buyMarket.yesPrice * 100).toFixed(0)}¢</span>
                  </button>
                  <button
                    onClick={() => setBuyOutcome("NO")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${buyOutcome === "NO" ? "bg-red-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    NO &nbsp;
                    <span className="font-mono text-xs opacity-80">@ {(buyMarket.noPrice * 100).toFixed(0)}¢</span>
                  </button>
                </div>
              </div>

              {/* Amount + preview */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block flex items-center">
                  Amount (USDC): <span className="text-gray-900 font-semibold font-mono">${buyAmount}</span>
                  <HelpTip content="How much USDC to spend on this trade." />
                </label>
                <p className="text-[11px] text-gray-400 mb-2">Display value: {formatMoney(buyAmount)}</p>
                <input
                  type="range" min={5} max={500} step={5}
                  value={buyAmount}
                  onChange={e => setBuyAmount(+e.target.value)}
                  className="w-full accent-[#FF4D00] mb-2"
                />
                <div className="flex gap-1">
                  {[10, 25, 50, 100, 250].map(v => (
                    <button key={v} onClick={() => setBuyAmount(v)}
                      className={`px-2 py-1 text-xs rounded transition ${buyAmount === v ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                    >${v}</button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              {(() => {
                const price = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
                const avgPrice = price > 0 ? price : (buyMarket.probabilityPct / 100);
                const shares = buyAmount / avgPrice;
                const payout = shares * 1;
                const profit = payout - buyAmount;
                const lose = -buyAmount;
                const targetExitPrice = Math.min(0.99, avgPrice * 1.1);
                const targetExitPnl = shares * (targetExitPrice - avgPrice);
                return (
                  <div className="space-y-2 bg-gray-100/50 rounded-lg p-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Shares</p>
                      <p className="text-sm font-bold text-gray-900">{shares.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Max Payout</p>
                      <p className="text-sm font-bold text-green-600">{formatMoney(payout)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Max Profit</p>
                      <p className={`text-sm font-bold ${profit > 0 ? "text-green-600" : "text-red-600"}`}>
                        {profit >= 0 ? "+" : ""}{formatMoney(Math.abs(profit))}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Max Loss</p>
                      <p className="text-sm font-bold text-red-600">-{formatMoney(Math.abs(lose))}</p>
                    </div>
                    </div>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-600 space-y-1">
                      <p className="font-semibold text-gray-700">What-if scenarios</p>
                      <p>If {buyOutcome} resolves true: <span className="font-semibold text-green-600">+{formatMoney(profit)}</span></p>
                      <p>If {buyOutcome === "YES" ? "NO" : "YES"} resolves true: <span className="font-semibold text-red-600">-{formatMoney(buyAmount)}</span></p>
                      <p>If price rises 10% and you exit early: <span className={`font-semibold ${targetExitPnl >= 0 ? "text-green-600" : "text-red-600"}`}>{targetExitPnl >= 0 ? "+" : "-"}{formatMoney(Math.abs(targetExitPnl))}</span></p>
                    </div>
                  </div>
                );
              })()}

              {/* Paper mode toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex items-center gap-1">
                  Paper Mode
                  <HelpTip content="Paper mode saves the trade without spending real money. Ideal for testing." />
                </span>
                <button onClick={() => setBuyPaper(p => !p)}
                  className={`relative w-10 h-5 rounded-full transition ${buyPaper ? "bg-purple-600" : "bg-green-700"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${buyPaper ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              <p className="text-xs text-center text-gray-400">
                {buyPaper ? "📝 This will be saved as a paper (simulated) trade" : "⚠️ This will attempt a LIVE buy on Polymarket"}
              </p>

              {buySuccess && (
                <p className={`text-sm text-center font-medium ${buySuccess.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>
                  {buySuccess}
                </p>
              )}

              {!buyPayloadReady && (
                <p className="text-xs text-center text-red-500">Disabled: {buyPayloadIssues.join(", ")}</p>
              )}

              <button
                onClick={handleDirectBuy}
                disabled={buySubmitting || !buyPayloadReady}
                className="w-full bg-[#FF4D00] hover:bg-orange-600 py-3 rounded-xl text-sm font-bold transition disabled:opacity-50"
              >
                {buySubmitting ? "Processing…" : `Confirm ${buyPaper ? "Paper " : ""}Buy — $${buyAmount} ${buyOutcome}`}
              </button>
            </div>
          )}

          {/* ── Search + Filters ── */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
            <h3 className="font-semibold text-sm text-gray-800 flex items-center gap-1">
              Markets Explorer
              <HelpTip content="Search live Polymarket markets. Enter a keyword and click Search, then filter results." />
              {wsConnected && (
                <span className="ml-2 flex items-center gap-1 text-[10px] text-green-600 font-medium">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              )}
            </h3>

            {/* Search row */}
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Search markets — e.g. Bitcoin, construction, election…"
                value={marketSearch}
                onChange={e => setMarketSearch(e.target.value)}
                onKeyDown={e => e.key === "Enter" && fetchMarkets()}
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#FF4D00]"
              />
              <button
                onClick={() => fetchMarkets()}
                disabled={loadingMarkets}
                className="bg-[#FF4D00] hover:bg-orange-600 px-5 py-2 rounded-lg text-sm font-bold transition disabled:opacity-50 whitespace-nowrap"
              >
                {loadingMarkets ? "Searching…" : "🔍 Search"}
              </button>
            </div>

            {/* Filter row (only shown after first load) */}
            {marketsLoaded && (
              <div className="space-y-3 pt-1 border-t border-gray-100">
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => applyQuickMarketPreset("construction")} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] hover:bg-gray-200 transition">🏗️ Construction</button>
                  <button onClick={() => applyQuickMarketPreset("high-volume")} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] hover:bg-gray-200 transition">💧 High Volume</button>
                  <button onClick={() => applyQuickMarketPreset("mispriced")} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] hover:bg-gray-200 transition">⚖️ Mispriced</button>
                  <button onClick={() => applyQuickMarketPreset("closing-soon")} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] hover:bg-gray-200 transition">⏳ Closing Soon</button>
                  <button onClick={() => applyQuickMarketPreset("crypto")} className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-[11px] hover:bg-gray-200 transition">₿ Crypto</button>
                </div>

                {/* Row 1: Category + Risk Tag + Sort */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block flex items-center">
                      Category
                      <HelpTip content="Filter by Polymarket category." />
                    </label>
                    <select
                      value={mktCategory}
                      onChange={e => setMktCategory(e.target.value)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-[#FF4D00]"
                    >
                      <option value="all">All Categories</option>
                      {FOCUS_AREAS.map(a => <option key={a} value={a.toLowerCase()}>{a}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block flex items-center">
                      Risk Tag
                      <HelpTip content="Filter by computed risk classification." />
                    </label>
                    <select
                      value={mktRiskTag}
                      onChange={e => setMktRiskTag(e.target.value as typeof mktRiskTag)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-[#FF4D00]"
                    >
                      <option value="all">All Tags</option>
                      <option value="hot">🔥 Hot (High Advantage)</option>
                      <option value="high-potential">📈 High Potential</option>
                      <option value="high-risk">⚠️ High Risk</option>
                      <option value="construction">🏗️ Construction</option>
                      <option value="none">No Tag</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block flex items-center">
                      Sort By
                      <HelpTip content="Sort the results table." />
                    </label>
                    <select
                      value={mktSortBy}
                      onChange={e => {
                        const key = e.target.value as MarketSortKey;
                        setMktSortBy(key);
                        setMktSortDir(defaultSortDirection(key));
                      }}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-[#FF4D00]"
                    >
                      <option value="volume">24h Volume ↓</option>
                      <option value="edge">Estimated Advantage % ↓</option>
                      <option value="probability">Probability ↓</option>
                      <option value="title">Title A→Z</option>
                      <option value="endDate">End Date ↑</option>
                    </select>
                    <button
                      onClick={() => setMktSortDir(prev => (prev === "asc" ? "desc" : "asc"))}
                      className="mt-2 text-xs text-gray-600 hover:text-gray-900 transition"
                    >
                      Direction: {mktSortDir === "asc" ? "↑ Asc" : "↓ Desc"}
                    </button>
                  </div>
                </div>
                {/* Row 2: Range sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      Min Estimated Advantage %: {mktMinEdge}%
                      <HelpTip content="Only show markets with at least this estimated advantage." />
                    </label>
                    <input type="range" min={0} max={30} value={mktMinEdge} onChange={e => setMktMinEdge(+e.target.value)} className="w-full accent-[#FF4D00]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      Min Volume: ${mktMinVol.toLocaleString()}
                      <HelpTip content="Minimum 24h trading volume. Higher = more liquid." />
                    </label>
                    <input type="range" min={0} max={100000} step={1000} value={mktMinVol} onChange={e => setMktMinVol(+e.target.value)} className="w-full accent-[#FF4D00]" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      Probability: {mktProbMin}%–{mktProbMax}%
                      <HelpTip content="Filter by the YES outcome probability range." />
                    </label>
                    <div className="flex items-center gap-2">
                      <input type="range" min={0} max={100} value={mktProbMin} onChange={e => setMktProbMin(Math.min(+e.target.value, mktProbMax - 1))} className="w-full accent-[#FF4D00]" />
                      <input type="range" min={0} max={100} value={mktProbMax} onChange={e => setMktProbMax(Math.max(+e.target.value, mktProbMin + 1))} className="w-full accent-[#FF4D00]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {marketsLoaded && (
              <div className="flex gap-3 items-center text-xs text-gray-400">
                <span>{filteredMarkets.length} results</span>
                <button onClick={() => fetchMarkets()} className="text-gray-500 hover:text-gray-900 transition">↻ Refresh</button>
                <button onClick={() => {
                  setMarkets([]);
                  setMarketsLoaded(false);
                  setMarketSearch("");
                  setMktCategory("all");
                  setMktRiskTag("all");
                  setMktProbMin(0);
                  setMktProbMax(100);
                  setMktMinVol(0);
                  setMktMinEdge(0);
                  setMktSortBy("volume");
                  setMktSortDir("desc");
                  setMarketsPage(1);
                }} className="text-gray-400 hover:text-gray-500 transition">Clear</button>
              </div>
            )}
          </div>

          {/* ── Results ── */}
          {!marketsLoaded && !loadingMarkets && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-12 text-center">
              <p className="text-3xl mb-3">🔍</p>
              <p className="text-gray-700 font-medium mb-1">Search Polymarket</p>
              <p className="text-gray-400 text-sm mb-5">Enter a keyword above and click Search to browse live prediction markets</p>
              <button onClick={() => fetchMarkets("")} className="bg-[#1E3A8A] hover:bg-blue-700 px-6 py-2.5 rounded-lg text-sm font-semibold transition">
                Load Top Markets
              </button>
            </div>
          )}

          {marketsLoaded && (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100 text-xs text-gray-500">
                <span>Page {marketsPage} of {marketsTotalPages}</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMarketsPage((prev) => Math.max(1, prev - 1))}
                    disabled={marketsPage <= 1}
                    className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Prev
                  </button>
                  <button
                    onClick={() => setMarketsPage((prev) => Math.min(marketsTotalPages, prev + 1))}
                    disabled={marketsPage >= marketsTotalPages}
                    className="px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-gray-500">
                      <th className="px-4 py-3 text-left font-medium">
                        <button onClick={() => setSortBy("title")} className="hover:text-gray-700 transition">Market {mktSortBy === "title" ? (mktSortDir === "asc" ? "↑" : "↓") : ""}</button>
                      </th>
                      <th className="px-3 py-3 text-center font-medium">Cat.</th>
                      <th className="px-3 py-3 text-right font-medium">
                        <button onClick={() => setSortBy("probability")} className="hover:text-gray-700 transition">YES / NO {mktSortBy === "probability" ? (mktSortDir === "asc" ? "↑" : "↓") : ""}</button>
                      </th>
                      <th className="px-3 py-3 text-right font-medium">
                        <button onClick={() => setSortBy("volume")} className="hover:text-gray-700 transition">Vol 24h {mktSortBy === "volume" ? (mktSortDir === "asc" ? "↑" : "↓") : ""}</button>
                      </th>
                      <th className="px-3 py-3 text-right font-medium">
                        <button onClick={() => setSortBy("endDate")} className="hover:text-gray-700 transition">Ends {mktSortBy === "endDate" ? (mktSortDir === "asc" ? "↑" : "↓") : ""}</button>
                      </th>
                      <th className="px-3 py-3 text-right font-medium">
                        <button onClick={() => setSortBy("edge")} className="hover:text-gray-700 transition">Advantage {mktSortBy === "edge" ? (mktSortDir === "asc" ? "↑" : "↓") : ""}</button>
                      </th>
                      <th className="px-3 py-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMarkets ? (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-400">Searching markets…</td></tr>
                    ) : filteredMarkets.length === 0 ? (
                      <tr><td colSpan={7} className="text-center py-10 text-gray-400">No markets match — try a different search or fewer filters</td></tr>
                    ) : (
                      pagedMarkets.map(m => (
                        <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-100/30">
                          <td className="px-4 py-3 max-w-[260px]">
                            <div className="flex items-start gap-2">
                              {m.riskTag && (
                                <span style={{ background: RISK_COLORS[m.riskTag] + "30", color: RISK_COLORS[m.riskTag] }}
                                  className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase whitespace-nowrap mt-0.5">
                                  {m.riskTag.replace("-", " ")}
                                </span>
                              )}
                              <span className="text-gray-900 line-clamp-2">{m.title}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-500 text-[11px]">{m.category.slice(0, 12)}</td>
                          <td className="px-3 py-3 text-right">
                            <div className="flex flex-col items-end gap-0.5">
                              <span className={`text-xs font-semibold ${m.probabilityPct > 60 ? "text-green-600" : m.probabilityPct < 40 ? "text-red-600" : "text-gray-700"}`}>
                                Y: {(m.yesPrice * 100).toFixed(0)}¢
                              </span>
                              <span className="text-[10px] text-gray-400">N: {(m.noPrice * 100).toFixed(0)}¢</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-right text-gray-500 text-[11px]">${m.volume24hUsd >= 1000 ? `${(m.volume24hUsd/1000).toFixed(0)}k` : m.volume24hUsd.toFixed(0)}</td>
                          <td className="px-3 py-3 text-right text-gray-400 text-[10px]">{m.endDateLabel ?? "—"}</td>
                          <td className="px-3 py-3 text-right">
                            <span className={m.edgePct > 15 ? "text-[#FF4D00] font-bold" : m.edgePct > 8 ? "text-yellow-600" : "text-gray-500"}>
                              {m.edgePct}%
                            </span>
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex justify-center items-center gap-1.5 flex-wrap">
                              {/* Bookmark */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => toggleBookmark(m.id)}
                                    className={`text-base leading-none transition ${bookmarks.has(m.id) ? "text-yellow-400" : "text-gray-400 hover:text-yellow-400"}`}
                                  >
                                    {bookmarks.has(m.id) ? "★" : "☆"}
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>{bookmarks.has(m.id) ? "Unfollow market" : "Follow market"}</TooltipContent>
                              </Tooltip>

                              {/* Buy YES */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => openBuyPanel(m, "YES")}
                                    className="text-xs bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 px-2 py-1 rounded-lg font-medium transition"
                                  >
                                    Buy YES
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Open buy panel for YES outcome.</TooltipContent>
                              </Tooltip>

                              {/* Buy NO */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => openBuyPanel(m, "NO")}
                                    className="text-xs bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-2 py-1 rounded-lg font-medium transition"
                                  >
                                    Buy NO
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Open buy panel for NO outcome.</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => setExcludedMarketIds((prev) => new Set(prev).add(m.id))}
                                    className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 px-2 py-1 rounded-lg font-medium transition"
                                  >
                                    Exclude
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Hide this market from current lists.</TooltipContent>
                              </Tooltip>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: HOT OPPORTUNITIES
      ════════════════════════════════════════════ */}
      {activeTab === "Hot Opps" && (
        <div className="space-y-4">
          {/* Shared buy panel — appears when a market is selected from Hot Opps */}
          {buyMarket && (
            <div className="bg-white border-2 border-[#FF4D00]/40 rounded-2xl p-5 space-y-4 shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Buying on</p>
                  <p className="text-sm font-semibold text-gray-900 leading-snug">{buyMarket.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{buyMarket.category}</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className="text-xs text-gray-500">Prob: {buyMarket.probabilityPct}%</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className={`text-xs font-bold ${buyMarket.edgePct > 10 ? "text-[#FF4D00]" : "text-gray-500"}`}>Advantage: {buyMarket.edgePct}%</span>
                  </div>
                </div>
                <button onClick={() => setBuyMarket(null)} className="text-gray-400 hover:text-gray-800 text-lg leading-none transition">×</button>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setBuyOutcome("YES")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${buyOutcome === "YES" ? "bg-green-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                  YES <span className="font-mono text-xs opacity-80">@ {(buyMarket.yesPrice * 100).toFixed(0)}¢</span>
                </button>
                <button onClick={() => setBuyOutcome("NO")}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${buyOutcome === "NO" ? "bg-red-700 text-white" : "bg-gray-100 text-gray-600"}`}>
                  NO <span className="font-mono text-xs opacity-80">@ {(buyMarket.noPrice * 100).toFixed(0)}¢</span>
                </button>
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Amount (USDC): <span className="font-semibold text-gray-900">${buyAmount}</span></label>
                <p className="text-[11px] text-gray-400 mb-2">Display value: {formatMoney(buyAmount)}</p>
                <input type="range" min={5} max={500} step={5} value={buyAmount} onChange={e => setBuyAmount(+e.target.value)} className="w-full accent-[#FF4D00] mb-2" />
                <div className="flex gap-1">{[10,25,50,100,250].map(v => <button key={v} onClick={() => setBuyAmount(v)} className={`px-2 py-1 text-xs rounded transition ${buyAmount===v?"bg-[#FF4D00] text-white":"bg-gray-100 text-gray-600"}`}>${v}</button>)}</div>
              </div>
              {(() => {
                const price = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
                const avgPrice = price > 0 ? price : (buyMarket.probabilityPct / 100);
                const shares = buyAmount / avgPrice;
                const payout = shares;
                const profit = payout - buyAmount;
                const targetExitPrice = Math.min(0.99, avgPrice * 1.1);
                const targetExitPnl = shares * (targetExitPrice - avgPrice);
                return (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs text-gray-600 space-y-1">
                    <p className="font-semibold text-gray-700">What-if scenarios</p>
                    <p>If {buyOutcome} resolves true: <span className="font-semibold text-green-600">+{formatMoney(profit)}</span></p>
                    <p>If {buyOutcome === "YES" ? "NO" : "YES"} resolves true: <span className="font-semibold text-red-600">-{formatMoney(buyAmount)}</span></p>
                    <p>If price rises 10% and you exit early: <span className={`font-semibold ${targetExitPnl >= 0 ? "text-green-600" : "text-red-600"}`}>{targetExitPnl >= 0 ? "+" : "-"}{formatMoney(Math.abs(targetExitPnl))}</span></p>
                  </div>
                );
              })()}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700 flex items-center gap-1">Paper Mode <HelpTip content="Paper = simulated trade only." /></span>
                <button onClick={() => setBuyPaper(p => !p)} className={`relative w-10 h-5 rounded-full transition ${buyPaper ? "bg-purple-600" : "bg-green-700"}`}>
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${buyPaper ? "translate-x-5" : "translate-x-0.5"}`} />
                </button>
              </div>
              {buySuccess && <p className={`text-sm text-center font-medium ${buySuccess.startsWith("✅") ? "text-green-600" : "text-red-600"}`}>{buySuccess}</p>}
              {!buyPayloadReady && <p className="text-xs text-center text-red-500">Disabled: {buyPayloadIssues.join(", ")}</p>}
              <button onClick={handleDirectBuy} disabled={buySubmitting || !buyPayloadReady}
                className="w-full bg-[#FF4D00] hover:bg-orange-600 py-3 rounded-xl text-sm font-bold transition disabled:opacity-50 text-white">
                {buySubmitting ? "Processing…" : `Confirm ${buyPaper ? "Paper " : ""}Buy — $${buyAmount} ${buyOutcome}`}
              </button>
            </div>
          )}

          <div className="flex gap-1 overflow-x-auto pb-1">
            {hotOppTabs.map(t => (
              <button
                key={t}
                onClick={() => setHotTab(t)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full whitespace-nowrap transition ${hotTab === t ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
              >
                {t}
              </button>
            ))}
          </div>

          {loadingMarkets ? (
            <div className="text-center py-12 text-gray-400">Loading…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {hotFiltered.map(m => (
                <div key={m.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 hover:border-gray-200 transition">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <p className="text-sm text-gray-900 font-medium line-clamp-2 flex-1">{m.title}</p>
                    <button onClick={() => toggleBookmark(m.id)} className={`text-lg flex-shrink-0 ${bookmarks.has(m.id) ? "text-yellow-400" : "text-slate-700 hover:text-yellow-400"}`}>
                      {bookmarks.has(m.id) ? "★" : "☆"}
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-3 flex-wrap">
                    {m.riskTag && (
                      <span style={{ background: RISK_COLORS[m.riskTag] + "25", color: RISK_COLORS[m.riskTag], borderColor: RISK_COLORS[m.riskTag] + "60" }}
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase">
                        {m.riskTag.replace("-", " ")}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{m.category}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="bg-gray-100 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">Prob.</p>
                      <p className={`text-sm font-bold ${m.probabilityPct > 60 ? "text-green-600" : m.probabilityPct < 40 ? "text-red-600" : "text-gray-900"}`}>{m.probabilityPct}%</p>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">Advantage</p>
                      <p className="text-sm font-bold text-[#FF4D00]">{m.edgePct}%</p>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">Vol 24h</p>
                      <p className="text-sm font-bold text-gray-900">${(m.volume24hUsd / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => openBuyPanel(m, "YES")}
                          className="flex-1 bg-green-50 hover:bg-green-100 text-green-700 border border-green-200 text-xs py-1.5 rounded-lg font-medium transition"
                        >
                          Buy YES @ {(m.yesPrice * 100).toFixed(0)}¢
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Open buy panel for YES outcome on this market.</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => openBuyPanel(m, "NO")}
                          className="flex-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs py-1.5 rounded-lg font-medium transition"
                        >
                          Buy NO @ {(m.noPrice * 100).toFixed(0)}¢
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Queue a NO buy on this market.</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              ))}
              {hotFiltered.length === 0 && (
                <div className="col-span-3 text-center py-12 text-gray-400">
                  No opportunities in this category yet. Try refreshing markets.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: SAVED DIRECTIVES
      ════════════════════════════════════════════ */}
      {activeTab === "Directives" && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Form */}
          <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 space-y-4">
            <h3 className="font-semibold text-gray-900">
              {editingDirective ? "Edit Directive" : "New Buy Directive"}
              <HelpTip content="Buy Directives are saved trading plans you can apply to the bot at any time." />
            </h3>

            <div>
              <label className="text-xs text-gray-500 mb-1 block">Directive Name</label>
              <input
                type="text" placeholder="e.g. Construction Arbitrage Q3"
                value={directiveName}
                onChange={e => setDirectiveName(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-[#FF4D00]"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 flex items-center">
                  Amount ($)
                  <HelpTip content="Total capital for this directive's session." />
                </label>
                <p className="text-[11px] text-gray-400 mb-1">Display value: {formatMoney(directiveAmount)}</p>
                <input
                  type="number" min={10} max={10000}
                  value={directiveAmount}
                  onChange={e => setDirectiveAmount(+e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 flex items-center">
                  Timeframe
                  <HelpTip content="How long this directive runs before auto-stopping." />
                </label>
                <select
                  value={directiveTimeframe}
                  onChange={e => setDirectiveTimeframe(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]"
                >
                  {["1d", "3d", "1w", "2w", "1m"].map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-1 flex items-center">
                Buys per Day: {directiveBuysPerDay}
                <HelpTip content="How many new positions to open each day." />
              </label>
              <input type="range" min={1} max={20} value={directiveBuysPerDay} onChange={e => setDirectiveBuysPerDay(+e.target.value)} className="w-full accent-[#FF4D00]" />
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 flex items-center">
                Risk Mix
                <HelpTip content="Conservative = low risk/reward. Aggressive = high risk/reward." />
              </label>
              <div className="flex gap-1">
                {(["conservative", "balanced", "aggressive"] as const).map(r => (
                  <button key={r} onClick={() => setDirectiveRisk(r)}
                    className={`flex-1 py-1.5 text-xs rounded-lg font-medium transition ${directiveRisk === r ? "bg-[#FF4D00] text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 flex items-center">
                Profit Strategy
                <HelpTip content="Arbitrage: exploit mispricing. Market-making: provide liquidity. Whale-copy: follow big players. Longshot: bet on unlikely outcomes with high payouts." />
              </label>
              <div className="grid grid-cols-2 gap-1">
                {(["arbitrage", "market-making", "whale-copy", "longshot"] as const).map(s => (
                  <button key={s} onClick={() => setDirectiveStrategy(s)}
                    className={`py-1.5 text-xs rounded-lg font-medium transition ${directiveStrategy === s ? "bg-[#1E3A8A] text-blue-200" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
                    {s.replace("-", " ").replace(/\b\w/g, c => c.toUpperCase())}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 mb-2 flex items-center">
                Focus Areas
                <HelpTip content="Market categories this directive targets." />
              </label>
              <div className="flex flex-wrap gap-1">
                {FOCUS_AREAS.map(area => (
                  <button key={area} onClick={() => setDirectiveFocus(prev => prev.includes(area) ? prev.filter(a => a !== area) : [...prev, area])}
                    className={`px-2 py-0.5 text-xs rounded-full transition ${directiveFocus.includes(area) ? "bg-[#1E3A8A] text-blue-200" : "bg-gray-100 text-gray-400 hover:bg-gray-200"}`}>
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 flex items-center">
                Follow Whales
                <HelpTip content="Mirror large trades in these markets." />
              </span>
              <button onClick={() => setDirectiveWhale(w => !w)}
                className={`relative w-10 h-5 rounded-full transition ${directiveWhale ? "bg-[#1E3A8A]" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${directiveWhale ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-700 flex items-center">
                Paper Mode
                <HelpTip content="Simulate this directive without spending real funds." />
              </span>
              <button onClick={() => setDirectivePaper(p => !p)}
                className={`relative w-10 h-5 rounded-full transition ${directivePaper ? "bg-purple-600" : "bg-gray-300"}`}>
                <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${directivePaper ? "translate-x-5" : "translate-x-0.5"}`} />
              </button>
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleSaveDirective}
                disabled={!directiveName.trim()}
                className="flex-1 bg-[#FF4D00] hover:bg-orange-600 py-2 rounded-lg text-sm font-bold transition disabled:opacity-40"
              >
                💾 Save Directive
              </button>
              {editingDirective && (
                <button onClick={resetDirectiveForm} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm transition">Cancel</button>
              )}
            </div>
          </div>

          {/* Saved list */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700">Saved Directives ({directives.length})</h3>
            {directives.length === 0 ? (
              <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-6 text-center text-gray-400 text-sm">
                No saved directives yet. Create one on the left.
              </div>
            ) : (
              directives.map(d => (
                <div key={d.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{d.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {formatMoney(d.amount)} · {d.timeframe} · {d.buys_per_day}/day · {d.profit_strategy}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {d.paper_mode && <span className="text-[10px] bg-purple-100 text-purple-700 border border-purple-200 px-1.5 py-0.5 rounded-full">Paper</span>}
                      <StatusBadge status={d.risk_mix} />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-3">
                    {d.focus_areas.map(a => (
                      <span key={a} className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{a}</span>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={() => applyDirective(d)} className="flex-1 bg-[#FF4D00] hover:bg-orange-600 text-white text-xs py-1.5 rounded-lg font-medium transition">
                          ▶ Apply to Bot
                        </button>
                      </TooltipTrigger>
                              <TooltipContent>Load this directive\'s settings into the bot and switch to Dashboard.</TooltipContent>
                    </Tooltip>
                    <button onClick={() => { setEditingDirective(d); setDirectiveName(d.name); setDirectiveAmount(d.amount); setDirectiveTimeframe(d.timeframe); setDirectiveBuysPerDay(d.buys_per_day); setDirectiveRisk(d.risk_mix); setDirectiveWhale(d.whale_follow); setDirectiveFocus(d.focus_areas); setDirectiveStrategy(d.profit_strategy); setDirectivePaper(d.paper_mode); }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition">
                      ✏️ Edit
                    </button>
                    <button onClick={() => deleteDirective(d.id!)} className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs rounded-lg transition">
                      🗑
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: WHALE WATCH
      ════════════════════════════════════════════ */}
      {activeTab === "Whale Watch" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 flex items-center gap-1">
              🐋 Whale Activity
              <HelpTip content="Large ($5k+) buys from sophisticated Polymarket wallets. Following whales is one of the most profitable strategies." />
            </h3>
            <div className="flex gap-2 items-center">
              <select value={whaleFilter} onChange={e => setWhaleFilter(e.target.value)}
                className="bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-xs text-gray-900 outline-none focus:border-[#FF4D00]">
                <option value="all">All Categories</option>
                {FOCUS_AREAS.map(a => <option key={a} value={a.toLowerCase()}>{a}</option>)}
              </select>
              <button onClick={fetchWhales} disabled={loadingWhales}
                className="bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1.5 rounded-lg text-xs text-gray-700 transition disabled:opacity-50">
                {loadingWhales ? "Loading…" : "↻ Refresh"}
              </button>
            </div>
          </div>

          {loadingWhales ? (
            <div className="text-center py-12 text-gray-400">Fetching whale activity…</div>
          ) : whaleData.length === 0 ? (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500 text-sm mb-3">No whale activity loaded yet</p>
              <button onClick={fetchWhales} className="bg-[#1E3A8A] hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-medium transition">
                🐋 Load Whale Data
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr className="text-gray-500">
                      <th className="px-4 py-3 text-left font-medium">Whale</th>
                      <th className="px-4 py-3 text-left font-medium">Market</th>
                      <th className="px-3 py-3 text-center font-medium">Outcome</th>
                      <th className="px-3 py-3 text-right font-medium">Shares</th>
                      <th className="px-3 py-3 text-right font-medium">Amount</th>
                      <th className="px-3 py-3 text-right font-medium">Time</th>
                      <th className="px-3 py-3 text-center font-medium">Copy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {whaleData
                      .filter(w => whaleFilter === "all" || w.category.toLowerCase() === whaleFilter)
                      .map((w, i) => (
                        <tr key={i} className="border-t border-gray-100 hover:bg-gray-100/30">
                          <td className="px-4 py-3 font-mono text-[#1E3A8A] font-semibold">{w.whaleAddress}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate text-gray-700">{w.marketTitle}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${w.outcome === "YES" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                              {w.outcome}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-gray-700">{Number(w.shares).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="px-3 py-3 text-right font-mono text-gray-900 font-bold">${Number(w.amountUsd).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="px-3 py-3 text-right text-gray-400">{new Date(w.timestamp).toLocaleTimeString()}</td>
                          <td className="px-3 py-3 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={async () => {
                                  const copyAmt = Math.min(Math.max(w.amountUsd * 0.1, 5), 25);
                                  const avgPx = w.shares > 0 ? w.amountUsd / w.shares : 0.5;
                                  try {
                                    const r = await fetch("/api/market/trades", {
                                      method: "POST",
                                      headers: { "Content-Type": "application/json" },
                                      body: JSON.stringify({
                                        market_id: `whale_copy_${Date.now()}`,
                                        market_title: w.marketTitle,
                                        outcome: w.outcome as "YES" | "NO",
                                        amount: copyAmt,
                                        avg_price: Math.min(Math.max(avgPx, 0.01), 0.99),
                                        category: w.category,
                                        probability: w.outcome === "YES" ? 55 : 45,
                                        paper_mode: paperMode,
                                      }),
                                    });
                                    if (r.ok) {
                                      addLog(`🐋 Copied: ${w.outcome} "${w.marketTitle.slice(0,35)}…" $${copyAmt.toFixed(0)} ${paperMode ? "(paper)" : "(live)"}`);
                                      fetchTrades();
                                    }
                                  } catch { addLog("❌ Whale copy failed"); }
                                }}
                                  className="text-xs bg-blue-50 hover:bg-blue-100 text-[#1E3A8A] border border-blue-200 px-2 py-0.5 rounded transition"
                                >
                                  Copy
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>Queue a copy of this whale\'s trade for the next scan.</TooltipContent>
                            </Tooltip>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════
          TAB: SIM COMPARE
      ════════════════════════════════════════════ */}
      {activeTab === "Sim Compare" && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-700 flex items-center gap-1">
              📊 Simulation Comparison
              <HelpTip content="Compare PNL curves from two saved simulation runs side by side to evaluate different strategies." />
            </h3>
            {trades.length > 0 && (
              <button onClick={saveCurrentSimRun}
                className="bg-[#FF4D00] hover:bg-orange-600 px-4 py-2 rounded-lg text-sm font-bold transition">
                💾 Save Current Sim
              </button>
            )}
          </div>

          {simRuns.length < 2 ? (
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-8 text-center">
              <p className="text-gray-500 text-sm mb-2">You need at least 2 saved simulation runs to compare</p>
              <p className="text-gray-400 text-xs">Run the bot in paper mode with different configs, then save each run</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Run A</label>
                  <select value={compareA || ""} onChange={e => setCompareA(e.target.value || null)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
                    <option value="">— Select run A —</option>
                    {simRuns.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Run B</label>
                  <select value={compareB || ""} onChange={e => setCompareB(e.target.value || null)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-900 outline-none focus:border-[#FF4D00]">
                    <option value="">— Select run B —</option>
                    {simRuns.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>

              {compareRunA && compareRunB && (
                <>
                  {/* Stats comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    {[compareRunA, compareRunB].map((run, idx) => (
                      <div key={run.id} className={`bg-white border-2 rounded-2xl p-4 shadow-sm ${idx === 0 ? "border-[#FF4D00]/40" : "border-[#1E3A8A]/40"}`}>
                        <p className={`text-xs font-bold mb-2 ${idx === 0 ? "text-[#FF4D00]" : "text-[#1E3A8A]"}`}>
                          {idx === 0 ? "Run A" : "Run B"}: {run.name}
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] text-gray-400">Total Profit / Loss</p>
                            <p className={`text-sm font-bold ${run.total_pnl >= 0 ? "text-green-600" : "text-red-600"}`}>
                              {run.total_pnl >= 0 ? "+" : ""}${run.total_pnl.toFixed(2)}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">Win Rate</p>
                            <p className="text-sm font-bold text-gray-900">{run.win_rate}%</p>
                          </div>
                          <div>
                            <p className="text-[10px] text-gray-400">Trades</p>
                            <p className="text-sm font-bold text-gray-900">{run.trade_count}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Compare chart */}
                  <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Cumulative Profit / Loss Comparison</h4>
                    {compareChartData.length > 0 ? (
                      <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={compareChartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                          <XAxis dataKey="label" tick={{ fontSize: 10, fill: "#6b7280" }} />
                          <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} tickFormatter={v => `$${v}`} />
                          <RechartsTooltip
                            contentStyle={{ background: "#ffffff", border: "1px solid #e5e7eb", borderRadius: 8, color: "#111827" }}
                            formatter={(v: number | undefined) => [`$${(v ?? 0)?.toFixed(2)}`, ""]}
                          />
                          <Legend />
                          <Line type="monotone" dataKey="a" name={compareRunA.name.slice(0, 20)} stroke="#FF4D00" strokeWidth={2} dot={false} connectNulls />
                          <Line type="monotone" dataKey="b" name={compareRunB.name.slice(0, 20)} stroke="#3b82f6" strokeWidth={2} dot={false} connectNulls />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No profit/loss data in selected runs</div>
                    )}
                  </div>
                </>
              )}

              {/* Run list */}
              <div className="space-y-2">
                <h4 className="text-xs text-gray-500 font-medium uppercase tracking-wider">All Saved Runs ({simRuns.length})</h4>
                {simRuns.map(run => (
                  <div key={run.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm text-gray-800 font-medium">{run.name}</p>
                      <p className="text-xs text-gray-400">{run.trade_count} trades · {run.win_rate}% win rate · ${run.total_pnl.toFixed(2)} profit/loss · {run.config.risk_mix}</p>
                    </div>
                    <button
                      onClick={() => {
                        const updated = simRuns.filter(r => r.id !== run.id);
                        localStorage.setItem("slate360_sim_runs", JSON.stringify(updated));
                        setSimRuns(updated);
                        if (compareA === run.id) setCompareA(null);
                        if (compareB === run.id) setCompareB(null);
                      }}
                      className="text-xs text-red-500 hover:text-red-700 transition px-2 py-1 rounded hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
