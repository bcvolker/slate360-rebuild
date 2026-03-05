/**
 * GET  /api/market/watchlist  — fetch user's watchlist
 * POST /api/market/watchlist  — add a market to watchlist
 * DELETE /api/market/watchlist — remove a market (body: { market_id })
 */
import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, created, badRequest, serverError } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, user }) => {
    const { data, error } = await admin
      .from("market_watchlist")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ watchlist: data ?? [] });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user }) => {
    const body = await req.json() as Record<string, unknown>;
    const { market_id, title, category, yes_price, no_price, probability, notes } = body;

    if (!market_id || typeof market_id !== "string") return badRequest("market_id required");
    if (!title || typeof title !== "string") return badRequest("title required");

    const { data, error } = await admin
      .from("market_watchlist")
      .upsert({
        user_id: user.id,
        market_id,
        title,
        category: category ?? null,
        yes_price: yes_price ?? null,
        no_price: no_price ?? null,
        probability: probability ?? null,
        notes: notes ?? null,
      }, { onConflict: "user_id,market_id" })
      .select()
      .single();

    if (error) return serverError(error.message);
    return created({ item: data });
  });

export const DELETE = (req: NextRequest) =>
  withAuth(req, async ({ admin, user }) => {
    const body = await req.json() as Record<string, unknown>;
    const { market_id } = body;
    if (!market_id) return badRequest("market_id required");

    const { error } = await admin
      .from("market_watchlist")
      .delete()
      .eq("user_id", user.id)
      .eq("market_id", String(market_id));

    if (error) return serverError(error.message);
    return ok({ removed: true });
  });
