import { randomBytes } from "crypto";
import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { hashSharePassword } from "@/lib/thermal/share-password";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import { APP_URL } from "@/lib/email";

type CreatePayload = {
  session_id: string;
  role?: "view" | "annotate" | "download";
  label?: string;
  expires_at?: string | null;
  max_views?: number | null;
  password?: string | null;
};

export const POST = (req: NextRequest) =>
  withThermalOpsAuth(req, async ({ user, admin, orgId, req: request }) => {
    const body = (await request.json().catch(() => null)) as CreatePayload | null;
    if (!body?.session_id) return badRequest("session_id is required");

    const { data: session, error: sessionError } = await admin
      .from("thermal_analysis_sessions")
      .select("id, org_id, name, branding_config")
      .eq("id", body.session_id)
      .is("deleted_at", null)
      .maybeSingle();

    if (sessionError) return serverError(sessionError.message);
    if (!session) return notFound("Session not found");
    if (orgId && session.org_id && session.org_id !== orgId) return notFound("Session not found");

    const token = randomBytes(24).toString("base64url");
    const role = body.role ?? "view";
    const password = body.password?.trim();
    const passwordHash = password ? hashSharePassword(password) : null;

    const { data: shareRow, error: insertError } = await admin
      .from("thermal_analysis_share_tokens")
      .insert({
        token,
        org_id: session.org_id ?? orgId,
        session_id: session.id,
        created_by: user.id,
        role,
        label: body.label ?? session.name,
        expires_at: body.expires_at ?? null,
        max_views: body.max_views ?? null,
        is_revoked: false,
        password_hash: passwordHash,
        branding_snapshot: session.branding_config ?? {},
      })
      .select("token, role, expires_at, max_views")
      .single();

    if (insertError) return serverError(insertError.message);

    return ok({
      token: shareRow.token,
      share_url: `${APP_URL}/share/thermal/${shareRow.token}`,
      role: shareRow.role,
      expires_at: shareRow.expires_at,
      max_views: shareRow.max_views,
      password_protected: Boolean(passwordHash),
    });
  });
