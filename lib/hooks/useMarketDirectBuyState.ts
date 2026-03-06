"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import type { MarketListing, MktTimeframe, MktRiskTag, MarketSortKey } from "@/components/dashboard/market/types";
import type { ApiEnvelope, MarketViewModel } from "@/lib/market/contracts";

const PAGE_SIZE = 25;

function endCutoff(tf: MktTimeframe): number {
  const now = Date.now();
  const day = 86_400_000;
  const todayEnd = new Date(new Date().toDateString()).getTime() + day;
  switch (tf) {
    case "hour": return now + 3_600_000;
    case "day": return now + day;
    case "week": return now + 7 * day;
    case "month": return now + 30 * day;
    case "year": return now + 365 * day;
    case "today": return todayEnd;
    case "tomorrow": return todayEnd + day;
    default: return Infinity;
  }
}

export function useMarketDirectBuyState({ paperMode }: { paperMode: boolean }) {
  // Filter state
  const [query, setQuery] = useState("");
  const [timeframe, setTimeframe] = useState<MktTimeframe>("all");
  const [category, setCategory] = useState("all");
  const [probMin, setProbMin] = useState(0);
  const [probMax, setProbMax] = useState(100);
  const [minEdge, setMinEdge] = useState(0);
  const [riskTag, setRiskTag] = useState<MktRiskTag>("all");
  const [sortBy, setSortBy] = useState<MarketSortKey>("edge");
  const [minVolume, setMinVolume] = useState(0);
  const [minLiquidity, setMinLiquidity] = useState(0);
  const [maxSpread, setMaxSpread] = useState(100);
  const [filtersOpen, setFiltersOpen] = useState(false);

  // Markets state
  const [markets, setMarkets] = useState<MarketListing[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(1);

  // Buy panel state
  const [buyMarket, setBuyMarket] = useState<MarketListing | null>(null);
  const [buyOutcome, setBuyOutcome] = useState<"YES" | "NO">("YES");
  const [buyAmount, setBuyAmount] = useState(25);
  const [buyPaper, setBuyPaper] = useState(paperMode);
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buySuccess, setBuySuccess] = useState("");

  const fetchMarkets = useCallback(async (kw?: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        limit: "1000",
        active: "true",
        closed: "false",
        order: "volume24hr",
        ascending: "false",
      });
      const res = await fetch(`/api/market/polymarket?${params.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const payload = await res.json() as ApiEnvelope<{ markets: MarketViewModel[] }>;
      const q = (kw ?? query).trim().toLowerCase();
      const mapped: MarketListing[] = (payload.data?.markets ?? [])
        .filter(m => !q || m.title.toLowerCase().includes(q) || m.category.toLowerCase().includes(q))
        .map(m => ({
          ...m,
          bookmarked: false,
          endDateLabel: m.endDate
            ? new Date(m.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "2-digit" })
            : undefined,
          liquidity: m.liquidityUsd,
        }));
      setMarkets(mapped);
      setPage(1);
      setLoaded(true);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [query]);

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

  const filteredMarkets = useMemo(() => {
    const cut = endCutoff(timeframe);
    return markets
      .filter(m => {
        if (timeframe !== "all") {
          const iso = m.endDateIso ?? m.endDate;
          if (!iso) return false;
          if (new Date(iso).getTime() > cut) return false;
        }
        if (category !== "all" && m.category !== category) return false;
        if (m.probabilityPct < probMin || m.probabilityPct > probMax) return false;
        if (m.edgePct < minEdge) return false;
        if (riskTag !== "all") {
          if (riskTag === "none" && m.riskTag) return false;
          if (riskTag !== "none" && m.riskTag !== riskTag) return false;
        }
        if (m.volume24hUsd < minVolume) return false;
        if (m.liquidityUsd < minLiquidity) return false;
        const spread = Math.max(0, (1 - m.yesPrice - m.noPrice) * 100);
        if (spread > maxSpread) return false;
        return true;
      })
      .sort((a, b) => {
        switch (sortBy) {
          case "edge": return b.edgePct - a.edgePct;
          case "probability": return b.probabilityPct - a.probabilityPct;
          case "title": return a.title.localeCompare(b.title);
          case "endDate": {
            const ea = a.endDate ? new Date(a.endDate).getTime() : Infinity;
            const eb = b.endDate ? new Date(b.endDate).getTime() : Infinity;
            return ea - eb;
          }
          default: return b.volume24hUsd - a.volume24hUsd;
        }
      });
  }, [markets, timeframe, category, probMin, probMax, minEdge, riskTag, sortBy, minVolume, minLiquidity, maxSpread]);

  const totalPages = Math.max(1, Math.ceil(filteredMarkets.length / PAGE_SIZE));
  const pagedMarkets = filteredMarkets.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const buyPayloadReady = useMemo(() => {
    if (!buyMarket) return false;
    const rawPrice = buyOutcome === "YES" ? buyMarket.yesPrice : buyMarket.noPrice;
    const price = rawPrice > 0 ? rawPrice : buyMarket.probabilityPct / 100;
    return !!buyMarket.id && buyAmount > 0 && Number.isFinite(price) && price > 0;
  }, [buyMarket, buyOutcome, buyAmount]);

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
  }, [buyMarket, buyOutcome, buyAmount, buyPaper]);

  return {
    query, setQuery,
    timeframe, setTimeframe,
    category, setCategory,
    probMin, setProbMin,
    probMax, setProbMax,
    minEdge, setMinEdge,
    riskTag, setRiskTag,
    sortBy, setSortBy,
    minVolume, setMinVolume,
    minLiquidity, setMinLiquidity,
    maxSpread, setMaxSpread,
    filtersOpen, setFiltersOpen,
    availableCategories,
    pagedMarkets,
    filteredCount: filteredMarkets.length,
    loading, loaded,
    page, setPage,
    totalPages,
    fetchMarkets,
    buyMarket, buyOutcome, setBuyOutcome,
    buyAmount, setBuyAmount,
    buyPaper, setBuyPaper,
    buySubmitting, buySuccess,
    buyPayloadReady,
    openBuyPanel, closeBuyPanel, handleBuy,
  };
}
