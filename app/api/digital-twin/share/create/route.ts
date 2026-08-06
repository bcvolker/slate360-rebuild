import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, notFound, serverError } from "@/lib/server/api-response";
import { APP_URL } from "@/lib/email";
import { resolveDigitalTwinEntitlement } from "@/lib/twin/processing-entitlement";

type CreatePayload = {
  space_id: string;
  role?: "view" | "annotate" | "download";
  label?: string;
  expires_at?: string | null;
  max_views?: number | null;
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

    const body = (await req.json().catch(() => null)) as CreatePayload | null;
    if (!body?.space_id) return badRequest("space_id is required");

    const { data: space, error: spaceError } = await admin
      .from("digital_twin_spaces")
      .select("id, org_id, title")
      .eq("id", body.space_id)
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .maybeSingle();

    if (spaceError) return serverError(spaceError.message);
    if (!space) return notFound("Twin space not found");

    // F4: capture the org's branding AT MINT (thermal's pattern) — the share
    // page renders from this snapshot, so later org-branding edits don't
    // silently restyle links a client already sent onward. logoKey is the R2
    // key (organizations.deliverable_logo_s3_key); the page signs it at render.
    const { data: org } = await admin
      .from("organizations")
      .select("name, deliverable_logo_s3_key")
      .eq("id", orgId)
      .maybeSingle();

    const token = randomBytes(24).toString("base64url");
    const role = body.role ?? "view";

    const { data: shareRow, error: insertError } = await admin
      .from("digital_twin_share_tokens")
      .insert({
        token,
        org_id: orgId,
        space_id: space.id,
        created_by: user.id,
        role,
        label: body.label ?? space.title,
        expires_at: body.expires_at ?? null,
        max_views: body.max_views ?? null,
        is_revoked: false,
        branding_snapshot: {
          orgName: org?.name ?? null,
          logoKey: org?.deliverable_logo_s3_key ?? null,
        },
      })
      .select("token, role, expires_at, max_views")
      .single();

    if (insertError) return serverError(insertError.message);

    const shareUrl = `${APP_URL}/share/twin/${shareRow.token}`;
    return ok({
      token: shareRow.token,
      share_url: shareUrl,
      role: shareRow.role,
      expires_at: shareRow.expires_at,
      max_views: shareRow.max_views,
    });
  });
