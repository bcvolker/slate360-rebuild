import { NextRequest } from "next/server";
import { ok, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { readProjectDocuments } from "@/lib/vnext/documents/read-project-documents";

type Params = { params: Promise<{ projectId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    const read = await readProjectDocuments(admin, projectId, {
      documentsBase: `/vnext/projects/${projectId}/documents`,
      itemsBase: `/vnext/projects/${projectId}/items`,
      exploreBase: `/vnext/projects/${projectId}/explore`,
    });
    if (read.error) return serverError("Documents could not be loaded.");
    return ok({ documents: read.documents });
  });
}
