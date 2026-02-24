import { NextRequest, NextResponse } from "next/server";
import { runMarketSchedulerTick } from "@/lib/market/scheduler";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function unauthorized() {
  return NextResponse.json(
    {
      ok: false,
      error: {
        code: "unauthorized",
        message: "Invalid scheduler secret",
      },
    },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
}

function hasValidSecret(req: NextRequest): boolean {
  const expected = process.env.MARKET_SCHEDULER_SECRET;
  if (!expected) return false;

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const headerSecret = req.headers.get("x-market-scheduler-secret") ?? "";

  return bearer === expected || headerSecret === expected;
}

export async function POST(req: NextRequest) {
  if (!hasValidSecret(req)) {
    return unauthorized();
  }

  try {
    const summary = await runMarketSchedulerTick(new Date());
    return NextResponse.json(
      {
        ok: true,
        data: summary,
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: {
          code: "scheduler_tick_failed",
          message: err instanceof Error ? err.message : "Scheduler tick failed",
        },
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}

export async function GET(req: NextRequest) {
  if (!hasValidSecret(req)) {
    return unauthorized();
  }

  return NextResponse.json(
    {
      ok: true,
      data: {
        status: "ready",
        endpoint: "/api/market/scheduler/tick",
        trigger: "POST with Authorization: Bearer <MARKET_SCHEDULER_SECRET>",
      },
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
