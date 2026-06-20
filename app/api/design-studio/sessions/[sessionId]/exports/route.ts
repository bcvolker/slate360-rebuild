import { NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, created, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";

const siteUrl = () =>
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "").replace(/\/$/, "");

// GET /api/design-studio/sessions/[sessionId]/exports — list exports + download/share URLs.
export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  return withAuth(req, async ({ admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return ok({ exports: [] });

    const { data: rows } = await admin
      .from("design_exports")
      .select("*")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    const exports = await Promise.all(
      (rows ?? []).map(async (r) => ({
        ...r,
        downloadUrl: r.storage_key ? await resolveDigitalTwinModelUrl(r.storage_key).catch(() => null) : null,
        shareUrl: r.share_token ? `${siteUrl()}/api/share/design/${r.share_token}` : null,
      })),
    );
    return ok({ exports });
  });
}

// POST /api/design-studio/sessions/[sessionId]/exports — create an export from a variant.
export async function POST(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  return withAuth(req, async ({ user, admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    let body: { variantId?: string; format?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }
    if (!body.variantId) return badRequest("variantId is required");

    const { data: variant } = await admin
      .from("design_variants")
      .select("id, preview_storage_key, final_storage_key, model_format")
      .eq("id", body.variantId)
      .eq("org_id", orgId)
      .single();
    if (!variant) return badRequest("Variant not found");

    const storageKey = variant.final_storage_key ?? variant.preview_storage_key;
    if (!storageKey) return badRequest("Variant has no model to export yet");

    const format = (body.format ?? variant.model_format ?? "glb").toLowerCase();
    try {
      const { data: row, error } = await admin
        .from("design_exports")
        .insert({
          org_id: orgId,
          session_id: sessionId,
          variant_id: variant.id,
          created_by: user.id,
          format,
          storage_key: storageKey,
          status: "ready",
          share_token: randomUUID().replace(/-/g, ""),
          completed_at: new Date().toISOString(),
        })
        .select("*")
        .single();
      if (error || !row) return serverError(error?.message ?? "Failed to create export");

      return created({
        export: {
          ...row,
          downloadUrl: await resolveDigitalTwinModelUrl(storageKey).catch(() => null),
          shareUrl: row.share_token ? `${siteUrl()}/api/share/design/${row.share_token}` : null,
        },
      });
    } catch (e) {
      return serverError(e instanceof Error ? e.message : "Failed to create export");
    }
  });
}
