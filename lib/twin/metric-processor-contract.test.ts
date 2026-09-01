import { describe, expect, it } from "vitest";
import {
  METRIC_PROCESSOR_JOB_TYPE,
  METRIC_PROCESSOR_OUTPUT_FORMAT,
  METRIC_PROCESSOR_TRIGGER_TASK,
  isPreviewPointCloud,
  metricProcessorInputAssets,
  metricProcessorMissingRequirements,
  twinJobTriggerTaskId,
} from "./metric-processor-contract";

describe("Twin Metric Processor V1 contract", () => {
  it("routes metric jobs to the dedicated Trigger task", () => {
    expect(twinJobTriggerTaskId("metric_processor")).toBe("twin.metric_processor");
    expect(twinJobTriggerTaskId("gaussian_splat")).toBe("twin.gaussian_splat");
    expect(METRIC_PROCESSOR_JOB_TYPE).toBe("metric_processor");
    expect(METRIC_PROCESSOR_OUTPUT_FORMAT).toBe("glb");
    expect(METRIC_PROCESSOR_TRIGGER_TASK).toBe("twin.metric_processor");
  });

  it("never treats the preview PLY as a processing input", () => {
    expect(isPreviewPointCloud("ply_lidar", "preview_point_cloud.ply")).toBe(true);
    const selected = metricProcessorInputAssets([
      { asset_kind: "lidar_depth" },
      { asset_kind: "lidar_poses" },
      { asset_kind: "ply_lidar" },
      { asset_kind: "lidar_traj" },
    ]);
    expect(selected.map((row) => row.asset_kind)).toEqual([
      "lidar_depth",
      "lidar_poses",
      "lidar_traj",
    ]);
  });

  it("fails clearly when depth or poses are missing", () => {
    expect(metricProcessorMissingRequirements([{ asset_kind: "ply_lidar" }])).toMatch(
      /s360depth/,
    );
    expect(
      metricProcessorMissingRequirements([
        { asset_kind: "lidar_depth" },
        { asset_kind: "lidar_poses" },
      ]),
    ).toBeNull();
  });
});
