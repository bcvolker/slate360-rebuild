/**
 * In-memory sliding-window rate limiter for public API routes.
 *
 * Suitable for single-instance Vercel deployments.  Each serverless
 * cold-start resets the window, which is acceptable — the goal is to
 * block brute-force bursts, not to maintain global state.
 */

import { NextResponse } from "next/server";

interface HitRecord {
  timestamps: number[];
}

const store = new Map<string, HitRecord>();

// Evict stale entries every 10 minutes to prevent memory leaks
const EVICT_INTERVAL_MS = 10 * 60 * 1000;
let lastEvict = Date.now();

function evictStale(windowMs: number) {
  const now = Date.now();
  if (now - lastEvict < EVICT_INTERVAL_MS) return;
  lastEvict = now;
  const cutoff = now - windowMs;
  for (const [key, record] of store) {
    record.timestamps = record.timestamps.filter((t) => t > cutoff);
    if (record.timestamps.length === 0) store.delete(key);
  }
}

/**
 * Returns a rate-limiter function for a specific route.
 *
 * @param maxRequests  Maximum allowed requests per window (default: 5)
 * @param windowMs     Window duration in ms (default: 15 minutes)
 */
export function createRateLimiter(maxRequests = 5, windowMs = 15 * 60 * 1000) {
  /**
   * Call at the top of your route handler.
   * Returns `null` if the request is allowed, or a 429 NextResponse to return.
   */
  return function checkRateLimit(req: Request): NextResponse | null {
    evictStale(windowMs);

    // Use forwarded IP (Vercel sets x-forwarded-for), fall back to generic key
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded?.split(",")[0]?.trim() || "unknown";

    const now = Date.now();
    const cutoff = now - windowMs;

    let record = store.get(ip);
    if (!record) {
      record = { timestamps: [] };
      store.set(ip, record);
    }

    record.timestamps = record.timestamps.filter((t) => t > cutoff);

    if (record.timestamps.length >= maxRequests) {
      const retryAfterSec = Math.ceil(
        (record.timestamps[0]! + windowMs - now) / 1000
      );
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    record.timestamps.push(now);
    return null;
  };
}
