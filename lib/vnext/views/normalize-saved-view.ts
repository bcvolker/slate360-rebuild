import { VNEXT_EXPLORE_REPRESENTATIONS, type VnextExploreRepresentation } from "@/lib/vnext/explore-types";
import {
  SAVED_VIEW_ASPECTS,
  type SavedViewAspect,
  type SavedViewDraft,
  type SavedViewState,
  type VnextSavedView,
} from "./saved-view-types";

export type SavedViewCheck = {
  projectId: string;
  sourceAllowed: boolean;
  itemAllowed: boolean;
  visitAllowed: boolean;
};

const TITLE_MAX = 120;

function finiteTriple(value: unknown): [number, number, number] | null {
  if (!Array.isArray(value) || value.length !== 3) return null;
  const nums = value.map((entry) => (typeof entry === "number" ? entry : Number.NaN));
  if (nums.some((entry) => !Number.isFinite(entry))) return null;
  return [nums[0], nums[1], nums[2]];
}

function viewStateFor(representation: VnextExploreRepresentation, raw: unknown): SavedViewState | null {
  if (typeof raw !== "object" || raw === null) return null;
  const record = raw as Record<string, unknown>;
  if (representation === "reality" && record.kind === "camera") {
    const position = finiteTriple(record.position);
    const lookAt = finiteTriple(record.lookAt);
    if (!position || !lookAt) return null;
    return { kind: "camera", position, lookAt };
  }
  if (representation === "360" && record.kind === "pano") {
    const yaw = typeof record.yaw === "number" ? record.yaw : Number.NaN;
    const pitch = typeof record.pitch === "number" ? record.pitch : Number.NaN;
    if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return null;
    return { kind: "pano", yaw, pitch };
  }
  if (representation === "plan" && record.kind === "plan") {
    const scale = typeof record.scale === "number" ? record.scale : Number.NaN;
    const x = typeof record.x === "number" ? record.x : Number.NaN;
    const y = typeof record.y === "number" ? record.y : Number.NaN;
    if (!Number.isFinite(scale) || scale < 1 || scale > 6) return null;
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { kind: "plan", scale, x, y };
  }
  if (representation === "thermal" && record.kind === "thermal" && typeof record.captureId === "string") {
    const captureId = record.captureId.trim();
    if (!captureId) return null;
    return { kind: "thermal", captureId };
  }
  return null;
}

export function normalizeSavedViewDraft(
  draft: SavedViewDraft,
  check: SavedViewCheck,
): { ok: true; value: Omit<VnextSavedView, "id" | "createdAt"> } | { ok: false; error: string } {
  if (!check.sourceAllowed) return { ok: false, error: "source" };
  const title = draft.title.trim().replace(/\s+/g, " ");
  if (!title || title.length > TITLE_MAX) return { ok: false, error: "title" };
  if (!VNEXT_EXPLORE_REPRESENTATIONS.includes(draft.representation as VnextExploreRepresentation)) {
    return { ok: false, error: "representation" };
  }
  const representation = draft.representation as VnextExploreRepresentation;
  const sourceId = draft.sourceId.trim();
  if (!sourceId) return { ok: false, error: "source" };
  const itemId = draft.itemId?.trim() || null;
  if (itemId && !check.itemAllowed) return { ok: false, error: "item" };
  const visitId = draft.visitId?.trim() || null;
  const occurredAt = draft.occurredAt?.trim() || null;
  if (visitId && !check.visitAllowed) return { ok: false, error: "visit" };
  if (visitId && !occurredAt) return { ok: false, error: "visit" };
  if (occurredAt && !Number.isFinite(Date.parse(occurredAt))) return { ok: false, error: "date" };
  let planSheetId = draft.planSheetId?.trim() || null;
  if (representation === "plan") {
    if (planSheetId && planSheetId !== sourceId) return { ok: false, error: "sheet" };
    planSheetId = sourceId;
  } else if (planSheetId) {
    return { ok: false, error: "sheet" };
  }
  const aspect = SAVED_VIEW_ASPECTS.includes(draft.aspect as SavedViewAspect)
    ? (draft.aspect as SavedViewAspect)
    : null;
  return {
    ok: true,
    value: {
      projectId: check.projectId,
      title,
      representation,
      sourceId,
      visitId,
      occurredAt,
      itemId,
      planSheetId,
      viewState: viewStateFor(representation, draft.viewState),
      aspect,
    },
  };
}

/** The saved source id, or null. Never substitutes a newer id. */
export function exactSavedSource(sourceId: string, availableIds: readonly string[]): string | null {
  return availableIds.includes(sourceId) ? sourceId : null;
}
