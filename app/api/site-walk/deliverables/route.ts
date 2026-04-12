/**
 * GET  /api/site-walk/deliverables?session_id=...  — list deliverables for a session
 * POST /api/site-walk/deliverables                 — create a new deliverable
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type {
  CreateDeliverablePayload,
  SiteWalkDeliverableType,
} from "@/lib/types/site-walk";

const VALID_TYPES: SiteWalkDeliverableType[] = [
  "report",
  "punchlist",
  "photo_log",
  "custom",
];

export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) return badRequest("session_id is required");
    if (!orgId) return badRequest("Organization context required");

    const { data, error } = await admin
      .from("site_walk_deliverables")
      .select("*")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (error) return serverError(error.message);
    return ok({ deliverables: data });
  });

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as CreateDeliverablePayload;
    if (!body.session_id) return badRequest("session_id is required");
    if (!body.deliverable_type || !VALID_TYPES.includes(body.deliverable_type)) {
      return badRequest(`deliverable_type must be one of: ${VALID_TYPES.join(", ")}`);
    }

    // Verify the session exists and belongs to this org
    const { data: session } = await admin
      .from("site_walk_sessions")
      .select("id")
      .eq("id", body.session_id)
      .eq("org_id", orgId)
      .single();

    if (!session) return badRequest("Session not found or access denied");

    const { data, error } = await admin
      .from("site_walk_deliverables")
      .insert({
        session_id: body.session_id,
        org_id: orgId,
        created_by: user.id,
        title: body.title?.trim() || "Untitled Report",
        deliverable_type: body.deliverable_type,
        status: "draft",
        content: body.content ?? [],
      })
      .select()
      .single();

    if (error) return serverError(error.message);
    return ok({ deliverable: data });
  });
