import type { OrgAppSubscriptions } from "@/lib/entitlements";
import type { HubProject } from "@/lib/types/site-walk";

/**
 * Simplified model: there is no "Workspace" tier anymore. Every Site Walk tier
 * does **Project Walks** — both Standard and Pro can create projects, add plans
 * and files, and walk them. The Pro-only differences (walk-with-plans,
 * collaborators, 360-on-plans, more storage/credits) are feature gates, not a
 * different walk type. `project_type` (field/full) no longer gates anything.
 */
export type SiteWalkWalkStartTier = "project";

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
  _rawOrgTier?: string | null,
  _isSlateCeo?: boolean,
  _row?: SubscriptionRow | null,
): SiteWalkWalkStartTier {
  return "project";
}

export function filterHubProjectsForWalkStart(
  projects: HubProject[],
  _tier?: SiteWalkWalkStartTier,
): HubProject[] {
  // Both tiers see all their projects — no project_type filtering.
  return projects;
}

export function walkStartCreateRoute(_tier?: SiteWalkWalkStartTier): string {
  return "/projects";
}
