import { NextRequest, NextResponse } from "next/server";

/**
 * Server-side directions endpoint.
 *
 * Uses Google Geocoding API (to resolve addresses → coordinates) and
 * OSRM (free, open-source routing engine) for the actual route polyline.
 *
 * This avoids the Google Routes API / Directions API, which are blocked
 * by this project's API key restrictions (API_KEY_SERVICE_BLOCKED).
 */

async function geocodeAddress(
  address: string,
  apiKey: string
): Promise<{ lat: number; lng: number } | null> {
  // If already looks like "lat, lng", parse directly
  const coordMatch = address.match(
    /^(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)$/
  );
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lng: parseFloat(coordMatch[2]),
    };
  }

  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
    address
  )}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.status === "OK" && data.results?.[0]?.geometry?.location) {
    return data.results[0].geometry.location;
  }
  return null;
}

const OSRM_PROFILE: Record<string, string> = {
  DRIVING: "driving",
  WALKING: "foot",
  BICYCLING: "bicycle",
  TRANSIT: "driving", // OSRM has no transit; fall back to driving
};

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

    // 1. Geocode both addresses in parallel
    const [originCoord, destCoord] = await Promise.all([
      geocodeAddress(origin, apiKey),
      geocodeAddress(destination, apiKey),
    ]);

    if (!originCoord) {
      return NextResponse.json(
        { error: `Could not find location: "${origin}"` },
        { status: 400 }
      );
    }
    if (!destCoord) {
      return NextResponse.json(
        { error: `Could not find location: "${destination}"` },
        { status: 400 }
      );
    }

    // 2. Get route from OSRM (free, no API key)
    const profile = OSRM_PROFILE[travelMode] || "driving";
    const osrmUrl = `https://router.project-osrm.org/route/v1/${profile}/${originCoord.lng},${originCoord.lat};${destCoord.lng},${destCoord.lat}?overview=full&geometries=polyline`;

    const osrmRes = await fetch(osrmUrl);
    const osrmData = await osrmRes.json();

    if (osrmData.code !== "Ok" || !osrmData.routes?.[0]) {
      return NextResponse.json(
        { error: "Could not find a route between those locations." },
        { status: 404 }
      );
    }

    const route = osrmData.routes[0];
    const distanceMeters: number = route.distance || 0;
    const durationSeconds: number = Math.round(route.duration || 0);

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
      encodedPolyline: route.geometry || "",
      distance,
      duration,
      distanceMeters,
      durationSeconds,
      startLocation: originCoord,
      endLocation: destCoord,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Internal server error";
    console.error("Directions API error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
