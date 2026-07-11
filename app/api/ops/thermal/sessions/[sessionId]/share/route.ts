import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, serverError } from "@/lib/server/api-response";
import { APP_URL } from "@/lib/email";

export const runtime = "nodejs";

type Params = { params: Promise<{ sessionId: string }> };

/** S7.5 saved-deliverables home: lists this session's share links (create/revoke already exist). */
export const GET = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { sessionId } = await params;
    let q = admin
      .from("thermal_analysis_share_tokens")
      .select("id, token, role, label, expires_at, max_views, view_count, is_revoked, last_viewed_at, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false });
    if (orgId) q = q.eq("org_id", orgId);
    const { data, error } = await q;
    if (error) return serverError(error.message);
    const links = (data ?? []).map((row) => ({ ...row, url: `${APP_URL}/share/thermal/${row.token}` }));
    return ok({ links });
  });
