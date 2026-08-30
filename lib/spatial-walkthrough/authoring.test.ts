import { describe, expect, it } from "vitest";
import {
  interpolateKeyframes,
  keyframeToPatch,
  keyframesFromLegacyOrStored,
  legacyPatchToKeyframe,
  lerpYaw,
  operatorRegions,
  parseKeyframes,
  removeKeyframeAt,
  upsertKeyframe,
  type OperatorKeyframe,
} from "./keyframes";
import { AUTHORING_MODES } from "./redaction";
import { interpolateOrientation, parseOrientationTrack, sphereCorrectionFromOrientation, upsertOrientation } from "./orientation";
import { applySkip, skipIntervals, yawInRange, wrapYaw, sectorYawCenter, rulesForPolicy } from "./redaction";
import { deliveredTime, excludeDraft, masterTimeFromDelivered, playbackHead, resizeRange, snapTime } from "./timeline-model";
import { contactStripSamples, jumpPrivacy } from "./privacy-review";
import { DEFAULT_OPERATOR_PATCH } from "./types";
import { clipReadyPatch } from "./derivatives";

const a: OperatorKeyframe = {
  t: 0, yawCenter: 170, yawWidth: 40, pitchTop: -10, pitchBottom: -70, nadirRadius: 0.2, feather: 0, style: "solid",
};
const b: OperatorKeyframe = {
  t: 10, yawCenter: -170, yawWidth: 80, pitchTop: 0, pitchBottom: -40, nadirRadius: 0.4, feather: 0.1, style: "blur",
};

describe("keyframe interpolation", () => {
  it("lerps yaw the short way across ±180", () => {
    expect(Math.abs(wrapYaw(lerpYaw(170, -170, 0.5) - 180))).toBeCloseTo(0, 5);
    const mid = interpolateKeyframes([a, b], 5);
    expect(Math.abs(wrapYaw((mid?.yawCenter ?? 0) - 180))).toBeCloseTo(0, 0);
    expect(mid?.yawWidth).toBeCloseTo(60, 5);
    expect(mid?.nadirRadius).toBeCloseTo(0.3, 5);
  });

  it("holds before first and after last", () => {
    expect(interpolateKeyframes([a, b], -1)?.yawWidth).toBe(40);
    expect(interpolateKeyframes([a, b], 99)?.style).toBe("blur");
  });

  it("upserts and removes at the same timestamp", () => {
    const next = upsertKeyframe([a], { ...a, t: 0.02, yawWidth: 50 });
    expect(next).toHaveLength(1);
    expect(next[0].yawWidth).toBe(50);
    expect(removeKeyframeAt(next, 0)).toHaveLength(0);
  });
});

describe("seam wrapping", () => {
  it("treats 160 to -160 as a rear sector, not a wrap through 0", () => {
    expect(yawInRange(175, 160, -160)).toBe(true);
    expect(yawInRange(0, 160, -160)).toBe(false);
    expect(Math.abs(sectorYawCenter(160, -160))).toBeGreaterThan(170);
    expect(wrapYaw(190)).toBeCloseTo(-170, 5);
  });
});

describe("skip playback", () => {
  const rules = [
    { clipId: "c", tStart: 10, tEnd: 20, yawMin: null, yawMax: null, pitchMin: null, pitchMax: null, mode: "skip" as const, policy: "public" as const },
    { clipId: "c", tStart: 30, tEnd: 32, yawMin: null, yawMax: null, pitchMin: null, pitchMax: null, mode: "skip" as const, policy: "client" as const },
  ];
  it("jumps master time to the end of an excluded range", () => {
    expect(applySkip(15, skipIntervals(rules, "c"))).toBe(20);
    expect(playbackHead(15, rulesForPolicy(rules, "public"), "c")).toBe(20);
    expect(playbackHead(15, rulesForPolicy(rules, "master"), "c")).toBe(15);
  });
  it("maps delivered time without cutting the master clock", () => {
    const skips = skipIntervals(rulesForPolicy(rules, "public"), "c");
    expect(deliveredTime(25, skips)).toBe(15);
    expect(masterTimeFromDelivered(15, skips)).toBe(25);
  });
});

describe("policy isolation and MASTER immutability", () => {
  it("MASTER playback ignores skip rules", () => {
    const skip = [{ clipId: "c", tStart: 4, tEnd: 8, yawMin: null, yawMax: null, pitchMin: null, pitchMax: null, mode: "skip" as const, policy: "client" as const }];
    expect(rulesForPolicy(skip, "master")).toHaveLength(0);
    expect(rulesForPolicy(skip, "client")).toHaveLength(1);
    expect(rulesForPolicy(skip, "public")).toHaveLength(1);
  });
  it("ingest ready patch never writes master_key", () => {
    const patch = clipReadyPatch({ proxyKey: "p", posterKey: "j", masterSha256: "deadbeef" });
    expect(patch).not.toHaveProperty("master_key");
  });
});

describe("legacy static masks", () => {
  it("promotes a static operator patch to one keyframe", () => {
    const kf = legacyPatchToKeyframe(DEFAULT_OPERATOR_PATCH);
    expect(kf.yawCenter).toBe(DEFAULT_OPERATOR_PATCH.rearYawCenter);
    const fromEmpty = keyframesFromLegacyOrStored([], DEFAULT_OPERATOR_PATCH);
    expect(fromEmpty).toHaveLength(1);
    const patch = keyframeToPatch(fromEmpty[0], DEFAULT_OPERATOR_PATCH);
    expect(patch.rearYawWidth).toBe(DEFAULT_OPERATOR_PATCH.rearYawWidth);
  });
  it("prefers stored keyframes over the static patch", () => {
    expect(keyframesFromLegacyOrStored([a, b], DEFAULT_OPERATOR_PATCH)).toHaveLength(2);
  });
});

describe("timeline range edits", () => {
  it("resizes edges and builds an exclude draft", () => {
    const r = resizeRange({ id: "x", track: "skip", start: 4, end: 10, label: "ex" }, "end", 12);
    expect(r.end).toBe(12);
    expect(excludeDraft(3, 8)).toEqual({ start: 3, end: 8 });
    expect(excludeDraft(5, 5.05)).toBeNull();
    expect(snapTime(10.2, [0, 10, 20], 0.4)).toBe(10);
  });
});

describe("orientation", () => {
  it("interpolates and maps to sphereCorrection, not CSS", () => {
    const track = parseOrientationTrack({
      source: "manual",
      keyframes: [
        { t: 0, rollDeg: 0, pitchDeg: 0, yawDeg: 0 },
        { t: 4, rollDeg: 8, pitchDeg: -4, yawDeg: 20 },
      ],
    });
    const mid = interpolateOrientation(track, 2);
    expect(mid.rollDeg).toBeCloseTo(4, 5);
    expect(sphereCorrectionFromOrientation(mid).roll).toBe("4deg");
    const next = upsertOrientation(track, { t: 4, rollDeg: 10, pitchDeg: -4, yawDeg: 20 });
    expect(next.keyframes).toHaveLength(2);
    expect(next.keyframes[1].rollDeg).toBe(10);
  });
});

describe("privacy review", () => {
  it("jumps previous/next keyframe and samples a contact strip", () => {
    expect(jumpPrivacy("next", 1, [a, b], [])).toBe(10);
    expect(jumpPrivacy("prev", 6, [a, b], [])).toBe(0);
    expect(contactStripSamples([a, b], 10, 5).map((s) => s.t)).toEqual([0, 5, 10]);
  });
});

describe("parse keyframes", () => {
  it("drops malformed rows", () => {
    expect(parseKeyframes([{ t: -1, yawCenter: 0 }, { t: 2, yawWidth: 40 }]).map((k) => k.t)).toEqual([2]);
  });
});

describe("independent privacy regions", () => {
  it("interpolates each operator-patch row on its own track", () => {
    expect(AUTHORING_MODES).toContain("operator-patch");
    const regions = operatorRegions(
      [
        { id: "rear", mode: "operator-patch", keyframes: [a, b] },
        { id: "panel", mode: "operator-patch", keyframes: [{ ...a, t: 0, yawCenter: 20, yawWidth: 30 }] },
      ],
      DEFAULT_OPERATOR_PATCH,
    );
    expect(regions).toHaveLength(2);
    expect(interpolateKeyframes(regions[0].frames, 5)?.yawWidth).toBeCloseTo(60, 5);
    expect(Math.abs(wrapYaw((interpolateKeyframes(regions[0].frames, 5)?.yawCenter ?? 0) - 180))).toBeCloseTo(0, 0);
    expect(interpolateKeyframes(regions[1].frames, 5)?.yawCenter).toBe(20);
  });
});
