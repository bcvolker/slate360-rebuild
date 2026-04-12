/**
 * GET  /api/site-walk/sessions?project_id=...  — list sessions for a project
 * POST /api/site-walk/sessions                 — create a new session
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { CreateSessionPayload } from "@/lib/types/site-walk";

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const projectId = req.nextUrl.searchParams.get("project_id");
    if (!projectId) return badRequest("project_id is required");
    if (!orgId) return badRequest("Organization context required");

    const { data, error } = await admin
      .from("site_walk_sessions")
      .select("*")
      .eq("org_id", orgId)
      .eq("project_id", projectId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ sessions: data });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as CreateSessionPayload;
    if (!body.project_id) return badRequest("project_id is required");
    if (!body.title?.trim()) return badRequest("title is required");

    const { data, error } = await admin
      .from("site_walk_sessions")
      .insert({
        org_id: orgId,
        project_id: body.project_id,
        created_by: user.id,
        title: body.title.trim(),
        status: "draft",
        metadata: body.metadata ?? {},
      })
      .select()
      .single();

    if (error) return serverError(error.message);
    return ok({ session: data });
  });
