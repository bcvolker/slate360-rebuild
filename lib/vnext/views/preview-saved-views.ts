import type { TwinCameraPath } from "@/lib/digital-twin/camera-path-types";
import type { VnextExploreData } from "@/lib/vnext/explore-types";
import { canClientSeeRepresentation } from "@/lib/vnext/scope/filter-client-surface";
import { previewScope } from "@/lib/vnext/scope/preview-profiles";
import {
  PREVIEW_EXPLORE_360,
  PREVIEW_EXPLORE_GEOMETRY,
  PREVIEW_EXPLORE_PLAN,
  PREVIEW_EXPLORE_REALITY,
  PREVIEW_EXPLORE_THERMAL,
  resolvePreviewExploreData,
} from "@/lib/vnext/preview-explore-fixtures";
import type { VnextSavedView } from "./saved-view-types";

const REALITY_MODEL = "preview-reality";
const HISTORY_MODEL = "model-sep18";

export const PREVIEW_PATH: TwinCameraPath = {
  loop: false,
  keyframes: [
    { id: "kf-1", position: [0, 2, 6], lookAt: [0, 1, 0], durationMs: 4000, easing: "easeInOut" },
    { id: "kf-2", position: [4, 2, 2], lookAt: [0, 1, 0], durationMs: 4000, easing: "easeInOut" },
    { id: "kf-3", position: [0, 3, -4], lookAt: [0, 1, 0], durationMs: 4000, easing: "linear" },
  ],
};

export const PREVIEW_SAVED_VIEWS: VnextSavedView[] = [
  {
    id: "sv-corridor",
    projectId: PREVIEW_EXPLORE_REALITY.projectId,
    title: "Level 2 corridor",
    representation: "reality",
    sourceId: REALITY_MODEL,
    visitId: null,
    occurredAt: null,
    itemId: null,
    planSheetId: null,
    viewState: { kind: "camera", position: [1, 2, 4], lookAt: [0, 1, 0] },
    aspect: null,
    createdAt: "2026-09-20T12:00:00.000Z",
  },
  {
    id: "sv-history",
    projectId: PREVIEW_EXPLORE_REALITY.projectId,
    title: "Above-ceiling plumbing",
    representation: "reality",
    sourceId: HISTORY_MODEL,
    visitId: "visit-sep18",
    occurredAt: "2026-09-18T15:00:00.000Z",
    itemId: null,
    planSheetId: null,
    viewState: { kind: "camera", position: [2, 1.5, 3], lookAt: [0, 1, 0] },
    aspect: null,
    createdAt: "2026-09-18T16:00:00.000Z",
  },
  {
    id: "sv-360",
    projectId: PREVIEW_EXPLORE_REALITY.projectId,
    title: "East stair landing",
    representation: "360",
    sourceId: "pano-1",
    visitId: null,
    occurredAt: "2026-09-14T12:00:00.000Z",
    itemId: null,
    planSheetId: null,
    viewState: { kind: "pano", yaw: 32, pitch: -8 },
    aspect: null,
    createdAt: "2026-09-14T12:00:00.000Z",
  },
  {
    id: "sv-plan",
    projectId: PREVIEW_EXPLORE_REALITY.projectId,
    title: "Foundation grid",
    representation: "plan",
    sourceId: "sheet-1",
    visitId: null,
    occurredAt: null,
    itemId: "item-plan",
    planSheetId: "sheet-1",
    viewState: { kind: "plan", scale: 2, x: 12, y: -8 },
    aspect: null,
    createdAt: "2026-09-12T12:00:00.000Z",
  },
  {
    id: "sv-geom",
    projectId: PREVIEW_EXPLORE_REALITY.projectId,
    title: "Modeled kitchen",
    representation: "geometry",
    sourceId: "geom-1",
    visitId: null,
    occurredAt: null,
    itemId: null,
    planSheetId: null,
    viewState: null,
    aspect: null,
    createdAt: "2026-09-11T12:00:00.000Z",
  },
  {
    id: "sv-thermal",
    projectId: PREVIEW_EXPLORE_REALITY.projectId,
    title: "North wall inspection",
    representation: "thermal",
    sourceId: "thermal-session",
    visitId: null,
    occurredAt: null,
    itemId: null,
    planSheetId: null,
    viewState: { kind: "thermal", captureId: "cap-2" },
    aspect: null,
    createdAt: "2026-09-10T12:00:00.000Z",
  },
];

const KNOWN_SOURCES = new Set([REALITY_MODEL, HISTORY_MODEL, "pano-1", "pano-2", "sheet-1", "sheet-2", "geom-1", "thermal-session"]);

export function previewViewsForScope(scopeId: string | null, empty: boolean): VnextSavedView[] {
  if (empty) return [];
  const scope = previewScope(scopeId);
  if (!scope) return PREVIEW_SAVED_VIEWS;
  return PREVIEW_SAVED_VIEWS.filter((view) => canClientSeeRepresentation(scope, view.representation));
}

export function applyPreviewSavedView(
  view: VnextSavedView,
  scopeId: string | null,
): { data: VnextExploreData; unavailable: boolean } {
  const scope = previewScope(scopeId);
  if (scope && !canClientSeeRepresentation(scope, view.representation)) {
    return { data: blocked(scopeId), unavailable: true };
  }
  if (!KNOWN_SOURCES.has(view.sourceId)) return { data: blocked(scopeId), unavailable: true };
  if (view.representation === "reality" && view.sourceId === HISTORY_MODEL) {
    return {
      unavailable: false,
      data: scoped({
        ...PREVIEW_EXPLORE_REALITY,
        activeSourceId: HISTORY_MODEL,
        activeSourceData: {
          kind: "reality",
          viewerKind: "splat",
          modelId: HISTORY_MODEL,
          modelUrl: "/marketing/sample-twin.spz",
          modelTitle: "Harbor Street — Sep 18, 2026",
        },
      }, scopeId),
    };
  }
  if (view.representation === "reality") {
    const current = PREVIEW_EXPLORE_REALITY.activeSourceData;
    return {
      unavailable: false,
      data: scoped({
        ...PREVIEW_EXPLORE_REALITY,
        activeSourceId: view.sourceId,
        activeSourceData: current && current.kind === "reality" ? { ...current, modelId: view.sourceId } : current,
      }, scopeId),
    };
  }
  if (view.representation === "geometry") {
    return { unavailable: false, data: scoped({ ...PREVIEW_EXPLORE_GEOMETRY, activeSourceId: view.sourceId }, scopeId) };
  }
  if (view.representation === "360" || view.representation === "plan" || view.representation === "thermal") {
    const data = resolvePreviewExploreData(view.representation, view.sourceId, scopeId);
    if (data.activeSourceId !== view.sourceId && view.representation !== "thermal") {
      return { data: blocked(scopeId), unavailable: true };
    }
    if (view.representation === "thermal") {
      return { unavailable: false, data: scoped({ ...PREVIEW_EXPLORE_THERMAL, activeSourceId: view.sourceId }, scopeId) };
    }
    return { unavailable: false, data: scoped(data, scopeId) };
  }
  return { data: blocked(scopeId), unavailable: true };
}

function blocked(scopeId: string | null): VnextExploreData {
  const data = resolvePreviewExploreData(null, null, scopeId);
  return { ...data, activeSourceData: null, activeSourceError: null, activeRepresentation: null };
}

function scoped(data: VnextExploreData, scopeId: string | null): VnextExploreData {
  const scope = previewScope(scopeId);
  if (!scope) return data;
  return {
    ...data,
    availableRepresentations: data.availableRepresentations.filter((rep) => canClientSeeRepresentation(scope, rep)),
  };
}
