import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";
import type { VnextVisit } from "@/lib/vnext/history/history-types";
import type { VnextNavItem } from "@/lib/vnext/nav";
import { vnextProjectNavItems } from "@/lib/vnext/project-nav";
import type { PortfolioEvidence, VnextRepresentation } from "@/lib/vnext/portfolio-types";
import { capabilityForRepresentation, type ClientCapabilityId } from "./capabilities";
import { canClientSeeCapability, type ClientProjectScope } from "./resolve-client-scope";

export function canClientSeeRepresentation(scope: ClientProjectScope, rep: VnextRepresentation | VnextExploreRepresentation): boolean {
  const capability = capabilityForRepresentation(rep);
  return capability ? canClientSeeCapability(scope, capability) : false;
}

export function applyScopeToEvidence(evidence: PortfolioEvidence, scope: ClientProjectScope): PortfolioEvidence {
  const representations = evidence.representations.filter((rep) => canClientSeeRepresentation(scope, rep));
  return {
    ...evidence,
    representations,
    realityPreviewUrl: canClientSeeCapability(scope, "reality") ? evidence.realityPreviewUrl : null,
    pano360Url: canClientSeeCapability(scope, "pano360") ? evidence.pano360Url : null,
    planUrl: canClientSeeCapability(scope, "plans") ? evidence.planUrl : null,
    droneUrl: null,
  };
}

export function filterVisitsForScope(visits: VnextVisit[], scope: ClientProjectScope): VnextVisit[] {
  if (!canClientSeeCapability(scope, "history")) return [];
  return visits.flatMap((visit) => {
    if (visit.kind === "thermal" && !canClientSeeCapability(scope, "thermal")) return [];
    if (visit.kind === "pano" && !canClientSeeCapability(scope, "pano360")) return [];
    const sources = visit.sources.filter((source) => canClientSeeRepresentation(scope, source.rep));
    const plans = canClientSeeCapability(scope, "plans") ? visit.plans : [];
    // Items was the one visit field filterVisitsForScope never stripped — an excluded-Items
    // project still showed each visit's real item titles/counts and a working link into
    // /items/[id], a page that then 404s. Same bug reached public share links, which reuse this
    // function. See lib/vnext/history/history-types.ts for the VnextHistoryItem/itemCount shape.
    const items = canClientSeeCapability(scope, "items") ? visit.items : [];
    if (visit.kind === "reality" && sources.length === 0) return [];
    const thumbnailHref = sources.find((source) => source.imageHref)?.imageHref ?? plans[0]?.imageHref ?? null;
    return [{ ...visit, sources, plans, items, itemCount: items.length, thumbnailHref }];
  });
}

export function projectNavForScope(
  projectId: string,
  scope: ClientProjectScope,
  available: readonly VnextRepresentation[],
): VnextNavItem[] {
  const explore = available.some((rep) => canClientSeeRepresentation(scope, rep));
  return vnextProjectNavItems(projectId).filter((item) => {
    if (item.label === "Items") return canClientSeeCapability(scope, "items");
    if (item.label === "Documents") return canClientSeeCapability(scope, "documents");
    if (item.label === "History") return canClientSeeCapability(scope, "history");
    if (item.label === "Explore") return explore;
    return true;
  });
}

export function compareRepAllowed(scope: ClientProjectScope, rep: string): boolean {
  if (!canClientSeeCapability(scope, "compare")) return false;
  return canClientSeeRepresentation(scope, rep as VnextExploreRepresentation);
}

export function navCapability(label: string): ClientCapabilityId | null {
  if (label === "Items") return "items";
  if (label === "Documents") return "documents";
  if (label === "History") return "history";
  return null;
}
