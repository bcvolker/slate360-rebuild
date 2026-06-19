/**
 * Owner-side Q&A on a deliverable (authed).
 *  GET  → the full question/answer thread for a deliverable the owner controls.
 *  POST → post an owner reply (optionally threaded under a viewer question).
 *
 * Mirrors the thermal share Q&A owner flow. Public viewers use the token-gated
 * route at /api/share/deliverable/[token]/questions.
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, notFound, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

export const GET = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const { data: del } = await admin
      .from("site_walk_deliverables")
      .select("id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!del) return notFound("Deliverable not found");

    const { data, error } = await admin
      .from("site_walk_deliverable_questions")
      .select("id, parent_id, author_name, body, is_owner_reply, status, created_at")
      .eq("deliverable_id", id)
      .order("created_at", { ascending: true });
    if (error) return serverError(error.message);

    return ok({ questions: data ?? [] });
  });

export const POST = (req: NextRequest, ctx: IdRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId, user }) => {
    if (!orgId) return badRequest("Organization context required");
    const { id } = await ctx.params;

    const body = (await req.json().catch(() => null)) as {
      body?: string;
      parentId?: string;
    } | null;
    const text = body?.body?.trim();
    if (!text) return badRequest("A reply is required");
    if (text.length > 4000) return badRequest("Reply is too long");

    const { data: del } = await admin
      .from("site_walk_deliverables")
      .select("id, org_id")
      .eq("id", id)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!del) return notFound("Deliverable not found");

    const { data: inserted, error } = await admin
      .from("site_walk_deliverable_questions")
      .insert({
        deliverable_id: id,
        org_id: orgId,
        parent_id: body?.parentId ?? null,
        author_name: user?.email ?? "Owner",
        body: text,
        is_owner_reply: true,
        status: "answered",
      })
      .select("id, parent_id, author_name, body, is_owner_reply, status, created_at")
      .single();
    if (error) return serverError(error.message);

    // Mark the question being answered as resolved.
    if (body?.parentId) {
      await admin
        .from("site_walk_deliverable_questions")
        .update({ status: "answered" })
        .eq("id", body.parentId)
        .eq("deliverable_id", id);
    }

    return ok({ question: inserted });
  });
