import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";
import { resolveDigitalTwinEntitlement } from "@/lib/twin/processing-entitlement";

export const runtime = "nodejs";

/**
 * F4 — list a space's share links so the Deliver tab can manage them.
 * Until now revoke only worked on a token held in the creating session's
 * state; a link minted last week was unmanageable. Same entitlement gate
 * as share/create and share/revoke.
 */
export const GET = (req: NextRequest, ctx: { params: Promise<{ spaceId: string }> }) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const entitlement = await resolveDigitalTwinEntitlement(admin, {
      userId: user.id,
      userEmail: user.email,
      orgId,
    });
    if (!entitlement.allowed) return forbidden("Digital Twin access required");

    const { spaceId } = await ctx.params;

    const { data: space, error: spaceError } = await admin
      .from("digital_twin_spaces")
      .select("id")
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();
    if (spaceError) return serverError(spaceError.message);
    if (!space) return notFound("Twin space not found");

    const { data: tokens, error } = await admin
      .from("digital_twin_share_tokens")
      .select("token, role, label, expires_at, max_views, view_count, is_revoked, created_at, last_viewed_at")
      .eq("space_id", spaceId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return serverError(error.message);

    return ok({ tokens: tokens ?? [] });
  });
