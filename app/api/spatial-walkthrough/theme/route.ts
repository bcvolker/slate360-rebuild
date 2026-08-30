import { NextRequest } from "next/server";
import { withSpatialWalkthroughAuth } from "@/lib/spatial-walkthrough/access";
import { ok, unauthorized, serverError } from "@/lib/server/api-response";
import { resolveOrgEntitlements } from "@/lib/server/org-feature-flags";
import { resolveBrandTheme, normalizeHex } from "@/lib/spatial-walkthrough/theme";

export const runtime = "nodejs";

export const GET = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const { data } = await admin.from("spatial_org_themes").select("*").eq("org_id", orgId).maybeSingle();
    const entitlements = await resolveOrgEntitlements(orgId);
    return ok({
      theme: resolveBrandTheme({
        org: data
          ? {
              logoUrl: data.logo_display_key || data.logo_key,
              primaryColor: data.primary_color,
              secondaryColor: data.secondary_color,
              accentColor: data.accent_color,
              pageBgColor: data.page_bg_color,
              surfaceColor: data.surface_color,
              textColor: data.text_color,
              mutedTextColor: data.muted_text_color,
              logoTreatment: data.logo_treatment,
              showPoweredBy: data.show_powered_by,
            }
          : {},
        canHidePoweredBy: entitlements.canWhiteLabel,
      }),
      row: data,
    });
  }, "view");

export const PUT = (req: NextRequest) =>
  withSpatialWalkthroughAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return unauthorized("Organization required");
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const payload = {
      org_id: orgId,
      primary_color: normalizeHex(String(body?.primaryColor ?? "")) ,
      secondary_color: normalizeHex(String(body?.secondaryColor ?? "")),
      accent_color: normalizeHex(String(body?.accentColor ?? "")),
      page_bg_color: normalizeHex(String(body?.pageBgColor ?? "")),
      surface_color: normalizeHex(String(body?.surfaceColor ?? "")),
      text_color: normalizeHex(String(body?.textColor ?? "")),
      muted_text_color: normalizeHex(String(body?.mutedTextColor ?? "")),
      logo_treatment: body?.logoTreatment === "light" || body?.logoTreatment === "dark" ? body.logoTreatment : "auto",
      show_powered_by: body?.showPoweredBy !== false,
    };
    const { data, error } = await admin.from("spatial_org_themes").upsert(payload).select("*").single();
    if (error) return serverError(error.message);
    return ok({ theme: data });
  }, "author");
