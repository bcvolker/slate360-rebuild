import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { ok, forbidden, serverError } from "@/lib/server/api-response";
import { listImportableTwins } from "@/lib/design-studio/internal-queries";

// GET /api/design-studio/twins — ready twins importable into a Design Studio session.
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ orgId }) => {
    const { isSlateCeo } = await resolveServerOrgContext();
    if (!isSlateCeo) return forbidden();
    if (!orgId) return ok({ twins: [] });
    try {
      const twins = await listImportableTwins(orgId);
      return ok({ twins });
    } catch (e) {
      return serverError(e instanceof Error ? e.message : "Failed to list twins");
    }
  });
