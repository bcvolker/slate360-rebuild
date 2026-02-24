import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { ApiEnvelope } from "@/lib/market/contracts";

const VALID_STATUSES = new Set(["running", "paused", "stopped", "paper"]);

export const dynamic = "force-dynamic";
export const revalidate = 0;

function noStoreJson<T>(body: ApiEnvelope<T>, init?: { status?: number }) {
  return NextResponse.json(body, {
    status: init?.status,
    headers: { "Cache-Control": "no-store" },
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });

  const { status } = await req.json();
  const normalizedStatus = String(status ?? "").trim().toLowerCase();
  if (!VALID_STATUSES.has(normalizedStatus)) {
    return noStoreJson({ ok: false, error: { code: "invalid_status", message: "Invalid status" } }, { status: 400 });
  }

  const { error } = await supabase
    .from("market_bot_runtime")
    .upsert({ user_id: user.id, status: normalizedStatus, updated_at: new Date().toISOString() }, { onConflict: "user_id" });

  if (error) {
    console.error("[market/bot-status] Error updating bot status:", error);
    return noStoreJson({ ok: false, error: { code: "bot_status_update_failed", message: "Failed to update bot status" } }, { status: 500 });
  }

  return noStoreJson({ ok: true, data: { status: normalizedStatus } });
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return noStoreJson({ ok: false, error: { code: "unauthorized", message: "Unauthorized" } }, { status: 401 });

  const { data, error } = await supabase
    .from("market_bot_runtime")
    .select("status")
    .eq("user_id", user.id)
    .single();

  if (error && error.code !== "PGRST116") { // PGRST116 is "no rows returned"
    console.error("[market/bot-status] Error fetching bot status:", error);
    return noStoreJson({ ok: false, error: { code: "bot_status_fetch_failed", message: "Failed to fetch bot status" } }, { status: 500 });
  }

  const status = VALID_STATUSES.has(String(data?.status ?? "").toLowerCase())
    ? String(data?.status).toLowerCase()
    : "stopped";
  return noStoreJson({ ok: true, data: { status } });
}
