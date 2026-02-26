import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for the Google Maps Static API.
 * Avoids CORS issues and html2canvas oklch/WebGL failures by fetching the
 * static map image on the server and returning it as a PNG.
 *
 * Requires: "Maps Static API" enabled in Google Cloud Console.
 */
export async function GET(req: NextRequest) {
  const params = req.nextUrl.searchParams;
  const center = params.get("center") || "40.7128,-74.006";
  const zoom = params.get("zoom") || "13";
  const size = params.get("size") || "800x450";
  const maptype = params.get("maptype") || "roadmap";
  const markers = params.getAll("markers");
  const path = params.get("path");

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Google Maps API key not configured." },
      { status: 500 }
    );
  }

  const url = new URL("https://maps.googleapis.com/maps/api/staticmap");
  url.searchParams.set("center", center);
  url.searchParams.set("zoom", zoom);
  url.searchParams.set("size", size);
  url.searchParams.set("scale", "2"); // retina quality
  url.searchParams.set("maptype", maptype);
  url.searchParams.set("key", apiKey);

  for (const m of markers) {
    url.searchParams.append("markers", m);
  }
  if (path) {
    url.searchParams.set("path", path);
  }

  try {
    const response = await fetch(url.toString(), {
      headers: { "Referer": "https://www.slate360.ai/" },
    });
    if (!response.ok) {
      console.error(
        "Static Maps API error:",
        response.status,
        await response.text().catch(() => "")
      );
      return NextResponse.json(
        { error: "Static Maps API request failed." },
        { status: response.status }
      );
    }

    const buffer = await response.arrayBuffer();
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Static map fetch failed";
    console.error("Static map error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
