"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { MarketListing, MktTimeframe, MktRiskTag, MarketSortDirection, MarketSortKey } from "@/components/dashboard/market/types";
import type { ApiEnvelope, MarketViewModel } from "@/lib/market/contracts";
import { buildTableInsights, filterAndSortMarkets } from "@/lib/market/direct-buy-table";

const PAGE_SIZE = 25;
const FETCH_BATCH_SIZE = 200;
const MAX_MARKET_FETCH = 1000;

export function useMarketDirectBuyState({
  paperMode,
  walletAddress,
  liveChecklist,
}: {
  paperMode: boolean;
  walletAddress?: `0x${string}`;
  liveChecklist: {
    walletConnected: boolean;
    polygonSelected: boolean;
    usdcFunded: boolean;
    signatureVerified: boolean;
    usdcApproved: boolean;
  };
}) {
  // Filter state
  const [query, setQuery] = useState("");
  const [timeframe, setTimeframe] = useState<MktTimeframe>("all");
  const [category, setCategory] = useState("all");
  const [probMin, setProbMin] = useState(0);
  const [probMax, setProbMax] = useState(100);
  const [minEdge, setMinEdge] = useState(0);
  const [riskTag, setRiskTag] = useState<MktRiskTag>("all");
  const [sortBy, setSortBy] = useState<MarketSortKey>("edge");
  const [sortDirection, setSortDirection] = useState<MarketSortDirection>("desc");
  const [minVolume, setMinVolume] = useState(0);
  const [minLiquidity, setMinLiquidity] = useState(0);
  const [maxSpread, setMaxSpread] = useState(100);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Markets state
  const [markets, setMarkets] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Buy panel state
  const [buyMarket, setBuyMarket] = useState<MarketListing | null>(null);
  const [buyOutcome, setBuyOutcome] = useState<"YES" | "NO">("YES");
  const [buyAmount, setBuyAmount] = useState(25);
  const [buyPaper, setBuyPaper] = useState(paperMode);
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buySuccess, setBuySuccess] = useState("");

  const mapMarket = useCallback((m: MarketViewModel): MarketListing => ({
    ...m,
    bookmarked: false,
    endDateLabel: m.endDate
      ? new Date(m.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
      : undefined,
    liquidity: m.liquidityUsd,
  }), []);

  const fetchMarkets = useCallback(async (kw?: string) => {
    setLoading(true);
    setLoadError(null);
    try {
      const normalizedQuery = (kw ?? query).trim().toLowerCase();
      const collected: MarketViewModel[] = [];
      let cursor: string | undefined;
      let hasMore = true;

      while (hasMore && collected.length < MAX_MARKET_FETCH) {
        const params = new URLSearchParams({
          limit: String(FETCH_BATCH_SIZE),
          active: "true",
          closed: "false",
          order: "volume24hr",
          ascending: "false",
        });
        if (cursor) {
          params.set("cursor", cursor);
        }

        const res = await fetch(`/api/market/polymarket?${params.toString()}`, { cache: "no-store" });
        if (!res.ok) {
          throw new Error(`Failed to load markets (${res.status})`);
        }
        const payload = await res.json() as ApiEnvelope<{ markets: MarketViewModel[]; nextCursor?: string }>;
        const batch = payload.data?.markets ?? [];
        if (batch.length === 0) {
          hasMore = false;
          break;
        }

        collected.push(...batch);
        cursor = payload.data?.nextCursor;
        hasMore = Boolean(cursor);

        if (normalizedQuery && collected.length >= MAX_MARKET_FETCH) {
          break;
        }
      }

      const mapped: MarketListing[] = collected
        .filter(m => !normalizedQuery || m.title.toLowerCase().includes(normalizedQuery) || m.category.toLowerCase().includes(normalizedQuery))
        .map(mapMarket);
      setMarkets(mapped);
      setPage(1);
      setLoaded(true);
    } catch (error) {
      setMarkets([]);
      setLoaded(true);
      setLoadError(error instanceof Error ? error.message : "Failed to load markets");
    }
    finally { setLoading(false); }
  }, [mapMarket, query]);

  // Auto-load markets on mount
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (!autoLoaded.current) {
      autoLoaded.current = true;
      fetchMarkets("");
    }
  }, [fetchMarkets]);

  const availableCategories = useMemo(
    () => [...new Set(markets.map(m => m.category))].sort(),
    [markets],
  );

  const toggleSort = useCallback((nextSort: MarketSortKey) => {
    if (nextSort === sortBy) {
      setSortDirection(current => current === "asc" ? "desc" : "asc");
      return;
    }
    setSortBy(nextSort);
    setSortDirection(nextSort === "title" || nextSort === "endDate" ? "asc" : "desc");
  }, [sortBy]);

  const filteredMarkets = useMemo(() => {
    return filterAndSortMarkets({
      markets,
      timeframe,
      category,
      probMin,
      probMax,
      minEdge,
      riskTag,
      sortBy,
      sortDirection,
      minVolume,
      minLiquidity,
      maxSpread,
    });
  }, [markets, timeframe, category, probMin, probMax, minEdge, riskTag, sortBy, sortDirection, minVolume, minLiquidity, maxSpread]);

  const tableInsights = useMemo(() => buildTableInsights(filteredMarkets), [filteredMarkets]);

  const totalPages = Math.max(1, Math.ceil(filteredMarkets.length / PAGE_SIZE));
  const pagedMarkets = filteredMarkets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const buyPayloadIssues = useMemo(() => {
    if (!buyMarket) return ["Select a market"];

    const rawPrice = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
    const price = rawPrice > 0 ? rawPrice : buyMarket.probabilityPct / 100;
    const issues: string[] = [];

    if (!buyMarket.id) issues.push("Missing market id");
    if (!(buyAmount > 0)) issues.push("Enter an amount greater than $0");
    if (!Number.isFinite(price) || price <= 0) issues.push("Price unavailable");

    if (!buyPaper) {
      const tokenId = buyOutcome === "YES" ? buyMarket.tokenIdYes : buyMarket.tokenIdNo;
      if (!tokenId) issues.push(`No ${buyOutcome} token id available`);
      if (!walletAddress) issues.push("Connect wallet on the Live Wallet tab");
      if (!liveChecklist.walletConnected) issues.push("Wallet not connected");
      if (!liveChecklist.polygonSelected) issues.push("Switch wallet to Polygon");
      if (!liveChecklist.signatureVerified) issues.push("Verify wallet signature");
      if (!liveChecklist.usdcApproved) issues.push("Approve USDC spending");
      if (!liveChecklist.usdcFunded) issues.push("Fund wallet with USDC");
    }

    return issues;
  }, [buyAmount, buyMarket, buyOutcome, buyPaper, liveChecklist, walletAddress]);

  const buyPayloadReady = buyPayloadIssues.length === 0;

  const openBuyPanel = (m: MarketListing, o: "YES" | "NO" = "YES") => {
    setBuyMarket(m);
    setBuyOutcome(o);
    setBuyAmount(25);
    setBuySuccess("");
    setBuyPaper(paperMode);
  };

  const closeBuyPanel = () => setBuyMarket(null);

  const handleBuy = useCallback(async () => {
    if (!buyMarket) return;
    setBuySubmitting(true);
    setBuySuccess("");
    try {
      const rawPrice = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
      const avgPrice = rawPrice > 0 ? rawPrice : buyMarket.probabilityPct / 100;
      const res = await fetch("/api/market/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          market_id: buyMarket.id,
          market_title: buyMarket.title,
          outcome: buyOutcome,
          amount: buyAmount,
          avg_price: avgPrice,
          category: buyMarket.category,
          probability: buyMarket.probabilityPct,
          paper_mode: buyPaper,
          wallet_address: walletAddress ?? null,
          token_id: buyOutcome === "YES" ? (buyMarket.tokenIdYes ?? null) : (buyMarket.tokenIdNo ?? null),
          take_profit_pct: 20,
          stop_loss_pct: 10,
          idempotency_key: crypto.randomUUID(),
        }),
      });
      const data = await res.json() as { error?: string };
      if (res.ok) {
        setBuySuccess(`✅ ${buyPaper ? "Paper " : ""}Buy placed — ${(buyAmount / avgPrice).toFixed(1)} shares ${buyOutcome}`);
        setTimeout(() => setBuyMarket(null), 2500);
      } else {
        setBuySuccess(`❌ ${data.error ?? "Buy failed"}`);
      }
    } catch (e: unknown) {
      setBuySuccess(`❌ ${(e as Error).message}`);
    } finally {
      setBuySubmitting(false);
    }
  }, [buyAmount, buyMarket, buyOutcome, buyPaper, walletAddress]);

  return {
    query, setQuery,
    timeframe, setTimeframe,
    category, setCategory,
    probMin, setProbMin,
    probMax, setProbMax,
    minEdge, setMinEdge,
    riskTag, setRiskTag,
    sortBy, setSortBy,
    sortDirection,
    toggleSort,
    minVolume, setMinVolume,
    minLiquidity, setMinLiquidity,
    maxSpread, setMaxSpread,
    filtersOpen, setFiltersOpen,
    availableCategories,
    pagedMarkets,
    filteredCount: filteredMarkets.length,
    tableInsights,
    loading, loaded, loadError,
    page, setPage,
    totalPages,
    fetchMarkets,
    buyMarket, buyOutcome, setBuyOutcome,
    buyAmount, setBuyAmount,
    buyPaper, setBuyPaper,
    buySubmitting, buySuccess,
    buyPayloadReady,
    buyPayloadIssues,
    openBuyPanel, closeBuyPanel, handleBuy,
  };
}
