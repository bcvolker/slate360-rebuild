import "server-only";

import type { createAdminClient } from "@/lib/supabase/admin";
import {
  effectiveDeliverables,
  normalizeDeliverables,
  type PackageDeliverable,
  type PortalPackage,
} from "./portal-package";

type Admin = ReturnType<typeof createAdminClient>;

/** Org rollout switch. Any read error counts as off (legacy behaviour). */
export async function loadDirectedTourEnabled(admin: Admin, orgId: string): Promise<boolean> {
  const { data, error } = await admin
    .from("org_feature_flags")
    .select("spatial_directed_tour")
    .eq("org_id", orgId)
    .maybeSingle();
  if (error || !data) return false;
  return (data as { spatial_directed_tour?: boolean }).spatial_directed_tour === true;
}

export async function loadPortalPackage(admin: Admin, projectId: string | null): Promise<PortalPackage | null> {
  if (!projectId) return null;
  const { data, error } = await admin
    .from("spatial_portal_packages")
    .select("deliverables, tour_history_enabled, current_visit_id")
    .eq("project_id", projectId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { deliverables: unknown; tour_history_enabled: boolean | null; current_visit_id: string | null };
  return {
    deliverables: normalizeDeliverables(row.deliverables),
    tourHistoryEnabled: row.tour_history_enabled !== false,
    currentVisitId: row.current_visit_id ?? null,
  };
}

type ShareLike = { org_id: string; walkthrough_id: string; deliverables?: unknown };

const cache = new Map<string, { at: number; value: Set<PackageDeliverable> | null }>();
const TTL_MS = 30_000;

/**
 * Deliverables allowed for one share (null = packaging not enforced for the org).
 * Cached briefly per walkthrough+override because the media route resolves this on
 * every video Range request.
 */
export async function resolveShareDeliverables(admin: Admin, share: ShareLike): Promise<Set<PackageDeliverable> | null> {
  const key = `${share.walkthrough_id}|${JSON.stringify(share.deliverables ?? null)}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value;

  const enforced = await loadDirectedTourEnabled(admin, share.org_id);
  let value: Set<PackageDeliverable> | null = null;
  if (enforced) {
    const { data: walk } = await admin
      .from("spatial_walkthroughs")
      .select("project_id")
      .eq("id", share.walkthrough_id)
      .maybeSingle();
    const pkg = await loadPortalPackage(admin, (walk?.project_id as string | null) ?? null);
    value = effectiveDeliverables({ enforced, pkg, shareOverride: share.deliverables ?? null });
  }
  cache.set(key, { at: Date.now(), value });
  return value;
}

/** Walkthrough media and boot are served only when the walkthrough is packaged. */
export async function shareServesWalkthrough(admin: Admin, share: ShareLike): Promise<boolean> {
  const allowed = await resolveShareDeliverables(admin, share);
  return allowed == null || allowed.has("walkthrough") || allowed.has("tour");
}
