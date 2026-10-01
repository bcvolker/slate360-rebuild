import type { SupabaseClient } from "@supabase/supabase-js";

import { isFixtureProject, projectThumbUrl } from "./project-card-visual";

export type ProjectThumbRow = {
  id: string;
  name: string;
  status: string;
  createdAt: string;
  imageUrl: string | null;
  isFixture: boolean;
};

export async function mapProjectCards(
  admin: SupabaseClient,
  orgId: string,
  rows: Array<{
    id: string;
    name: string;
    status: string | null;
    created_at: string;
    thumbnail_url?: string | null;
    metadata?: Record<string, unknown> | null;
  }>,
): Promise<ProjectThumbRow[]> {
  const ids = rows.map((row) => row.id);
  const { data: walks } = ids.length
    ? await admin
        .from("spatial_walkthroughs")
        .select("id, project_id, status")
        .eq("org_id", orgId)
        .in("project_id", ids)
        .in("status", ["ready", "published"])
        .order("updated_at", { ascending: false })
    : { data: [] as Array<{ id: string; project_id: string }> };
  const walkByProject = new Map<string, string>();
  for (const walk of walks ?? []) {
    if (walk.project_id && !walkByProject.has(walk.project_id)) {
      walkByProject.set(walk.project_id, walk.id);
    }
  }
  const walkIds = [...walkByProject.values()];
  const { data: clips } = walkIds.length
    ? await admin
        .from("spatial_clips")
        .select("id, walkthrough_id, capture_meta, poster_key")
        .in("walkthrough_id", walkIds)
        .eq("status", "ready")
        .order("sort_order")
    : { data: [] as Array<{ id: string; walkthrough_id: string; capture_meta: Record<string, unknown> | null }> };
  const clipByWalk = new Map<string, { id: string; capture_meta: Record<string, unknown> | null }>();
  for (const clip of clips ?? []) {
    if (!clipByWalk.has(clip.walkthrough_id)) clipByWalk.set(clip.walkthrough_id, clip);
  }

  return rows.map((row) => {
    const walkId = walkByProject.get(row.id);
    const clip = walkId ? clipByWalk.get(walkId) : null;
    const meta = clip?.capture_meta && typeof clip.capture_meta === "object" ? clip.capture_meta : {};
    const hasPoster = Boolean(
      meta.client_poster_key ||
      meta.public_poster_key ||
      clip?.id,
    );
    const heroUrl = walkId && clip && hasPoster
      ? `/api/spatial-walkthrough/${walkId}/media?clip=${clip.id}&kind=hero&policy=client`
      : null;
    return {
      id: row.id,
      name: row.name,
      status: row.status ?? "active",
      createdAt: row.created_at,
      imageUrl: projectThumbUrl({
        thumbnailUrl: row.thumbnail_url,
        heroUrl,
      }),
      isFixture: isFixtureProject(row.name, row.metadata),
    };
  });
}
