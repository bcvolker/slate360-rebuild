import { NextRequest, NextResponse } from "next/server";
import { withMarketAuth } from "@/lib/server/api-auth";
import type { MarketSystemBlocker, MarketSystemStatusViewModel } from "@/lib/market/contracts";
import { resolveUserMaxOpenPositions } from "@/lib/market/user-position-limit";

function isMissingTable(code: string | undefined, message: string | undefined, table: string) {
  return code === "42P01" || code === "PGRST205" || message?.includes(table) === true;
}

function configSourceLabel(source: MarketSystemStatusViewModel["configSource"]) {
  switch (source) {
    case "market_plans": return "Saved plans";
    case "market_directives": return "Legacy directives fallback";
    case "user_metadata": return "Account metadata fallback";
    default: return "Default app settings";
  }
}

export const GET = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const fallbackMaxOpenPositions = Number(process.env.MARKET_MAX_OPEN_POSITIONS) || 25;
    const [plansRes, directivesRes, runtimeRes, stateRes, tradesRes] = await Promise.all([
      admin.from("market_plans").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("is_archived", false),
      admin.from("market_directives").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      admin.from("market_bot_runtime").select("status").eq("user_id", user.id).maybeSingle(),
      admin.from("market_bot_runtime_state").select("runs_today,trades_today,last_run_at,last_error").eq("user_id", user.id).maybeSingle(),
      admin.from("market_trades").select("id", { count: "exact", head: true }).eq("user_id", user.id),
    ]);

    if (plansRes.error && !isMissingTable(plansRes.error.code, plansRes.error.message, "market_plans")) {
      return NextResponse.json({ ok: false, error: { code: "system_status_failed", message: plansRes.error.message } }, { status: 500 });
    }
    if (directivesRes.error && !isMissingTable(directivesRes.error.code, directivesRes.error.message, "market_directives")) {
      return NextResponse.json({ ok: false, error: { code: "system_status_failed", message: directivesRes.error.message } }, { status: 500 });
    }
    if (runtimeRes.error) {
      return NextResponse.json({ ok: false, error: { code: "system_status_failed", message: runtimeRes.error.message } }, { status: 500 });
    }
    if (stateRes.error) {
      return NextResponse.json({ ok: false, error: { code: "system_status_failed", message: stateRes.error.message } }, { status: 500 });
    }
    if (tradesRes.error) {
      return NextResponse.json({ ok: false, error: { code: "system_status_failed", message: tradesRes.error.message } }, { status: 500 });
    }

    const hasRuntimeMetadata = Boolean(
      user.user_metadata &&
      typeof user.user_metadata === "object" &&
      typeof (user.user_metadata as Record<string, unknown>).marketBotConfig === "object",
    );
    const planCount = plansRes.count ?? 0;
    const directiveCount = directivesRes.count ?? 0;
    const { maxOpenPositions: effectiveMaxOpenPositions } = await resolveUserMaxOpenPositions({
      supabase: admin,
      user,
      fallback: fallbackMaxOpenPositions,
    });
    const configSource: MarketSystemStatusViewModel["configSource"] = planCount > 0
      ? "market_plans"
      : directiveCount > 0
        ? "market_directives"
        : hasRuntimeMetadata
          ? "user_metadata"
          : "defaults";

    const missingEnv = [
      ["POLYMARKET_API_KEY", process.env.POLYMARKET_API_KEY],
      ["POLYMARKET_API_SECRET", process.env.POLYMARKET_API_SECRET],
      ["POLYMARKET_API_PASSPHRASE", process.env.POLYMARKET_API_PASSPHRASE],
      ["NEXT_PUBLIC_POLYMARKET_SPENDER", process.env.NEXT_PUBLIC_POLYMARKET_SPENDER],
    ].filter(([, value]) => !value).map(([key]) => key);

    const blockers: MarketSystemBlocker[] = [];
    if (missingEnv.includes("NEXT_PUBLIC_POLYMARKET_SPENDER")) {
      blockers.push({
        code: "missing_spender_env",
        label: "Live wallet approval is blocked",
        detail: "NEXT_PUBLIC_POLYMARKET_SPENDER is missing, so the app cannot check or request USDC allowance for Polymarket.",
        severity: "critical",
      });
    }
    if (missingEnv.some((key) => key !== "NEXT_PUBLIC_POLYMARKET_SPENDER")) {
      blockers.push({
        code: "missing_live_env",
        label: "Live order fallback is still possible",
        detail: `Missing live CLOB env: ${missingEnv.filter((key) => key !== "NEXT_PUBLIC_POLYMARKET_SPENDER").join(", ")}`,
        severity: "warning",
      });
    }
    if (configSource !== "market_plans") {
      blockers.push({
        code: "config_fallback",
        label: "Automation is using a fallback config source",
        detail: configSource === "market_directives"
          ? "Scheduler/scan behavior can still depend on legacy directives instead of only saved plans."
          : configSource === "user_metadata"
            ? "Runtime config is being recovered from account metadata because no saved plan exists."
            : "No saved plan exists, so the robot will rely on default settings until you create one.",
        severity: configSource === "defaults" ? "warning" : "info",
      });
    }
    if (stateRes.data?.last_error) {
      blockers.push({
        code: "last_runtime_error",
        label: "Background automation reported an error",
        detail: String(stateRes.data.last_error),
        severity: "warning",
      });
    }

    const liveEnvReady = missingEnv.length === 0;
    const runtimeStatus = runtimeRes.data?.status ?? "stopped";
    const recommendation = blockers.some((item) => item.severity === "critical")
      ? "Use practice mode and fix the critical blocker before attempting live trading."
      : planCount === 0
        ? "Create a saved plan first, then run one paper scan and confirm the result banner plus Results tab update."
        : runtimeStatus === "stopped"
          ? "Your saved plan exists. Start the robot and verify one immediate scan before relying on background automation."
          : "The system is configured. Verify the latest scan/result trail before increasing risk or trade frequency.";

    const payload: MarketSystemStatusViewModel = {
      configSource,
      configSourceLabel: configSourceLabel(configSource),
      runtimeStatus,
      practiceReady: true,
      liveServerReady: liveEnvReady,
      liveEnvReady,
      planCount,
      effectiveMaxOpenPositions,
      tradeCount: tradesRes.count ?? 0,
      hasLegacyDirective: directiveCount > 0,
      hasRuntimeMetadata,
      runsToday: Number(stateRes.data?.runs_today ?? 0),
      tradesToday: Number(stateRes.data?.trades_today ?? 0),
      lastRunIso: stateRes.data?.last_run_at ? String(stateRes.data.last_run_at) : null,
      blockers,
      recommendation,
    };

    return NextResponse.json({ ok: true, data: payload, meta: { timestamp: new Date().toISOString() } }, { headers: { "Cache-Control": "no-store" } });
  });