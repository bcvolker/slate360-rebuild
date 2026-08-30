import { describe, expect, it } from "vitest";
import { actionIdForEdge, clipEdgeActionsAtTime } from "./clip-edge-actions";
import { placeholderBriefingCues, activeBriefingCue } from "./briefing-script";
import { isNavMode, NAV_MODE_LABEL } from "./nav-mode";
import { pathHudNodes, pathHudOpacity, upcomingWaypoints } from "./path-hud";
import { absoluteViewHref, currentViewHref, locatorFromView, parseShareLocator, serializeShareLocator } from "./share-locator";
import { nextChapter } from "./chapters";
import { crossingKind } from "./clip-edges";
import { buildViewerMarkers } from "./markers";
import type { WaypointRecord } from "./types";
import { PREVIEW_CHAPTERS, PREVIEW_CLIPS, PREVIEW_EDGES } from "./chapter-preview-fixtures";

const wps: WaypointRecord[] = [
  { id: "a", clipId: "c1", tSeconds: 2, label: "A", zone: null, yawDeg: 10, pitchDeg: -8, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "b", clipId: "c1", tSeconds: 12, label: "B", zone: null, yawDeg: 28, pitchDeg: -18, sortOrder: 1, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "c", clipId: "c1", tSeconds: 24, label: "C", zone: null, yawDeg: 40, pitchDeg: -26, sortOrder: 2, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "d", clipId: "c1", tSeconds: 36, label: "D", zone: null, yawDeg: -12, pitchDeg: -32, sortOrder: 3, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "e", clipId: "c1", tSeconds: 48, label: "E", zone: null, yawDeg: 6, pitchDeg: -20, sortOrder: 4, thumbnailKey: null, xyz: null, isVisible: true },
];

describe("nav modes", () => {
  it("names Explore, Play Walk, and Guided Briefing", () => {
    expect(isNavMode("explore")).toBe(true);
    expect(NAV_MODE_LABEL.play).toBe("Play Walk");
    expect(NAV_MODE_LABEL.briefing).toBe("Guided Briefing");
  });
});

describe("path HUD", () => {
  it("emphasizes the nearest upcoming station and weakens 2–4 ahead", () => {
    const nodes = pathHudNodes(wps, "c1", 2, 1);
    expect(upcomingWaypoints(wps, "c1", 2).map((w) => w.id)).toEqual(["b", "c", "d", "e"]);
    expect(nodes[0].waypoint.id).toBe("b");
    expect(nodes[0].opacity).toBeGreaterThan(nodes[1].opacity);
    expect(nodes[1].opacity).toBeGreaterThan(nodes[3].opacity);
    expect(nodes[0].scale).toBeGreaterThan(nodes[3].scale);
  });
  it("fades substantially when stopped and returns when navigating", () => {
    expect(pathHudOpacity(false)).toBeLessThan(0.25);
    expect(pathHudOpacity(true)).toBe(1);
    const idle = pathHudNodes(wps, "c1", 2, pathHudOpacity(false));
    const live = pathHudNodes(wps, "c1", 2, pathHudOpacity(true));
    expect(idle[0].opacity).toBeLessThan(live[0].opacity);
  });
  it("does not claim metric occlusion — pitch only changes apparent scale", () => {
    const low = pathHudNodes(wps, "c1", 2)[0];
    const high = pathHudNodes(
      wps.map((w) => (w.id === "b" ? { ...w, pitchDeg: 8 } : w)),
      "c1",
      2,
    )[0];
    expect(low.scale).toBeGreaterThan(high.scale);
  });
});

describe("clip-edge actions", () => {
  it("exposes Take Off only for an aerial edge near the clip end", () => {
    expect(actionIdForEdge("aerial")).toBe("take-off");
    expect(actionIdForEdge("stairs")).toBe("go-upstairs");
    expect(actionIdForEdge("door")).toBe("go-inside");
    const actions = clipEdgeActionsAtTime({
      edges: PREVIEW_EDGES,
      clips: PREVIEW_CLIPS,
      clipId: "clip-2",
      t: 88,
      duration: 90,
    });
    expect(actions.map((a) => a.id)).toEqual(["take-off"]);
    expect(clipEdgeActionsAtTime({
      edges: PREVIEW_EDGES,
      clips: PREVIEW_CLIPS,
      clipId: "clip-2",
      t: 8,
      duration: 90,
    })).toEqual([]);
  });
  it("keeps same-clip travel uninterrupted and fades across clips", () => {
    expect(crossingKind("clip-1", "clip-1")).toBe("continue");
    expect(crossingKind("clip-2", "clip-3")).toBe("fade");
  });
});

describe("guided briefing placeholders", () => {
  it("emits script cues without speech fields", () => {
    const cues = placeholderBriefingCues(PREVIEW_CHAPTERS);
    expect(cues[0].text).toContain("Narration will attach here");
    expect(cues[0]).not.toHaveProperty("audioUrl");
    expect(activeBriefingCue(cues, 50, "clip-1")?.chapterId).toBe("ch-l1");
  });
});

describe("deep link current view", () => {
  it("round-trips clip, chapter, time, yaw, pitch, and pin", () => {
    const locator = locatorFromView({
      clipId: "clip-1",
      chapterId: "ch-lobby",
      tSeconds: 12.5,
      yawDeg: 18.25,
      pitchDeg: -6.5,
      pinId: "pin-doc",
    });
    const href = currentViewHref("/w/tok", locator);
    const parsed = parseShareLocator(href.split("?")[1] ?? "");
    expect(parsed.clipId).toBe("clip-1");
    expect(parsed.chapterId).toBe("ch-lobby");
    expect(parsed.tSeconds).toBe(12.5);
    expect(parsed.yawDeg).toBe(18.25);
    expect(parsed.pitchDeg).toBe(-6.5);
    expect(parsed.pinId).toBe("pin-doc");
    expect(serializeShareLocator(locator)).toContain("pin=pin-doc");
    expect(absoluteViewHref("https://slate360.ai", "/w/tok", locator)).toContain("https://slate360.ai/w/tok?");
  });
});

describe("chapters in navigation", () => {
  it("advances Entire Walk to the next named space", () => {
    expect(nextChapter(PREVIEW_CHAPTERS, null, PREVIEW_CHAPTERS[0])?.id).toBe("ch-l1");
    expect(nextChapter(PREVIEW_CHAPTERS, "ch-aerial", null)).toBeNull();
  });
});

describe("viewer path markers", () => {
  it("renders lookahead chevrons instead of a single next-station reticle", () => {
    const markers = buildViewerMarkers({
      waypoints: wps,
      clipId: "c1",
      t: 2,
      pins: [{ id: "p1", yawDeg: 20, pitchDeg: -8, label: "Spec" }],
      redactions: [],
    });
    const path = markers.filter((m) => m.data.kind === "waypoint");
    expect(path.length).toBe(4);
    expect(path[0].html).toContain("sw-path");
    expect(path[0].html).toContain("sw-reticle");
    expect(path[1].html).toContain('data-rank="1"');
    expect(markers.find((m) => m.data.kind === "pin")?.html).toContain("sw-pin");
  });
});
