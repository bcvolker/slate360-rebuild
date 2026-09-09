import { describe, expect, it } from "vitest";

import {
  compact,
  describeCaptureSummary,
  formatDuration,
  isBundleAsset,
  parseTwinCaptureSummary,
  pickPosterKey,
  summarizeCapture,
  type SummaryAssetRow,
} from "./capture-summary-pure";

const ASSETS: SummaryAssetRow[] = [
  { asset_kind: "photo", file_size_bytes: 3_000_000, storage_key: "o/s/c/twin_photo_1.jpg", status: "ready" },
  { asset_kind: "photo", file_size_bytes: 3_000_000, storage_key: "o/s/c/twin_photo_2.jpg", status: "ready" },
  { asset_kind: "photo", file_size_bytes: 3_000_000, storage_key: "o/s/c/twin_photo_3.jpg", status: "failed" },
  { asset_kind: "video", file_size_bytes: 50_000_000, storage_key: "o/s/c/clip1.mp4", status: "ready" },
  { asset_kind: "ply_lidar", file_size_bytes: 7_500_000, storage_key: "o/s/c/lidar_capture.ply", status: "ready" },
  { asset_kind: "other", file_size_bytes: 900, storage_key: "o/s/c/capture_bundle.json", status: "ready" },
];

describe("summarizeCapture", () => {
  it("counts only ready assets and sums their bytes", () => {
    const s = summarizeCapture(ASSETS, null, new Date("2026-09-09T00:00:00Z"));
    expect(s.photos).toBe(2);
    expect(s.videos).toBe(1);
    expect(s.assetKinds).toEqual({ photo: 2, video: 1, ply_lidar: 1, other: 1 });
    expect(s.bytes).toBe(3_000_000 * 2 + 50_000_000 + 7_500_000 + 900);
    expect(s.fromBundle).toBe(false);
    expect(s.lidarPoints).toBe(0);
    expect(s.computedAt).toBe("2026-09-09T00:00:00.000Z");
  });

  it("takes LiDAR, pose, depth and duration figures from the bundle", () => {
    const s = summarizeCapture(ASSETS, {
      pointCount: 1_234_567,
      keyframeCount: 658,
      depthEvidenceFrameCount: 120,
      durationSec: 187.4,
      captureSettings: { captureMode: "photos", photoIntervalSec: 1, shutterDenominator: 250, junk: "x" },
    });
    expect(s.lidarPoints).toBe(1_234_567);
    expect(s.poses).toBe(658);
    expect(s.depthFrames).toBe(120);
    expect(s.durationSec).toBe(187);
    expect(s.settings).toEqual({ captureMode: "photos", photoIntervalSec: 1, shutterDenominator: 250 });
    expect(s.fromBundle).toBe(true);
  });
});

describe("parseTwinCaptureSummary", () => {
  it("round-trips a stored summary and rejects other shapes", () => {
    const s = summarizeCapture(ASSETS, { pointCount: 5 });
    expect(parseTwinCaptureSummary({ summary: s })).toEqual(s);
    expect(parseTwinCaptureSummary({ summary: { version: 2 } })).toBeNull();
    expect(parseTwinCaptureSummary(null)).toBeNull();
    expect(parseTwinCaptureSummary({ gps: {} })).toBeNull();
  });
});

describe("pickPosterKey", () => {
  it("chooses the photo a quarter of the way through the walk, numerically", () => {
    const keys = [1, 2, 3, 10, 11, 12, 20, 21, 22].map((n) => `k/twin_photo_${n}.jpg`);
    expect(pickPosterKey(keys)).toBe("k/twin_photo_3.jpg");
    expect(pickPosterKey(["k/twin_photo_10.jpg", "k/twin_photo_9.jpg"])).toBe("k/twin_photo_9.jpg");
    expect(pickPosterKey([])).toBeNull();
  });
});

describe("formatting", () => {
  it("compacts counts and formats durations", () => {
    expect(compact(950)).toBe("950");
    expect(compact(12_400)).toBe("12K");
    expect(compact(1_234_567)).toBe("1.2M");
    expect(formatDuration(187)).toBe("3:07");
  });

  it("describes a capture in one line", () => {
    const s = summarizeCapture(ASSETS, { pointCount: 1_234_567, durationSec: 187 });
    expect(describeCaptureSummary(s)).toBe("2 photos · 1 clip · 1.2M LiDAR points · 3:07");
    expect(describeCaptureSummary(summarizeCapture([], null))).toBe("no LiDAR");
  });

  it("recognises the bundle sidecar by name", () => {
    expect(isBundleAsset(ASSETS[5])).toBe(true);
    expect(isBundleAsset(ASSETS[0])).toBe(false);
  });
});
