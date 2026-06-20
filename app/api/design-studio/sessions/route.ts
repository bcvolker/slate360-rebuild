import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, created, badRequest, forbidden, serverError } from "@/lib/server/api-response";
import { listDesignSessions } from "@/lib/design-studio/internal-queries";
import { createSessionFromTwin } from "@/lib/design-studio/internal-mutations";

// GET /api/design-studio/sessions — the CEO's sessions.
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return ok({ sessions: [] });
    try {
      return ok({ sessions: await listDesignSessions(orgId) });
    } catch (e) {
      return serverError(e instanceof Error ? e.message : "Failed to list sessions");
    }
  });

// POST /api/design-studio/sessions — import a twin into a new session.
export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user, admin, orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return forbidden("No organization");

    let body: { twinModelId?: string; projectId?: string | null; title?: string };
    try {
      body = await req.json();
    } catch {
      return badRequest("Invalid JSON body");
    }
    if (!body.twinModelId) return badRequest("twinModelId is required");

    try {
      const result = await createSessionFromTwin(admin, {
        orgId,
        userId: user.id,
        twinModelId: body.twinModelId,
        projectId: body.projectId ?? null,
        title: body.title,
      });
      return created(result);
    } catch (e) {
      return serverError(e instanceof Error ? e.message : "Failed to create session");
    }
  });
