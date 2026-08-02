import { describe, expect, it } from "vitest";
import { twinMediaToAssetKind } from "./twin-review-media";

describe("Twin source classification", () => {
  it("routes raw Insta360 video to the panorama worker", () => {
    expect(
      twinMediaToAssetKind(
        new File([], "VID_20260801_120000.insv", { type: "video/mp4" }),
      ),
    ).toBe("panorama_360");
  });

  it("uses a measured equirectangular hint for a generic stitched export", () => {
    expect(
      twinMediaToAssetKind(
        new File([], "VID_20260801_120000.mp4", { type: "video/mp4" }),
        false,
        "equirect",
      ),
    ).toBe("panorama_360");
  });

  it("does not treat ordinary GPS-capable phone video as a drone source", () => {
    expect(
      twinMediaToAssetKind(
        new File([], "IMG_20260801_120000.mp4", { type: "video/mp4" }),
      ),
    ).toBe("video");
  });

  it("preserves the native depth-evidence asset kind", () => {
    expect(
      twinMediaToAssetKind(
        new File([], "lidar_depth.s360depth", { type: "application/octet-stream" }),
      ),
    ).toBe("lidar_depth");
  });
});
