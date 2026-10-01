/**
 * iPhone capture data-preservation contract.
 *
 * Native ARKit capture must keep inexpensive trajectory and packed depth
 * regardless of the on-device preview point-cloud budget. The 500k PLY is a
 * display preview, not the sensor master.
 *
 * This module is the testable policy the Swift capture path implements.
 */

export const TRAJECTORY_FILENAME = "lidar_traj.jsonl";
export const PREVIEW_PLY_FILENAME = "preview_point_cloud.ply";
export const DEPTH_EVIDENCE_FILENAME = "lidar_depth.s360depth";
export const KEYFRAME_POSES_FILENAME = "lidar_poses.json";
export const SOURCE_MANIFEST_FILENAME = "capture_manifest.json";

export const PREVIEW_DEFAULT_MAX_POINTS = 500_000;
export const PREVIEW_VOXEL_SIZE_M = 0.02;
export const TRAJECTORY_TARGET_HZ = 60;
export const VIDEO_TARGET_HZ = 30;
export const KEYFRAME_MIN_INTERVAL_SEC = 0.1;
export const KEYFRAME_MAX_INTERVAL_SEC = 2.0;

export type ReconstructionQuality = "normal" | "high";

export type CaptureSourceRole =
  | "trajectory_master"
  | "depth_keyframe_master"
  | "rgb_video_master"
  | "point_cloud_preview";

export type KeyframeThresholds = {
  translationM: number;
  rotationRad: number;
  minIntervalSec: number;
  maxIntervalSec: number;
};

export type CaptureTelemetrySnapshot = {
  arFramesReceived: number;
  trajectoryPosesWritten: number;
  videoFramesWritten: number;
  videoFramesDropped: number;
  depthKeyframesWritten: number;
  depthBacklogDrops: number;
  voxelUpdatesSkipped: number;
  previewPoints: number;
  trackingLimitedFrames: number;
  trajectoryWriteFailures: number;
};

export type CaptureSourceRoleRecord = {
  role: CaptureSourceRole;
  filename: string | string[];
  count: number;
  frame_rate_hz?: number;
  dropped?: number;
  keyframe_translation_m?: number;
  keyframe_rotation_rad?: number;
  keyframe_min_interval_sec?: number;
  keyframe_max_interval_sec?: number;
  maxPoints?: number;
  voxel_size_m?: number;
  depth_width?: number;
  depth_height?: number;
  duration_sec?: number;
  is_sensor_master: boolean;
};

export type CaptureSourceManifest = {
  version: number;
  reconstruction_quality: ReconstructionQuality;
  duration_sec: number;
  roles: Record<CaptureSourceRole, CaptureSourceRoleRecord>;
  telemetry: CaptureTelemetrySnapshot;
  qa_summary: string;
};

export function keyframeThresholds(quality: ReconstructionQuality): KeyframeThresholds {
  if (quality === "high") {
    return {
      translationM: 0.04,
      rotationRad: 0.07,
      minIntervalSec: KEYFRAME_MIN_INTERVAL_SEC,
      maxIntervalSec: KEYFRAME_MAX_INTERVAL_SEC,
    };
  }
  return {
    translationM: 0.08,
    rotationRad: 0.14,
    minIntervalSec: KEYFRAME_MIN_INTERVAL_SEC,
    maxIntervalSec: KEYFRAME_MAX_INTERVAL_SEC,
  };
}

export function parseReconstructionQuality(value: string | null | undefined): ReconstructionQuality {
  return value === "high" ? "high" : "normal";
}

/** Preview voxels: insert until the display budget is full. Never evict. */
export function insertPreviewVoxel(
  grid: Map<string, unknown>,
  key: string,
  maxPoints: number,
): { inserted: boolean; skipped: boolean; evicted: boolean } {
  if (grid.has(key)) return { inserted: false, skipped: false, evicted: false };
  if (grid.size >= maxPoints) return { inserted: false, skipped: true, evicted: false };
  grid.set(key, true);
  return { inserted: true, skipped: false, evicted: false };
}

export function shouldRecordKeyframe(opts: {
  elapsedSec: number;
  movedM: number;
  turnedRad: number;
  isFirst: boolean;
  thresholds: KeyframeThresholds;
}): boolean {
  if (opts.elapsedSec < opts.thresholds.minIntervalSec) return false;
  if (opts.isFirst || opts.elapsedSec >= opts.thresholds.maxIntervalSec) return true;
  return opts.movedM >= opts.thresholds.translationM || opts.turnedRad >= opts.thresholds.rotationRad;
}

export function estimateTrajectoryBytes(durationSec: number, hz = TRAJECTORY_TARGET_HZ, bytesPerPose = 360): number {
  return Math.max(0, Math.round(durationSec * hz * bytesPerPose));
}

export function formatQaSummary(t: CaptureTelemetrySnapshot, durationSec: number): string {
  const dur = `${Math.floor(durationSec / 60)}m${String(Math.round(durationSec % 60)).padStart(2, "0")}s`;
  return [
    `QA ${dur}`,
    `${t.trajectoryPosesWritten} traj`,
    `${t.depthKeyframesWritten} depth kf`,
    `${t.videoFramesWritten} video (${t.videoFramesDropped} dropped)`,
    `preview ${t.previewPoints}`,
    `${t.depthBacklogDrops} backlog drops`,
    `${t.voxelUpdatesSkipped} voxels skipped`,
    `${t.trackingLimitedFrames} tracking-limited`,
  ].join(" · ");
}

export function buildSourceManifest(input: {
  quality: ReconstructionQuality;
  durationSec: number;
  videoFilenames: string[];
  telemetry: CaptureTelemetrySnapshot;
  depthWidth: number;
  depthHeight: number;
}): CaptureSourceManifest {
  const thresholds = keyframeThresholds(input.quality);
  const roles: Record<CaptureSourceRole, CaptureSourceRoleRecord> = {
    trajectory_master: {
      role: "trajectory_master",
      filename: TRAJECTORY_FILENAME,
      count: input.telemetry.trajectoryPosesWritten,
      frame_rate_hz: TRAJECTORY_TARGET_HZ,
      dropped: input.telemetry.trajectoryWriteFailures,
      duration_sec: input.durationSec,
      is_sensor_master: true,
    },
    depth_keyframe_master: {
      role: "depth_keyframe_master",
      filename: DEPTH_EVIDENCE_FILENAME,
      count: input.telemetry.depthKeyframesWritten,
      keyframe_translation_m: thresholds.translationM,
      keyframe_rotation_rad: thresholds.rotationRad,
      keyframe_min_interval_sec: thresholds.minIntervalSec,
      keyframe_max_interval_sec: thresholds.maxIntervalSec,
      depth_width: input.depthWidth,
      depth_height: input.depthHeight,
      duration_sec: input.durationSec,
      is_sensor_master: true,
    },
    rgb_video_master: {
      role: "rgb_video_master",
      filename: input.videoFilenames.length === 1 ? input.videoFilenames[0]! : input.videoFilenames,
      count: input.telemetry.videoFramesWritten,
      frame_rate_hz: VIDEO_TARGET_HZ,
      dropped: input.telemetry.videoFramesDropped,
      duration_sec: input.durationSec,
      is_sensor_master: true,
    },
    point_cloud_preview: {
      role: "point_cloud_preview",
      filename: PREVIEW_PLY_FILENAME,
      count: input.telemetry.previewPoints,
      maxPoints: PREVIEW_DEFAULT_MAX_POINTS,
      voxel_size_m: PREVIEW_VOXEL_SIZE_M,
      is_sensor_master: false,
    },
  };
  return {
    version: 1,
    reconstruction_quality: input.quality,
    duration_sec: input.durationSec,
    roles,
    telemetry: input.telemetry,
    qa_summary: formatQaSummary(input.telemetry, input.durationSec),
  };
}

export type SimulatedFrame = {
  hasDepth: boolean;
  trackingLimited?: boolean;
  voxelKeys?: string[];
};

export type CaptureSimulationResult = {
  trajectoryPoses: Array<{ tracking_state: string }>;
  depthKeyframesWritten: number;
  telemetry: CaptureTelemetrySnapshot;
  previewKeys: string[];
  trajectoryCapped: boolean;
  prefixEvictionUsed: boolean;
  manifest: CaptureSourceManifest;
};

/**
 * Minimal capture-loop simulator used by tests. Mirrors native isolation:
 * trajectory is written for every ARFrame, packed depth is independent of
 * the preview budget, and preview voxels never evict.
 */
export function simulateCapture(opts: {
  frames: SimulatedFrame[];
  previewMaxPoints?: number;
  quality?: ReconstructionQuality;
  durationSec?: number;
  videoFilenames?: string[];
  depthWidth?: number;
  depthHeight?: number;
}): CaptureSimulationResult {
  const maxPoints = opts.previewMaxPoints ?? PREVIEW_DEFAULT_MAX_POINTS;
  const quality = opts.quality ?? "normal";
  const preview = new Map<string, unknown>();
  const trajectoryPoses: Array<{ tracking_state: string }> = [];
  let depthKeyframesWritten = 0;
  let voxelUpdatesSkipped = 0;
  let trackingLimitedFrames = 0;

  for (const frame of opts.frames) {
    if (frame.trackingLimited) trackingLimitedFrames += 1;
    trajectoryPoses.push({ tracking_state: frame.trackingLimited ? "limited" : "normal" });
    if (!frame.hasDepth) continue;
    depthKeyframesWritten += 1;
    for (const key of frame.voxelKeys ?? []) {
      const result = insertPreviewVoxel(preview, key, maxPoints);
      if (result.skipped) voxelUpdatesSkipped += 1;
    }
  }

  const telemetry: CaptureTelemetrySnapshot = {
    arFramesReceived: opts.frames.length,
    trajectoryPosesWritten: trajectoryPoses.length,
    videoFramesWritten: Math.floor(opts.frames.length / 2),
    videoFramesDropped: 0,
    depthKeyframesWritten,
    depthBacklogDrops: 0,
    voxelUpdatesSkipped,
    previewPoints: preview.size,
    trackingLimitedFrames,
    trajectoryWriteFailures: 0,
  };
  const durationSec = opts.durationSec ?? opts.frames.length / TRAJECTORY_TARGET_HZ;
  return {
    trajectoryPoses,
    depthKeyframesWritten,
    telemetry,
    previewKeys: [...preview.keys()],
    trajectoryCapped: false,
    prefixEvictionUsed: false,
    manifest: buildSourceManifest({
      quality,
      durationSec,
      videoFilenames: opts.videoFilenames ?? ["twin_capture_clip1.mp4"],
      telemetry,
      depthWidth: opts.depthWidth ?? 256,
      depthHeight: opts.depthHeight ?? 192,
    }),
  };
}
