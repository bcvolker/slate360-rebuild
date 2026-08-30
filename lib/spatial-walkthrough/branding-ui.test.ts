import { describe, expect, it } from "vitest";
import { contrastRatio, contrastWarning } from "./contrast";
import { extractPaletteFromSvg, suggestThemeFromColors } from "./palette";
import { sanitizeSvg, svgLooksUnsafe } from "./sanitize-svg";
import { filterWalkthroughCards, emptyLibraryFilter } from "./library-filter";
import { shareStatusFromRows } from "./share-status";
import { markerKindFromPinType, markerScaleFromPitch } from "./marker-scale";
import { parseOperatorPatch } from "./operator-patch";
import { buildViewerMarkers } from "./markers";

describe("contrast", () => {
  it("flags weak text on dark canvas", () => {
    expect(contrastRatio("#777777", "#0b0f15") ?? 0).toBeLessThan(4.5);
    expect(contrastWarning("#f8fafc", "#0b0f15")).toBeNull();
  });
});

describe("palette from logo", () => {
  it("reads fills from svg and suggests without requiring apply", () => {
    const svg = `<svg><rect fill="#1b3a4b"/><circle fill="#3aa0c8"/></svg>`;
    const colors = extractPaletteFromSvg(svg);
    expect(colors).toContain("#3aa0c8");
    expect(suggestThemeFromColors(colors)?.accentColor).toBeTruthy();
  });
});

describe("svg sanitize", () => {
  it("strips script and rejects leftovers that stay unsafe", () => {
    const dirty = `<svg><script>alert(1)</script><rect fill="#fff"/></svg>`;
    const out = sanitizeSvg(dirty);
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.svg.includes("script")).toBe(false);
    expect(svgLooksUnsafe(`<svg onclick="x()"><rect/></svg>`)).toBe(true);
  });
});

describe("library filters", () => {
  const items = [
    { id: "1", title: "MEP", captured_at: "2026-08-12", building: "A", floor: "L12", zone: "Mech", walkthrough_type: "interior", status: "ready", duration_s: 10, waypointCount: 1, pinCount: 1 },
    { id: "2", title: "Dock", captured_at: "2026-07-01", building: "B", floor: "L1", zone: "Dock", walkthrough_type: "exterior", status: "ready", duration_s: 10, waypointCount: 1, pinCount: 0 },
  ];
  it("filters by building and date", () => {
    const filter = { ...emptyLibraryFilter(), building: "A", dateFrom: "2026-08-01" };
    expect(filterWalkthroughCards(items, filter).map((i) => i.id)).toEqual(["1"]);
  });
});

describe("share status", () => {
  it("returns live when an unexpired token exists", () => {
    expect(shareStatusFromRows([{ is_revoked: false, expires_at: null }])).toBe("live");
    expect(shareStatusFromRows([])).toBe("unshared");
  });
});

describe("marker language", () => {
  it("distinguishes waypoint, document, and issue", () => {
    expect(markerKindFromPinType("issue")).toBe("issue");
    expect(markerKindFromPinType("drawing")).toBe("document");
    expect(markerScaleFromPitch(-40)).toBeGreaterThan(markerScaleFromPitch(0));
    const markers = buildViewerMarkers({
      waypoints: [{ id: "a", clipId: "c", tSeconds: 2, label: "Next", zone: null, yawDeg: 0, pitchDeg: -30, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true }],
      clipId: "c",
      t: 0,
      pins: [{ id: "i", yawDeg: 10, pitchDeg: -12, label: "Hold", pinType: "issue" }],
      redactions: [],
      operatorPatch: parseOperatorPatch({ enabled: true, fill: "brand", showDate: true, logoInPatch: true, showCompass: true, headingDeg: 12 }),
      chrome: { title: "Level 12", capturedAt: "2026-08-12T00:00:00.000Z" },
    });
    expect(markers.find((m) => m.data.kind === "pin")?.html).toContain("sw-mark--issue");
    expect(markers.find((m) => m.id === "nadir-patch")?.html).toContain("Level 12");
    expect(markers.find((m) => m.id === "nadir-patch")?.html).toContain("sw-nadir-compass");
  });
});
