import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

// GET /api/market/tab-prefs — load saved tab order/visibility
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, user }) => {
    const { data, error } = await admin
      .from("market_tab_prefs")
      .select("tabs")
      .eq("user_id", user.id)
      .maybeSingle();
    if (error) return serverError(error.message);
    return ok({ tabs: data?.tabs ?? null });
  });

// POST /api/market/tab-prefs — upsert tab preferences
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user }) => {
    let body: unknown;
    try { body = await req.json(); } catch { return badRequest("Invalid JSON"); }
    const record = body as Record<string, unknown>;
    if (!Array.isArray(record.tabs)) return badRequest("tabs must be an array");

    const tabs = (record.tabs as unknown[]).map((t) => {
      const tab = t as Record<string, unknown>;
      return {
        id: String(tab.id ?? ""),
        label: String(tab.label ?? tab.id ?? ""),
        visible: Boolean(tab.visible !== false),
      };
    });

    const { error } = await admin.from("market_tab_prefs").upsert(
      { user_id: user.id, tabs },
      { onConflict: "user_id" }
    );
    if (error) return serverError(error.message);
    return ok({ saved: true });
  });
