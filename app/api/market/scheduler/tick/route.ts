import { NextRequest, NextResponse } from "next/server";
import { runMarketSchedulerTick } from "@/lib/market/scheduler";
import { createAdminClient } from "@/lib/supabase/admin";

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
  const cronExpected = process.env.CRON_SECRET;
  if (!expected && !cronExpected) return false;

  const authHeader = req.headers.get("authorization") ?? "";
  const bearer = authHeader.startsWith("Bearer ") ? authHeader.slice("Bearer ".length).trim() : "";
  const headerSecret = req.headers.get("x-market-scheduler-secret") ?? "";

  return bearer === expected || headerSecret === expected || bearer === cronExpected || headerSecret === cronExpected;
}

async function acquireSchedulerLock(nowIso: string, lockSeconds = 270): Promise<{ acquired: boolean; lockId: string }> {
  const admin = createAdminClient();
  const lockId = `tick-${Date.now()}`;
  try {
    await admin.from("market_scheduler_lock").upsert(
      {
        lock_key: "global",
        locked_until: "epoch",
        locked_by: null,
        updated_at: nowIso,
      },
      { onConflict: "lock_key" },
    );

    const lockUntil = new Date(Date.now() + lockSeconds * 1000).toISOString();
    const { data, error } = await admin
      .from("market_scheduler_lock")
      .update({ locked_until: lockUntil, locked_by: lockId, updated_at: nowIso })
      .eq("lock_key", "global")
      .lt("locked_until", nowIso)
      .select("lock_key")
      .maybeSingle();

    if (error) {
      return { acquired: false, lockId };
    }
    return { acquired: Boolean(data), lockId };
  } catch {
    // If the lock table is not migrated yet, allow execution (old behavior).
    return { acquired: true, lockId };
  }
}

async function releaseSchedulerLock(lockId: string) {
  const admin = createAdminClient();
  try {
    await admin
      .from("market_scheduler_lock")
      .update({ locked_until: new Date().toISOString(), locked_by: null, updated_at: new Date().toISOString() })
      .eq("lock_key", "global")
      .eq("locked_by", lockId);
  } catch {
    // best effort
  }
}

export async function POST(req: NextRequest) {
  if (!hasValidSecret(req)) {
    return unauthorized();
  }

  const nowIso = new Date().toISOString();
  const lock = await acquireSchedulerLock(nowIso);
  if (!lock.acquired) {
    return NextResponse.json(
      {
        ok: true,
        data: {
          skipped: true,
          reason: "tick_locked",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
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
  } finally {
    await releaseSchedulerLock(lock.lockId);
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
