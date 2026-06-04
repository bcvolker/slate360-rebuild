import {
  getEntitlements,
  resolveModularEntitlements,
  type OrgAppSubscriptions,
} from "@/lib/entitlements";
import type { HubProject } from "@/lib/types/site-walk";

/** Site Walk home walk-start tier: workspace (basic) vs project (pro / legacy business+). */
export type SiteWalkWalkStartTier = "workspace" | "project";

type SubscriptionRow = {
  site_walk?: OrgAppSubscriptions["site_walk"] | null;
  tours?: OrgAppSubscriptions["tours"] | null;
  slatedrop?: OrgAppSubscriptions["slatedrop"] | null;
  design_studio?: OrgAppSubscriptions["design_studio"] | null;
  content_studio?: OrgAppSubscriptions["content_studio"] | null;
  bundle?: OrgAppSubscriptions["bundle"] | null;
  storage_addon_gb?: number | null;
  credit_addon_balance?: number | null;
};

export function resolveSiteWalkWalkStartTier(
  rawOrgTier: string | null | undefined,
  isSlateCeo: boolean,
  row: SubscriptionRow | null,
): SiteWalkWalkStartTier {
  const entitlements = getEntitlements(rawOrgTier ?? null, { isSlateCeo });
  if (entitlements.tier === "business" || entitlements.tier === "enterprise") {
    return "project";
  }

  const modular = resolveModularEntitlements(
    row
      ? {
          site_walk: row.site_walk ?? "none",
          tours: row.tours ?? "none",
          slatedrop: row.slatedrop ?? "none",
          design_studio: row.design_studio ?? "none",
          content_studio: row.content_studio ?? "none",
          bundle: row.bundle ?? null,
          storageAddonGB: row.storage_addon_gb ?? 0,
          creditAddonBalance: row.credit_addon_balance ?? 0,
        }
      : null,
  );

  return modular.apps.site_walk.tier === "pro" ? "project" : "workspace";
}

export function filterHubProjectsForWalkStart(
  projects: HubProject[],
  tier: SiteWalkWalkStartTier,
): HubProject[] {
  if (tier === "project") {
    return projects.filter((p) => p.projectType === "full");
  }
  return projects.filter((p) => p.projectType !== "full");
}

export function walkStartCreateRoute(tier: SiteWalkWalkStartTier): string {
  return tier === "project" ? "/projects" : "/site-walk/setup";
}
