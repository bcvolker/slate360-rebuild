"use client";

import { useState, useMemo } from "react";
import type { MarketListing } from "@/components/dashboard/market/types";

interface UseMarketBuyStateParams {
  paperMode: boolean;
  addLog: (msg: string) => void;
  settleAndRefresh: () => Promise<void>;
  directiveTakeProfitPct: number;
  directiveStopLossPct: number;
  address: `0x${string}` | undefined;
}

export function useMarketBuyState({
  paperMode, addLog, settleAndRefresh, directiveTakeProfitPct, directiveStopLossPct, address,
}: UseMarketBuyStateParams) {
  const [buyMarket, setBuyMarket] = useState<MarketListing | null>(null);
  const [buyOutcome, setBuyOutcome] = useState<"YES" | "NO">("YES");
  const [buyAmount, setBuyAmount] = useState(25);
  const [buyTakeProfitPct, setBuyTakeProfitPct] = useState(20);
  const [buyStopLossPct, setBuyStopLossPct] = useState(10);
  const [buyPaper, setBuyPaper] = useState(true);
  const [buySubmitting, setBuySubmitting] = useState(false);
  const [buySuccess, setBuySuccess] = useState("");

  const openBuyPanel = (market: MarketListing, outcome: "YES" | "NO" = "YES") => {
    setBuyMarket(market); setBuyOutcome(outcome); setBuyAmount(25);
    setBuyTakeProfitPct(directiveTakeProfitPct);
    setBuyStopLossPct(directiveStopLossPct);
    setBuySuccess(""); setBuyPaper(paperMode);
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
      const data = await res.json() as { error?: string; missingFields?: string[] };
      if (res.ok) {
        setBuySuccess(`✅ ${buyPaper ? "Paper " : ""}Buy — ${(Number(buyAmount) / avgPrice).toFixed(1)} shares ${buyOutcome} @ $${avgPrice.toFixed(3)}`);
        addLog(`🛒 Bought ${buyOutcome} on "${marketTitle.slice(0, 40)}…" — $${buyAmount} ${buyPaper ? "(paper)" : "(live)"}`);
        await settleAndRefresh();
        setTimeout(() => setBuyMarket(null), 2500);
      } else {
        const missing = Array.isArray(data?.missingFields) ? ` (${data.missingFields.join(", ")})` : "";
        setBuySuccess(`❌ ${data.error ?? "Buy failed"}${missing}`);
      }
    } catch (e: unknown) { setBuySuccess(`❌ ${(e as Error).message}`); }
    finally { setBuySubmitting(false); }
  };

  return {
    buyMarket, setBuyMarket, buyOutcome, setBuyOutcome,
    buyAmount, setBuyAmount, buyTakeProfitPct, setBuyTakeProfitPct,
    buyStopLossPct, setBuyStopLossPct, buyPaper, setBuyPaper,
    buySubmitting, buySuccess, setBuySuccess,
    openBuyPanel, handleDirectBuy, buyPayloadIssues, buyPayloadReady,
  };
}
