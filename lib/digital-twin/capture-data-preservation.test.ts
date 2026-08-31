import { describe, expect, it } from "vitest";
import {
  PREVIEW_DEFAULT_MAX_POINTS,
  PREVIEW_PLY_FILENAME,
  TRAJECTORY_FILENAME,
  TRAJECTORY_TARGET_HZ,
  buildSourceManifest,
  estimateTrajectoryBytes,
  insertPreviewVoxel,
  keyframeThresholds,
  parseReconstructionQuality,
  shouldRecordKeyframe,
  simulateCapture,
} from "./capture-data-preservation";

describe("iPhone capture data preservation", () => {
  it("defaults reconstruction quality to normal 8 cm / 8° and keeps high quality opt-in", () => {
    expect(parseReconstructionQuality(undefined)).toBe("normal");
    expect(parseReconstructionQuality("high")).toBe("high");
    expect(keyframeThresholds("normal")).toMatchObject({ translationM: 0.08, rotationRad: 0.14 });
    expect(keyframeThresholds("high")).toMatchObject({ translationM: 0.04, rotationRad: 0.07 });
    expect(shouldRecordKeyframe({
      elapsedSec: 0.05,
      movedM: 1,
      turnedRad: 1,
      isFirst: false,
      thresholds: keyframeThresholds("high"),
    })).toBe(false);
  });

  it("does not cap a 4-minute trajectory", () => {
    const frameCount = 4 * 60 * TRAJECTORY_TARGET_HZ;
    const result = simulateCapture({
      frames: Array.from({ length: frameCount }, () => ({ hasDepth: true, voxelKeys: [] })),
      durationSec: 240,
    });
    expect(result.trajectoryPoses.length).toBe(14400);
    expect(result.telemetry.trajectoryPosesWritten).toBe(14400);
    expect(result.trajectoryCapped).toBe(false);
    expect(result.manifest.roles.trajectory_master.count).toBe(14400);
    expect(estimateTrajectoryBytes(240)).toBeLessThan(6 * 1024 * 1024);
  });

  it("persists trajectory even when depth is absent", () => {
    const result = simulateCapture({
      frames: Array.from({ length: 180 }, () => ({ hasDepth: false })),
    });
    expect(result.telemetry.trajectoryPosesWritten).toBe(180);
    expect(result.depthKeyframesWritten).toBe(0);
    expect(result.telemetry.previewPoints).toBe(0);
  });

  it("cannot let the 500k preview cap stop depth or trajectory", () => {
    const frames = Array.from({ length: 40 }, (_, i) => ({
      hasDepth: true,
      voxelKeys: [`v-${i}`],
    }));
    const result = simulateCapture({
      frames,
      previewMaxPoints: 10,
    });
    expect(result.telemetry.previewPoints).toBe(10);
    expect(result.telemetry.voxelUpdatesSkipped).toBe(30);
    expect(result.telemetry.trajectoryPosesWritten).toBe(40);
    expect(result.depthKeyframesWritten).toBe(40);
  });

  it("never uses arbitrary prefix / hash-order deletion for preview voxels", () => {
    const grid = new Map<string, unknown>();
    const keys = ["a", "b", "c", "d", "e", "f"];
    const outcomes = keys.map((key) => insertPreviewVoxel(grid, key, 4));
    expect(outcomes.map((row) => row.evicted)).toEqual([false, false, false, false, false, false]);
    expect([...grid.keys()]).toEqual(["a", "b", "c", "d"]);
    expect(grid.size).toBe(4);
    expect(insertPreviewVoxel(grid, "a", 4).inserted).toBe(false);
  });

  it("source manifest differentiates master streams from the preview PLY", () => {
    const telemetry = {
      arFramesReceived: 120,
      trajectoryPosesWritten: 120,
      videoFramesWritten: 60,
      videoFramesDropped: 2,
      depthKeyframesWritten: 18,
      depthBacklogDrops: 1,
      voxelUpdatesSkipped: 9,
      previewPoints: PREVIEW_DEFAULT_MAX_POINTS,
      trackingLimitedFrames: 3,
      trajectoryWriteFailures: 0,
    };
    const manifest = buildSourceManifest({
      quality: "normal",
      durationSec: 4,
      videoFilenames: ["twin_capture_clip1.mp4"],
      telemetry,
      depthWidth: 256,
      depthHeight: 192,
    });
    expect(manifest.roles.trajectory_master).toMatchObject({
      role: "trajectory_master",
      filename: TRAJECTORY_FILENAME,
      is_sensor_master: true,
    });
    expect(manifest.roles.depth_keyframe_master.is_sensor_master).toBe(true);
    expect(manifest.roles.rgb_video_master.is_sensor_master).toBe(true);
    expect(manifest.roles.point_cloud_preview).toMatchObject({
      role: "point_cloud_preview",
      filename: PREVIEW_PLY_FILENAME,
      is_sensor_master: false,
      maxPoints: PREVIEW_DEFAULT_MAX_POINTS,
      voxel_size_m: 0.02,
    });
    expect(manifest.qa_summary).toContain("120 traj");
    expect(manifest.qa_summary).toContain("18 depth kf");
  });
});
