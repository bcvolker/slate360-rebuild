/**
 * GET /api/market/polymarket
 * Server-side proxy for Polymarket Gamma API — avoids browser CORS restrictions.
 * All query params are forwarded to gamma-api.polymarket.com/markets.
 */
import { NextRequest, NextResponse } from "next/server";
import type { ApiEnvelope, MarketViewModel } from "@/lib/market/contracts";
import { mapGammaMarketToMarketVM } from "@/lib/market/mappers";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 200;

function noStoreJson<T>(body: ApiEnvelope<T>, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { "Cache-Control": "no-store" },
  });
}

function decodeCursor(value: string | null): number {
  if (!value) return 0;

  const direct = Number.parseInt(value, 10);
  if (Number.isFinite(direct) && direct >= 0) return direct;

  try {
    const decoded = Buffer.from(value, "base64url").toString("utf8");
    const parsed = Number.parseInt(decoded, 10);
    if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  } catch {
    // ignore invalid cursor and fall back to 0
  }

  return 0;
}

function encodeCursor(offset: number): string {
  return Buffer.from(String(offset), "utf8").toString("base64url");
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const forwardParams = new URLSearchParams(searchParams);
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = decodeCursor(searchParams.get("cursor"));

  forwardParams.delete("_q");
  forwardParams.delete("cursor");
  forwardParams.set("limit", String(limit));
  if (offset > 0) {
    forwardParams.set("offset", String(offset));
  }

  const upstreamUrl = `https://gamma-api.polymarket.com/markets?${forwardParams.toString()}`;

  try {
    const res = await fetch(upstreamUrl, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent": "Slate360/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return noStoreJson(
        {
          ok: false,
          error: {
            code: "polymarket_upstream_error",
            message: `Polymarket upstream error (${res.status})`,
            details: { status: res.status },
          },
        },
        { status: res.status }
      );
    }

    const upstreamData: unknown = await res.json();
    const rows = Array.isArray(upstreamData)
      ? upstreamData
      : Array.isArray((upstreamData as { markets?: unknown[] })?.markets)
        ? ((upstreamData as { markets: unknown[] }).markets)
        : [];

    const markets: MarketViewModel[] = rows.map((row) => mapGammaMarketToMarketVM(row));
    const hasMore = markets.length === limit;
    const nextCursor = hasMore ? encodeCursor(offset + markets.length) : undefined;

    return noStoreJson({
      ok: true,
      data: {
        markets,
        ...(nextCursor ? { nextCursor } : {}),
      },
    });
  } catch (err) {
    console.error("[polymarket proxy]", err);
    return noStoreJson(
      {
        ok: false,
        error: {
          code: "polymarket_fetch_failed",
          message: err instanceof Error ? err.message : "Failed to fetch from Polymarket",
        },
      },
      { status: 503 }
    );
  }
}
