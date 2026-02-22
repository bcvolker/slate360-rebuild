import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { status } = await req.json();
  if (!status) return NextResponse.json({ error: "Status required" }, { status: 400 });

  const { error } = await supabase
    .from("market_bot_settings")
    .upsert({ user_id: user.id, status, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) {
    console.error("[market/bot-status] Error updating bot status:", error);
    return NextResponse.json({ error: "Failed to update bot status" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("market_bot_settings")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 is "no rows returned"
    console.error("[market/bot-status] Error fetching bot status:", error);
    return NextResponse.json({ error: "Failed to fetch bot status" }, { status: 500 });
  }

  return NextResponse.json({ status: data?.status ?? "stopped" });
}
