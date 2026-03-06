"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ApiEnvelope, MarketViewModel, WhaleActivityViewModel } from "@/lib/market/contracts";
import type { MarketListing, MktRiskTag, MktTimeframe, MarketSortKey, BotConfig } from "@/components/dashboard/market/types";

interface UseMarketsExplorerDeps {
  activeTab: string;
  botConfig: BotConfig;
  runPreviewScan: () => Promise<void>;
}

export function useMarketsExplorer({ activeTab, botConfig, runPreviewScan }: UseMarketsExplorerDeps) {
  const [markets, setMarkets] = useState<MarketListing[]>([]);
  const [marketsLoaded, setMarketsLoaded] = useState(false);
  const [loadingMarkets, setLoadingMarkets] = useState(false);
  const [marketSearch, setMarketSearch] = useState("");
  const [mktTimeframe, setMktTimeframe] = useState<MktTimeframe>("all");
  const [mktCategory, setMktCategory] = useState("all");
  const [mktProbMin, setMktProbMin] = useState(0);
  const [mktProbMax, setMktProbMax] = useState(100);
  const [mktMinVol, setMktMinVol] = useState(0);
  const [mktMinEdge, setMktMinEdge] = useState(0);
  const [mktRiskTag, setMktRiskTag] = useState<MktRiskTag>("all");
  const [mktSortBy, setMktSortByState] = useState<MarketSortKey>("volume");
  const [mktSortDir, setMktSortDir] = useState<"asc" | "desc">("desc");
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const [watchlist, setWatchlist] = useState<Set<string>>(new Set());
  const [excludedMarketIds, setExcludedMarketIds] = useState<Set<string>>(new Set());
  const [marketsPage, setMarketsPage] = useState(1);
  const [previewSummary, setPreviewSummary] = useState<{ marketsScanned: number; opportunitiesFound: number; decisions: number } | null>(null);
  const [whaleData, setWhaleData] = useState<WhaleActivityViewModel[]>([]);
  const [loadingWhales, setLoadingWhales] = useState(false);
  const [whaleFilter, setWhaleFilter] = useState("all");
  const [hotTab, setHotTab] = useState("All");
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);

  const MARKETS_PAGE_SIZE = 50;
  const previewDebounceRef = useRef<number | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const livePricesRef = useRef<Map<string, { yes: number; no: number }>>(new Map());

  const fetchMarkets = useCallback(async (keyword?: string) => {
    setLoadingMarkets(true);
    try {
      const kw = keyword ?? marketSearch;
      const params = new URLSearchParams({ limit: "500", active: "true", closed: "false", order: "volume24hr", ascending: "false" });
      let cursor: string | undefined;
      let pageCount = 0;
      const merged: MarketViewModel[] = [];
      const maxPages = kw.trim().length > 0 ? 5 : 12;

      do {
        const pageParams = new URLSearchParams(params);
        if (cursor) pageParams.set("cursor", cursor);
        const res = await fetch(`/api/market/polymarket?${pageParams.toString()}`, { cache: "no-store" });
        if (!res.ok) break;
        const payload = await res.json() as ApiEnvelope<{ markets: MarketViewModel[]; nextCursor?: string }>;
        merged.push(...(payload.data?.markets ?? []));
        cursor = payload.data?.nextCursor;
        pageCount += 1;
      } while (cursor && pageCount < maxPages);

      const query = (keyword ?? marketSearch).trim().toLowerCase();
      const mapped: MarketListing[] = merged
        .filter(m => !query || m.title.toLowerCase().includes(query) || m.category.toLowerCase().includes(query))
        .map(m => ({
          ...m,
          bookmarked: bookmarks.has(m.id),
          endDateLabel: m.endDate ? new Date(m.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" }) : undefined,
          liquidity: m.liquidityUsd,
        }));
      setMarkets(mapped);
      setMarketsPage(1);
      setMarketsLoaded(true);
    } catch (e) {
      console.error("fetchMarkets", e);
    } finally {
      setLoadingMarkets(false);
    }
  }, [marketSearch, bookmarks]);

  const fetchWhales = useCallback(async () => {
    setLoadingWhales(true);
    try {
      const res = await fetch("/api/market/whales", { cache: "no-store" });
      if (res.ok) {
        const payload = await res.json() as ApiEnvelope<{ whales: WhaleActivityViewModel[] }>;
        setWhaleData(payload.data?.whales ?? []);
      }
    } catch (e) { console.error("fetchWhales", e); }
    finally { setLoadingWhales(false); }
  }, []);

  const subscribeToMarkets = useCallback((marketIds: string[]) => {
    if (wsRef.current) { wsRef.current.close(); wsRef.current = null; }
    if (marketIds.length === 0) return;
    try {
      const ws = new WebSocket("wss://ws-subscriptions-clob.polymarket.com/ws/market");
      wsRef.current = ws;
      ws.onopen = () => {
        setWsConnected(true);
        marketIds.slice(0, 20).forEach(id => ws.send(JSON.stringify({ type: "market", market: id })));
      };
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg?.market) {
            const changes = Array.isArray(msg.data) ? msg.data : msg.data ? [msg.data] : [];
            for (const change of changes) {
              if (change.price != null) {
                const existing = livePricesRef.current.get(msg.market) ?? { yes: 0, no: 0 };
                if (change.outcome === "Yes" || change.side === "BUY") { existing.yes = parseFloat(change.price); existing.no = 1 - existing.yes; }
                else if (change.outcome === "No" || change.side === "SELL") { existing.no = parseFloat(change.price); existing.yes = 1 - existing.no; }
                livePricesRef.current.set(msg.market, existing);
              }
            }
            setMarkets(prev => prev.map(m => {
              const live = livePricesRef.current.get(m.id);
              if (!live || (live.yes === 0 && live.no === 0)) return m;
              return { ...m, yesPrice: live.yes, noPrice: live.no, probabilityPct: parseFloat((live.yes * 100).toFixed(1)) };
            }));
          }
        } catch { /* ignore non-JSON */ }
      };
      ws.onerror = () => setWsConnected(false);
      ws.onclose = () => { setWsConnected(false); wsRef.current = null; };
    } catch { setWsConnected(false); }
  }, []);

  const toggleBookmark = useCallback((id: string) => {
    setBookmarks(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  }, []);

  const toggleWatchlist = useCallback(async (market: MarketListing) => {
    const id = market.id;
    const isWatched = watchlist.has(id);
    setWatchlist(prev => { const n = new Set(prev); isWatched ? n.delete(id) : n.add(id); return n; });
    try {
      if (isWatched) {
        await fetch("/api/market/watchlist", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ market_id: id }) });
      } else {
        await fetch("/api/market/watchlist", { method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ market_id: id, title: market.title, category: market.category, yes_price: market.yesPrice, no_price: market.noPrice, probability: market.probabilityPct }) });
      }
    } catch {
      setWatchlist(prev => { const n = new Set(prev); isWatched ? n.add(id) : n.delete(id); return n; });
    }
  }, [watchlist]);

  const setSortBy = useCallback((key: MarketSortKey) => {
    setMktSortByState(prev => {
      if (prev === key) { setMktSortDir(d => d === "asc" ? "desc" : "asc"); return prev; }
      setMktSortDir(key === "title" || key === "endDate" ? "asc" : "desc");
      return key;
    });
  }, []);

  const applyQuickMarketPreset = useCallback((preset: "construction" | "high-volume" | "mispriced" | "closing-soon" | "crypto") => {
    if (preset === "construction") { setMarketSearch("construction"); setMktRiskTag("construction"); setMktMinVol(5000); setMktMinEdge(3); setMktSortByState("edge"); setMktSortDir("desc"); }
    else if (preset === "high-volume") { setMktMinVol(25000); setMktMinEdge(0); setMktRiskTag("all"); setMktSortByState("volume"); setMktSortDir("desc"); }
    else if (preset === "mispriced") { setMktMinEdge(10); setMktProbMin(20); setMktProbMax(80); setMktSortByState("edge"); setMktSortDir("desc"); }
    else if (preset === "closing-soon") { setMktSortByState("endDate"); setMktSortDir("asc"); setMktMinVol(1000); }
    else if (preset === "crypto") { setMarketSearch("crypto bitcoin ethereum"); setMktSortByState("volume"); setMktSortDir("desc"); }
  }, []);

  // Load watchlist from DB on mount
  useEffect(() => {
    fetch("/api/market/watchlist").then(r => r.json())
      .then((d: { items?: { market_id: string }[] }) => {
        if (Array.isArray(d?.items)) setWatchlist(new Set(d.items.map(w => w.market_id)));
      }).catch(() => { /* non-critical */ });
  }, []);

  // Auto-subscribe WebSocket
  useEffect(() => {
    if (marketsLoaded && markets.length > 0 && (activeTab === "Markets" || activeTab === "Hot Opps")) {
      subscribeToMarkets(markets.slice(0, 20).map(m => m.id));
    }
    return () => { if (wsRef.current) { wsRef.current.close(); wsRef.current = null; } };
  }, [marketsLoaded, markets, activeTab, subscribeToMarkets]);

  // Debounced preview scan + market refresh on filter changes
  const { minEdge, minVolume, minProbLow, minProbHigh, whaleFollow, riskMix, focusAreas } = botConfig;
  useEffect(() => {
    if (activeTab !== "Markets" && activeTab !== "Hot Opps") return;
    if (previewDebounceRef.current) window.clearTimeout(previewDebounceRef.current);
    previewDebounceRef.current = window.setTimeout(() => {
      void fetchMarkets(marketSearch);
      void runPreviewScan();
    }, 450);
    return () => { if (previewDebounceRef.current) window.clearTimeout(previewDebounceRef.current); };
  }, [activeTab, marketSearch, mktCategory, mktRiskTag, mktProbMin, mktProbMax, mktMinVol, mktMinEdge, mktTimeframe,
      minEdge, minVolume, minProbLow, minProbHigh, whaleFollow, riskMix, focusAreas, fetchMarkets, runPreviewScan]);

  // Filtered + sorted market computation
  const filteredMarkets = useMemo(() => {
    const withinTimeframe = (endDate: string | null): boolean => {
      if (mktTimeframe === "all") return true;
      if (!endDate) return false;
      const end = new Date(endDate).getTime();
      if (!Number.isFinite(end)) return false;
      const now = Date.now();
      const day = 86_400_000;
      if (mktTimeframe === "hour") return end >= now && end <= now + 3_600_000;
      if (mktTimeframe === "day") return end >= now && end <= now + day;
      if (mktTimeframe === "week") return end >= now && end <= now + 7 * day;
      if (mktTimeframe === "month") return end >= now && end <= now + 31 * day;
      if (mktTimeframe === "year") return end >= now && end <= now + 366 * day;
      if (mktTimeframe === "today" || mktTimeframe === "tomorrow") {
        const target = new Date(); if (mktTimeframe === "tomorrow") target.setDate(target.getDate() + 1);
        const endDateObj = new Date(end);
        return endDateObj.getFullYear() === target.getFullYear() && endDateObj.getMonth() === target.getMonth() && endDateObj.getDate() === target.getDate();
      }
      return true;
    };

    return markets
      .filter(m =>
        !excludedMarketIds.has(m.id) &&
        (mktCategory === "all" || m.category === mktCategory) &&
        (mktRiskTag === "all" || mktRiskTag === "none" ? !m.riskTag : m.riskTag === mktRiskTag) &&
        m.probabilityPct >= mktProbMin && m.probabilityPct <= mktProbMax &&
        m.volume24hUsd >= mktMinVol && m.edgePct >= mktMinEdge &&
        withinTimeframe(m.endDate ?? null)
      )
      .sort((a, b) => {
        const dir = mktSortDir === "asc" ? 1 : -1;
        if (mktSortBy === "volume") return dir * (a.volume24hUsd - b.volume24hUsd);
        if (mktSortBy === "edge") return dir * (a.edgePct - b.edgePct);
        if (mktSortBy === "probability") return dir * (a.probabilityPct - b.probabilityPct);
        if (mktSortBy === "title") return dir * a.title.localeCompare(b.title);
        if (mktSortBy === "endDate") {
          const ea = a.endDate ? new Date(a.endDate).getTime() : 0;
          const eb = b.endDate ? new Date(b.endDate).getTime() : 0;
          return dir * (ea - eb);
        }
        return 0;
      });
  }, [markets, excludedMarketIds, mktCategory, mktRiskTag, mktProbMin, mktProbMax, mktMinVol, mktMinEdge, mktTimeframe, mktSortBy, mktSortDir]);

  const pagedMarkets = useMemo(() => filteredMarkets.slice((marketsPage - 1) * MARKETS_PAGE_SIZE, marketsPage * MARKETS_PAGE_SIZE), [filteredMarkets, marketsPage]);
  const marketsTotalPages = Math.max(1, Math.ceil(filteredMarkets.length / MARKETS_PAGE_SIZE));

  const hotFiltered = useMemo(() => {
    const base = filteredMarkets.filter(m => !excludedMarketIds.has(m.id));
    if (hotTab === "High Potential") return base.filter(m => m.riskTag === "high-potential");
    if (hotTab === "High Risk-High Reward") return base.filter(m => m.riskTag === "high-risk");
    if (hotTab === "Bookmarked") return base.filter(m => bookmarks.has(m.id));
    if (hotTab === "Watchlist") return base.filter(m => watchlist.has(m.id));
    if (hotTab === "Construction") return base.filter(m => m.riskTag === "construction" || m.category.toLowerCase().includes("construction"));
    return base.filter(m => m.riskTag !== null);
  }, [filteredMarkets, hotTab, bookmarks, watchlist, excludedMarketIds]);

  return {
    markets, marketsLoaded, loadingMarkets, filteredMarkets, pagedMarkets, marketsTotalPages,
    hotFiltered, hotTab, setHotTab,
    marketSearch, setMarketSearch,
    mktTimeframe, setMktTimeframe, mktCategory, setMktCategory,
    mktProbMin, setMktProbMin, mktProbMax, setMktProbMax,
    mktMinVol, setMktMinVol, mktMinEdge, setMktMinEdge,
    mktRiskTag, setMktRiskTag, mktSortBy, mktSortDir,
    bookmarks, watchlist, excludedMarketIds, setExcludedMarketIds,
    marketsPage, setMarketsPage, previewSummary,
    filtersExpanded, setFiltersExpanded,
    whaleData, loadingWhales, whaleFilter, setWhaleFilter,
    wsConnected,
    fetchMarkets, fetchWhales, subscribeToMarkets,
    toggleBookmark, toggleWatchlist, setSortBy, applyQuickMarketPreset,
    clearMarkets: () => { setMarkets([]); setMarketsLoaded(false); setPreviewSummary(null); },
  };
}
