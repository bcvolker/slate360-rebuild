import { NextRequest } from "next/server";
import { withAuth, type AuthedContext } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import { getScopedProjectForUser } from "@/lib/projects/access";

export const PATCH = async (req: NextRequest) =>
  withAuth(req, async ({ admin, user, orgId }: AuthedContext) => {
    try {
      const body = await req.json();
      const { session_id, project_id, session_name } = body;

      if (!session_id || !project_id) {
        return badRequest("Missing session_id or project_id");
      }

      // Enforce the current org's boundary
      if (!orgId) {
        return badRequest("Missing context organization.");
      }

      const { project } = await getScopedProjectForUser(user.id, project_id, "id");
      if (!project) return badRequest("Project not found or access denied");

      const updates: any = {
        project_id,
        is_ad_hoc: false,
        updated_at: new Date().toISOString(),
      };

      if (session_name) {
        updates.title = session_name;
      }

      const { data, error } = await admin
        .from("site_walk_sessions")
        .update(updates)
        .eq("id", session_id)
        .eq("org_id", orgId)
        .select()
        .single();

      if (error) {
        return serverError(error.message);
      }

      return ok(data);
    } catch (e: any) {
      return serverError(e.message ?? "Failed to attach session");
    }
  });