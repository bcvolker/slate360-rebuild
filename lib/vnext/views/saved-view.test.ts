import { describe, expect, it } from "vitest";
import { scopeFromIncluded } from "@/lib/vnext/scope/resolve-client-scope";
import { canClientSeeRepresentation } from "@/lib/vnext/scope/filter-client-surface";
import { exactSavedSource, normalizeSavedViewDraft } from "./normalize-saved-view";
import { previewViewsForScope } from "./preview-saved-views";
import { unambiguousVisit, visitMatchesSource } from "./visit-match";
import type { VnextVisit } from "@/lib/vnext/history/history-types";

const check = { projectId: "p1", sourceAllowed: true, itemAllowed: true, visitAllowed: true };

function visit(id: string, sourceId: string): VnextVisit {
  return {
    id,
    occurredAt: "2026-09-18T15:00:00.000Z",
    dateLabel: "Sep 18, 2026",
    title: "Visit",
    kind: "reality",
    kindLabel: "Reality",
    sources: [{ rep: "reality", label: "Scan", sourceId, exploreHref: "/e", imageHref: null }],
    plans: [],
    items: [],
    itemCount: 0,
    thumbnailHref: null,
    frame: null,
  };
}

describe("saved view provenance", () => {
  it("keeps the Reality model and visit date", () => {
    const result = normalizeSavedViewDraft(
      {
        title: "Above-ceiling plumbing",
        representation: "reality",
        sourceId: "model-sep18",
        visitId: "visit-sep18",
        occurredAt: "2026-09-18T15:00:00.000Z",
        viewState: { kind: "camera", position: [1, 2, 3], lookAt: [0, 1, 0] },
      },
      check,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.sourceId).toBe("model-sep18");
    expect(result.value.visitId).toBe("visit-sep18");
    expect(result.value.occurredAt).toBe("2026-09-18T15:00:00.000Z");
    expect(result.value.viewState).toEqual({ kind: "camera", position: [1, 2, 3], lookAt: [0, 1, 0] });
  });

  it("keeps an item only when that item is allowed", () => {
    const kept = normalizeSavedViewDraft(
      { title: "Pin", representation: "plan", sourceId: "sheet-1", itemId: "item-plan" },
      check,
    );
    const rejected = normalizeSavedViewDraft(
      { title: "Pin", representation: "plan", sourceId: "sheet-1", itemId: "other-project" },
      { ...check, itemAllowed: false },
    );
    expect(kept.ok && kept.value.itemId).toBe("item-plan");
    expect(kept.ok && kept.value.planSheetId).toBe("sheet-1");
    expect(rejected.ok).toBe(false);
  });

  it("rejects a plan sheet that is not the saved source", () => {
    const result = normalizeSavedViewDraft(
      { title: "Sheet", representation: "plan", sourceId: "sheet-1", planSheetId: "sheet-2" },
      check,
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a source that is not in this project", () => {
    const result = normalizeSavedViewDraft(
      { title: "Elsewhere", representation: "reality", sourceId: "other-model" },
      { ...check, sourceAllowed: false },
    );
    expect(result.ok).toBe(false);
  });

  it("does not replace a missing historical source with a newer id", () => {
    expect(exactSavedSource("model-sep18", ["model-current"])).toBeNull();
    expect(exactSavedSource("model-sep18", ["model-current", "model-sep18"])).toBe("model-sep18");
  });

  it("omits a camera pose the geometry viewer cannot supply", () => {
    const result = normalizeSavedViewDraft(
      {
        title: "Mesh",
        representation: "geometry",
        sourceId: "geom-1",
        viewState: { kind: "camera", position: [1, 2, 3], lookAt: [0, 0, 0] },
      },
      check,
    );
    expect(result.ok && result.value.viewState).toBeNull();
  });

  it("stores 360 yaw and pitch and drops anything else", () => {
    const result = normalizeSavedViewDraft(
      { title: "Landing", representation: "360", sourceId: "pano-1", viewState: { kind: "pano", yaw: 32, pitch: -8, zoom: 40 } },
      check,
    );
    expect(result.ok && result.value.viewState).toEqual({ kind: "pano", yaw: 32, pitch: -8 });
  });

  it("requires a title", () => {
    expect(normalizeSavedViewDraft({ title: "  ", representation: "reality", sourceId: "m1" }, check).ok).toBe(false);
  });

  it("hides a saved view whose capability is off", () => {
    const scope = scopeFromIncluded(["reality", "pano360", "plans", "items", "documents", "history", "compare"]);
    const visible = previewViewsForScope("a", false);
    expect(visible.some((view) => view.representation === "thermal")).toBe(false);
    expect(canClientSeeRepresentation(scope, "thermal")).toBe(false);
    expect(visible.some((view) => view.id === "sv-history")).toBe(true);
  });

  it("attaches a visit only when one visit contains the source", () => {
    const older = visit("visit-sep18", "model-sep18");
    const newer = { ...visit("visit-now", "model-current"), occurredAt: "2026-09-20T12:00:00.000Z" };
    expect(unambiguousVisit([older, newer], "model-sep18", "reality")?.id).toBe("visit-sep18");
    expect(unambiguousVisit([older, newer], "missing", "reality")).toBeNull();
    expect(visitMatchesSource([older], "visit-sep18", older.occurredAt, "model-sep18", "reality")).toBe(true);
    expect(visitMatchesSource([older], "visit-sep18", older.occurredAt, "model-current", "reality")).toBe(false);
  });
});
