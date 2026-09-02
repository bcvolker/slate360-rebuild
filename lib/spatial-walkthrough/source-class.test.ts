import { describe, expect, it } from "vitest";

import { classifySource, isBrowserPanorama, isErp } from "./source-class";

describe("ingest source class", () => {
  it("never treats raw Insta360 as a browser panorama", () => {
    const kind = classifySource({ fileName: "VID_2026_00_00.insv" });
    expect(kind).toBe("RAW_INSTA360");
    expect(isBrowserPanorama(kind)).toBe(false);
  });

  it("classifies 2:1 stitched video and stills", () => {
    expect(classifySource({ fileName: "housewalk.mp4", width: 3840, height: 1920 })).toBe("STITCHED_ERP_VIDEO");
    expect(classifySource({ fileName: "hero.jpg", width: 5760, height: 2880 })).toBe("STITCHED_ERP_STILL");
    expect(isErp(1920, 1080)).toBe(false);
  });

  it("classifies iPhone depth, lidar sidecars, and documents", () => {
    expect(classifySource({ fileName: "scan.s360depth" })).toBe("RGBD_IPHONE");
    expect(classifySource({ fileName: "lidar_poses.json" })).toBe("LIDAR");
    expect(classifySource({ fileName: "spec.pdf" })).toBe("DOCUMENT");
    expect(classifySource({ fileName: "clip.mp4", width: 1920, height: 1080 })).toBe("PERSPECTIVE_VIDEO");
  });
});
