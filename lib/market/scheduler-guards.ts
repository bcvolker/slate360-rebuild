import { createAdminClient } from "@/lib/supabase/admin";
import { toNumberOrZero } from "@/lib/market/contracts";

type AdminClient = ReturnType<typeof createAdminClient>;

type GuardDirective = {
  auto_pause_losing_days: number | null;
};

type EvaluateSchedulerGuardsInput = {
  admin: AdminClient;
  userId: string;
  now: Date;
  dailyPnl: number;
  dailyLossCap: number;
  totalLossCap: number;
  moonshotMode: boolean;
  targetProfitMonthly: number;
  currentMaxTradesPerScan: number;
  configMaxTradesPerScan: number;
  directive: GuardDirective | null;
};

type EvaluateSchedulerGuardsResult = {
  skipReason: string | null;
  totalPnl: number;
  maxTradesPerScan: number;
};

async function getTotalPnl(admin: AdminClient, userId: string): Promise<number> {
  const { data: totalPnlRows } = await admin.from("market_trades").select("pnl").eq("user_id", userId);
  return (totalPnlRows ?? []).reduce(
    (sum, trade) => sum + toNumberOrZero((trade as { pnl?: unknown }).pnl),
    0,
  );
}

async function shouldAutoPauseForLosingDays(
  admin: AdminClient,
  userId: string,
  now: Date,
  autoPauseLosingDays: number,
): Promise<boolean> {
  const windowStart = new Date(now);
  windowStart.setUTCDate(windowStart.getUTCDate() - autoPauseLosingDays);

  const { data: recentRows } = await admin
    .from("market_trades")
    .select("pnl,created_at")
    .eq("user_id", userId)
    .gte("created_at", windowStart.toISOString());

  const dayBuckets = new Map<string, number>();
  for (const row of recentRows ?? []) {
    const created = String((row as { created_at?: unknown }).created_at ?? "");
    const day = created.slice(0, 10);
    if (!day) continue;
    dayBuckets.set(day, (dayBuckets.get(day) ?? 0) + toNumberOrZero((row as { pnl?: unknown }).pnl));
  }

  const recentDays = [...dayBuckets.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-autoPauseLosingDays);

  return recentDays.length >= autoPauseLosingDays && recentDays.every(([, pnl]) => pnl < 0);
}

async function getMonthPnl(admin: AdminClient, userId: string, now: Date): Promise<number> {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
  const { data: monthRows } = await admin
    .from("market_trades")
    .select("pnl")
    .eq("user_id", userId)
    .gte("created_at", monthStart);

  return (monthRows ?? []).reduce(
    (sum, trade) => sum + toNumberOrZero((trade as { pnl?: unknown }).pnl),
    0,
  );
}

export async function evaluateSchedulerGuards(
  input: EvaluateSchedulerGuardsInput,
): Promise<EvaluateSchedulerGuardsResult> {
  const {
    admin,
    userId,
    now,
    dailyPnl,
    dailyLossCap,
    totalLossCap,
    moonshotMode,
    targetProfitMonthly,
    currentMaxTradesPerScan,
    configMaxTradesPerScan,
    directive,
  } = input;

  if (dailyPnl <= -dailyLossCap) {
    return { skipReason: "daily_loss_cap_reached", totalPnl: 0, maxTradesPerScan: currentMaxTradesPerScan };
  }

  const totalPnl = await getTotalPnl(admin, userId);
  if (totalPnl <= -totalLossCap) {
    await admin
      .from("market_bot_runtime")
      .update({ status: "paused", updated_at: now.toISOString() })
      .eq("user_id", userId);
    return { skipReason: "total_loss_cap_reached", totalPnl, maxTradesPerScan: currentMaxTradesPerScan };
  }

  const autoPauseLosingDays = Math.max(1, Number(directive?.auto_pause_losing_days ?? 3));
  if (autoPauseLosingDays > 0) {
    const shouldPause = await shouldAutoPauseForLosingDays(admin, userId, now, autoPauseLosingDays);
    if (shouldPause) {
      await admin
        .from("market_bot_runtime")
        .update({ status: "paused", updated_at: now.toISOString() })
        .eq("user_id", userId);
      return {
        skipReason: `auto_paused_${autoPauseLosingDays}_losing_days`,
        totalPnl,
        maxTradesPerScan: currentMaxTradesPerScan,
      };
    }
  }

  let maxTradesPerScan = currentMaxTradesPerScan;
  if (targetProfitMonthly > 0 && moonshotMode) {
    const monthPnl = await getMonthPnl(admin, userId, now);
    const remainingTarget = targetProfitMonthly - monthPnl;
    if (remainingTarget > 0) {
      maxTradesPerScan = Math.min(
        configMaxTradesPerScan,
        Math.max(maxTradesPerScan, Math.ceil(maxTradesPerScan * 1.2)),
      );
    }
  }

  return { skipReason: null, totalPnl, maxTradesPerScan };
}
