import type { VnextVisit } from "@/lib/vnext/history/history-types";
import type { VnextExploreRepresentation } from "@/lib/vnext/explore-types";

function visitHasSource(visit: VnextVisit, sourceId: string, representation: VnextExploreRepresentation): boolean {
  if (visit.sources.some((source) => source.sourceId === sourceId && source.rep === representation)) return true;
  return representation === "plan" && visit.plans.some((plan) => plan.sheetId === sourceId);
}

/** The one visit that contains this source, or null when there is not exactly one. */
export function unambiguousVisit(
  visits: readonly VnextVisit[],
  sourceId: string,
  representation: VnextExploreRepresentation,
): VnextVisit | null {
  const matches = visits.filter((visit) => visitHasSource(visit, sourceId, representation));
  return matches.length === 1 ? matches[0] : null;
}

export function visitMatchesSource(
  visits: readonly VnextVisit[],
  visitId: string,
  occurredAt: string,
  sourceId: string,
  representation: VnextExploreRepresentation,
): boolean {
  const visit = visits.find((entry) => entry.id === visitId);
  if (!visit || visit.occurredAt !== occurredAt) return false;
  return visitHasSource(visit, sourceId, representation);
}
