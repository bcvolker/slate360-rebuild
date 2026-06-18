/**
 * GET  /api/ceo/content — list marketing content assets
 * POST /api/ceo/content — add a content asset reference
 *
 * Owner/CEO only. Lets marketing surfaces (hero, feature tiles, Learn More) be
 * pointed at new asset URLs without a redeploy.
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { isOwnerEmail } from "@/lib/server/beta-access";

const PLACEMENTS = ["homepage_hero", "feature_tile", "learn_more", "other"] as const;

export const dynamic = "force-dynamic";

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isOwnerEmail(user.email)) return forbidden("CEO access required");
    const { data, error } = await admin
      .from("marketing_content_assets")
      .select("id, placement, label, url, updated_at")
      .order("placement", { ascending: true })
      .order("created_at", { ascending: false });
    if (error) return serverError(error.message);
    return ok({
      assets: (data ?? []).map((a) => ({
        id: a.id,
        placement: a.placement,
        label: a.label,
        url: a.url,
        updatedAt: a.updated_at,
      })),
    });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin }) => {
    if (!isOwnerEmail(user.email)) return forbidden("CEO access required");

    const body = (await req.json().catch(() => ({}))) as {
      placement?: unknown;
      url?: unknown;
      label?: unknown;
    };
    const placement = typeof body.placement === "string" ? body.placement : "";
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const label = typeof body.label === "string" ? body.label.trim() : null;

    if (!(PLACEMENTS as readonly string[]).includes(placement)) {
      return badRequest(`placement must be one of: ${PLACEMENTS.join(", ")}`);
    }
    if (!/^https?:\/\//i.test(url)) {
      return badRequest("url must be an absolute http(s) URL");
    }

    const { data, error } = await admin
      .from("marketing_content_assets")
      .insert({ placement, url, label, updated_by: user.email })
      .select("id, placement, label, url, updated_at")
      .single();
    if (error) return serverError(error.message);
    return ok({
      asset: {
        id: data.id,
        placement: data.placement,
        label: data.label,
        url: data.url,
        updatedAt: data.updated_at,
      },
    });
  });
