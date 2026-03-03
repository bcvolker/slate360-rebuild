import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, serverError } from "@/lib/server/api-response";
import { ensureUserOrganization } from "@/lib/server/org-bootstrap";

export const POST = (req: NextRequest) =>
  withAuth(req, async ({ user }) => {
    try {
      const orgId = await ensureUserOrganization(user);
      return ok({ ok: true, orgId });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to bootstrap organization";
      return serverError(message);
    }
  });
