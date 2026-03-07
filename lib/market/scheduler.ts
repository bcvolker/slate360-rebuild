import { createAdminClient } from "@/lib/supabase/admin";
import { runForUser, type SchedulerUserResult } from "@/lib/market/scheduler-run-user";
import { getConfig, isoDay, type MarketsPromiseCache } from "@/lib/market/scheduler-utils";

type RuntimeRow = { user_id: string; status: "running" | "paused" | "stopped" | "paper" };

export type SchedulerTickResult = {
  usersConsidered: number;
  usersExecuted: number;
  totalTradesExecuted: number;
  results: SchedulerUserResult[];
  timestamp: string;
};

export async function runMarketSchedulerTick(now = new Date()): Promise<SchedulerTickResult> {
  const admin = createAdminClient();
  const config = getConfig();

  const { data: runtimeRows, error } = await admin
    .from("market_bot_runtime")
    .select("user_id,status")
    .in("status", ["running", "paper"])
    .limit(config.maxUsersPerTick);

  if (error) {
    throw new Error(`Failed to fetch runtime rows: ${error.message}`);
  }

  const rows = (runtimeRows ?? []) as RuntimeRow[];
  const results: SchedulerUserResult[] = [];
  const marketsCache: MarketsPromiseCache = new Map();

  for (let offset = 0; offset < rows.length; offset += config.concurrency) {
    const chunk = rows.slice(offset, offset + config.concurrency);

    const chunkResults = await Promise.all(
      chunk.map(async (row): Promise<SchedulerUserResult> => {
        try {
          return await runForUser(row.user_id, row.status, now, config, marketsCache);
        } catch (err) {
          const message = err instanceof Error ? err.message : "unknown_error";

          await admin.from("market_bot_runtime_state").upsert(
            {
              user_id: row.user_id,
              day_bucket: isoDay(now),
              updated_at: now.toISOString(),
              last_error: message.slice(0, 500),
              last_error_at: now.toISOString(),
            },
            { onConflict: "user_id" },
          );

          return {
            userId: row.user_id,
            status: "error",
            reason: message,
            tradesExecuted: 0,
            decisions: 0,
          };
        }
      }),
    );

    results.push(...chunkResults);
  }

  return {
    usersConsidered: rows.length,
    usersExecuted: results.filter((result) => result.status === "executed").length,
    totalTradesExecuted: results.reduce((sum, result) => sum + result.tradesExecuted, 0),
    results,
    timestamp: now.toISOString(),
  };
}
