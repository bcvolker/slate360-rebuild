/**
 * Shared API auth wrappers — eliminates duplicated auth boilerplate.
 *
 * Usage:
 *   import { withAuth, withProjectAuth } from "@/lib/server/api-auth";
 *   import type { ProjectRouteContext } from "@/lib/types/api";
 *   import { ok, serverError } from "@/lib/server/api-response";
 *
 *   export const GET = (req: NextRequest, ctx: ProjectRouteContext) =>
 *     withProjectAuth(req, ctx, async ({ admin, projectId, project }) => {
 *       const { data, error } = await admin.from("project_rfis").select("*").eq("project_id", projectId);
 *       if (error) return serverError(error.message);
 *       return ok({ rfis: data });
 *     });
 */
import { NextRequest, NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  resolveProjectScope,
  getScopedProjectForUser,
} from "@/lib/projects/access";

/* ─── Context types passed to handlers ──────────────────────── */

/** Context available after basic auth check */
export type AuthedContext = {
  req: NextRequest;
  user: User;
  admin: ReturnType<typeof createAdminClient>;
  orgId: string | null;
};

/** Context available after auth + project scoping */
export type AuthedProjectContext = AuthedContext & {
  projectId: string;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any -- Supabase .single() returns dynamic shape based on select clause */
  project: Record<string, any>;
};

/* ─── Wrappers ─────────────────────────────────────────────── */

/**
 * Basic auth wrapper — ensures user is authenticated and resolves org scope.
 *
 * Replaces the repeated pattern:
 *   const supabase = await createClient();
 *   const { data: { user } } = await supabase.auth.getUser();
 *   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 */
export async function withAuth(
  req: NextRequest,
  handler: (ctx: AuthedContext) => Promise<NextResponse>,
): Promise<NextResponse> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { admin, orgId } = await resolveProjectScope(user.id);

    return await handler({ req, user, admin, orgId });
  } catch (err) {
    console.error("[withAuth] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

/**
 * Project-scoped auth wrapper — ensures user is authenticated AND has access
 * to the specified project.
 *
 * Replaces the repeated 12-line preamble in project sub-routes.
 *
 * @param selectClause — Supabase select clause for the project lookup.
 *   Defaults to "id, name" which covers most use cases.
 *   Pass a wider clause (e.g. "id, name, metadata, status") if the handler
 *   needs more project fields.
 */
export async function withProjectAuth(
  req: NextRequest,
  context: { params: Promise<{ projectId: string }> },
  handler: (ctx: AuthedProjectContext) => Promise<NextResponse>,
  selectClause = "id, name",
): Promise<NextResponse> {
  try {
    const { projectId } = await context.params;

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { admin, orgId } = await resolveProjectScope(user.id);
    const { project } = await getScopedProjectForUser(
      user.id,
      projectId,
      selectClause,
    );

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 },
      );
    }

    return await handler({
      req,
      user,
      admin,
      orgId,
      projectId,
      project,
    });
  } catch (err) {
    console.error("[withProjectAuth] unexpected error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
