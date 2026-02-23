import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

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
};

async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { supabase, user };
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
  return null;
}

export async function GET() {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data, error } = await supabase
      .from("market_directives")
      .select("id,name,amount,timeframe,buys_per_day,risk_mix,whale_follow,focus_areas,profit_strategy,paper_mode,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ directives: data ?? [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to fetch directives" },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, user } = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as DirectivePayload;
    const validationError = validateDirectiveInput(body);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const payload = {
      user_id: user.id,
      name: body.name!.trim(),
      amount: body.amount!,
      timeframe: body.timeframe!,
      buys_per_day: body.buys_per_day!,
      risk_mix: body.risk_mix!,
      whale_follow: Boolean(body.whale_follow),
      focus_areas: body.focus_areas!,
      profit_strategy: body.profit_strategy!,
      paper_mode: body.paper_mode !== false,
    };

    const { data, error } = await supabase
      .from("market_directives")
      .insert(payload)
      .select("id,name,amount,timeframe,buys_per_day,risk_mix,whale_follow,focus_areas,profit_strategy,paper_mode,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ directive: data }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create directive" },
      { status: 500 },
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
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

    const { data, error } = await supabase
      .from("market_directives")
      .update({
        name: body.name!.trim(),
        amount: body.amount!,
        timeframe: body.timeframe!,
        buys_per_day: body.buys_per_day!,
        risk_mix: body.risk_mix!,
        whale_follow: Boolean(body.whale_follow),
        focus_areas: body.focus_areas!,
        profit_strategy: body.profit_strategy!,
        paper_mode: body.paper_mode !== false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.id)
      .eq("user_id", user.id)
      .select("id,name,amount,timeframe,buys_per_day,risk_mix,whale_follow,focus_areas,profit_strategy,paper_mode,created_at")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ directive: data });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update directive" },
      { status: 500 },
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
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