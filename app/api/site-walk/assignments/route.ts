/**
 * GET  /api/site-walk/assignments?session_id=...  — list assignments for a session
 * POST /api/site-walk/assignments                 — create an assignment
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { CreateAssignmentPayload, AssignmentPriority } from "@/lib/types/site-walk";
import { notifyAssignment } from "@/lib/site-walk/notify-assignment";

const VALID_PRIORITIES: AssignmentPriority[] = ["low", "medium", "high", "critical"];

export const GET = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    const sessionId = req.nextUrl.searchParams.get("session_id");
    if (!sessionId) return badRequest("session_id is required");
    if (!orgId) return badRequest("Organization context required");

    const assignedTo = req.nextUrl.searchParams.get("assigned_to");
    let query = admin
      .from("site_walk_assignments")
      .select("*")
      .eq("session_id", sessionId)
      .eq("org_id", orgId)
      .order("created_at", { ascending: false });

    if (assignedTo) query = query.eq("assigned_to", assignedTo);

    const { data, error } = await query;
    if (error) return serverError(error.message);
    return ok({ assignments: data });
  });

export const POST = (req: NextRequest) =>
  withAppAuth("punchwalk", req, async ({ admin, user, orgId }) => {
    if (!orgId) return badRequest("Organization context required");

    const body = (await req.json()) as CreateAssignmentPayload;
    if (!body.session_id) return badRequest("session_id is required");
    if (!body.assigned_to) return badRequest("assigned_to is required");
    if (!body.title?.trim()) return badRequest("title is required");

    if (body.priority && !VALID_PRIORITIES.includes(body.priority)) {
      return badRequest(`priority must be one of: ${VALID_PRIORITIES.join(", ")}`);
    }

    // Verify the session belongs to this org
    const { data: session } = await admin
      .from("site_walk_sessions")
      .select("id")
      .eq("id", body.session_id)
      .eq("org_id", orgId)
      .single();
    if (!session) return badRequest("Session not found or access denied");

    const { data, error } = await admin
      .from("site_walk_assignments")
      .insert({
        org_id: orgId,
        session_id: body.session_id,
        item_id: body.item_id ?? null,
        assigned_by: user.id,
        assigned_to: body.assigned_to,
        title: body.title.trim(),
        description: body.description ?? null,
        priority: body.priority ?? "medium",
        status: "pending",
        due_date: body.due_date ?? null,
      })
      .select()
      .single();

    if (error) return serverError(error.message);

    // Fire-and-forget assignment notification
    void notifyAssignment({
      kind: "task",
      sessionId: body.session_id,
      assigneeUserId: body.assigned_to,
      assignerUserId: user.id,
      title: body.title.trim(),
      message: body.description ?? null,
      priority: body.priority ?? "medium",
      dueDate: body.due_date ?? null,
      itemId: body.item_id ?? null,
    });

    return ok({ assignment: data });
  });
