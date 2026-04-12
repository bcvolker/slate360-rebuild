/**
 * GET  /api/site-walk/comments?session_id=...&item_id=...  — list comments
 * POST /api/site-walk/comments                             — create a comment
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { CreateCommentPayload } from "@/lib/types/site-walk";

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) return badRequest("session_id is required");
    if (!orgId) return badRequest("Organization context required");

    let query = admin
      .from("site_walk_comments")
      .select("*")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: true });

    const itemId = req.nextUrl.searchParams.get("item_id");
    if (itemId) {
      query = query.eq("item_id", itemId);
    }

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok({ comments: data });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as CreateCommentPayload;
    if (!body.session_id) return badRequest("session_id is required");
    if (!body.body?.trim()) return badRequest("body is required");

    // Verify the session exists and belongs to this org
    const { data: session } = await admin
      .from("site_walk_sessions")
      .select("id")
      .eq("id", body.session_id)
      .eq("org_id", orgId)
      .single();
    if (!session) return badRequest("Session not found or access denied");

    const { data, error } = await admin
      .from("site_walk_comments")
      .insert({
        org_id: orgId,
        session_id: body.session_id,
        item_id: body.item_id ?? null,
        parent_id: body.parent_id ?? null,
        author_id: user.id,
        body: body.body.trim(),
        is_field: body.is_field ?? false,
        is_escalation: body.is_escalation ?? false,
      })
      .select()
      .single();

    if (error) return serverError(error.message);
    return ok({ comment: data });
  });
