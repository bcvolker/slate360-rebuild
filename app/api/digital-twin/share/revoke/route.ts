import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";
import { resolveDigitalTwinEntitlement } from "@/lib/twin/processing-entitlement";

type RevokePayload = {
  token: string;
};

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const entitlement = await resolveDigitalTwinEntitlement(admin, {
      userId: user.id,
      userEmail: user.email,
      orgId,
    });
    if (!entitlement.allowed) return forbidden("Digital Twin access required");

    const body = (await req.json().catch(() => null)) as RevokePayload | null;
    if (!body?.token) return badRequest("token is required");

    const { data: existing, error: fetchError } = await admin
      .from("digital_twin_share_tokens")
      .select("id, token, is_revoked")
      .eq("token", body.token)
      .eq("org_id", orgId)
      .maybeSingle();

    if (fetchError) return serverError(fetchError.message);
    if (!existing) return notFound("Share token not found");
    if (existing.is_revoked) {
      return ok({ token: existing.token, revoked: true });
    }

    const { data, error } = await admin
      .from("digital_twin_share_tokens")
      .update({ is_revoked: true })
      .eq("id", existing.id)
      .eq("org_id", orgId)
      .select("token, is_revoked")
      .single();

    if (error) return serverError(error.message);
    return ok({ token: data.token, revoked: data.is_revoked });
  });
