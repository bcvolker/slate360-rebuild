/**
 * PATCH /api/ops/feedback/[feedbackId] — update a beta feedback item's status.
 *
 * Operations Console staff + CEO only (canAccessOperationsConsole). Used by the
 * Feedback & Approvals tab to triage submissions.
 */
import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { resolveServerOrgContext } from "@/lib/server/org-context";

const FEEDBACK_STATUSES = ["new", "triaged", "in_progress", "resolved", "wontfix"] as const;
type FeedbackStatus = (typeof FEEDBACK_STATUSES)[number];

function isFeedbackStatus(value: unknown): value is FeedbackStatus {
  return typeof value === "string" && (FEEDBACK_STATUSES as readonly string[]).includes(value);
}

type RouteContext = { params: Promise<{ feedbackId: string }> };

export const PATCH = (req: NextRequest, ctx: RouteContext) =>
  withAuth(req, async ({ admin }) => {
    const { canAccessOperationsConsole } = await resolveServerOrgContext();
    if (!canAccessOperationsConsole) return forbidden("Operations Console access required");

    const { feedbackId } = await ctx.params;
    if (!feedbackId) return badRequest("feedbackId is required");

    const body = (await req.json().catch(() => ({}))) as { status?: unknown };
    if (!isFeedbackStatus(body.status)) {
      return badRequest(`status must be one of: ${FEEDBACK_STATUSES.join(", ")}`);
    }

    const { data, error } = await admin
      .from("beta_feedback")
      .update({ status: body.status })
      .eq("id", feedbackId)
      .select("id, status")
      .maybeSingle();

    if (error) return serverError(error.message);
    if (!data) return badRequest("Feedback item not found");
    return ok({ feedback: data });
  });
