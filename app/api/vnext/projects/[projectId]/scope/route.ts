import { NextRequest } from "next/server";
import { badRequest, forbidden, ok, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { replaceProjectClientScope } from "@/lib/vnext/scope/write-project-scope";

type Params = { params: Promise<{ projectId: string }> };

export function PUT(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, user, projectId, orgId }) => {
    const body = (await req.json().catch(() => null)) as { included?: unknown } | null;
    if (!body || !Array.isArray(body.included) || body.included.some((value) => typeof value !== "string")) {
      return badRequest("included must be a list of capability ids.");
    }
    const result = await replaceProjectClientScope(admin, user.id, projectId, orgId, body.included);
    if (result === "denied") return forbidden("You do not have permission to change this project.");
    if (result === "error") return serverError("Project delivery scope could not be saved.");
    return ok({ ok: true });
  });
}
