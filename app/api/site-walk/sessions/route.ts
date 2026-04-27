/**
 * GET  /api/site-walk/sessions?project_id=...  — list sessions for a project
 * POST /api/site-walk/sessions                 — create a new session
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import {
  SITE_WALK_SESSION_TYPES,
  SITE_WALK_SYNC_STATES,
  type CreateSessionPayload,
} from "@/lib/types/site-walk";

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    const projectId = req.nextUrl.searchParams.get("project_id");
    const isAdHoc = req.nextUrl.searchParams.get("is_ad_hoc") === "true";
    if (!orgId) return badRequest("Organization context required");

    let query = admin
      .from("site_walk_sessions")
      .select("*")
      .eq("org_id", orgId);

    if (projectId) query = query.eq("project_id", projectId);
    else if (isAdHoc) query = query.eq("is_ad_hoc", true);

    const { data, error } = await query
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ sessions: data });
  });

export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as CreateSessionPayload;
    const projectId = body.project_id ?? null;
    const sessionType = body.session_type ?? "general";
    const syncState = body.sync_state ?? "synced";

    if (!SITE_WALK_SESSION_TYPES.includes(sessionType)) {
      return badRequest(`session_type must be one of: ${SITE_WALK_SESSION_TYPES.join(", ")}`);
    }
    if (!SITE_WALK_SYNC_STATES.includes(syncState)) {
      return badRequest(`sync_state must be one of: ${SITE_WALK_SYNC_STATES.join(", ")}`);
    }

    const { data, error } = await admin
      .from("site_walk_sessions")
      .insert({
        org_id: orgId,
        project_id: projectId,
        created_by: user.id,
        title: body.title?.trim() || "Untitled Site Walk",
        status: "draft",
        metadata: body.metadata ?? {},
        is_ad_hoc: body.is_ad_hoc ?? !projectId,
        client_session_id: body.client_session_id ?? null,
        session_type: sessionType,
        sync_state: syncState,
      })
      .select()
      .single();

    if (error) return serverError(error.message);
    return ok({ session: data });
  });
