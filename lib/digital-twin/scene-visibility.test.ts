import { describe, expect, it } from "vitest";

import {
  cameraSeesBox,
  GRAPHITE_RGB,
  isGraphitePixel,
  probeRgbaBuffer,
  VISIBLE_RATIO_MIN,
} from "./scene-visibility";

function fillGraphite(width: number, height: number): Uint8Array {
  const buf = new Uint8Array(width * height * 4);
  for (let i = 0; i < buf.length; i += 4) {
    buf[i] = GRAPHITE_RGB[0];
    buf[i + 1] = GRAPHITE_RGB[1];
    buf[i + 2] = GRAPHITE_RGB[2];
    buf[i + 3] = 255;
  }
  return buf;
}

describe("scene visibility probe", () => {
  it("fails a graphite-only framebuffer", () => {
    const pixels = fillGraphite(64, 64);
    const probe = probeRgbaBuffer(pixels, 64, 64);
    expect(probe.visible).toBe(false);
    expect(probe.nonBackgroundPixelRatio).toBeLessThan(VISIBLE_RATIO_MIN);
    expect(isGraphitePixel(GRAPHITE_RGB[0], GRAPHITE_RGB[1], GRAPHITE_RGB[2])).toBe(true);
  });

  it("passes when center and quadrants have spatial pixels", () => {
    const pixels = fillGraphite(64, 64);
    for (let y = 8; y < 56; y++) {
      for (let x = 8; x < 56; x++) {
        const i = (y * 64 + x) * 4;
        pixels[i] = 180;
        pixels[i + 1] = 160;
        pixels[i + 2] = 90;
      }
    }
    const probe = probeRgbaBuffer(pixels, 64, 64);
    expect(probe.nonBackgroundPixelRatio).toBeGreaterThan(VISIBLE_RATIO_MIN);
    expect(probe.visible).toBe(true);
  });

  it("treats a large non-graphite field as visible even when variance is low", () => {
    const pixels = fillGraphite(64, 64);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = 40;
      pixels[i + 1] = 180;
      pixels[i + 2] = 70;
    }
    const probe = probeRgbaBuffer(pixels, 64, 64);
    expect(probe.visible).toBe(true);
  });

  it("detects a camera that does not look at the mesh bbox", () => {
    const box = { min: [0, 0, 0] as [number, number, number], max: [2, 2, 2] as [number, number, number] };
    const miss = cameraSeesBox({
      position: [20, 1, 20],
      look: [0, 0, 1],
      near: 0.06,
      far: 60,
      box,
    });
    expect(miss.cameraInsideBbox).toBe(false);
    expect(miss.lookHitsBbox).toBe(false);
    const hit = cameraSeesBox({
      position: [1, 1, -2],
      look: [0, 0, 1],
      near: 0.06,
      far: 60,
      box,
    });
    expect(hit.lookHitsBbox).toBe(true);
  });
});
