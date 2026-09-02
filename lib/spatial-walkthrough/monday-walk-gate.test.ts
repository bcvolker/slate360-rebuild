import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("monday walkthrough visual gates", () => {
  it("starts playback from the Play / Enter user gesture", () => {
    const src = readFileSync("components/spatial-walkthrough/viewer/WalkthroughExperience.tsx", "utf8");
    expect(src).toMatch(/nav\.setMode\("play"\)/);
    expect(src).toMatch(/playerRef\.current\?\.play\(\)/);
    expect(src).not.toMatch(/else playerRef\.current\?\.pause\(\)/);
    expect(src).not.toMatch(/showHold/);
    expect(src).toMatch(/LookHint/);
  });

  it("enables Photo Sphere look and wheel zoom on the live sphere", () => {
    const player = readFileSync("components/spatial-walkthrough/viewer/WalkthroughPlayer.tsx", "utf8");
    expect(player).toMatch(/mousewheel: true/);
    expect(player).toMatch(/mousemove: true/);
    expect(player).toMatch(/touchmoveTwoFingers: false/);
  });

  it("exposes a real timeline scrubber and path HUD toggle", () => {
    const chrome = readFileSync("components/spatial-walkthrough/viewer/WalkthroughChrome.tsx", "utf8");
    expect(chrome).toMatch(/data-testid="sw-timeline-scrub"/);
    expect(chrome).toMatch(/data-testid="sw-path-toggle"/);
    const poster = readFileSync("components/spatial-walkthrough/viewer/PosterStage.tsx", "utf8");
    expect(poster).toMatch(/data-testid="sw-enter"/);
  });

  it("uses the Slate360 logo asset instead of generic Spatial text", () => {
    const frame = readFileSync("components/spatial-walkthrough/viewer/BrandFrame.tsx", "utf8");
    expect(frame).toMatch(/ViewerBrandMark/);
    expect(frame).not.toMatch(/"Spatial"/);
    const mark = readFileSync("components/shared/ViewerBrandMark.tsx", "utf8");
    expect(mark).toMatch(/SlateLogo/);
    expect(mark).not.toMatch(/Spatial/);
  });
});
