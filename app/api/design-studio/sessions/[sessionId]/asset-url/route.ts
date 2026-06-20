import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { resolveDigitalTwinModelUrl } from "@/lib/digital-twin/resolve-model-url";

// GET /api/design-studio/sessions/[sessionId]/asset-url?variantId=...
// Returns a presigned, fetchable URL for the variant's (or session's source) model.
export async function GET(req: NextRequest, ctx: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await ctx.params;
  const variantId = req.nextUrl.searchParams.get("variantId");

  return withAuth(req, async ({ admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    const { data: session } = await admin
      .from("design_sessions")
      .select("id, source_storage_key, source_viewer_kind, source_format")
      .eq("id", sessionId)
      .eq("org_id", orgId)
      .single();
    if (!session) return badRequest("Session not found");

    let storageKey: string | null = session.source_storage_key;
    let format: string | null = session.source_format;

    if (variantId) {
      const { data: variant } = await admin
        .from("design_variants")
        .select("preview_storage_key, final_storage_key, model_format")
        .eq("id", variantId)
        .eq("org_id", orgId)
        .single();
      if (variant) {
        storageKey = variant.final_storage_key ?? variant.preview_storage_key ?? storageKey;
        format = variant.model_format ?? format;
      }
    }

    if (!storageKey) return badRequest("No model available for this session yet");

    try {
      const url = await resolveDigitalTwinModelUrl(storageKey);
      return ok({ url, viewerKind: session.source_viewer_kind, format });
    } catch (e) {
      return serverError(e instanceof Error ? e.message : "Failed to resolve model URL");
    }
  });
}
