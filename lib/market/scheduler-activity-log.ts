import { createAdminClient } from "@/lib/supabase/admin";

type AdminClient = ReturnType<typeof createAdminClient>;

export async function logSchedulerSkip(
  admin: AdminClient,
  userId: string,
  skipReason: string,
  details: {
    dailyPnl: number;
    dailyLossCap: number;
    totalLossCap: number;
    totalPnl: number;
  },
): Promise<void> {
  try {
    await admin.from("market_activity_log").insert({
      user_id: userId,
      level: "warn",
      message: `Scheduler skipped: ${skipReason}`,
      context: details,
    });
  } catch {
    // best effort only
  }
}

export async function logSchedulerNoDecisions(
  admin: AdminClient,
  userId: string,
  details: {
    scoredCount: number;
    botRiskLevel: string;
    focusAreas: string[];
    maxTradesPerScan: number;
    maxPositionUsd: number;
    dailyPnl: number;
    maxDailyLoss: number;
  },
): Promise<void> {
  try {
    await admin.from("market_activity_log").insert({
      user_id: userId,
      level: "warn",
      message: `Scheduler found ${details.scoredCount} scored opportunities but 0 passed trade filters. Check confidence thresholds, focus areas, or portfolio mix.`,
      context: details,
    });
  } catch {
    // best effort only
  }
}

export async function logSchedulerRunSummary(
  admin: AdminClient,
  userId: string,
  details: {
    scoredCount: number;
    decisionCount: number;
    executedCount: number;
    buysPerDay: number;
    runFrequencySeconds: number;
    moonshotMode: boolean;
    dailyPnl: number;
    totalPnl: number;
  },
): Promise<void> {
  try {
    await admin.from("market_activity_log").insert({
      user_id: userId,
      level: "info",
      message: `Scheduler run: found ${details.scoredCount} opportunities, decided ${details.decisionCount}, executed ${details.executedCount} paper trades.`,
      context: {
        buysPerDay: details.buysPerDay,
        runFrequencySeconds: details.runFrequencySeconds,
        moonshotMode: details.moonshotMode,
        dailyPnl: details.dailyPnl,
        totalPnl: details.totalPnl,
      },
    });
  } catch {
    // best effort only
  }
}