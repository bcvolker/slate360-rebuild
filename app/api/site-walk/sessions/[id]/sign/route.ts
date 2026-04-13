/**
 * POST /api/site-walk/sessions/[id]/sign — capture client/inspector signature
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

type SignPayload = {
  client_signature_s3_key?: string;
  inspector_signature_s3_key?: string;
};

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json()) as SignPayload;
    if (!body.client_signature_s3_key && !body.inspector_signature_s3_key) {
      return badRequest("At least one signature key required");
    }

    const updates: Record<string, unknown> = {
      signed_at: new Date().toISOString(),
      signed_by: user.id,
    };
    if (body.client_signature_s3_key) updates.client_signature_s3_key = body.client_signature_s3_key;
    if (body.inspector_signature_s3_key) updates.inspector_signature_s3_key = body.inspector_signature_s3_key;

    const { data, error } = await admin
      .from("site_walk_sessions")
      .update(updates)
      .eq("id", id)
      .eq("org_id", orgId)
      .select()
      .single();

    if (error) return serverError(error.message);
    if (!data) return notFound("Session not found");
    return ok({ session: data });
  });
