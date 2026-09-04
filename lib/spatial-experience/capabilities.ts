/** Client deliverable visibility. Twin stays hidden unless QA + human review both pass. */

export const CAPABILITY_IDS = [
  "walkthrough",
  "stations",
  "plan",
  "twin",
  "aerial",
  "thermal",
  "documents",
  "history",
  "items",
  "questions",
] as const;

export type CapabilityId = (typeof CAPABILITY_IDS)[number];

export type ArtifactGate = {
  exists: boolean;
  published: boolean;
  entitled: boolean;
  qaStatus?: "accepted" | "rejected" | "candidate" | null;
  humanReviewAccepted?: boolean;
  /** Plan overlay needs a raster, not a PDF URL. */
  rasterReady?: boolean;
};

export type ProjectCapabilities = Record<CapabilityId, boolean>;

const HIDDEN: ProjectCapabilities = {
  walkthrough: false,
  stations: false,
  plan: false,
  twin: false,
  aerial: false,
  thermal: false,
  documents: false,
  history: false,
  items: false,
  questions: false,
};

export function isClientVisible(id: CapabilityId, gate: ArtifactGate): boolean {
  if (!gate.exists || !gate.published || !gate.entitled) return false;
  if (id === "twin") {
    return gate.qaStatus === "accepted" && gate.humanReviewAccepted === true;
  }
  if (id === "plan" && gate.rasterReady === false) return false;
  return true;
}

export function resolveProjectCapabilities(gates: Partial<Record<CapabilityId, ArtifactGate>>): ProjectCapabilities {
  const out = { ...HIDDEN };
  for (const id of CAPABILITY_IDS) {
    const gate = gates[id];
    out[id] = gate ? isClientVisible(id, gate) : false;
  }
  return out;
}

export function visibleRealityTiles(caps: ProjectCapabilities): Array<"walkthrough" | "twin" | "stations" | "aerial"> {
  const tiles: Array<"walkthrough" | "twin" | "stations" | "aerial"> = [];
  if (caps.walkthrough) tiles.push("walkthrough");
  if (caps.twin) tiles.push("twin");
  if (caps.stations) tiles.push("stations");
  if (caps.aerial) tiles.push("aerial");
  return tiles;
}

export function visiblePortalNav(caps: ProjectCapabilities): Array<"overview" | "reality" | "plan" | "history" | "documents" | "items"> {
  const nav: Array<"overview" | "reality" | "plan" | "history" | "documents" | "items"> = ["overview"];
  if (caps.walkthrough || caps.stations || caps.twin || caps.aerial) nav.push("reality");
  if (caps.plan) nav.push("plan");
  if (caps.history) nav.push("history");
  if (caps.documents) nav.push("documents");
  if (caps.items || caps.questions) nav.push("items");
  return nav;
}

export type LayoutStateId = "A" | "B" | "C" | "D" | "E";

/** Fixture gates for adaptive-layout tests. Twin only in D/E when accepted. */
export function layoutStateGates(state: LayoutStateId): Partial<Record<CapabilityId, ArtifactGate>> {
  const live = { exists: true, published: true, entitled: true };
  const twinOk = { ...live, qaStatus: "accepted" as const, humanReviewAccepted: true };
  if (state === "A") return { walkthrough: live, history: live };
  if (state === "B") return { stations: live };
  if (state === "C") return { walkthrough: live, stations: live, history: live };
  if (state === "D") return { walkthrough: live, twin: twinOk, history: live };
  return {
    walkthrough: live,
    stations: live,
    plan: { ...live, rasterReady: true },
    twin: twinOk,
    documents: live,
    history: live,
    items: live,
    questions: live,
  };
}
