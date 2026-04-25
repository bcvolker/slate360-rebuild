import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { createAdminClient } from "@/lib/supabase/admin";
import { ok, badRequest, forbidden, serverError } from "@/lib/server/api-response";

export const dynamic = "force-dynamic";

const ALLOWED_STATUSES = [
  "new",
  "triaged",
  "in_progress",
  "resolved",
  "wont_fix",
  "duplicate",
] as const;
type FeedbackStatus = (typeof ALLOWED_STATUSES)[number];

function isAllowedStatus(s: unknown): s is FeedbackStatus {
  return typeof s === "string" && (ALLOWED_STATUSES as readonly string[]).includes(s);
}

export const POST = (
  req: NextRequest,
  context: { params: Promise<{ id: string }> },
) =>
  withAuth(req, async () => {
    const { canAccessOperationsConsole } = await resolveServerOrgContext();
    if (!canAccessOperationsConsole) return forbidden("Operations Console access required");

    const { id } = await context.params;
    if (!id) return badRequest("Missing feedback id");

    const body = (await req.json().catch(() => null)) as { status?: unknown } | null;
    if (!body || !isAllowedStatus(body.status)) {
      return badRequest(
        `status is required and must be one of: ${ALLOWED_STATUSES.join(", ")}`,
      );
    }

    const admin = createAdminClient();
    const updates: Record<string, string> = { status: body.status };
    if (body.status === "resolved") updates.resolved_at = new Date().toISOString();

    const { error } = await admin.from("beta_feedback").update(updates).eq("id", id);

    if (error) {
      console.error("[/api/operations/feedback/[id]/status] supabase error:", error);
      return serverError("Failed to update status");
    }

    return ok({ success: true, status: body.status });
  });
