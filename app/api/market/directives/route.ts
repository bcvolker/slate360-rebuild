import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { mergeDirectiveWithRuntime, mergeMarketBotMetadata, type LegacyDirectiveRow } from "@/lib/market/directive-runtime";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { buildRuntimeConfig } from "@/lib/market/runtime-config";

type DirectivePayload = {
  id?: string;
  name?: string;
  amount?: number;
  timeframe?: string;
  buys_per_day?: number;
  risk_mix?: "conservative" | "balanced" | "aggressive";
  whale_follow?: boolean;
  focus_areas?: string[];
  profit_strategy?: "arbitrage" | "market-making" | "whale-copy" | "longshot";
  paper_mode?: boolean;
  daily_loss_cap?: number;
  moonshot_mode?: boolean;
  total_loss_cap?: number;
  auto_pause_losing_days?: number;
  target_profit_monthly?: number | null;
  take_profit_pct?: number;
  stop_loss_pct?: number;
  runtime_config?: Record<string, unknown>;
};

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
}

async function updateMarketRuntimeConfig(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: NonNullable<Awaited<ReturnType<typeof getAuthUser>>["user"]>,
  body: DirectivePayload,
) {
  const runtimeConfig = buildRuntimeConfig({
    ...(body.runtime_config ?? {}),
    capitalAlloc: body.amount,
    maxTradesPerDay: body.buys_per_day,
    paperMode: body.paper_mode !== false,
    focusAreas: body.focus_areas,
    timeframe: body.timeframe,
    dailyLossCap: body.daily_loss_cap,
    moonshotMode: body.moonshot_mode,
    totalLossCap: body.total_loss_cap,
    autoPauseLosingDays: body.auto_pause_losing_days,
    targetProfitMonthly: body.target_profit_monthly,
    takeProfitPct: body.take_profit_pct,
    stopLossPct: body.stop_loss_pct,
  });

  const existingMetadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? (user.user_metadata as Record<string, unknown>)
      : {};

  const { error } = await supabase.auth.updateUser({
    data: mergeMarketBotMetadata(existingMetadata, runtimeConfig),
  });

  return { runtimeConfig, error };
}

function validateDirectiveInput(body: DirectivePayload) {
  if (!body.name || !body.name.trim()) {
    return "Directive name is required";
  }
  if (typeof body.amount !== "number" || Number.isNaN(body.amount) || body.amount <= 0) {
    return "Amount must be a positive number";
  }
  if (!body.timeframe) {
    return "Timeframe is required";
  }
  if (typeof body.buys_per_day !== "number" || Number.isNaN(body.buys_per_day) || body.buys_per_day <= 0) {
    return "Buys per day must be a positive number";
  }
  if (!body.risk_mix) {
    return "Risk mix is required";
  }
  if (!body.profit_strategy) {
    return "Profit strategy is required";
  }
  if (!Array.isArray(body.focus_areas)) {
    return "Focus areas must be an array";
  }
  if (body.daily_loss_cap != null && (Number.isNaN(body.daily_loss_cap) || body.daily_loss_cap <= 0)) {
    return "Daily loss cap must be a positive number";
  }
  if (body.total_loss_cap != null && (Number.isNaN(body.total_loss_cap) || body.total_loss_cap <= 0)) {
    return "Total loss cap must be a positive number";
  }
  if (body.auto_pause_losing_days != null && (Number.isNaN(body.auto_pause_losing_days) || body.auto_pause_losing_days < 1)) {
    return "Auto-pause losing days must be at least 1";
  }
  if (body.take_profit_pct != null && (Number.isNaN(body.take_profit_pct) || body.take_profit_pct <= 0)) {
    return "Take profit must be a positive percent";
  }
  if (body.stop_loss_pct != null && (Number.isNaN(body.stop_loss_pct) || body.stop_loss_pct <= 0)) {
    return "Stop loss must be a positive percent";
  }
  return null;
}

export async function GET() {
  try {
    const access = await resolveServerOrgContext();
    if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!access.canAccessMarket) return NextResponse.json({ error: "Market access required" }, { status: 403 });

    const { supabase, user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("market_directives")
      .select("id,name,amount,timeframe,buys_per_day,risk_mix,whale_follow,focus_areas,profit_strategy,paper_mode,created_at,updated_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      if (error.code === "42P01") {
        return NextResponse.json({ directives: [] });
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const runtimeConfig = buildRuntimeConfig(
      user.user_metadata?.marketBotConfig as Record<string, unknown> | undefined,
    );

    return NextResponse.json({
      directives: ((data ?? []) as LegacyDirectiveRow[]).map((row) => mergeDirectiveWithRuntime(row, runtimeConfig)),
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch directives" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const access = await resolveServerOrgContext();
    if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!access.canAccessMarket) return NextResponse.json({ error: "Market access required" }, { status: 403 });

    const { supabase, user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as DirectivePayload;
    const validationError = validateDirectiveInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { runtimeConfig, error: runtimeConfigError } = await updateMarketRuntimeConfig(supabase, user, body);
    if (runtimeConfigError) {
      return NextResponse.json({ error: runtimeConfigError.message }, { status: 500 });
    }

    const payload = {
      user_id: user.id,
      name: body.name!.trim(),
      amount: body.amount!,
      timeframe: body.timeframe!,
      buys_per_day: body.buys_per_day!,
      risk_mix: body.risk_mix!,
      whale_follow: Boolean(body.whale_follow),
      focus_areas: runtimeConfig.focusAreas,
      profit_strategy: body.profit_strategy!,
      paper_mode: body.paper_mode !== false,
    };

    const { data, error } = await supabase
      .from("market_directives")
      .insert(payload)
      .select("id,name,amount,timeframe,buys_per_day,risk_mix,whale_follow,focus_areas,profit_strategy,paper_mode,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { directive: mergeDirectiveWithRuntime(data as LegacyDirectiveRow, runtimeConfig) },
      { status: 201 },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create directive" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const access = await resolveServerOrgContext();
    if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!access.canAccessMarket) return NextResponse.json({ error: "Market access required" }, { status: 403 });

    const { supabase, user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as DirectivePayload;
    if (!body.id) {
      return NextResponse.json({ error: "Directive id is required" }, { status: 400 });
    }

    const validationError = validateDirectiveInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const { runtimeConfig, error: runtimeConfigError } = await updateMarketRuntimeConfig(supabase, user, body);
    if (runtimeConfigError) {
      return NextResponse.json({ error: runtimeConfigError.message }, { status: 500 });
    }

    const { data, error } = await supabase
      .from("market_directives")
      .update({
        name: body.name!.trim(),
        amount: body.amount!,
        timeframe: body.timeframe!,
        buys_per_day: body.buys_per_day!,
        risk_mix: body.risk_mix!,
        whale_follow: Boolean(body.whale_follow),
        focus_areas: runtimeConfig.focusAreas,
        profit_strategy: body.profit_strategy!,
        paper_mode: body.paper_mode !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("id,name,amount,timeframe,buys_per_day,risk_mix,whale_follow,focus_areas,profit_strategy,paper_mode,created_at,updated_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ directive: mergeDirectiveWithRuntime(data as LegacyDirectiveRow, runtimeConfig) });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update directive" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const access = await resolveServerOrgContext();
    if (!access.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!access.canAccessMarket) return NextResponse.json({ error: "Market access required" }, { status: 403 });

    const { supabase, user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "Directive id is required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("market_directives")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to delete directive" },
      { status: 500 },
    );
  }
}