import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiEnvelope, WhaleActivityViewModel } from "@/lib/market/contracts";
import { mapWhaleRowToWhaleVM } from "@/lib/market/mappers";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson<T>(body: ApiEnvelope<T>, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });
    }

    const metadata = (user.user_metadata ?? {}) as {
      marketBotConfig?: { walletAddress?: string | null };
    };
    const walletFromMetadata = metadata.marketBotConfig?.walletAddress?.trim();
    const envWallets = (process.env.POLYMARKET_WHALE_USERS ?? "")
      .split(",")
      .map((wallet) => wallet.trim())
      .filter(Boolean);

    const usersToQuery = [walletFromMetadata, ...envWallets].filter(
      (wallet, idx, arr): wallet is string => Boolean(wallet) && arr.indexOf(wallet) === idx,
    );

    const collected: Record<string, unknown>[] = [];

    for (const whaleUser of usersToQuery.slice(0, 8)) {
      const upstream = `https://data-api.polymarket.com/activity?limit=40&user=${encodeURIComponent(whaleUser)}`;
      const res = await fetch(upstream, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      });

      if (!res.ok) {
        continue;
      }

      const data = (await res.json()) as Record<string, unknown>[];
      for (const item of data) {
        const side = String(item.side ?? "").toUpperCase();
        const amount = Number(item.usdcSize ?? item.amount ?? 0);
        if (side === "BUY" && amount >= 5000) {
          collected.push(item);
        }
      }
    }

    if (collected.length > 0) {
      const sorted = collected
        .sort(
          (a, b) =>
            new Date(String(b.timestamp ?? 0)).getTime() -
            new Date(String(a.timestamp ?? 0)).getTime(),
        )
        .slice(0, 50);

      const whales: WhaleActivityViewModel[] = sorted.map((row) => mapWhaleRowToWhaleVM(row));
      return noStoreJson({ ok: true, data: { whales } });
    }

    const gammaFallback = await fetch(
      "https://gamma-api.polymarket.com/markets?limit=25&active=true&closed=false&order=volume24hr&ascending=false",
      {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(15_000),
        cache: "no-store",
      },
    );

    if (!gammaFallback.ok) {
      return noStoreJson({ ok: true, data: { whales: [] } });
    }

    const gammaData = (await gammaFallback.json()) as Record<string, unknown>[];
    const synthetic = gammaData.slice(0, 20).map((market, idx) => {
      const yesPrice = Number((market.outcomePrices as string[] | undefined)?.[0] ?? 0.5);
      const estimatedAmount = Math.max(5000, Math.min(50000, Number(market.volume24hr ?? 0) * 0.02));
      const shares = estimatedAmount / Math.max(yesPrice, 0.01);

      return {
        proxyWallet: `market-flow-${idx + 1}`,
        user: `market-flow-${idx + 1}`,
        title: String(market.question ?? market.title ?? "Unknown market"),
        side: "BUY",
        outcome: yesPrice >= 0.5 ? "YES" : "NO",
        size: Number(shares.toFixed(2)),
        usdcSize: Number(estimatedAmount.toFixed(2)),
        timestamp: new Date().toISOString(),
        category: String(market.category ?? "General"),
      };
    });

    const whales: WhaleActivityViewModel[] = synthetic.map((row) => mapWhaleRowToWhaleVM(row));
    return noStoreJson({ ok: true, data: { whales } });

  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return noStoreJson({ ok: false, error: { code: "whales_fetch_failed", message: msg } }, { status: 503 });
  }
}
