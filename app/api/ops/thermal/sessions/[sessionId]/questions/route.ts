import { NextRequest } from "next/server";
import { withThermalOpsAuth } from "@/lib/thermal/access";
import { ok, badRequest, serverError } from "@/lib/server/api-response";

export const runtime = "nodejs";

type Params = { params: Promise<{ sessionId: string }> };

/** CEO view of stakeholder questions for a session, and posting replies. */
export const GET = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId }) => {
    const { sessionId } = await params;
    let q = admin
      .from("thermal_analysis_share_questions")
      .select("id, parent_id, author_name, author_email, body, is_owner_reply, status, capture_id, created_at")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: true });
    if (orgId) q = q.eq("org_id", orgId);
    const { data, error } = await q;
    if (error) return serverError(error.message);
    return ok({ questions: data ?? [] });
  });

export const POST = (req: NextRequest, { params }: Params) =>
  withThermalOpsAuth(req, async ({ admin, orgId, user }) => {
    const { sessionId } = await params;
    const body = (await req.json().catch(() => null)) as {
      body?: string;
      parentId?: string;
      status?: string;
    } | null;

    // Status-only update (acknowledge / resolve) on an existing question.
    if (body?.status && body.parentId) {
      const { error } = await admin
        .from("thermal_analysis_share_questions")
        .update({ status: body.status, updated_at: new Date().toISOString() })
        .eq("id", body.parentId)
        .eq("session_id", sessionId);
      if (error) return serverError(error.message);
      return ok({ updated: true });
    }

    const text = body?.body?.trim();
    if (!text) return badRequest("A reply is required");

    const { data: inserted, error } = await admin
      .from("thermal_analysis_share_questions")
      .insert({
        session_id: sessionId,
        org_id: orgId,
        parent_id: body?.parentId ?? null,
        author_name: user.email ?? "Inspector",
        body: text,
        is_owner_reply: true,
        status: "answered",
      })
      .select("id, parent_id, author_name, body, is_owner_reply, status, created_at")
      .single();
    if (error) return serverError(error.message);

    // Mark the question being answered as answered.
    if (body?.parentId) {
      await admin
        .from("thermal_analysis_share_questions")
        .update({ status: "answered", updated_at: new Date().toISOString() })
        .eq("id", body.parentId);
    }

    return ok({ reply: inserted });
  });
