import type { NextRequest } from "next/server";
import { withProjectAuth } from "@/lib/server/api-auth";
import { ok, serverError } from "@/lib/server/api-response";
import { loadProjectPeople } from "@/lib/server/collaborator-data";
import { getEntitlements } from "@/lib/entitlements";
import { resolveServerOrgContext } from "@/lib/server/org-context";
import { countActiveCollaborators } from "@/lib/server/collaborators";

export const GET = (
  req: NextRequest,
  ctx: { params: Promise<{ projectId: string }> },
) =>
  withProjectAuth(req, ctx, async ({ user, projectId, orgId }) => {
    try {
      const [people, context] = await Promise.all([
        loadProjectPeople(projectId, orgId),
        resolveServerOrgContext(),
      ]);

      const ent = getEntitlements(context.tier, { isSlateCeo: context.isSlateCeo });
      const used = await countActiveCollaborators(user.id);
      const limit = ent.maxCollaborators;

      return ok({
        ...people,
        seatUsage: {
          used,
          limit: Number.isFinite(limit) ? limit : null,
        },
      });
    } catch (err) {
      return serverError(err instanceof Error ? err.message : "Failed to load people");
    }
  });
