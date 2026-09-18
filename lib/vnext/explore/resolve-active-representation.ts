import {
  VNEXT_EXPLORE_REPRESENTATIONS,
  type VnextExploreRepresentation,
} from "@/lib/vnext/explore-types";
import { REPRESENTATION_LABEL } from "@/lib/vnext/project-hero";

/** Same priority order as the Overview hero (Reality > 360 > Plan > ...), minus Drone. */
export const EXPLORE_DEFAULT_PRIORITY: readonly VnextExploreRepresentation[] = [
  "reality",
  "geometry",
  "360",
  "plan",
  "thermal",
];

export function normalizeExploreRep(value: string | null | undefined): VnextExploreRepresentation | null {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  return (VNEXT_EXPLORE_REPRESENTATIONS as readonly string[]).includes(lower)
    ? (lower as VnextExploreRepresentation)
    : null;
}

export type ActiveRepresentationDecision = {
  representation: VnextExploreRepresentation | null;
  /** Set only when a representation was explicitly requested but isn't available. */
  unavailableError: string | null;
};

/**
 * Pure decision: given what's actually available and what the URL requested, which representation
 * should Explore show? No dead/empty viewer — an unavailable request resolves to a concise error
 * (surfaced alongside a real fallback representation when one exists) rather than a blank state,
 * and never loops back into requesting the same unavailable representation again.
 */
export function resolveActiveRepresentation(
  available: readonly VnextExploreRepresentation[],
  requested: VnextExploreRepresentation | null,
): ActiveRepresentationDecision {
  if (requested) {
    if (available.includes(requested)) {
      return { representation: requested, unavailableError: null };
    }
    const fallback = EXPLORE_DEFAULT_PRIORITY.find((rep) => available.includes(rep)) ?? null;
    return {
      representation: fallback,
      unavailableError: `"${REPRESENTATION_LABEL[requested]}" isn't available for this project.`,
    };
  }
  const fallback = EXPLORE_DEFAULT_PRIORITY.find((rep) => available.includes(rep)) ?? null;
  return { representation: fallback, unavailableError: null };
}
