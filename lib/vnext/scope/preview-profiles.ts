import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";
import { canClientSeeRepresentation, filterVisitsForScope, projectNavForScope } from "@/lib/vnext/scope/filter-client-surface";
import { scopeFromIncluded, type ClientProjectScope } from "@/lib/vnext/scope/resolve-client-scope";
import type { ClientCapabilityId } from "@/lib/vnext/scope/capabilities";
import { PREVIEW_VISITS } from "@/lib/vnext/preview-history-fixtures";
import { PREVIEW_OVERVIEW_PROJECT } from "@/lib/vnext/preview-overview-fixtures";
import type { VnextNavItem } from "@/lib/vnext/nav";
import type { VnextProjectOverview } from "@/lib/vnext/overview-types";
import type { VnextVisit } from "@/lib/vnext/history/history-types";

/** Internal data exists for every representation. The profile decides what the client was sold. */
const PRESENT: VnextExploreRepresentation[] = ["reality", "geometry", "360", "plan", "thermal"];

const PROFILES: Record<string, readonly ClientCapabilityId[]> = {
  a: ["reality", "pano360", "plans", "items", "documents", "history", "compare"],
  b: ["pano360", "plans", "items", "documents", "history", "compare"],
  c: ["reality", "thermal", "plans", "items", "documents", "history", "compare"],
};

export function previewScope(profile: string | null | undefined): ClientProjectScope | null {
  const ids = profile ? PROFILES[profile] : undefined;
  return ids ? scopeFromIncluded(ids) : null;
}

export function previewRepresentations(scope: ClientProjectScope): VnextExploreRepresentation[] {
  return PRESENT.filter((rep) => canClientSeeRepresentation(scope, rep));
}

export type PreviewScopeView = {
  overview: VnextProjectOverview;
  nav: VnextNavItem[];
  visits: VnextVisit[];
  canCompare: boolean;
};

export function previewScopeView(profile: string): PreviewScopeView | null {
  const scope = previewScope(profile);
  if (!scope) return null;
  const representations = previewRepresentations(scope);
  const root = `/preview/vnext/scope/${profile}`;
  const nav = projectNavForScope("preview", scope, representations).map((item) => ({
    ...item,
    href: root,
    exact: item.label === "Overview",
  }));
  return {
    overview: {
      ...PREVIEW_OVERVIEW_PROJECT,
      representations,
      hero: representations.includes("reality") ? PREVIEW_OVERVIEW_PROJECT.hero : { kind: "neutral", url: null },
      recentItems: scope.included.has("items") ? PREVIEW_OVERVIEW_PROJECT.recentItems : [],
      recentDocuments: scope.included.has("documents") ? PREVIEW_OVERVIEW_PROJECT.recentDocuments : [],
      latestVisit: representations.includes("thermal")
        ? { occurredAt: "2026-09-18T18:00:00.000Z", sourceLabel: "Thermal scan", dateLabel: "Sep 18, 2026" }
        : representations.includes("reality")
          ? PREVIEW_OVERVIEW_PROJECT.latestVisit
          : { occurredAt: "2026-09-18T15:00:00.000Z", sourceLabel: "Site visit", dateLabel: "Sep 18, 2026" },
    },
    nav,
    visits: filterVisitsForScope(PREVIEW_VISITS, scope),
    canCompare: scope.included.has("compare"),
  };
}
