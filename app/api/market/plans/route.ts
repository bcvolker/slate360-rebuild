import { NextRequest, NextResponse } from "next/server";
import { withMarketAuth } from "@/lib/server/api-auth";
import type { AutomationPlan } from "@/components/dashboard/market/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PostgrestError } from "@supabase/supabase-js";

type PlanRow = {
  id: string;
  name: string;
  mode: "practice" | "real";
  budget: number;
  risk_level: AutomationPlan["riskLevel"];
  categories: string[];
  scan_mode: AutomationPlan["scanMode"];
  max_trades_per_day: number;
  max_daily_loss: number;
  max_open_positions: number;
  max_pct_per_trade: number;
  fee_alert_threshold: number;
  cooldown_after_loss_streak: number;
  large_trader_signals: boolean;
  closing_soon_focus: boolean;
  slippage: number;
  minimum_liquidity: number;
  maximum_spread: number;
  fill_policy: AutomationPlan["fillPolicy"];
  exit_rules: AutomationPlan["exitRules"];
  runtime_config: Record<string, unknown> | null;
  is_default: boolean;
  is_archived: boolean;
  created_at: string;
  updated_at: string;
};

function toPlan(row: PlanRow): AutomationPlan {
  return {
    id: row.id,
    name: row.name,
    budget: row.budget,
    riskLevel: row.risk_level,
    categories: row.categories ?? ["General"],
    scanMode: row.scan_mode,
    maxTradesPerDay: row.max_trades_per_day,
    mode: row.mode,
    maxDailyLoss: row.max_daily_loss,
    maxOpenPositions: row.max_open_positions,
    maxPctPerTrade: row.max_pct_per_trade,
    feeAlertThreshold: row.fee_alert_threshold,
    cooldownAfterLossStreak: row.cooldown_after_loss_streak,
    largeTraderSignals: row.large_trader_signals,
    closingSoonFocus: row.closing_soon_focus,
    slippage: row.slippage,
    minimumLiquidity: row.minimum_liquidity,
    maximumSpread: row.maximum_spread,
    fillPolicy: row.fill_policy,
    exitRules: row.exit_rules,
    isDefault: row.is_default,
    isArchived: row.is_archived,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(plan: AutomationPlan, userId: string) {
  return {
    id: plan.id,
    user_id: userId,
    name: plan.name,
    mode: plan.mode,
    budget: plan.budget,
    risk_level: plan.riskLevel,
    categories: plan.categories,
    scan_mode: plan.scanMode,
    max_trades_per_day: plan.maxTradesPerDay,
    max_daily_loss: plan.maxDailyLoss,
    max_open_positions: plan.maxOpenPositions,
    max_pct_per_trade: plan.maxPctPerTrade,
    fee_alert_threshold: plan.feeAlertThreshold,
    cooldown_after_loss_streak: plan.cooldownAfterLossStreak,
    large_trader_signals: plan.largeTraderSignals,
    closing_soon_focus: plan.closingSoonFocus,
    slippage: plan.slippage,
    minimum_liquidity: plan.minimumLiquidity,
    maximum_spread: plan.maximumSpread,
    fill_policy: plan.fillPolicy,
    exit_rules: plan.exitRules,
    runtime_config: {},
    is_default: plan.isDefault,
    is_archived: plan.isArchived,
  };
}

function isMissingPlansSchema(error: PostgrestError | null) {
  return error?.code === "42P01" || error?.code === "PGRST205" || error?.message?.includes("market_plans") === true;
}

async function unsetOtherDefaults(admin: ReturnType<typeof createAdminClient>, userId: string, excludeId?: string) {
  let query = admin.from("market_plans").update({ is_default: false }).eq("user_id", userId).eq("is_default", true);
  if (excludeId) query = query.neq("id", excludeId);
  await query;
}

export const GET = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const { data, error } = await admin
      .from("market_plans")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (isMissingPlansSchema(error)) return NextResponse.json({ plans: [], degraded: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plans: (data ?? []).map((row) => toPlan(row as PlanRow)) });
  });

export const POST = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const body = await req.json() as AutomationPlan;
    if (!body.name?.trim()) return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    if (body.isDefault) await unsetOtherDefaults(admin, user.id);

    const { data, error } = await admin
      .from("market_plans")
      .insert(toRow(body, user.id))
      .select("*")
      .single();

    if (isMissingPlansSchema(error)) return NextResponse.json({ plan: body, degraded: true }, { status: 201 });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: toPlan(data as PlanRow) }, { status: 201 });
  });

export const PATCH = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const body = await req.json() as AutomationPlan;
    if (!body.id) return NextResponse.json({ error: "Plan id is required" }, { status: 400 });
    if (!body.name?.trim()) return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    if (body.isDefault) await unsetOtherDefaults(admin, user.id, body.id);

    const { data, error } = await admin
      .from("market_plans")
      .update(toRow(body, user.id))
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (isMissingPlansSchema(error)) return NextResponse.json({ plan: body, degraded: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ plan: toPlan(data as PlanRow) });
  });

export const DELETE = (req: NextRequest) =>
  withMarketAuth(req, async ({ admin, user }) => {
    const id = new URL(req.url).searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Plan id is required" }, { status: 400 });

    const { error } = await admin.from("market_plans").delete().eq("id", id).eq("user_id", user.id);
    if (isMissingPlansSchema(error)) return NextResponse.json({ ok: true, degraded: true });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  });