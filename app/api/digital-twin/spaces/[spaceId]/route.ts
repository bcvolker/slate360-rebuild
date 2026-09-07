import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";
import { resolveDigitalTwinEntitlement } from "@/lib/twin/processing-entitlement";

export const runtime = "nodejs";

export const PATCH = (
  req: NextRequest,
  { params }: { params: Promise<{ spaceId: string }> },
) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { spaceId } = await params;
    if (!spaceId) return badRequest("spaceId is required");

    const entitlement = await resolveDigitalTwinEntitlement(admin, {
      userId: user.id,
      userEmail: user.email,
      orgId,
    });
    if (!entitlement.allowed) return forbidden("Digital Twin access required");

    const body = (await req.json().catch(() => null)) as { title?: string } | null;
    const title = body?.title?.trim();
    if (!title || title.length > 80) return badRequest("title is required");

    const { data: space, error } = await admin
      .from("digital_twin_spaces")
      .update({ title })
      .eq("id", spaceId)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .select("id, title")
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!space) return notFound("Space not found");
    return ok({ space });
  });
