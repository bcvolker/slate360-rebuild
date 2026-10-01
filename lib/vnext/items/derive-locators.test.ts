import { describe, expect, it } from "vitest";
import { bestSpatialAction, buildExploreItemFocus, deriveItemLocators, type LocatorEvidence } from "./derive-locators";
import { PREVIEW_ITEM_NOTE, PREVIEW_ITEM_PANO, PREVIEW_ITEM_PLAN } from "../preview-items-fixtures";

const SHEETS = new Set(["sheet-1"]);

function evidence(overrides: Partial<LocatorEvidence> = {}): LocatorEvidence {
  return {
    itemId: "item-1",
    projectId: "p1",
    itemType: "photo",
    hasRenderableImage: true,
    latitude: null,
    longitude: null,
    locationLabel: "Level 2",
    sessionId: "session-1",
    sessionInProject: true,
    capturedAt: "2026-09-18T15:00:00.000Z",
    pins: [],
    renderableSheetIds: SHEETS,
    ...overrides,
  };
}

describe("deriveItemLocators", () => {
  it("turns a same-project plan pin into a precise plan locator", () => {
    const locators = deriveItemLocators(
      evidence({
        pins: [{ itemId: "item-1", projectId: "p1", planSheetId: "sheet-1", xPct: "62.5", yPct: 38 }],
      }),
    );
    expect(locators).toContainEqual({ kind: "plan", sheetId: "sheet-1", xPct: 62.5, yPct: 38, precise: true });
  });

  it("ignores an unrelated item pin and a cross-project pin", () => {
    const locators = deriveItemLocators(
      evidence({
        pins: [
          { itemId: "other", projectId: "p1", planSheetId: "sheet-1", xPct: 10, yPct: 10 },
          { itemId: "item-1", projectId: "p2", planSheetId: "sheet-1", xPct: 20, yPct: 20 },
          { itemId: "item-1", projectId: "p1", planSheetId: "sheet-missing", xPct: 30, yPct: 30 },
        ],
      }),
    );
    expect(locators.some((locator) => locator.kind === "plan")).toBe(false);
  });

  it("keeps lat/lng as a geo locator and a matching session as visit context", () => {
    const locators = deriveItemLocators(evidence({ latitude: 45.5, longitude: -122.6 }));
    expect(locators).toContainEqual({ kind: "geo", latitude: 45.5, longitude: -122.6, locationLabel: "Level 2" });
    expect(locators).toContainEqual({
      kind: "visit",
      sessionId: "session-1",
      capturedAt: "2026-09-18T15:00:00.000Z",
    });
  });

  it("does not invent a spatial locator from a photo, a session, or a label alone", () => {
    const locators = deriveItemLocators(evidence({ sessionInProject: false, sessionId: null, capturedAt: null }));
    expect(locators).toEqual([]);
    expect(bestSpatialAction(locators)).toBeNull();
  });

  it("opens a photo_360 as a panorama without pretending a look direction exists", () => {
    const locators = deriveItemLocators(evidence({ itemType: "photo_360" }));
    expect(bestSpatialAction(locators)).toEqual({ representation: "360", sourceId: "item-1", precise: false });
  });

  it("does not build a panorama locator when the 360 image is missing", () => {
    const locators = deriveItemLocators(evidence({ itemType: "photo_360", hasRenderableImage: false }));
    expect(locators.some((locator) => locator.kind === "panorama")).toBe(false);
  });

  it("prefers the plan marker over opening the panorama", () => {
    const locators = deriveItemLocators(
      evidence({
        itemType: "photo_360",
        pins: [{ itemId: "item-1", projectId: "p1", planSheetId: "sheet-1", xPct: 12, yPct: 80 }],
      }),
    );
    expect(bestSpatialAction(locators)?.representation).toBe("plan");
  });

  it("drops a visit locator when the session is not in this project", () => {
    const locators = deriveItemLocators(evidence({ sessionInProject: false }));
    expect(locators.some((locator) => locator.kind === "visit")).toBe(false);
  });
});

describe("buildExploreItemFocus", () => {
  const locators = deriveItemLocators(
    evidence({
      pins: [{ itemId: "item-1", projectId: "p1", planSheetId: "sheet-1", xPct: 62, yPct: 38 }],
    }),
  );

  it("places a marker only on the matching plan sheet", () => {
    const focus = buildExploreItemFocus({
      itemId: "item-1",
      title: "Water stain",
      statusLabel: "Open",
      locationLabel: "Level 2",
      dateLabel: "Sep 18, 2026",
      detailHref: "/vnext/projects/p1/items/item-1",
      locators,
      activeRepresentation: "plan",
      activeSourceId: "sheet-1",
    });
    expect(focus.planMarker).toEqual({ xPct: 62, yPct: 38, label: "Location of Water stain" });
    expect(focus.contextNote).toBe("Shown on this sheet");
  });

  it("does not fake a marker on Reality or on a different sheet", () => {
    const reality = buildExploreItemFocus({
      itemId: "item-1",
      title: "Water stain",
      statusLabel: "Open",
      locationLabel: "Level 2",
      dateLabel: "Sep 18, 2026",
      detailHref: "/items/item-1",
      locators,
      activeRepresentation: "reality",
      activeSourceId: null,
    });
    expect(reality.planMarker).toBeNull();
    expect(reality.opensPanorama).toBe(false);
    expect(reality.contextNote).toBe("Marked on a plan");

    const otherSheet = buildExploreItemFocus({
      itemId: "item-1",
      title: "Water stain",
      statusLabel: "Open",
      locationLabel: "Level 2",
      dateLabel: "Sep 18, 2026",
      detailHref: "/items/item-1",
      locators,
      activeRepresentation: "plan",
      activeSourceId: "sheet-2",
    });
    expect(otherSheet.planMarker).toBeNull();
    expect(otherSheet.contextNote).toBe("Marked on another sheet");
  });
});

describe("preview item fixtures", () => {
  it("derive the plan, panorama, and no-jump cases used by the visual fixtures", () => {
    expect(PREVIEW_ITEM_PLAN.spatialAction).toEqual({ representation: "plan", sourceId: "sheet-1", precise: true });
    expect(PREVIEW_ITEM_PLAN.locators.find((locator) => locator.kind === "plan")).toMatchObject({ xPct: 62, yPct: 38 });
    expect(PREVIEW_ITEM_PANO.spatialAction).toEqual({ representation: "360", sourceId: "pano-1", precise: false });
    expect(PREVIEW_ITEM_NOTE.spatialAction).toBeNull();
    expect(PREVIEW_ITEM_NOTE.locators.map((locator) => locator.kind)).toEqual(["visit"]);
  });
});
