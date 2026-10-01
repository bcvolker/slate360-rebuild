import { NextRequest } from "next/server";
import { badRequest, forbidden, notFound, ok, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { readSavedViews } from "@/lib/vnext/views/read-saved-views";
import { createSavedView } from "@/lib/vnext/views/write-saved-view";
import type { SavedViewDraft } from "@/lib/vnext/views/saved-view-types";

type Params = { params: Promise<{ projectId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const listed = await readSavedViews(admin, projectId);
    if (listed.failed) return serverError("Saved views could not be loaded.");
    return ok({ views: listed.views });
  });
}

export function POST(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, user, projectId, orgId }) => {
    const body = (await req.json().catch(() => null)) as SavedViewDraft | null;
    if (!body || typeof body.title !== "string" || typeof body.representation !== "string" || typeof body.sourceId !== "string") {
      return badRequest("A title, representation, and source are required.");
    }
    if ("projectId" in body && (body as { projectId?: string }).projectId && (body as { projectId?: string }).projectId !== projectId) {
      return notFound("Not found");
    }
    const result = await createSavedView(admin, user.id, projectId, orgId, body);
    if (result.ok) return ok({ id: result.id });
    if (result.reason === "denied") return forbidden("You do not have permission to save a view.");
    if (result.reason === "hidden" || result.reason === "invalid") return notFound("Not found");
    return serverError("The view could not be saved.");
  });
}
