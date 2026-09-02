import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { applyKeyframe, keyframeAtView, rearYawFromView } from "./studio-keys";
import { DEFAULT_OPERATOR_PATCH } from "./types";

describe("studio live embed", () => {
  it("does not force a 100dvh chapter shell while authoring", () => {
    const src = readFileSync("components/spatial-walkthrough/viewer/ChapterWalkthroughExperience.tsx", "utf8");
    expect(src).toMatch(/rest\.authoring \? "relative flex h-full min-h-0 flex-col"/);
    expect(src).toMatch(/data-studio=\{rest\.authoring \? "true"/);
  });

  it("gives compact BrandFrame a real height so PSV can mount", () => {
    const css = readFileSync("components/spatial-walkthrough/viewer/walkthrough-chrome.css", "utf8");
    expect(css).toMatch(/\.sw-frame\[data-compact="true"\] \{\s*height: 100%;/);
  });

  it("fills the dashboard viewer route without page padding", () => {
    const src = readFileSync("components/dashboard-desktop/DashboardDesktopShell.tsx", "utf8");
    expect(src).toMatch(/viewerRoute \? "min-h-0 flex-1 overflow-hidden p-0"/);
  });
});

describe("studio rear keyframes", () => {
  it("stores rear as current yaw + 180 wrapping the seam", () => {
    expect(Math.abs(rearYawFromView(0))).toBe(180);
    expect(rearYawFromView(10)).toBe(-170);
    expect(rearYawFromView(-180)).toBe(0);
    const frame = keyframeAtView({ t: 17.4, yaw: 12, pitch: -8 }, DEFAULT_OPERATOR_PATCH);
    expect(frame.t).toBeCloseTo(17.4);
    expect(frame.yawCenter).toBe(rearYawFromView(12));
    const next = applyKeyframe(DEFAULT_OPERATOR_PATCH, frame);
    expect(next.keyframes).toHaveLength(1);
    expect(next.rearYawCenter).toBe(frame.yawCenter);
  });
});
