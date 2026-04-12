/**
 * GET  /api/site-walk/plans?session_id=... — list plans for a session
 * POST /api/site-walk/plans — create a plan (uploaded floor plan / site map)
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { CreatePlanPayload } from "@/lib/types/site-walk";

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) return badRequest("session_id is required");

    const { data, error } = await admin
      .from("site_walk_plans")
      .select("*")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .order("sort_order", { ascending: true });

    if (error) return serverError(error.message);
    return ok({ plans: data ?? [] });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as CreatePlanPayload;
    if (!body.session_id || !body.title?.trim() || !body.s3_key) {
      return badRequest("session_id, title, and s3_key are required");
    }

    const { data: maxOrder } = await admin
      .from("site_walk_plans")
      .select("sort_order")
      .eq("session_id", body.session_id)
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const { data, error } = await admin
      .from("site_walk_plans")
      .insert({
        session_id: body.session_id,
        org_id: orgId,
        title: body.title.trim(),
        s3_key: body.s3_key,
        file_id: body.file_id ?? null,
        width: body.width ?? 0,
        height: body.height ?? 0,
        sort_order: (maxOrder?.sort_order ?? -1) + 1,
      })
      .select()
      .single();

    if (error) return serverError(error.message);
    return ok({ plan: data }, 201);
  });
