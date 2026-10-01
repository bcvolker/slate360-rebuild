import type { VnextVisit } from "@/lib/vnext/history/history-types";
import type { VnextProjectOverview } from "@/lib/vnext/overview-types";
import { formatPlainDate, pickLatestVisit } from "@/lib/vnext/overview-visit";
import type { PortfolioEvidence, VnextRepresentation } from "@/lib/vnext/portfolio-types";
import { formatDocumentedDate, pickLatestIso, resolveProjectHero } from "@/lib/vnext/project-hero";
import { canClientSeeRepresentation } from "@/lib/vnext/scope/filter-client-surface";
import { canClientSeeCapability, type ClientProjectScope } from "@/lib/vnext/scope/resolve-client-scope";
import { retargetPublicUrl, sharePath, type PublicSection } from "./share-rules";

const PUBLIC_REPS = new Set<VnextRepresentation>(["reality", "geometry", "360", "plan"]);

export function publicOverviewRepresentations(reps: readonly VnextRepresentation[]): VnextRepresentation[] {
  return reps.filter((rep) => PUBLIC_REPS.has(rep));
}

/** Only a token-scoped media route can be a public hero. Project images and other hosts are dropped. */
export function shareSafeHeroUrl(url: string | null | undefined, projectId: string, token: string): string | null {
  if (!url) return null;
  const next = retargetPublicUrl(url, projectId, token);
  if (!next?.startsWith(`/api/share/project/${token}/`)) return null;
  return next;
}

export function publicVisitMoments(
  visits: readonly VnextVisit[],
  scope: ClientProjectScope,
): Array<{ occurredAt: string; sourceLabel: string }> {
  return visits.flatMap((visit) => {
    if (visit.kind === "thermal") return [];
    const sources = visit.sources.filter(
      (source) => source.rep !== "thermal" && canClientSeeRepresentation(scope, source.rep),
    );
    const plans = canClientSeeCapability(scope, "plans") ? visit.plans : [];
    if (sources.length === 0 && plans.length === 0) return [];
    return [{ occurredAt: visit.occurredAt, sourceLabel: visit.kindLabel }];
  });
}

export function composePublicOverview(input: {
  id: string;
  name: string;
  context: string | null;
  locationLabel: string | null;
  evidence: PortfolioEvidence;
  projectId: string;
  token: string;
  sections: readonly PublicSection[];
  publishedVisits: ReadonlyArray<{ occurredAt: string; sourceLabel: string }>;
}): VnextProjectOverview {
  const representations = publicOverviewRepresentations(input.evidence.representations);
  const hero = resolveProjectHero({
    reality: representations.includes("reality")
      ? shareSafeHeroUrl(input.evidence.realityPreviewUrl, input.projectId, input.token)
      : null,
    pano360: representations.includes("360")
      ? shareSafeHeroUrl(input.evidence.pano360Url, input.projectId, input.token)
      : null,
    drone: null,
    plan: representations.includes("plan")
      ? shareSafeHeroUrl(input.evidence.planUrl, input.projectId, input.token)
      : null,
    projectImage: null,
    satellite: null,
  });
  const latest = pickLatestVisit(
    input.publishedVisits.map((visit) => ({ iso: visit.occurredAt, sourceLabel: visit.sourceLabel })),
  );
  const dateLabel = latest ? formatPlainDate(latest.occurredAt) : null;
  const root = sharePath(input.token);
  return {
    id: input.id,
    name: input.name,
    context: input.context,
    locationLabel: input.locationLabel,
    hero,
    documentedLabel: formatDocumentedDate(pickLatestIso(input.publishedVisits.map((visit) => visit.occurredAt))),
    latestVisit:
      input.sections.includes("history") && latest && dateLabel
        ? { occurredAt: latest.occurredAt, sourceLabel: latest.sourceLabel, dateLabel }
        : null,
    representations,
    recentItems: [],
    recentDocuments: [],
    exploreHref: `${root}/explore`,
    itemsHref: root,
    documentsHref: root,
    historyHref: `${root}/history`,
  };
}
