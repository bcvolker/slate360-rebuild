import { describe, expect, it } from "vitest";
import {
  chapterAtTime,
  chapterBands,
  chapterDeleteTouchesSource,
  chapterVisibleOnPolicy,
  clampToChapter,
  displayChapterName,
  nextChapter,
  normalizeTimeRange,
  toChapter,
  waypointsInChapter,
} from "./chapters";
import { crossingKind, impliedEdges, locationChip, outgoingEdge, resolveEdges, toClipEdge } from "./clip-edges";
import { isLegacyShareUrl, parseShareLocator, serializeShareLocator, sharePath } from "./share-locator";
import { orderedWaypointsAll, nextInList, indexAtPosition } from "./chapters";
import { spaceHref, spaceLibraryCards } from "./space-cards";
import type { ChapterRecord } from "./chapters";
import type { ClipSummary } from "./clip-edges";
import type { WaypointRecord } from "./types";

function ch(partial: Partial<ChapterRecord> & { id: string; clipId: string; name: string; startTime: number; endTime: number }): ChapterRecord {
  return {
    walkthroughId: "wt",
    building: null,
    floor: null,
    zone: null,
    chapterType: "other",
    defaultYaw: 12,
    defaultPitch: -8,
    sortOrder: 0,
    thumbnailKey: null,
    visibility: "client",
    description: null,
    ...partial,
  };
}

const lobby = ch({ id: "ch-lobby", clipId: "c1", name: "Lobby", chapterType: "lobby", startTime: 0, endTime: 45, sortOrder: 0 });
const level1 = ch({ id: "ch-l1", clipId: "c1", name: "Level 1", chapterType: "floor", floor: "L1", startTime: 45, endTime: 140, sortOrder: 1 });
const mech = ch({ id: "ch-mech", clipId: "c1", name: "Mechanical Room", chapterType: "mechanical", zone: "MEP", startTime: 140, endTime: 210, sortOrder: 2 });

const clips: ClipSummary[] = [
  { id: "c1", title: "Interior", zone: null, durationS: 420, defaultYaw: 0, defaultPitch: 0, sortOrder: 0, videoUrl: "/v1", posterUrl: null },
  { id: "c2", title: "Exterior North", zone: "North", durationS: 90, defaultYaw: 40, defaultPitch: -6, sortOrder: 1, videoUrl: "/v2", posterUrl: null },
];

const wps: WaypointRecord[] = [
  { id: "a", clipId: "c1", tSeconds: 20, label: "Lobby desk", zone: null, yawDeg: 0, pitchDeg: 0, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "b", clipId: "c1", tSeconds: 80, label: "L1 corridor", zone: null, yawDeg: 0, pitchDeg: 0, sortOrder: 1, thumbnailKey: null, xyz: null, isVisible: true },
  { id: "c", clipId: "c2", tSeconds: 10, label: "North entry", zone: null, yawDeg: 0, pitchDeg: 0, sortOrder: 0, thumbnailKey: null, xyz: null, isVisible: true },
];

describe("chapter object", () => {
  it("parses additive fields without copying media", () => {
    const row = toChapter({
      id: "x", walkthrough_id: "wt", clip_id: "c1", name: "Stair 1", chapter_type: "stairs",
      start_time: 210, end_time: 250, default_yaw: 90, default_pitch: -10, sort_order: 3, visibility: "public",
    });
    expect(row.clipId).toBe("c1");
    expect(row.chapterType).toBe("stairs");
    expect(chapterDeleteTouchesSource()).toBe(false);
  });
  it("rejects a zero-length range", () => {
    expect(normalizeTimeRange(12, 12)).toBeNull();
    expect(normalizeTimeRange(40, 12)).toEqual({ startTime: 12, endTime: 40 });
  });
});

describe("waypoint scope", () => {
  it("limits next/prev to the selected chapter", () => {
    expect(waypointsInChapter(wps, lobby).map((w) => w.id)).toEqual(["a"]);
    expect(waypointsInChapter(wps, level1).map((w) => w.id)).toEqual(["b"]);
  });
  it("Entire Walk orders waypoints across clips", () => {
    expect(orderedWaypointsAll(wps, ["c1", "c2"]).map((w) => w.id)).toEqual(["a", "b", "c"]);
    expect(indexAtPosition(wps, ["c1", "c2"], "c1", 80)).toBe(1);
    expect(nextInList(orderedWaypointsAll(wps, ["c1", "c2"]), 1)?.id).toBe("c");
  });
});

describe("doorway vs clip crossing", () => {
  it("does not cut when the next chapter is the same clip", () => {
    expect(crossingKind("c1", "c1")).toBe("continue");
    expect(chapterAtTime([lobby, level1, mech], "c1", 50)?.name).toBe("Level 1");
  });
  it("fades only when crossing source clips", () => {
    expect(crossingKind("c1", "c2")).toBe("fade");
    const edges = impliedEdges(clips, "wt");
    expect(outgoingEdge(edges, "c1", "end")?.destClipId).toBe("c2");
    expect(locationChip(clips[1], "exterior")).toContain("Exterior");
  });
  it("uses stored edges when present", () => {
    const stored = [toClipEdge({
      id: "e1", walkthrough_id: "wt", source_clip_id: "c1", dest_clip_id: "c2",
      source_endpoint: "end", dest_endpoint: "start", transition_type: "stairs",
    })];
    expect(resolveEdges(clips, stored, "wt")[0].transitionType).toBe("stairs");
  });
});

describe("share locator", () => {
  it("keeps bare /w/{token} as Entire Walk", () => {
    expect(isLegacyShareUrl("")).toBe(true);
    expect(isLegacyShareUrl("?code=abc")).toBe(true);
    expect(parseShareLocator("").chapterId).toBeNull();
    expect(sharePath("tok")).toBe("/w/tok");
  });
  it("round-trips clip, chapter, time, yaw, pitch, pin", () => {
    const qs = serializeShareLocator({
      walkthroughId: null, clipId: "c1", chapterId: "ch-l1", tSeconds: 46.25, yawDeg: 18, pitchDeg: -6, pinId: "pin-1",
    });
    const loc = parseShareLocator(qs);
    expect(loc.chapterId).toBe("ch-l1");
    expect(loc.tSeconds).toBe(46.25);
    expect(loc.pinId).toBe("pin-1");
  });
});

describe("library spaces", () => {
  it("presents a chapter independently with parent date/building fallback", () => {
    const spaces = spaceLibraryCards(
      [{ id: "wt", captured_at: "2026-08-12", building: "Tower A", floor: "L1", zone: null, walkthrough_type: "interior", status: "published" }],
      [mech],
    );
    expect(spaces[0].title).toBe("Mechanical Room");
    expect(spaces[0].building).toBe("Tower A");
    expect(spaces[0].zone).toBe("MEP");
    expect(spaceHref(spaces[0], (id) => `/spatial-walkthrough/${id}`)).toContain("chapter=ch-mech");
  });
  it("hides internal chapters from public policy", () => {
    expect(chapterVisibleOnPolicy("internal", "public")).toBe(false);
    expect(chapterVisibleOnPolicy("client", "client")).toBe(true);
  });
});

describe("select chapter", () => {
  it("seeks to start and reports the chapter name", () => {
    expect(clampToChapter(200, level1)).toBe(140);
    expect(displayChapterName(level1, lobby, false)).toBe("Level 1");
    expect(displayChapterName(null, lobby, true)).toBe("Lobby");
    expect(nextChapter([lobby, level1, mech], "ch-lobby", lobby)?.id).toBe("ch-l1");
  });
  it("draws timeline bands for the active clip", () => {
    const bands = chapterBands([lobby, level1], "c1", 420, "ch-l1");
    expect(bands).toHaveLength(2);
    expect(bands[1].active).toBe(true);
    expect(bands[0].widthPct).toBeGreaterThan(0);
  });
});
