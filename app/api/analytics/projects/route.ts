import { NextRequest } from "next/server";
import { withAuth } from "@/lib/server/api-auth";
import { ok, serverError } from "@/lib/server/api-response";

/**
 * GET /api/analytics/projects
 * Returns the list of projects the authenticated user can access,
 * for use in the Analytics project selector.
 */
export const GET = (req: NextRequest) =>
  withAuth(req, async ({ admin, orgId }) => {
    if (!orgId) return ok({ projects: [] });

    const { data, error } = await admin
      .from("projects")
      .select("id, name, status, metadata, created_at, updated_at")
      .eq("org_id", orgId)
      .is("deleted_at", null)
      .order("updated_at", { ascending: false });

    if (error) return serverError(error.message);

    const projects = (data ?? []).map((p) => {
      const meta = (p.metadata ?? {}) as Record<string, unknown>;
      const locRaw = (meta.location ?? {}) as Record<string, unknown>;
      return {
        id: p.id as string,
        name: p.name as string,
        status: (p.status ?? "Active") as string,
        address: (locRaw.address ?? null) as string | null,
        lat: typeof locRaw.lat === "number" ? locRaw.lat : null,
        lng: typeof locRaw.lng === "number" ? locRaw.lng : null,
        createdAt: p.created_at as string,
        updatedAt: p.updated_at as string,
      };
    });

    return ok({ projects });
  });
