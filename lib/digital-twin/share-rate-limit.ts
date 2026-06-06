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

export function createTwinShareRateLimiter(
  prefix: string,
  maxRequests = 15,
  windowSec = 60,
) {
  const limiter = buildLimiter(prefix, maxRequests, windowSec);

  return async function checkTwinShareRate(
    req: Request,
    token: string,
  ): Promise<NextResponse | null> {
    if (!limiter) return null;

    const ip = resolveIp(req);
    const key = `${token}:${ip}`;
    const { success, reset } = await limiter.limit(key);

    if (!success) {
      const retryAfterSec = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
      return NextResponse.json(
        { error: "Too many requests. Please try again later." },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
      );
    }

    return null;
  };
}
