import { NextRequest } from "next/server";
import { notFound, ok, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { readProjectItem } from "@/lib/vnext/items/read-project-items";
import { projectIncludesCapability } from "@/lib/vnext/scope/read-project-scope";

type Params = { params: Promise<{ projectId: string; itemId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    if (!(await projectIncludesCapability(admin, projectId, "items"))) return notFound();
    const { itemId } = await ctx.params;
    const read = await readProjectItem(admin, projectId, itemId);
    if (!read.ok) return serverError("This item could not be loaded.");
    if (!read.item) return notFound();
    return ok({ item: read.item });
  });
}
