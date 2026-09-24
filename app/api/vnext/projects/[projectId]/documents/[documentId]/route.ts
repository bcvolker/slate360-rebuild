import { NextRequest } from "next/server";
import { notFound, ok, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { readProjectDocuments } from "@/lib/vnext/documents/read-project-documents";
import { projectIncludesCapability } from "@/lib/vnext/scope/read-project-scope";

type Params = { params: Promise<{ projectId: string; documentId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    if (!(await projectIncludesCapability(admin, projectId, "documents"))) return notFound();
    const { documentId } = await ctx.params;
    const read = await readProjectDocuments(admin, projectId, {
      documentsBase: `/vnext/projects/${projectId}/documents`,
      itemsBase: `/vnext/projects/${projectId}/items`,
      exploreBase: `/vnext/projects/${projectId}/explore`,
    });
    if (read.error) return serverError("Documents could not be loaded.");
    const document = read.documents.find((entry) => entry.id === documentId);
    if (!document) return notFound();
    return ok({ document });
  });
}
