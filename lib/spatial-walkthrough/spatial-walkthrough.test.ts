import { describe, expect, it } from "vitest";
import { visibleClientApps, isSpatialOnlyPortal, projectTabIdsForSurface, mergeClientSurfaceFlags, projectTabLabel, commandPaletteHrefAllowed } from "./client-surface";
import { allowedMediaKind, filterProjectFilesForPolicy, validateWalkthroughUpload } from "./policy";
import { orderedWaypoints, indexAtTime, assignSortOrder, prevWaypoint } from "./waypoints";
import { serializePinLocator, isCompleteLocator, pinVisibleOnPolicy } from "./pins";
import { resolveBrandTheme } from "./theme";
import { applySkip, rulesForPolicy, skipIntervals } from "./redaction";
import { parseOperatorPatch } from "./operator-patch";
import { buildViewerMarkers } from "./markers";
import { isNavAppVisible, isSpatialOnlyAppList } from "./nav-filter";
import { productApiFromPath } from "./api-product-paths";
import { EMPTY_LIBRARY_FILTERS, matchesLibraryFilters } from "./library-filter";
import { guestPermissions, memberPermissions, publicPermissions } from "./share-roles";
import type { WaypointRecord } from "./types";

const spatialOnly = {
  spatialWalkthrough: true,
  siteWalk: false,
  twin360: false,
  slatedrop: false,
  designStudio: false,
  contentStudio: false,
  thermal: false,
  isCeo: false,
};

describe("entitlement filtering", () => {
  it("shows only Spatial Walkthrough when that is the sole flag", () => {
    expect(visibleClientApps(spatialOnly)).toEqual(["spatial-walkthrough"]);
    expect(isSpatialOnlyPortal(spatialOnly)).toBe(true);
    expect(projectTabIdsForSurface(spatialOnly)).toEqual(["overview", "walkthroughs", "items", "documents", "files", "team"]);
  });

  it("does not show twin or site walk without flags", () => {
    const apps = visibleClientApps(spatialOnly);
    expect(apps).not.toContain("twin360");
    expect(apps).not.toContain("site-walk");
    expect(apps).not.toContain("thermal");
  });
});

describe("share-policy isolation", () => {
  it("never serves master on a public or client share", () => {
    expect(allowedMediaKind("public", "master", false)).toBe(false);
    expect(allowedMediaKind("public", "proxy", false)).toBe(true);
    expect(allowedMediaKind("client", "master", true)).toBe(false);
    expect(allowedMediaKind("master", "master", true)).toBe(true);
  });

  it("limits public project files to allowlisted ids", () => {
    const files = [{ id: "a" }, { id: "b" }];
    expect(filterProjectFilesForPolicy(files, new Set(["a"]), "public")).toEqual([{ id: "a" }]);
    expect(filterProjectFilesForPolicy(files, new Set(["a"]), "client")).toEqual(files);
  });
});

describe("waypoint ordering", () => {
  const list: WaypointRecord[] = [
    { id: "b", clipId: "c1", tSeconds: 12, label: "B", zone: null, yawDeg: 0, pitchDeg: 0, sortOrder: 1, thumbnailKey: null, xyz: null, isVisible: true },
    { id: "a", clipId: "c1", tSeconds: 2, label: "A", zone: null, yawDeg: 0, pitchDeg: 0, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
    { id: "x", clipId: "c2", tSeconds: 1, label: "X", zone: null, yawDeg: 0, pitchDeg: 0, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
  ];
  it("orders by sort_order within a clip", () => {
    expect(orderedWaypoints(list, "c1").map((w) => w.id)).toEqual(["a", "b"]);
  });
  it("indexes the last waypoint at or before t", () => {
    expect(indexAtTime(list, "c1", 2)).toBe(0);
    expect(indexAtTime(list, "c1", 12)).toBe(1);
  });
  it("reassigns sort from time", () => {
    expect(assignSortOrder(list.filter((w) => w.clipId === "c1")).map((w) => w.sortOrder)).toEqual([0, 1]);
  });
});

describe("pin locator serialization", () => {
  it("keeps clip/time/yaw/pitch", () => {
    const loc = serializePinLocator({
      walkthroughId: "w",
      clipId: "c",
      tSeconds: 3.5,
      yawDeg: 40,
      pitchDeg: -10,
    });
    expect(isCompleteLocator(loc)).toBe(true);
    expect(loc.tSeconds).toBe(3.5);
  });
  it("hides client pins from public policy", () => {
    expect(pinVisibleOnPolicy("client", "public")).toBe(false);
    expect(pinVisibleOnPolicy("public", "public")).toBe(true);
  });
});

describe("branding theme resolution", () => {
  it("forces Powered by Slate360 when white-label is not entitled", () => {
    const theme = resolveBrandTheme({
      walkthrough: { accentColor: "#112233", showPoweredBy: false },
      canHidePoweredBy: false,
    });
    expect(theme.showPoweredBy).toBe(true);
    expect(theme.accentColor).toBe("#112233");
  });
  it("honors hide when entitled", () => {
    const theme = resolveBrandTheme({
      walkthrough: { showPoweredBy: false },
      canHidePoweredBy: true,
    });
    expect(theme.showPoweredBy).toBe(false);
  });
});

describe("redaction intervals", () => {
  const rules = [
    { clipId: "c", tStart: 10, tEnd: 20, yawMin: null, yawMax: null, pitchMin: null, pitchMax: null, mode: "skip" as const, policy: "public" as const },
    { clipId: "c", tStart: 30, tEnd: 32, yawMin: null, yawMax: null, pitchMin: null, pitchMax: null, mode: "skip" as const, policy: "client" as const },
  ];
  it("public policy includes client+public skips", () => {
    expect(skipIntervals(rulesForPolicy(rules, "public"), "c")).toHaveLength(2);
    expect(skipIntervals(rulesForPolicy(rules, "client"), "c")).toHaveLength(1);
  });
  it("jumps t to the end of a skip window", () => {
    expect(applySkip(15, [{ start: 10, end: 20 }])).toBe(20);
    expect(applySkip(9, [{ start: 10, end: 20 }])).toBe(9);
  });
});

describe("protected media upload rules", () => {
  it("rejects raw insv", () => {
    const r = validateWalkthroughUpload({
      filename: "clip.insv",
      contentType: "video/mp4",
      size: 10,
    });
    expect(r.ok).toBe(false);
  });
  it("accepts stitched mp4", () => {
    const r = validateWalkthroughUpload({
      filename: "walk.mp4",
      contentType: "video/mp4",
      size: 10,
      width: 5760,
      height: 2880,
    });
    expect(r.ok).toBe(true);
  });
});

describe("nav entitlement filtering", () => {
  it("hides unpurchased apps for a spatial-only org", () => {
    expect(isNavAppVisible("spatial-walkthrough", false, ["spatial-walkthrough"])).toBe(true);
    expect(isNavAppVisible("site-walk", false, ["spatial-walkthrough"])).toBe(false);
    expect(isNavAppVisible("twin360", false, ["spatial-walkthrough"])).toBe(false);
    expect(isNavAppVisible("thermal", true, ["spatial-walkthrough"])).toBe(true);
  });

  it("fails closed when visible apps are unknown", () => {
    expect(isNavAppVisible("site-walk", false, null)).toBe(false);
    expect(isNavAppVisible("spatial-walkthrough", false, null)).toBe(false);
  });
});

describe("purchase vs beta widening", () => {
  it("does not grant Site Walk or Twin to a spatial-only purchase in beta", () => {
    const flags = mergeClientSurfaceFlags({
      isCeo: false,
      betaMode: true,
      purchased: {
        spatialWalkthrough: true,
        siteWalk: false,
        twin360: false,
        slatedrop: false,
        designStudio: false,
        contentStudio: false,
      },
    });
    expect(isSpatialOnlyPortal(flags)).toBe(true);
    expect(flags.siteWalk).toBe(false);
    expect(flags.twin360).toBe(false);
    expect(projectTabLabel("files", flags)).toBe("Project Files");
    expect(projectTabLabel("team", flags)).toBe("Sharing");
    expect(projectTabLabel("walkthroughs", flags)).toBe(null);
    expect(commandPaletteHrefAllowed("/site-walk", flags)).toBe(false);
    expect(commandPaletteHrefAllowed("/dashboard", flags)).toBe(false);
  });

  it("still grants Twin in beta to Site Walk purchasers", () => {
    const flags = mergeClientSurfaceFlags({
      isCeo: false,
      betaMode: true,
      purchased: {
        spatialWalkthrough: false,
        siteWalk: true,
        twin360: false,
        slatedrop: false,
        designStudio: false,
        contentStudio: false,
      },
    });
    expect(flags.siteWalk).toBe(true);
    expect(flags.twin360).toBe(true);
    expect(isSpatialOnlyPortal(flags)).toBe(false);
  });
});

describe("command palette", () => {
  it("hides unpurchased products for a spatial-only surface", () => {
    expect(commandPaletteHrefAllowed("/site-walk", spatialOnly)).toBe(false);
    expect(commandPaletteHrefAllowed("/slatedrop", spatialOnly)).toBe(false);
    expect(commandPaletteHrefAllowed("/coordination/inbox", spatialOnly)).toBe(false);
    expect(commandPaletteHrefAllowed("/dashboard", spatialOnly)).toBe(false);
    expect(commandPaletteHrefAllowed("/spatial-walkthrough", spatialOnly)).toBe(true);
    expect(commandPaletteHrefAllowed("/projects", spatialOnly)).toBe(true);
  });
});

describe("product API guard paths", () => {
  it("maps disabled product prefixes", () => {
    expect(productApiFromPath("/api/site-walk/sessions")).toBe("site-walk");
    expect(productApiFromPath("/api/digital-twin/jobs")).toBe("twin360");
    expect(productApiFromPath("/api/ops/thermal/sessions")).toBe("thermal");
    expect(productApiFromPath("/api/spatial-walkthrough/shares")).toBeNull();
  });
});

describe("library filters", () => {
  it("matches date, zone, and aerial elevation", () => {
    const item = {
      title: "Roof A",
      captured_at: "2026-08-01T12:00:00.000Z",
      building: "B1",
      floor: "3",
      zone: "Mech",
      walkthrough_type: "aerial",
    };
    expect(matchesLibraryFilters(item, { ...EMPTY_LIBRARY_FILTERS, elevation: "aerial", dateFrom: "2026-08-01", dateTo: "2026-08-01" })).toBe(true);
    expect(matchesLibraryFilters(item, { ...EMPTY_LIBRARY_FILTERS, elevation: "ground" })).toBe(false);
  });
});

describe("share roles", () => {
  it("gives public view-only and admin manage", () => {
    expect(publicPermissions(false)).toEqual({ view: true, download: false, share: false, manage: false });
    expect(memberPermissions("admin").manage).toBe(true);
    expect(memberPermissions("viewer").download).toBe(false);
    expect(guestPermissions(true).download).toBe(true);
  });
});

describe("spatial-only desktop nav", () => {
  it("treats a single spatial-walkthrough app list as spatial-only", () => {
    expect(isSpatialOnlyAppList(["spatial-walkthrough"], false)).toBe(true);
    expect(isSpatialOnlyAppList(["spatial-walkthrough"], true)).toBe(false);
    expect(isSpatialOnlyAppList(["spatial-walkthrough", "site-walk"], false)).toBe(false);
  });
});

describe("viewer markers", () => {
  const wps: WaypointRecord[] = [
    { id: "a", clipId: "c1", tSeconds: 2, label: "A", zone: null, yawDeg: 10, pitchDeg: 0, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
    { id: "b", clipId: "c1", tSeconds: 12, label: "B", zone: null, yawDeg: 40, pitchDeg: -5, sortOrder: 1, thumbnailKey: null, xyz: null, isVisible: true },
  ];
  it("shows path stations instead of a numbered tick strip", () => {
    const markers = buildViewerMarkers({
      waypoints: wps,
      clipId: "c1",
      t: 2,
      pins: [{ id: "p1", yawDeg: 20, pitchDeg: -8, label: "Spec" }],
      redactions: [],
      operatorPatch: parseOperatorPatch({ enabled: true, logoInPatch: true, showDate: true }),
    });
    expect(markers.filter((m) => m.data.kind === "waypoint")).toHaveLength(1);
    expect(markers.find((m) => m.data.kind === "waypoint")?.data.id).toBe("b");
    expect(markers.find((m) => m.data.kind === "waypoint")?.html).toContain("sw-path-station");
    expect(markers.find((m) => m.data.kind === "pin")?.html).toContain("sw-pin");
    expect(markers.find((m) => m.id === "nadir-patch")?.html).toContain("sw-nadir");
  });
  it("does not return a previous waypoint at the start", () => {
    expect(prevWaypoint(wps, "c1", 0)).toBeNull();
  });
});
