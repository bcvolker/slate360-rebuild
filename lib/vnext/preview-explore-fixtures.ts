import {
  normalizeExploreRep,
  resolveActiveRepresentation,
} from "./explore/resolve-active-representation";
import { canClientSeeRepresentation } from "./scope/filter-client-surface";
import { previewScope } from "./scope/preview-profiles";
import type {
  VnextExploreData,
  VnextExploreRepresentation,
  VnextPanoSourceData,
  VnextPlanSourceData,
} from "./explore-types";

const PROJECT_ID = "11111111-1111-4111-8111-111111111111";
const PROJECT_NAME = "Harbor Street Residence";
const OVERVIEW_HREF = "/preview/vnext/project";

const BASE: Pick<VnextExploreData, "projectId" | "projectName" | "overviewHref"> = {
  projectId: PROJECT_ID,
  projectName: PROJECT_NAME,
  overviewHref: OVERVIEW_HREF,
};

/** Reality — the real, playable sample splat already used elsewhere in preview/marketing. */
export const PREVIEW_EXPLORE_REALITY: VnextExploreData = {
  ...BASE,
  availableRepresentations: ["reality", "geometry", "360", "plan", "thermal"],
  sourcesByRepresentation: {
    "360": [
      { id: "pano-1", label: "East stair", dateLabel: "Sep 14, 2026" },
      { id: "pano-2", label: "Front porch", dateLabel: "Sep 10, 2026" },
    ],
    plan: [
      { id: "sheet-1", label: "A1.0 — Foundation", dateLabel: "Sep 1, 2026" },
      { id: "sheet-2", label: "A1.1 — Framing", dateLabel: "Sep 1, 2026" },
    ],
  },
  activeRepresentation: "reality",
  activeSourceId: null,
  activeSourceData: {
    kind: "reality",
    viewerKind: "splat",
    modelId: "preview-reality",
    modelUrl: "/marketing/sample-twin.spz",
    modelTitle: "Harbor Street — Reality capture",
  },
  activeSourceError: null,
};

export const PREVIEW_EXPLORE_GEOMETRY: VnextExploreData = {
  ...PREVIEW_EXPLORE_REALITY,
  activeRepresentation: "geometry",
  activeSourceId: "geom-1",
  activeSourceData: {
    kind: "geometry",
    viewerKind: "model",
    modelUrl: "/uploads/test-box.glb",
    modelTitle: "Harbor Street — Geometry",
  },
};

export const PREVIEW_EXPLORE_360: VnextExploreData = {
  ...PREVIEW_EXPLORE_REALITY,
  activeRepresentation: "360",
  activeSourceId: "pano-1",
  // A raster placeholder, not the .svg used elsewhere in this file's fixtures: @photo-sphere-viewer's
  // WebGL texture pipeline (unlike a plain <img>) cannot use an SVG source here and fails every load
  // with an unhandled-rejection-worthy raw DOM error event — reproduced and confirmed in isolation
  // against the real Viewer, independent of this app's own code. A real captured 360 photo is always
  // a raster JPEG, so this fixture now matches that.
  activeSourceData: { kind: "360", imageUrl: "/vnext-preview/pano360.png", title: "East stair" },
};

export const PREVIEW_EXPLORE_PLAN: VnextExploreData = {
  ...PREVIEW_EXPLORE_REALITY,
  activeRepresentation: "plan",
  activeSourceId: "sheet-1",
  activeSourceData: { kind: "plan", imageUrl: "/vnext-preview/plan.svg", sheetName: "A1.0 — Foundation" },
};

export const PREVIEW_EXPLORE_THERMAL: VnextExploreData = {
  ...PREVIEW_EXPLORE_REALITY,
  activeRepresentation: "thermal",
  activeSourceId: "thermal-session",
  activeSourceData: {
    kind: "thermal",
    sessionName: "North wall inspection",
    captures: [
      { id: "cap-1", imageUrl: "/vnext-preview/reality.svg", label: "North-01.jpg" },
      { id: "cap-2", imageUrl: "/vnext-preview/reality.svg", label: "North-02.jpg" },
      { id: "cap-3", imageUrl: "/vnext-preview/reality.svg", label: "North-03.jpg" },
    ],
  },
  activeSourceError: null,
};

export const PREVIEW_EXPLORE_EMPTY: VnextExploreData = {
  ...BASE,
  availableRepresentations: [],
  sourcesByRepresentation: {},
  activeRepresentation: null,
  activeSourceId: null,
  activeSourceData: null,
  activeSourceError: null,
};

export const PREVIEW_EXPLORE_ERROR: VnextExploreData = {
  ...PREVIEW_EXPLORE_REALITY,
  activeSourceData: null,
  activeSourceError: "This representation could not be loaded right now. Try again or switch to another.",
};

// See the PREVIEW_EXPLORE_360 comment above: a raster placeholder, required by the pano
// viewer's WebGL texture pipeline.
const PANO_SOURCES: Record<string, VnextPanoSourceData> = {
  "pano-1": { kind: "360", imageUrl: "/vnext-preview/pano360.png", title: "East stair" },
  "pano-2": { kind: "360", imageUrl: "/vnext-preview/pano360.png", title: "Front porch" },
};

const PLAN_SOURCES: Record<string, VnextPlanSourceData> = {
  "sheet-1": { kind: "plan", imageUrl: "/vnext-preview/plan.svg", sheetName: "A1.0 — Foundation" },
  "sheet-2": { kind: "plan", imageUrl: "/vnext-preview/plan.svg", sheetName: "A1.1 — Framing" },
};

const PREVIEW_AVAILABLE: VnextExploreRepresentation[] = ["reality", "geometry", "360", "plan", "thermal"];

/**
 * Drives the one interactive preview route (/preview/vnext/project/explore) from its own
 * ?rep=/?source= — reusing the exact same pure decision function the real orchestrator uses
 * (lib/vnext/explore/resolve-active-representation.ts) so switching/deep-link/fallback behavior
 * is provably identical between the sandbox e2e tests exercise and the authenticated production
 * page, without needing a logged-in session (this vNext e2e suite is unauthenticated-only).
 */
export function resolvePreviewExploreData(
  repParam: string | null,
  sourceParam: string | null,
  scopeId?: string | null,
): VnextExploreData {
  const scope = previewScope(scopeId);
  const available = scope ? PREVIEW_AVAILABLE.filter((rep) => canClientSeeRepresentation(scope, rep)) : PREVIEW_AVAILABLE;
  const requestedRaw = normalizeExploreRep(repParam);
  const requested = scope && requestedRaw && !canClientSeeRepresentation(scope, requestedRaw) ? null : requestedRaw;
  const decision = resolveActiveRepresentation(available, requested);
  const rep = decision.representation;
  const scoped = (data: VnextExploreData): VnextExploreData =>
    scope ? { ...data, availableRepresentations: available } : data;

  if (rep === "geometry") return scoped(PREVIEW_EXPLORE_GEOMETRY);
  if (rep === "360") {
    const sourceId = sourceParam && PANO_SOURCES[sourceParam] ? sourceParam : "pano-1";
    return scoped({ ...PREVIEW_EXPLORE_360, activeSourceId: sourceId, activeSourceData: PANO_SOURCES[sourceId] });
  }
  if (rep === "plan") {
    const sourceId = sourceParam && PLAN_SOURCES[sourceParam] ? sourceParam : "sheet-1";
    return scoped({ ...PREVIEW_EXPLORE_PLAN, activeSourceId: sourceId, activeSourceData: PLAN_SOURCES[sourceId] });
  }
  if (rep === "thermal") return scoped(PREVIEW_EXPLORE_THERMAL);
  return scoped({ ...PREVIEW_EXPLORE_REALITY, activeSourceError: decision.unavailableError });
}
