import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiEnvelope, SchedulerHealthViewModel } from "@/lib/market/contracts";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson<T>(body: ApiEnvelope<T>, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { "Cache-Control": "no-store" },
  });
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseStatus(value: unknown): SchedulerHealthViewModel["status"] {
  const normalized = String(value ?? "").toLowerCase();
  if (normalized === "running" || normalized === "paused" || normalized === "paper") {
    return normalized;
  }
  return "stopped";
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return noStoreJson(
        { ok: false, error: { code: "unauthorized", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const [{ data: runtime }, { data: state }, { data: directive }] = await Promise.all([
      supabase
        .from("market_bot_runtime")
        .select("status,updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("market_bot_runtime_state")
        .select("runs_today,trades_today,last_run_at,last_scan_at,last_error,last_error_at,updated_at")
        .eq("user_id", user.id)
        .maybeSingle(),
      supabase
        .from("market_directives")
        .select("buys_per_day")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const status = parseStatus(runtime?.status);

    const minIntervalSeconds = Number(process.env.MARKET_SCHEDULER_MIN_INTERVAL_SECONDS ?? 30);
    const maxIntervalSeconds = Number(process.env.MARKET_SCHEDULER_MAX_INTERVAL_SECONDS ?? 3600);
    const buysPerDayRaw = Number(directive?.buys_per_day ?? process.env.MARKET_SCHEDULER_DEFAULT_BUYS_PER_DAY ?? 24);

    const buysPerDay = Number.isFinite(buysPerDayRaw) && buysPerDayRaw > 0 ? buysPerDayRaw : 24;
    const intervalFromBuys = Math.floor(86400 / buysPerDay);
    const runFrequencySeconds = clamp(
      Number.isFinite(intervalFromBuys) ? intervalFromBuys : 3600,
      Number.isFinite(minIntervalSeconds) ? Math.max(5, minIntervalSeconds) : 30,
      Number.isFinite(maxIntervalSeconds) ? Math.max(30, maxIntervalSeconds) : 3600,
    );

    const lastRunIso = state?.last_run_at ? String(state.last_run_at) : null;
    const nextEligibleRunIso = (() => {
      if (!lastRunIso) return null;
      const last = new Date(lastRunIso).getTime();
      if (!Number.isFinite(last)) return null;
      return new Date(last + runFrequencySeconds * 1000).toISOString();
    })();

    const payload: SchedulerHealthViewModel = {
      status,
      runsToday: Number(state?.runs_today ?? 0),
      tradesToday: Number(state?.trades_today ?? 0),
      runFrequencySeconds,
      lastRunIso,
      lastScanIso: state?.last_scan_at ? String(state.last_scan_at) : null,
      nextEligibleRunIso,
      lastError: state?.last_error ? String(state.last_error) : null,
      lastErrorAtIso: state?.last_error_at ? String(state.last_error_at) : null,
      updatedAtIso: state?.updated_at ? String(state.updated_at) : runtime?.updated_at ? String(runtime.updated_at) : null,
    };

    return noStoreJson({ ok: true, data: payload, meta: { timestamp: new Date().toISOString() } });
  } catch (err) {
    return noStoreJson(
      {
        ok: false,
        error: {
          code: "scheduler_health_unhandled_error",
          message: err instanceof Error ? err.message : "Failed to fetch scheduler health",
        },
      },
      { status: 500 }
    );
  }
}
