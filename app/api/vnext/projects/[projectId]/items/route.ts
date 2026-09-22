import { NextRequest } from "next/server";
import { ok, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { readProjectItems } from "@/lib/vnext/items/read-project-items";

type Params = { params: Promise<{ projectId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const read = await readProjectItems(admin, projectId);
    if (!read.ok) return serverError("Items could not be loaded.");
    return ok({ items: read.items });
  });
}
