"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useSignMessage,
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

// ─── Types ────────────────────────────────────────────────────────────────────

interface MarketTrade {
  id: string;
  market_id: string;
  market_title: string;
  outcome: string;
  shares: number;
  avg_price: number;
  current_price: number;
  pnl: number;
  status: "open" | "closed" | "paper";
  created_at: string;
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

interface WhaleActivity {
  whale_address: string;
  market_title: string;
  outcome: string;
  shares: number;
  amount_usd: number;
  timestamp: string;
  category: string;
}

interface MarketListing {
  id: string;
  title: string;
  category: string;
  probability: number;
  volume24h: number;
  edge_pct: number;
  outcome_yes: number;
  outcome_no: number;
  bookmarked: boolean;
  risk_tag: "hot" | "high-risk" | "construction" | "high-potential" | null;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FOCUS_AREAS = [
  "Construction", "Real Estate", "Politics", "Sports",
  "Crypto", "Finance", "Science", "Tech", "Entertainment"
];

const RISK_COLORS = {
  hot: "#FF4D00",
  "high-risk": "#ef4444",
  "high-potential": "#22c55e",
  construction: "#1E3A8A",
};

const TABS = ["Overview", "Markets", "Hot Opps", "Directives", "Whale Watch", "Sim Compare"];

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
    connected: "bg-green-900/60 text-green-300",
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

  // Tabs
  const [activeTab, setActiveTab] = useState("Overview");

  // Bot state
  const [botRunning, setBotRunning] = useState(false);
  const [botPaused, setBotPaused] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [lastScan, setLastScan] = useState<string | null>(null);
  const [scanLog, setScanLog] = useState<string[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

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
  const [mktSortBy, setMktSortBy] = useState<"volume" | "edge" | "probability" | "title">("volume");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());

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

  // ── Effects ────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchTrades();
    // Markets are NOT auto-loaded — user triggers search
    loadDirectives();
    loadSimRuns();
  }, []);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [scanLog]);

  useEffect(() => {
    // Build cumulative PNL chart from trades
    const sorted = [...trades].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
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

  // ── Data fetchers ──────────────────────────────────────────────────────────

  const fetchTrades = async () => {
    setLoadingTrades(true);
    try {
      const res = await fetch("/api/market/trades");
      if (res.ok) {
        const data = await res.json();
        setTrades(data.trades || []);
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
        limit: "80",
        active: "true",
        closed: "false",
        order: "volume24hr",
        ascending: "false",
      });
      if (kw.trim()) params.set("_q", kw.trim()); // used as client-side keyword filter
      // Use server-side proxy to avoid CORS restrictions on Polymarket's API
      const res = await fetch(
        `/api/market/polymarket?${params.toString()}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        const mapped: MarketListing[] = (data || [])
          .filter((m: Record<string, unknown>) => {
            if (!kw.trim()) return true;
            const title = String(m.question || m.title || "").toLowerCase();
            const cat = String(m.category || "").toLowerCase();
            return title.includes(kw.toLowerCase()) || cat.includes(kw.toLowerCase());
          })
          .slice(0, 80)
          .map((m: Record<string, unknown>) => {
            const prob = parseFloat(String(m.outcomePrices ? (m.outcomePrices as string[])[0] : 0)) * 100;
            const vol = parseFloat(String(m.volume24hr || 0));
            const spread = m.outcomePrices ? Math.abs(parseFloat(String((m.outcomePrices as string[])[0])) - 0.5) : 0;
            const edge = parseFloat((spread * 100 * 1.4).toFixed(1));
            const tag: MarketListing["risk_tag"] =
              edge > 20 ? "hot" :
              prob > 80 || prob < 20 ? "high-risk" :
              String(m.category || "").toLowerCase().includes("construction") ? "construction" :
              vol > 50000 ? "high-potential" : null;
            return {
              id: String(m.id || m.conditionId || Math.random()),
              title: String(m.question || m.title || ""),
              category: String(m.category || "General"),
              probability: parseFloat(prob.toFixed(1)),
              volume24h: vol,
              edge_pct: edge,
              outcome_yes: parseFloat(String(m.outcomePrices ? (m.outcomePrices as string[])[0] : 0)),
              outcome_no: parseFloat(String(m.outcomePrices ? (m.outcomePrices as string[])[1] : 0)),
              bookmarked: bookmarks.has(String(m.id || m.conditionId)),
              risk_tag: tag,
            };
          });
        setMarkets(mapped);
        setMarketsLoaded(true);
      }
    } catch (e) {
      console.error("fetchMarkets", e);
    } finally {
      setLoadingMarkets(false);
    }
  };

  const fetchWhales = async () => {
    setLoadingWhales(true);
    try {
      // Fetch large recent trades from Polymarket activity API
      const res = await fetch(
        "/api/market/whales",
        { next: { revalidate: 30 } }
      );
      if (res.ok) {
        const data = await res.json();
        const mapped: WhaleActivity[] = (data || []).slice(0, 30).map((a: Record<string, unknown>) => ({
          whale_address: String(a.proxyWallet || a.user || "").slice(0, 10) + "…",
          market_title: String(a.title || a.market || "Unknown market"),
          outcome: String(a.side === "BUY" ? a.outcome || "YES" : a.outcome || "NO"),
          shares: parseFloat(String(a.size || 0)),
          amount_usd: parseFloat(String(a.usdcSize || a.amount || 0)),
          timestamp: String(a.timestamp || new Date().toISOString()),
          category: String(a.category || "General"),
        }));
        setWhaleData(mapped);
      } else {
        // Fallback: use top trades from our own DB
        const r = await fetch("/api/market/trades");
        if (r.ok) {
          const d = await r.json();
          const wh: WhaleActivity[] = (d.trades || [])
            .filter((t: MarketTrade) => Math.abs(t.shares * t.avg_price) > 100)
            .slice(0, 20)
            .map((t: MarketTrade) => ({
              whale_address: "0xbot…",
              market_title: t.market_title,
              outcome: t.outcome,
              shares: t.shares,
              amount_usd: t.shares * t.avg_price,
              timestamp: t.created_at,
              category: t.category || "General",
            }));
          setWhaleData(wh);
        }
      }
    } catch (e) {
      console.error("fetchWhales", e);
    } finally {
      setLoadingWhales(false);
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
      const nonce = `Slate360 Market Robot verification: ${Date.now()}`;
      const signature = await signMessageAsync({ message: nonce });
      const res = await fetch("/api/market/wallet-connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address, signature, nonce }),
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
        addLog(`✅ Scan complete — ${data.trades_executed || 0} trades executed`);
        if (data.trades) {
          data.trades.forEach((t: MarketTrade) => {
            addLog(`  → ${t.outcome} on "${t.market_title?.slice(0, 40)}…" @ $${t.avg_price?.toFixed(3)}`);
          });
        }
        setLastScan(new Date().toISOString());
        await fetchTrades();
      } else {
        addLog(`❌ Scan failed: ${data.error || "Unknown error"}`);
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
    await runScan();
  };

  const handlePauseBot = () => {
    setBotPaused(p => !p);
    addLog(botPaused ? "▶️ Bot resumed" : "⏸ Bot paused");
  };

  const handleStopBot = () => {
    setBotRunning(false);
    setBotPaused(false);
    addLog("⛔ Bot stopped");
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

  const handleDirectBuy = async () => {
    if (!buyMarket) return;
    setBuySubmitting(true);
    setBuySuccess("");
    try {
      const price = buyOutcome === "YES" ? buyMarket.outcome_yes : buyMarket.outcome_no;
      const avgPrice = price > 0 ? price : (buyMarket.probability / 100);
      const res = await fetch("/api/market/trades", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_id:    buyMarket.id,
          market_title: buyMarket.title,
          outcome:      buyOutcome,
          amount:       buyAmount,
          avg_price:    avgPrice,
          category:     buyMarket.category,
          probability:  buyMarket.probability,
          paper_mode:   buyPaper,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBuySuccess(`✅ ${buyPaper ? "Paper " : ""}Buy saved — ${(buyAmount / avgPrice).toFixed(1)} shares ${buyOutcome} @ $${avgPrice.toFixed(3)}`);
        addLog(`🛒 Bought ${buyOutcome} on "${buyMarket.title.slice(0, 40)}…" — $${buyAmount} ${buyPaper ? "(paper)" : "(live)"}`);
        await fetchTrades();
        setTimeout(() => setBuyMarket(null), 2500);
      } else {
        setBuySuccess(`❌ ${data.error || "Buy failed"}`);
      }
    } catch (e: unknown) {
      setBuySuccess(`❌ ${(e as Error).message}`);
    } finally {
      setBuySubmitting(false);
    }
  };

  // ── Directives CRUD ────────────────────────────────────────────────────────

  const loadDirectives = () => {
    try {
      const saved = localStorage.getItem("slate360_directives");
      if (saved) setDirectives(JSON.parse(saved));
    } catch {}
  };

  const saveDirectives = (list: BuyDirective[]) => {
    localStorage.setItem("slate360_directives", JSON.stringify(list));
    setDirectives(list);
  };

  const handleSaveDirective = () => {
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
    const existing = directives.filter(x => x.id !== d.id);
    saveDirectives([d, ...existing]);
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
    setActiveTab("Overview");
  };

  const deleteDirective = (id: string) => {
    saveDirectives(directives.filter(d => d.id !== id));
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

  const loadSimRuns = () => {
    try {
      const saved = localStorage.getItem("slate360_sim_runs");
      if (saved) setSimRuns(JSON.parse(saved));
    } catch {}
  };

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

  const filteredMarkets = (() => {
    const q = marketSearch.toLowerCase();
    const filtered = markets.filter(m => {
      if (q && !m.title.toLowerCase().includes(q) && !m.category.toLowerCase().includes(q)) return false;
      if (mktCategory !== "all" && m.category.toLowerCase() !== mktCategory.toLowerCase()) return false;
      if (m.probability < mktProbMin || m.probability > mktProbMax) return false;
      if (m.volume24h < mktMinVol) return false;
      if (m.edge_pct < mktMinEdge) return false;
      if (mktRiskTag === "none" && m.risk_tag !== null) return false;
      if (mktRiskTag !== "all" && mktRiskTag !== "none" && m.risk_tag !== mktRiskTag) return false;
      return true;
    });
    return filtered.sort((a, b) => {
      switch (mktSortBy) {
        case "edge": return b.edge_pct - a.edge_pct;
        case "probability": return b.probability - a.probability;
        case "title": return a.title.localeCompare(b.title);
        default: return b.volume24h - a.volume24h;
      }
    });
  })();

  const hotOppTabs = ["All", "High Potential", "High Risk-High Reward", "Bookmarked", "Construction"];
  const hotFiltered = markets.filter(m => {
    if (hotTab === "All") return m.risk_tag !== null;
    if (hotTab === "High Potential") return m.risk_tag === "high-potential";
    if (hotTab === "High Risk-High Reward") return m.risk_tag === "high-risk";
    if (hotTab === "Bookmarked") return bookmarks.has(m.id);
    if (hotTab === "Construction") return m.risk_tag === "construction" || m.category.toLowerCase().includes("construction");
    return true;
  }).slice(0, 30);

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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 px-1">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            🤖 Market Robot
            <StatusBadge status={botRunning ? (botPaused ? "idle" : "running") : "idle"} />
            {paperMode && <span className="text-xs bg-purple-100 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Paper Mode</span>}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            AI-powered prediction market bot — {lastScan ? `Last scan: ${new Date(lastScan).toLocaleTimeString()}` : "Not scanned yet"}
          </p>
        </div>

        {/* Wallet */}
        <div className="flex items-center gap-2 flex-wrap">
          {isConnected ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded-lg">
                {address?.slice(0, 6)}…{address?.slice(-4)}
              </span>
              {walletVerified
                ? <span className="text-xs text-green-400 font-medium">✓ Verified</span>
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
                  className="flex items-center gap-2 bg-[#1E3A8A] hover:bg-blue-700 px-4 py-2 rounded-lg text-sm font-semibold transition disabled:opacity-50"
                >
                  🦊 {isConnecting ? "Connecting…" : "Connect MetaMask"}
                </button>
              </TooltipTrigger>
              <TooltipContent>Connect your MetaMask wallet to enable live trading. Paper mode works without a wallet.</TooltipContent>
            </Tooltip>
          )}
          {walletError && <p className="text-xs text-red-400">{walletError}</p>}
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
              // Markets tab: don't auto-load — user triggers search
            }}
            className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition border-b-2 -mb-px ${
              activeTab === tab
                ? "border-[#FF4D00] text-[#FF4D00]"
                : "border-transparent text-gray-500 hover:text-gray-900"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════
          TAB: OVERVIEW
      ════════════════════════════════════════════ */}
      {activeTab === "Overview" && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left: Config + Controls */}
          <div className="xl:col-span-1 space-y-4">

            {/* Bot Controls */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
              <h3 className="font-semibold text-xs text-gray-400 uppercase tracking-widest">Bot Controls</h3>
              <div className="flex gap-2 flex-wrap">
                {!botRunning ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={handleStartBot} className="flex-1 bg-[#FF4D00] hover:bg-orange-600 py-2 rounded-lg text-sm font-bold transition">
                        ▶ Start Bot
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Start the market scanning bot with current settings.</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={handlePauseBot} className="flex-1 bg-yellow-700 hover:bg-yellow-600 py-2 rounded-lg text-sm font-bold transition">
                          {botPaused ? "▶ Resume" : "⏸ Pause"}
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Pause or resume the bot without losing its state.</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={handleStopBot} className="flex-1 bg-red-900 hover:bg-red-700 py-2 rounded-lg text-sm font-bold transition">
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
                      {scanning ? "🔍 Scanning…" : "🔍 Test Scan Now"}
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
                  <TooltipContent>Save a snapshot of current PNL chart + config for comparison later under "Sim Compare" tab.</TooltipContent>
                </Tooltip>
              )}
            </div>

            {/* Bot Configuration */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4 space-y-3">
              <h3 className="font-semibold text-xs text-gray-400 uppercase tracking-widest">Configuration</h3>

              {/* Capital */}
              <div>
                <label className="flex items-center text-xs text-gray-500 mb-1">
                  Capital Allocation ($)
                  <HelpTip content="Total USDC allocated for this bot session. Split across open positions." />
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
                  Minimum Edge %
                  <HelpTip content="Only enter trades where the bot detects at least this % edge over the market price." />
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
            </div>
          </div>

          {/* Right: Stats + Chart + Log */}
          <div className="xl:col-span-2 space-y-4">
            {/* Stats row */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total PNL", value: `${totalPnl >= 0 ? "+" : ""}$${totalPnl.toFixed(2)}`, color: totalPnl >= 0 ? "text-green-400" : "text-red-400" },
                { label: "Open Positions", value: openTrades.length, color: "text-gray-900" },
                { label: "Win Rate", value: `${winRate}%`, color: parseFloat(winRate) >= 50 ? "text-green-400" : "text-red-400" },
                { label: "Total Trades", value: trades.length, color: "text-gray-900" },
              ].map(stat => (
                <div key={stat.label} className="bg-white border border-gray-100 rounded-2xl shadow-sm p-3">
                  <p className="text-xs text-gray-500">{stat.label}</p>
                  <p className={`text-xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            {/* PNL Chart */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-sm text-gray-800">
                  Cumulative PNL
                  <HelpTip content="Running sum of all trade profits/losses over time. Slope up = profitable strategy." />
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
                      formatter={(v: number | undefined) => [`$${(v ?? 0).toFixed(2)}`, "Cum. PNL"]}
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

            {/* Activity Log */}
            <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-4">
              <h3 className="font-semibold text-sm text-gray-700 mb-2">Activity Log</h3>
              <div ref={logRef} className="bg-gray-50 border border-gray-100 rounded-lg p-3 h-36 overflow-y-auto font-mono text-xs space-y-0.5">
                {scanLog.length === 0
                  ? <span className="text-gray-400">No activity yet…</span>
                  : scanLog.map((l, i) => (
                    <div key={i} className={`${l.includes("✅") ? "text-green-600" : l.includes("❌") ? "text-red-600" : l.includes("⚠️") ? "text-yellow-600" : "text-gray-500"}`}>
                      {l}
                    </div>
                  ))
                }
              </div>
            </div>

            {/* Open Positions */}
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
                        <th className="pb-2 text-right font-medium">PNL</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openTrades.map(t => (
                        <tr key={t.id} className="border-b border-gray-200/50">
                          <td className="py-2 pr-2 max-w-[180px] truncate text-gray-700">{t.market_title}</td>
                          <td className="py-2 pr-2">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${t.outcome === "YES" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{t.outcome}</span>
                          </td>
                          <td className="py-2 text-right font-mono">{Number(t.shares).toFixed(1)}</td>
                          <td className="py-2 text-right font-mono">${Number(t.avg_price).toFixed(3)}</td>
                          <td className="py-2 text-right font-mono">${Number(t.current_price).toFixed(3)}</td>
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
                    <span className="text-xs text-gray-500">Prob: {buyMarket.probability}%</span>
                    <span className="text-xs text-gray-400">·</span>
                    <span className={`text-xs font-bold ${buyMarket.edge_pct > 10 ? "text-orange-400" : "text-gray-500"}`}>Edge: {buyMarket.edge_pct}%</span>
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
                    <span className="font-mono text-xs opacity-80">@ {(buyMarket.outcome_yes * 100).toFixed(0)}¢</span>
                  </button>
                  <button
                    onClick={() => setBuyOutcome("NO")}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-bold transition ${buyOutcome === "NO" ? "bg-red-700 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
                  >
                    NO &nbsp;
                    <span className="font-mono text-xs opacity-80">@ {(buyMarket.outcome_no * 100).toFixed(0)}¢</span>
                  </button>
                </div>
              </div>

              {/* Amount + preview */}
              <div>
                <label className="text-xs text-gray-500 mb-1 block flex items-center">
                  Amount (USDC): <span className="text-gray-900 font-semibold font-mono">${buyAmount}</span>
                  <HelpTip content="How much USDC to spend on this trade." />
                </label>
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
                const price = buyOutcome === "YES" ? buyMarket.outcome_yes : buyMarket.outcome_no;
                const avgPrice = price > 0 ? price : (buyMarket.probability / 100);
                const shares = buyAmount / avgPrice;
                const payout = shares * 1;
                const profit = payout - buyAmount;
                return (
                  <div className="grid grid-cols-3 gap-2 text-center bg-gray-100/50 rounded-lg p-3">
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Shares</p>
                      <p className="text-sm font-bold text-gray-900">{shares.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Max Payout</p>
                      <p className="text-sm font-bold text-green-400">${payout.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 mb-1">Max Profit</p>
                      <p className={`text-sm font-bold ${profit > 0 ? "text-green-400" : "text-red-400"}`}>
                        {profit >= 0 ? "+" : ""}${profit.toFixed(2)}
                      </p>
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
                <p className={`text-sm text-center font-medium ${buySuccess.startsWith("✅") ? "text-green-400" : "text-red-400"}`}>
                  {buySuccess}
                </p>
              )}

              <button
                onClick={handleDirectBuy}
                disabled={buySubmitting}
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
                      <option value="hot">🔥 Hot (High Edge)</option>
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
                      onChange={e => setMktSortBy(e.target.value as typeof mktSortBy)}
                      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-900 outline-none focus:border-[#FF4D00]"
                    >
                      <option value="volume">24h Volume ↓</option>
                      <option value="edge">Edge % ↓</option>
                      <option value="probability">Probability ↓</option>
                      <option value="title">Title A→Z</option>
                    </select>
                  </div>
                </div>
                {/* Row 2: Range sliders */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs text-gray-500 mb-1 flex items-center gap-1">
                      Min Edge %: {mktMinEdge}%
                      <HelpTip content="Only show markets with at least this estimated edge." />
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
                <button onClick={() => { setMarkets([]); setMarketsLoaded(false); setMarketSearch(""); }} className="text-gray-400 hover:text-gray-500 transition">Clear</button>
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
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-500">
                    <tr className="text-gray-500">
                      <th className="px-4 py-3 text-left font-medium">Market</th>
                      <th className="px-3 py-3 text-center font-medium">Cat.</th>
                      <th className="px-3 py-3 text-right font-medium">Prob.</th>
                      <th className="px-3 py-3 text-right font-medium">Vol 24h</th>
                      <th className="px-3 py-3 text-right font-medium">Edge</th>
                      <th className="px-3 py-3 text-center font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loadingMarkets ? (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400">Searching markets…</td></tr>
                    ) : filteredMarkets.length === 0 ? (
                      <tr><td colSpan={6} className="text-center py-10 text-gray-400">No markets match — try a different search or fewer filters</td></tr>
                    ) : (
                      filteredMarkets.slice(0, 60).map(m => (
                        <tr key={m.id} className="border-t border-gray-100 hover:bg-gray-100/30">
                          <td className="px-4 py-3 max-w-[260px]">
                            <div className="flex items-start gap-2">
                              {m.risk_tag && (
                                <span style={{ background: RISK_COLORS[m.risk_tag] + "30", color: RISK_COLORS[m.risk_tag] }}
                                  className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase whitespace-nowrap mt-0.5">
                                  {m.risk_tag.replace("-", " ")}
                                </span>
                              )}
                              <span className="text-slate-200 line-clamp-2">{m.title}</span>
                            </div>
                          </td>
                          <td className="px-3 py-3 text-center text-gray-500">{m.category.slice(0, 10)}</td>
                          <td className="px-3 py-3 text-right">
                            <span className={m.probability > 60 ? "text-green-400" : m.probability < 40 ? "text-red-400" : "text-gray-700"}>
                              {m.probability}%
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right text-gray-500">${m.volume24h.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="px-3 py-3 text-right">
                            <span className={m.edge_pct > 15 ? "text-orange-400 font-bold" : m.edge_pct > 8 ? "text-yellow-400" : "text-gray-500"}>
                              {m.edge_pct}%
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
                                <TooltipContent>Bookmark for Hot Opps tracking.</TooltipContent>
                              </Tooltip>

                              {/* Buy YES */}
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <button
                                    onClick={() => openBuyPanel(m, "YES")}
                                    className="text-xs bg-green-900/40 hover:bg-green-800/70 text-green-400 px-2 py-1 rounded-lg font-medium transition"
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
                                    className="text-xs bg-red-900/40 hover:bg-red-800/70 text-red-400 px-2 py-1 rounded-lg font-medium transition"
                                  >
                                    Buy NO
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>Open buy panel for NO outcome.</TooltipContent>
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
                    {m.risk_tag && (
                      <span style={{ background: RISK_COLORS[m.risk_tag] + "25", color: RISK_COLORS[m.risk_tag], borderColor: RISK_COLORS[m.risk_tag] + "60" }}
                        className="text-[10px] px-2 py-0.5 rounded-full font-bold border uppercase">
                        {m.risk_tag.replace("-", " ")}
                      </span>
                    )}
                    <span className="text-xs text-gray-500">{m.category}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                    <div className="bg-gray-100 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">Prob.</p>
                      <p className={`text-sm font-bold ${m.probability > 60 ? "text-green-600" : m.probability < 40 ? "text-red-600" : "text-gray-900"}`}>{m.probability}%</p>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">Edge</p>
                      <p className="text-sm font-bold text-orange-400">{m.edge_pct}%</p>
                    </div>
                    <div className="bg-gray-100 rounded-lg p-2">
                      <p className="text-[10px] text-gray-400">Vol 24h</p>
                      <p className="text-sm font-bold text-gray-900">${(m.volume24h / 1000).toFixed(0)}k</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => { addLog(`🎯 ${m.title.slice(0,30)}… queued for YES buy`); }}
                          className="flex-1 bg-green-900/40 hover:bg-green-800/60 text-green-400 text-xs py-1.5 rounded-lg font-medium transition"
                        >
                          Buy YES @ {(m.outcome_yes * 100).toFixed(0)}¢
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Queue a YES buy on this market.</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          onClick={() => { addLog(`🎯 ${m.title.slice(0,30)}… queued for NO buy`); }}
                          className="flex-1 bg-red-900/40 hover:bg-red-800/60 text-red-400 text-xs py-1.5 rounded-lg font-medium transition"
                        >
                          Buy NO @ {(m.outcome_no * 100).toFixed(0)}¢
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
            <h3 className="font-semibold text-slate-200">
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
                        ${d.amount} · {d.timeframe} · {d.buys_per_day}/day · {d.profit_strategy}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {d.paper_mode && <span className="text-[10px] bg-purple-900/60 text-purple-400 px-1.5 py-0.5 rounded-full">Paper</span>}
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
                        <button onClick={() => applyDirective(d)} className="flex-1 bg-[#FF4D00]/20 hover:bg-[#FF4D00]/40 text-orange-400 text-xs py-1.5 rounded-lg font-medium transition">
                          ▶ Apply to Bot
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Load this directive\'s settings into the bot and switch to Overview.</TooltipContent>
                    </Tooltip>
                    <button onClick={() => { setEditingDirective(d); setDirectiveName(d.name); setDirectiveAmount(d.amount); setDirectiveTimeframe(d.timeframe); setDirectiveBuysPerDay(d.buys_per_day); setDirectiveRisk(d.risk_mix); setDirectiveWhale(d.whale_follow); setDirectiveFocus(d.focus_areas); setDirectiveStrategy(d.profit_strategy); setDirectivePaper(d.paper_mode); }}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-500 text-xs rounded-lg transition">
                      ✏️ Edit
                    </button>
                    <button onClick={() => deleteDirective(d.id!)} className="px-3 py-1.5 bg-red-900/30 hover:bg-red-900/60 text-red-400 text-xs rounded-lg transition">
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
            <h3 className="font-semibold text-slate-200 flex items-center gap-1">
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
                  <thead className="bg-gray-500">
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
                          <td className="px-4 py-3 font-mono text-blue-400">{w.whale_address}</td>
                          <td className="px-4 py-3 max-w-[200px] truncate text-gray-700">{w.market_title}</td>
                          <td className="px-3 py-3 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${w.outcome === "YES" ? "bg-green-900/60 text-green-400" : "bg-red-900/60 text-red-400"}`}>
                              {w.outcome}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-right font-mono text-gray-700">{Number(w.shares).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="px-3 py-3 text-right font-mono text-gray-900 font-bold">${Number(w.amount_usd).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                          <td className="px-3 py-3 text-right text-gray-400">{new Date(w.timestamp).toLocaleTimeString()}</td>
                          <td className="px-3 py-3 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => addLog(`🐋 Copying whale trade: ${w.outcome} on "${w.market_title.slice(0,30)}…"`)}
                                  className="text-xs bg-blue-900/40 hover:bg-blue-800/60 text-blue-400 px-2 py-0.5 rounded transition"
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
            <h3 className="font-semibold text-slate-200 flex items-center gap-1">
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
                        <p className={`text-xs font-bold mb-2 ${idx === 0 ? "text-orange-400" : "text-blue-400"}`}>
                          {idx === 0 ? "Run A" : "Run B"}: {run.name}
                        </p>
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div>
                            <p className="text-[10px] text-gray-400">Total PNL</p>
                            <p className={`text-sm font-bold ${run.total_pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
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
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">Cumulative PNL Comparison</h4>
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
                      <div className="h-[260px] flex items-center justify-center text-gray-400 text-sm">No PNL data in selected runs</div>
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
                      <p className="text-xs text-gray-400">{run.trade_count} trades · {run.win_rate}% win rate · ${run.total_pnl.toFixed(2)} PNL · {run.config.risk_mix}</p>
                    </div>
                    <button
                      onClick={() => {
                        const updated = simRuns.filter(r => r.id !== run.id);
                        localStorage.setItem("slate360_sim_runs", JSON.stringify(updated));
                        setSimRuns(updated);
                        if (compareA === run.id) setCompareA(null);
                        if (compareB === run.id) setCompareB(null);
                      }}
                      className="text-xs text-red-500 hover:text-red-400 transition px-2 py-1 rounded hover:bg-red-900/20"
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