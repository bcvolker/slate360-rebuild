import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side proxy for the Google Routes API v2.
 * Replaces the deprecated client-side DirectionsService which returns REQUEST_DENIED
 * when the legacy "Directions API" is not enabled in the GCP project.
 *
 * Requires: "Routes API" enabled in Google Cloud Console.
 */
export async function POST(req: NextRequest) {
  try {
    const { origin, destination, travelMode } = await req.json();

    if (!origin || !destination) {
      return NextResponse.json(
        { error: "Origin and destination are required." },
        { status: 400 }
      );
    }

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Google Maps API key not configured." },
        { status: 500 }
      );
    }

    const modeMap: Record<string, string> = {
      DRIVING: "DRIVE",
      WALKING: "WALK",
      BICYCLING: "BICYCLE",
      TRANSIT: "TRANSIT",
    };

    const body: Record<string, unknown> = {
      origin: { address: origin },
      destination: { address: destination },
      travelMode: modeMap[travelMode] || "DRIVE",
      polylineEncoding: "ENCODED_POLYLINE",
      computeAlternativeRoutes: false,
    };

    // TRAFFIC_AWARE is not supported for TRANSIT
    if (travelMode !== "TRANSIT") {
      body.routingPreference = "TRAFFIC_AWARE";
    }

    const res = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask":
            "routes.duration,routes.distanceMeters,routes.polyline.encodedPolyline,routes.legs.startLocation,routes.legs.endLocation",
          // Pass Referer so the request satisfies the API key's HTTP referrer restriction
          "Referer": "https://www.slate360.ai/",
        },
        body: JSON.stringify(body),
      }
    );

    const data = await res.json();

    if (!res.ok) {
      const msg = data?.error?.message || "Routes API request failed";
      console.error("Routes API error:", JSON.stringify(data?.error));
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    if (!data.routes?.[0]) {
      return NextResponse.json(
        { error: "No route found between those locations." },
        { status: 404 }
      );
    }

    const route = data.routes[0];
    const distanceMeters: number = route.distanceMeters || 0;
    const durationStr: string = route.duration || "0s";
    const durationSeconds = parseInt(durationStr.replace("s", ""), 10) || 0;

    // Format distance
    const distanceMiles = distanceMeters / 1609.344;
    const distance =
      distanceMiles >= 0.1
        ? `${distanceMiles.toFixed(1)} mi`
        : `${Math.round(distanceMeters * 3.28084)} ft`;

    // Format duration
    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.ceil((durationSeconds % 3600) / 60);
    const duration =
      hours > 0 ? `${hours} hr ${minutes} min` : `${minutes} min`;

    return NextResponse.json({
      encodedPolyline: route.polyline?.encodedPolyline || "",
      distance,
      duration,
      distanceMeters,
      durationSeconds,
      startLocation: route.legs?.[0]?.startLocation?.latLng,
      endLocation: route.legs?.[0]?.endLocation?.latLng,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Directions API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
