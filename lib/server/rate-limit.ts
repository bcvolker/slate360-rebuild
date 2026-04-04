/**
 * Serverless-safe rate limiter using Upstash Redis.
 *
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 * Falls back to permissive (allow-all) when Upstash is not configured,
 * so local dev is not blocked. Production MUST have Upstash configured.
 */

import { NextResponse } from "next/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

function resolveIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

function buildLimiter(prefix: string, maxRequests: number, windowSec: number) {
  if (!redisUrl || !redisToken) return null;

  return new Ratelimit({
    redis: new Redis({ url: redisUrl, token: redisToken }),
    limiter: Ratelimit.slidingWindow(maxRequests, `${windowSec} s`),
    prefix: `ratelimit:${prefix}`,
    analytics: false,
  });
}

/**
 * Returns an async rate-limiter function for a specific route.
 *
 * @param prefix       Unique namespace for this route (e.g. "auth:signup")
 * @param maxRequests  Maximum allowed requests per window (default: 5)
 * @param windowSec    Window duration in seconds (default: 900 = 15 min)
 */
export function createRateLimiter(
  prefix: string,
  maxRequests = 5,
  windowSec = 900
) {
  const limiter = buildLimiter(prefix, maxRequests, windowSec);

  return async function checkRateLimit(req: Request): Promise<NextResponse | null> {
    if (!limiter) {
      if (process.env.NODE_ENV === "production") {
        console.warn("[rate-limit] Upstash not configured — rate limiting disabled in production!");
      }
      return null;
    }

    const ip = resolveIp(req);
    const { success, reset } = await limiter.limit(ip);

    if (!success) {
      const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    return null;
  };
}
