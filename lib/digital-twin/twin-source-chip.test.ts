import { describe, expect, it } from "vitest";
import {
  assetKindForChip,
  availableChipsForFile,
  chipForAssetKind,
  chipLabel,
  defaultChipForFile,
  deriveJobType,
  isChipLocked,
  isLidarDescriptor,
  type TwinSourceChip,
} from "./twin-source-chip";

const video = (name: string) => ({ name, type: "video/mp4" });
const photo = (name: string) => ({ name, type: "image/jpeg" });

describe("twin-source-chip", () => {
  it("labels the four source chips", () => {
    expect((["phone", "360", "drone", "lidar"] as TwinSourceChip[]).map(chipLabel)).toEqual([
      "Phone",
      "360",
      "Drone",
      "LiDAR",
    ]);
  });

  it("keeps measured panoramic media locked to 360", () => {
    expect(isChipLocked("phone", "equirect")).toBe(true);
    expect(isChipLocked("drone", "dual_fisheye")).toBe(true);
    expect(isChipLocked("360", "equirect")).toBe(false);
    expect(isChipLocked("phone", "flat")).toBe(false);
    expect(availableChipsForFile(video("VID_1.mp4"), "equirect")).toEqual(["360"]);
  });

  it("keeps LiDAR files on the LiDAR chip", () => {
    expect(isLidarDescriptor({ name: "scan.e57", type: "" })).toBe(true);
    expect(isLidarDescriptor({ name: "lidar_poses.json", type: "application/json" })).toBe(true);
    expect(availableChipsForFile({ name: "scan.ply", type: "" })).toEqual(["lidar"]);
    expect(assetKindForChip("lidar", { name: "depth.s360depth", type: "" })).toBe("lidar_depth");
    expect(assetKindForChip("lidar", { name: "lidar_poses.json", type: "application/json" })).toBe(
      "lidar_poses",
    );
  });

  it("uses measured projection before filename hints", () => {
    expect(defaultChipForFile(video("DJI_001.mp4"), "equirect")).toBe("360");
    expect(defaultChipForFile(photo("DJI_001.JPG"), "flat")).toBe("drone");
    expect(defaultChipForFile(video("IMG_001.mp4"), "flat")).toBe("phone");
  });

  it("maps chips to the existing asset and job contracts", () => {
    expect(assetKindForChip("phone", video("walk.mp4"))).toBe("video");
    expect(assetKindForChip("360", video("pano.mp4"))).toBe("panorama_360");
    expect(assetKindForChip("drone", photo("DJI_001.JPG"))).toBe("drone_photo");
    expect(chipForAssetKind("drone_video")).toBe("drone");
    expect(chipForAssetKind("ply_lidar")).toBe("lidar");
    expect(deriveJobType(["phone", "drone"])).toEqual({
      jobType: "photogrammetry_mesh",
      outputFormat: "glb",
    });
    expect(deriveJobType(["phone", "360"])).toEqual({
      jobType: "gaussian_splat",
      outputFormat: "spz",
    });
  });

  it("round-trips each chip through asset kind", () => {
    const chips: TwinSourceChip[] = ["phone", "360", "drone", "lidar"];
    for (const chip of chips) {
      const file = chip === "lidar" ? { name: "scan.ply", type: "" } : video("source.mp4");
      expect(chipForAssetKind(assetKindForChip(chip, file))).toBe(chip);
    }
  });
});
