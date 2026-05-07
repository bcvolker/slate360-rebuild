/**
 * GET / PUT /api/site-walk/projects/[projectId]/capture-settings
 *
 * Per-project Site Walk capture settings (currently: trade list).
 * Falls back to the built-in CAPTURE_TRADES when no row exists for the project.
 */
import { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { CAPTURE_TRADES } from "@/lib/types/site-walk-capture";

const MAX_TRADES = 60;
const MAX_TRADE_LENGTH = 64;

export const GET = (req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) =>
  withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const { data, error } = await admin
      .from("site_walk_project_capture_settings")
      .select("trade_options")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) return serverError(error.message);

    const stored = Array.isArray(data?.trade_options) ? (data!.trade_options as unknown[]) : [];
    const trades = stored
      .filter((value): value is string => typeof value === "string")
      .map((value) => value.trim())
      .filter(Boolean);

    return ok({
      trades: trades.length > 0 ? trades : [...CAPTURE_TRADES],
      isCustom: trades.length > 0,
    });
  });

export const PUT = (req: NextRequest, ctx: { params: Promise<{ projectId: string }> }) =>
  withProjectAuth(req, ctx, async ({ admin, projectId, user }) => {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }

    const incoming = (body as { trades?: unknown })?.trades;
    if (!Array.isArray(incoming)) return badRequest("trades must be an array of strings");

    const cleaned: string[] = [];
    const seen = new Set<string>();
    for (const value of incoming) {
      if (typeof value !== "string") continue;
      const trimmed = value.trim().slice(0, MAX_TRADE_LENGTH);
      if (!trimmed) continue;
      const key = trimmed.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      cleaned.push(trimmed);
      if (cleaned.length >= MAX_TRADES) break;
    }

    const { error } = await admin
      .from("site_walk_project_capture_settings")
      .upsert(
        {
          project_id: projectId,
          trade_options: cleaned,
          created_by: user.id,
          updated_by: user.id,
        },
        { onConflict: "project_id" },
      );

    if (error) return serverError(error.message);

    return ok({ trades: cleaned });
  });
