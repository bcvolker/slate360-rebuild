/**
 * GET /api/market/polymarket
 * Server-side proxy for Polymarket Gamma API — avoids browser CORS restrictions.
 * All query params are forwarded to gamma-api.polymarket.com/markets.
 */
import { NextRequest, NextResponse } from "next/server";
import type { ApiEnvelope, MarketViewModel } from "@/lib/market/contracts";
import { mapGammaMarketToMarketVM } from "@/lib/market/mappers";
import { resolveServerOrgContext } from "@/lib/server/org-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const DEFAULT_LIMIT = 80;
const MAX_LIMIT = 200;
const SEARCH_SCAN_LIMIT = 5000;
const UPCOMING_SCAN_LIMIT = 5000;

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

function parseRows(upstreamData: unknown): unknown[] {
  return Array.isArray(upstreamData)
    ? upstreamData
    : Array.isArray((upstreamData as { markets?: unknown[] })?.markets)
      ? ((upstreamData as { markets: unknown[] }).markets)
      : [];
}

function matchesQuery(market: MarketViewModel, query: string): boolean {
  const haystack = `${market.title} ${market.category}`.toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function isUpcomingMarket(market: MarketViewModel): boolean {
  const iso = market.endDate ?? market.endDateIso;
  if (!iso) return false;
  const endTime = new Date(iso).getTime();
  return Number.isFinite(endTime) && endTime >= Date.now();
}

async function fetchUpstreamRows(url: string) {
  const res = await fetch(url, {
    cache: "no-store",
    headers: {
      Accept: "application/json",
      "User-Agent": "Slate360/1.0",
    },
    signal: AbortSignal.timeout(15_000),
  });

  if (!res.ok) {
    return { res, rows: null as unknown[] | null };
  }

  const upstreamData: unknown = await res.json();
  return { res, rows: parseRows(upstreamData) };
}

async function searchMarkets(
  forwardParams: URLSearchParams,
  query: string,
  limit: number,
  offset: number,
) {
  const matches: MarketViewModel[] = [];
  let scanOffset = offset;

  while (matches.length < limit && scanOffset < SEARCH_SCAN_LIMIT) {
    const params = new URLSearchParams(forwardParams);
    params.set("limit", String(MAX_LIMIT));
    if (scanOffset > 0) {
      params.set("offset", String(scanOffset));
    } else {
      params.delete("offset");
    }

    const upstreamUrl = `https://gamma-api.polymarket.com/markets?${params.toString()}`;
    const { res, rows } = await fetchUpstreamRows(upstreamUrl);

    if (!res.ok || !rows) {
      return { res, markets: null as MarketViewModel[] | null, nextCursor: undefined as string | undefined };
    }

    if (rows.length === 0) break;

    const mapped = rows.map((row) => mapGammaMarketToMarketVM(row)).filter((market) => matchesQuery(market, query));
    matches.push(...mapped);
    scanOffset += rows.length;

    if (rows.length < MAX_LIMIT) break;
  }

  const sliced = matches.slice(0, limit);
  const nextCursor = matches.length > limit ? encodeCursor(offset + limit) : undefined;
  return { res: null, markets: sliced, nextCursor };
}

async function collectUpcomingMarkets(
  forwardParams: URLSearchParams,
  limit: number,
  offset: number,
) {
  const matches: MarketViewModel[] = [];
  let scanOffset = offset;

  while (matches.length < limit && scanOffset < UPCOMING_SCAN_LIMIT) {
    const params = new URLSearchParams(forwardParams);
    params.set("limit", String(MAX_LIMIT));
    if (scanOffset > 0) {
      params.set("offset", String(scanOffset));
    } else {
      params.delete("offset");
    }

    const upstreamUrl = `https://gamma-api.polymarket.com/markets?${params.toString()}`;
    const { res, rows } = await fetchUpstreamRows(upstreamUrl);

    if (!res.ok || !rows) {
      return { res, markets: null as MarketViewModel[] | null, nextCursor: undefined as string | undefined };
    }

    if (rows.length === 0) break;

    const mapped = rows
      .map((row) => mapGammaMarketToMarketVM(row))
      .filter((market) => isUpcomingMarket(market));
    matches.push(...mapped);
    scanOffset += rows.length;

    if (rows.length < MAX_LIMIT) break;
  }

  const sliced = matches.slice(0, limit);
  const nextCursor = sliced.length === limit && scanOffset < UPCOMING_SCAN_LIMIT
    ? encodeCursor(scanOffset)
    : undefined;
  return { res: null, markets: sliced, nextCursor };
}

export async function GET(req: NextRequest) {
  const access = await resolveServerOrgContext();
  if (!access.user) {
    return noStoreJson(
      { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
      { status: 401 }
    );
  }
  if (!access.canAccessMarket) {
    return noStoreJson(
      { ok: false, error: { code: "forbidden", message: "Market access required" } },
      { status: 403 }
    );
  }

  const { searchParams } = req.nextUrl;

  const forwardParams = new URLSearchParams(searchParams);
  const requestedLimit = Number.parseInt(searchParams.get("limit") ?? String(DEFAULT_LIMIT), 10);
  const limit = Number.isFinite(requestedLimit)
    ? Math.min(Math.max(requestedLimit, 1), MAX_LIMIT)
    : DEFAULT_LIMIT;
  const offset = decodeCursor(searchParams.get("cursor"));
  const query = searchParams.get("_q")?.trim() ?? "";
  const upcomingOnly = searchParams.get("upcoming") === "true";

  forwardParams.delete("_q");
  forwardParams.delete("cursor");
  forwardParams.delete("upcoming");

  try {
    if (query) {
      const { res, markets, nextCursor } = await searchMarkets(forwardParams, query, limit, offset);

      if (res && !res.ok) {
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

      return noStoreJson({
        ok: true,
        data: {
          markets: markets ?? [],
          ...(nextCursor ? { nextCursor } : {}),
        },
      });
    }

    if (upcomingOnly) {
      const { res, markets, nextCursor } = await collectUpcomingMarkets(forwardParams, limit, offset);

      if (res && !res.ok) {
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

      return noStoreJson({
        ok: true,
        data: {
          markets: markets ?? [],
          ...(nextCursor ? { nextCursor } : {}),
        },
      });
    }

    forwardParams.set("limit", String(limit));
    if (offset > 0) {
      forwardParams.set("offset", String(offset));
    }

    const upstreamUrl = `https://gamma-api.polymarket.com/markets?${forwardParams.toString()}`;
    const { res, rows } = await fetchUpstreamRows(upstreamUrl);

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

    const markets: MarketViewModel[] = (rows ?? []).map((row) => mapGammaMarketToMarketVM(row));
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
