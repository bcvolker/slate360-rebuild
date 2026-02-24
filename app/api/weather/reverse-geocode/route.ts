import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const lat = req.nextUrl.searchParams.get("lat");
  const lng = req.nextUrl.searchParams.get("lng");

  if (!lat || !lng) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  const upstream = new URL("https://geocoding-api.open-meteo.com/v1/reverse");
  upstream.searchParams.set("latitude", lat);
  upstream.searchParams.set("longitude", lng);
  upstream.searchParams.set("count", "1");
  upstream.searchParams.set("language", "en");

  try {
    const res = await fetch(upstream.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "Slate360/1.0",
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Upstream geocode failed", status: res.status }, { status: 502 });
    }

    const data = await res.json();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=1800" },
    });
  } catch {
    return NextResponse.json({ error: "Reverse geocode request failed" }, { status: 503 });
  }
}
