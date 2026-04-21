/**
 * GET  /api/site-walk/branding/settings — fetch org brand_settings
 * PUT  /api/site-walk/branding/settings — replace brand_settings jsonb
 *
 * Org-scoped, shared across all apps. Logo upload is handled separately
 * by /api/site-walk/branding (multipart) — this endpoint stores text
 * fields and a resolved logo URL.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED = new Set([
  "logo_url", "signature_url", "primary_color",
  "header_html", "footer_html",
  "contact_name", "contact_email", "contact_phone",
  "address", "website",
]);

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ orgId }) => {
    if (!orgId) return badRequest("Organization required");
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("organizations")
      .select("brand_settings")
      .eq("id", orgId)
      .single();
    if (error) return serverError(error.message);
    return ok({ brand_settings: data?.brand_settings ?? {} });
  });

export const PUT = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ orgId }) => {
    if (!orgId) return badRequest("Organization required");
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return badRequest("Body must be a JSON object");
    }
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      if (ALLOWED.has(k)) clean[k] = v;
    }
    const admin = createAdminClient();
    const { error } = await admin
      .from("organizations")
      .update({ brand_settings: clean })
      .eq("id", orgId);
    if (error) return serverError(error.message);
    return ok({ brand_settings: clean });
  });
