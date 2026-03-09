"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { MarketListing, MktTimeframe, MktRiskTag, MarketSortDirection, MarketSortKey } from "@/components/dashboard/market/types";
import type { ApiEnvelope, MarketViewModel } from "@/lib/market/contracts";
import { buildTableInsights, filterAndSortMarkets } from "@/lib/market/direct-buy-table";
import { getDirectBuyFetchPlan } from "@/lib/market/direct-buy-fetch";

const FETCH_BATCH_SIZE = 200;

export function useMarketDirectBuyState({
  paperMode,
  walletAddress,
  liveChecklist,
  onTradePlaced,
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
  onTradePlaced?: () => void | Promise<void>;
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
  const lastFetchMode = useRef<string | null>(null);

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

  const fetchMarkets = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const plan = getDirectBuyFetchPlan(timeframe);
      const collected: MarketViewModel[] = [];
      let cursor: string | undefined;
      let hasMore = true;
      lastFetchMode.current = plan.mode;

      while (hasMore && collected.length < plan.maxMarkets) {
        const params = new URLSearchParams({
          limit: String(FETCH_BATCH_SIZE),
          active: "true",
          closed: "false",
          order: plan.order,
          ascending: String(plan.ascending),
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

      }

      const mapped: MarketListing[] = collected.map(mapMarket);
      setMarkets(mapped);
      setLoaded(true);
    } catch (error) {
      setMarkets([]);
      setLoaded(true);
      setLoadError(error instanceof Error ? error.message : "Failed to load markets");
    }
    finally { setLoading(false); }
  }, [mapMarket, timeframe]);

  // Auto-load markets on mount
  const autoLoaded = useRef(false);
  useEffect(() => {
    if (!autoLoaded.current) {
      autoLoaded.current = true;
      fetchMarkets();
    }
  }, [fetchMarkets]);

  useEffect(() => {
    if (!loaded || loading) return;
    const nextPlan = getDirectBuyFetchPlan(timeframe);
    if (nextPlan.mode !== lastFetchMode.current) {
      void fetchMarkets();
    }
  }, [fetchMarkets, loaded, loading, timeframe]);

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
      query,
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
  }, [markets, query, timeframe, category, probMin, probMax, minEdge, riskTag, sortBy, sortDirection, minVolume, minLiquidity, maxSpread]);

  const tableInsights = useMemo(() => buildTableInsights(filteredMarkets), [filteredMarkets]);

  const clearFilters = useCallback(() => {
    setQuery("");
    setTimeframe("all");
    setCategory("all");
    setProbMin(0);
    setProbMax(100);
    setMinEdge(0);
    setRiskTag("all");
    setSortBy("edge");
    setSortDirection("desc");
    setMinVolume(0);
    setMinLiquidity(0);
    setMaxSpread(100);
  }, []);

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
        window.setTimeout(() => {
          setBuyMarket(null);
          void onTradePlaced?.();
        }, 900);
      } else {
        setBuySuccess(`❌ ${data.error ?? "Buy failed"}`);
      }
    } catch (e: unknown) {
      setBuySuccess(`❌ ${(e as Error).message}`);
    } finally {
      setBuySubmitting(false);
    }
  }, [buyAmount, buyMarket, buyOutcome, buyPaper, onTradePlaced, walletAddress]);

  const fetchModeLabel = useMemo(() => getDirectBuyFetchPlan(timeframe).label, [timeframe]);

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
    filteredMarkets,
    filteredCount: filteredMarkets.length,
    fetchModeLabel,
    tableInsights,
    loading, loaded, loadError,
    clearFilters,
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
