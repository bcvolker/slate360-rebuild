import { NextResponse } from "next/server";

export const revalidate = 0;

export async function GET() {
  try {
    const upstream = "https://data-api.polymarket.com/activity?limit=50&side=BUY&minAmount=5000";
    const res = await fetch(upstream, {
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream error", status: res.status }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60" },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 503 });
  }
}
