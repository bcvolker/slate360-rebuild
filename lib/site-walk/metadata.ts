/**
 * Capture metadata helper — collects timestamp, GPS, and weather for a Site Walk item.
 * Runs entirely in the browser. Falls back gracefully when permissions are denied.
 */

export interface CaptureWeather {
  temperature_f?: number;
  temperature_c?: number;
  conditions?: string;
  wind_mph?: number;
  humidity_pct?: number;
  source: "open-meteo" | "unavailable";
  fetched_at: string;
}

export interface CaptureMetadata {
  captured_at: string;
  device: {
    user_agent: string;
    platform: string;
    screen?: { width: number; height: number };
  };
  gps?: {
    latitude: number;
    longitude: number;
    accuracy_m: number;
    altitude_m: number | null;
    heading_deg: number | null;
  };
  weather?: CaptureWeather;
}

/**
 * Best-effort browser geolocation. Returns null if denied or unavailable.
 */
export async function getGps(): Promise<CaptureMetadata["gps"] | null> {
  if (typeof navigator === "undefined" || !navigator.geolocation) return null;
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
        accuracy_m: pos.coords.accuracy,
        altitude_m: pos.coords.altitude ?? null,
        heading_deg: pos.coords.heading ?? null,
      }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 30_000 },
    );
  });
}

// In-memory weather cache (10 min, ~5km grid)
type CacheEntry = { fetchedAt: number; weather: CaptureWeather };
const weatherCache = new Map<string, CacheEntry>();
const WEATHER_TTL_MS = 10 * 60 * 1000;

function gridKey(lat: number, lon: number): string {
  return `${lat.toFixed(2)}:${lon.toFixed(2)}`;
}

/**
 * Fetch current weather from Open-Meteo (no API key required).
 * Returns "unavailable" stub if the request fails so the metadata field is always populated.
 */
export async function getWeather(lat: number, lon: number): Promise<CaptureWeather> {
  const key = gridKey(lat, lon);
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.fetchedAt < WEATHER_TTL_MS) {
    return cached.weather;
  }

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m&temperature_unit=fahrenheit&wind_speed_unit=mph`;
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error(`open-meteo ${res.status}`);
    const json = await res.json() as {
      current?: {
        temperature_2m?: number;
        relative_humidity_2m?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
    };
    const c = json.current ?? {};
    const weather: CaptureWeather = {
      temperature_f: c.temperature_2m,
      temperature_c: typeof c.temperature_2m === "number" ? Math.round(((c.temperature_2m - 32) * 5) / 9 * 10) / 10 : undefined,
      conditions: weatherCodeLabel(c.weather_code),
      wind_mph: c.wind_speed_10m,
      humidity_pct: c.relative_humidity_2m,
      source: "open-meteo",
      fetched_at: new Date().toISOString(),
    };
    weatherCache.set(key, { fetchedAt: Date.now(), weather });
    return weather;
  } catch {
    return {
      source: "unavailable",
      fetched_at: new Date().toISOString(),
    };
  }
}

function weatherCodeLabel(code?: number): string | undefined {
  if (typeof code !== "number") return undefined;
  // WMO weather interpretation codes
  if (code === 0) return "Clear";
  if (code <= 3) return "Partly cloudy";
  if (code <= 48) return "Fog";
  if (code <= 57) return "Drizzle";
  if (code <= 67) return "Rain";
  if (code <= 77) return "Snow";
  if (code <= 82) return "Rain showers";
  if (code <= 86) return "Snow showers";
  if (code <= 99) return "Thunderstorm";
  return undefined;
}

/**
 * Top-level: gather everything available for a capture.
 */
export async function captureMetadata(): Promise<CaptureMetadata> {
  const gps = await getGps();
  const weather = gps ? await getWeather(gps.latitude, gps.longitude) : undefined;

  const meta: CaptureMetadata = {
    captured_at: new Date().toISOString(),
    device: {
      user_agent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
      platform: typeof navigator !== "undefined" ? navigator.platform : "unknown",
      screen: typeof window !== "undefined"
        ? { width: window.screen.width, height: window.screen.height }
        : undefined,
    },
  };
  if (gps) meta.gps = gps;
  if (weather) meta.weather = weather;
  return meta;
}
