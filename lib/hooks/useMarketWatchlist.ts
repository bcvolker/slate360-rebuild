"use client";

import { useCallback, useEffect, useState } from "react";
import type { MarketListing } from "@/components/dashboard/market/types";

export type SavedMarketItem = {
  id: string;
  marketId: string;
  title: string;
  category: string | null;
  yesPrice: number | null;
  noPrice: number | null;
  probability: number | null;
  createdAt: string;
};

function mapWatchlistRow(row: Record<string, unknown>): SavedMarketItem {
  return {
    id: String(row.id ?? ""),
    marketId: String(row.market_id ?? ""),
    title: String(row.title ?? ""),
    category: typeof row.category === "string" ? row.category : null,
    yesPrice: typeof row.yes_price === "number" ? row.yes_price : null,
    noPrice: typeof row.no_price === "number" ? row.no_price : null,
    probability: typeof row.probability === "number" ? row.probability : null,
    createdAt: String(row.created_at ?? new Date().toISOString()),
  };
}

export function useMarketWatchlist() {
  const [items, setItems] = useState<SavedMarketItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchWatchlist = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/market/watchlist", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { data?: { watchlist?: Record<string, unknown>[] } };
      setItems((data.data?.watchlist ?? []).map(mapWatchlistRow));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchWatchlist(); }, [fetchWatchlist]);

  const isSaved = useCallback((marketId: string) => items.some((item) => item.marketId === marketId), [items]);

  const toggleSave = useCallback(async (market: MarketListing) => {
    const existing = items.find((item) => item.marketId === market.id);
    if (existing) {
      const prev = items;
      setItems((current) => current.filter((item) => item.marketId !== market.id));
      const res = await fetch("/api/market/watchlist", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ market_id: market.id }),
      });
      if (!res.ok) setItems(prev);
      return;
    }

    const optimistic: SavedMarketItem = {
      id: `temp-${market.id}`,
      marketId: market.id,
      title: market.title,
      category: market.category,
      yesPrice: market.yesPrice,
      noPrice: market.noPrice,
      probability: market.probabilityPct,
      createdAt: new Date().toISOString(),
    };
    const prev = items;
    setItems((current) => [optimistic, ...current]);
    const res = await fetch("/api/market/watchlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        market_id: market.id,
        title: market.title,
        category: market.category,
        yes_price: market.yesPrice,
        no_price: market.noPrice,
        probability: market.probabilityPct,
      }),
    });
    if (!res.ok) {
      setItems(prev);
      return;
    }
    await fetchWatchlist();
  }, [fetchWatchlist, items]);

  const removeSaved = useCallback(async (marketId: string) => {
    const prev = items;
    setItems((current) => current.filter((item) => item.marketId !== marketId));
    const res = await fetch("/api/market/watchlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ market_id: marketId }),
    });
    if (!res.ok) setItems(prev);
  }, [items]);

  return { items, loading, isSaved, toggleSave, removeSaved, refresh: fetchWatchlist };
}
