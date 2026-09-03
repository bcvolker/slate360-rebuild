import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("creator walkthrough ux reset gates", () => {
  it("does not cover the public sphere with a flat Play poster", () => {
    const src = readFileSync("components/spatial-walkthrough/viewer/WalkthroughExperience.tsx", "utf8");
    expect(src).not.toMatch(/PosterStage/);
    expect(src).toMatch(/LookHint/);
    expect(src).toMatch(/publicChrome/);
  });

  it("enables Photo Sphere look and wheel zoom on the live sphere", () => {
    const player = readFileSync("components/spatial-walkthrough/viewer/WalkthroughPlayer.tsx", "utf8");
    expect(player).toMatch(/mousewheel: true/);
    expect(player).toMatch(/mousemove: true/);
    expect(player).toMatch(/maxFov: restrictView \? 42 : 100/);
    expect(player).toMatch(/cursor-grab/);
  });

  it("exposes a single public play/pause toolbar", () => {
    const chrome = readFileSync("components/spatial-walkthrough/viewer/WalkthroughChrome.tsx", "utf8");
    expect(chrome).toMatch(/PublicWalkToolbar/);
    expect(chrome).toMatch(/data-testid="sw-timeline-scrub"/);
    const bar = readFileSync("components/spatial-walkthrough/viewer/PublicWalkToolbar.tsx", "utf8");
    expect(bar).toMatch(/sw-play-pause/);
    expect(bar).not.toMatch(/Guided Briefing/);
  });

  it("uses the Slate360 logo asset instead of generic Spatial text", () => {
    const frame = readFileSync("components/spatial-walkthrough/viewer/BrandFrame.tsx", "utf8");
    expect(frame).toMatch(/ViewerBrandMark/);
    expect(frame).not.toMatch(/"Spatial"/);
    const mark = readFileSync("components/shared/ViewerBrandMark.tsx", "utf8");
    expect(mark).toMatch(/SlateLogo/);
    expect(mark).not.toMatch(/Spatial/);
  });

  it("hides the install banner on product surfaces", () => {
    const src = readFileSync("components/shared/InstallBanner.tsx", "utf8");
    expect(src).toMatch(/isProductSurface/);
  });
});
