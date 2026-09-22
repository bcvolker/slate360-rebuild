import { describe, expect, it } from "vitest";
import { segmentDurations, samplePath } from "@/lib/digital-twin/camera-path-math";
import type { TwinCameraPath } from "@/lib/digital-twin/camera-path-types";
import { adoptPlaybackPath, pathDurationMs, pathIsPlayable, pathPlayDurationMs, playbackModelMatches, playbackPause, playbackPlay, playbackRestart, playbackTick } from "./playback-state";

const path: TwinCameraPath = {
  loop: false,
  keyframes: [
    { id: "a", position: [0, 0, 0], lookAt: [0, 0, 1], durationMs: 1000, easing: "linear" },
    { id: "b", position: [10, 0, 0], lookAt: [0, 0, 1], durationMs: 1000, easing: "linear" },
    { id: "c", position: [10, 0, 10], lookAt: [0, 0, 1], durationMs: 1000, easing: "linear" },
  ],
};

describe("camera path playback", () => {
  it("samples the start, middle, and end of one model path", () => {
    const total = pathDurationMs(segmentDurations(path));
    expect(total).toBe(2000);
    const start = samplePath(path, 0);
    const middle = samplePath(path, 1000);
    const end = samplePath(path, total);
    expect(start?.position.x).toBeCloseTo(0, 4);
    expect(middle?.position.x).toBeGreaterThan(0);
    expect(end?.position.distanceTo(middle!.position)).toBeGreaterThan(0);
    const held = samplePath(path, total);
    expect(held?.position.x).toBeCloseTo(end!.position.x, 5);
    expect(held?.position.z).toBeCloseTo(end!.position.z, 5);
  });

  it("loops only when the path says to", () => {
    const looped = samplePath({ ...path, loop: true }, 2000);
    const once = samplePath(path, 2000);
    expect(looped?.position.x).toBeCloseTo(0, 4);
    expect(once?.position.x).not.toBeCloseTo(0, 0);
  });

  it("pauses, resumes, and restarts without depending on a clock", () => {
    const playing = playbackPlay({ status: "idle", elapsedMs: 0 });
    const moved = playbackTick(playing, 400, 2000, false);
    const paused = playbackPause(moved);
    const held = playbackTick(paused, 400, 2000, false);
    expect(held).toEqual(paused);
    const resumed = playbackTick(playbackPlay(paused), 100, 2000, false);
    expect(resumed.elapsedMs).toBe(500);
    expect(playbackRestart()).toEqual({ status: "paused", elapsedMs: 0 });
    expect(playbackTick(playing, 5000, 2000, false)).toEqual({ status: "paused", elapsedMs: 2000 });
    expect(playbackTick(playing, 2500, 2000, true).elapsedMs).toBe(500);
  });

  it("will not play a path against a different model", () => {
    expect(playbackModelMatches("model-a", "model-a")).toBe(true);
    expect(playbackModelMatches("model-a", "model-b")).toBe(false);
    expect(playbackModelMatches("", "model-a")).toBe(false);
    expect(pathPlayDurationMs(path)).toBe(pathDurationMs(segmentDurations(path)));
    expect(pathIsPlayable(path)).toBe(true);
    expect(pathIsPlayable({ keyframes: [path.keyframes[0]!] })).toBe(false);
    const playing = adoptPlaybackPath(null, "model-a", path);
    const moved = { ...playing, playback: playbackTick(playbackPlay(playing.playback), 400, 2000, false) };
    expect(adoptPlaybackPath(moved, "model-a", path).playback).toEqual(moved.playback);
    const other = adoptPlaybackPath(moved, "model-b", path);
    expect(other.modelId).toBe("model-b");
    expect(other.playback).toEqual({ status: "idle", elapsedMs: 0 });
  });
});
