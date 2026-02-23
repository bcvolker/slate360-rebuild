/**
 * GET /api/market/polymarket
 * Server-side proxy for Polymarket Gamma API — avoids browser CORS restrictions.
 * All query params are forwarded to gamma-api.polymarket.com/markets.
 */
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  // If there's a search query, we can't use it directly on Gamma API,
  // but we can increase the limit to get more results to filter client-side
  const forwardParams = new URLSearchParams(searchParams);
  // Always fetch a large limit so client-side filtering works well
  forwardParams.set("limit", "500");

  const upstreamUrl = `https://gamma-api.polymarket.com/markets?${forwardParams.toString()}`;

  try {
    const res = await fetch(upstreamUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Slate360/1.0",
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: "Polymarket upstream error", status: res.status },
        { status: res.status }
      );
    }

    const data = await res.json();

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    });
  } catch (err) {
    console.error("[polymarket proxy]", err);
    return NextResponse.json(
      { error: "Failed to fetch from Polymarket" },
      { status: 503 }
    );
  }
}
