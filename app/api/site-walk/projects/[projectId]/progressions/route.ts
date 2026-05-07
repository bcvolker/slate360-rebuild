/**
 * GET /api/site-walk/projects/[projectId]/progressions
 *
 * Returns progression chains in the project, grouped by location_label.
 * Only includes items whose item_relationship is in ('before','after','progress')
 * OR which are referenced by such items via before_item_id.
 *
 * Response: { groups: Array<{ location: string; items: SiteWalkItem[] }> }
 */
import { NextRequest } from "next/server";
import { withAppAuth } from "@/lib/server/api-auth";
import { ok, badRequest, serverError } from "@/lib/server/api-response";
import type { IdRouteContext } from "@/lib/types/api";

type ProjectRouteContext = { params: Promise<{ projectId: string }> };

export const GET = (req: NextRequest, ctx: IdRouteContext | ProjectRouteContext) =>
  withAppAuth("punchwalk", req, async ({ admin, orgId }) => {
    if (!orgId) return badRequest("Organization context required");
    const params = await (ctx as ProjectRouteContext).params;
    const projectId = params?.projectId;
    if (!projectId) return badRequest("projectId is required");

    // Items that explicitly carry a progression role
    const { data: roleRows, error: roleError } = await admin
      .from("site_walk_items")
      .select("*")
      .eq("org_id", orgId)
      .eq("project_id", projectId)
      .in("item_relationship", ["before", "after", "progress"])
      .order("location_label", { ascending: true })
      .order("created_at", { ascending: true });

    if (roleError) return serverError(roleError.message);
    const items = roleRows ?? [];

    // Pull in any parents referenced by before_item_id but not yet included
    const referencedIds = new Set(
      items.map((item) => item.before_item_id).filter((value): value is string => Boolean(value)),
    );
    const knownIds = new Set(items.map((item) => item.id));
    const missingIds = [...referencedIds].filter((id) => !knownIds.has(id));
    if (missingIds.length > 0) {
      const { data: parents } = await admin
        .from("site_walk_items")
        .select("*")
        .eq("org_id", orgId)
        .eq("project_id", projectId)
        .in("id", missingIds);
      if (parents) items.push(...parents);
    }

    const groupsMap = new Map<string, typeof items>();
    for (const item of items) {
      const key = (item.location_label as string | null)?.trim() || "Unspecified location";
      const bucket = groupsMap.get(key) ?? [];
      bucket.push(item);
      groupsMap.set(key, bucket);
    }
    const groups = [...groupsMap.entries()]
      .map(([location, list]) => ({
        location,
        items: list.slice().sort((a, b) => new Date(a.created_at as string).getTime() - new Date(b.created_at as string).getTime()),
      }))
      .sort((a, b) => a.location.localeCompare(b.location));

    return ok({ groups });
  });
