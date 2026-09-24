import { NextRequest } from "next/server";
import { notFound, ok, serverError } from "@/lib/server/api-response";
import { withProjectAuth } from "@/lib/server/api-auth";
import { readProjectDocuments } from "@/lib/vnext/documents/read-project-documents";
import { projectIncludesCapability } from "@/lib/vnext/scope/read-project-scope";

type Params = { params: Promise<{ projectId: string }> };

export function GET(req: NextRequest, ctx: Params) {
  return withProjectAuth(req, ctx, async ({ admin, projectId }) => {
    // Mirrors load-project-documents.ts's own "documents" gate — the page loader already fails
    // closed when the client scope excludes Documents; this API surface did not, so a direct
    // request could still return real data for an excluded section.
    if (!(await projectIncludesCapability(admin, projectId, "documents"))) return notFound();
    const read = await readProjectDocuments(admin, projectId, {
      documentsBase: `/vnext/projects/${projectId}/documents`,
      itemsBase: `/vnext/projects/${projectId}/items`,
      exploreBase: `/vnext/projects/${projectId}/explore`,
    });
    if (read.error) return serverError("Documents could not be loaded.");
    return ok({ documents: read.documents });
  });
}
