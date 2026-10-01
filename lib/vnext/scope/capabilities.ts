import type { VnextCompareRep } from "@/lib/vnext/history/history-types";
import type { VnextRepresentation } from "@/lib/vnext/portfolio-types";

/** Stable ids. Client labels live beside them. Pricing does not. */
export const CLIENT_CAPABILITY_IDS = [
  "reality",
  "geometry",
  "pano360",
  "plans",
  "thermal",
  "items",
  "documents",
  "history",
  "compare",
] as const;

export type ClientCapabilityId = (typeof CLIENT_CAPABILITY_IDS)[number];

/** Sold per project. Hidden entirely when not included. */
export const SERVICE_CAPABILITY_IDS = ["reality", "geometry", "pano360", "plans", "thermal"] as const;

/** Base portal sections. Still project-scoped, not a price. */
export const PORTAL_CAPABILITY_IDS = ["items", "documents", "history", "compare"] as const;

export const CAPABILITY_LABEL: Record<ClientCapabilityId, string> = {
  reality: "Reality",
  geometry: "Geometry",
  pano360: "360",
  plans: "Plans",
  thermal: "Thermal",
  items: "Items",
  documents: "Documents",
  history: "History",
  compare: "Compare",
};

const CAPABILITY_SET = new Set<string>(CLIENT_CAPABILITY_IDS);

export function isClientCapabilityId(value: string): value is ClientCapabilityId {
  return CAPABILITY_SET.has(value);
}

export function capabilityForRepresentation(rep: VnextRepresentation | VnextCompareRep): ClientCapabilityId | null {
  if (rep === "360") return "pano360";
  if (rep === "plan") return "plans";
  if (rep === "drone") return null;
  if (rep === "reality" || rep === "geometry" || rep === "thermal") return rep;
  return null;
}
