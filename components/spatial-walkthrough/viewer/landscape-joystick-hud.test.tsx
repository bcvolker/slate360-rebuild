import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { LandscapeJoystickHud } from "@/components/spatial-walkthrough/viewer/LandscapeJoystickHud";

describe("landscape joystick HUD", () => {
  it("renders seek and look sticks without covering the document when visible", () => {
    const html = renderToStaticMarkup(
      <LandscapeJoystickHud
        player={null}
        duration={42}
        visible
        immersive={false}
        offerFullscreen
        onToggleFullscreen={() => undefined}
      />,
    );
    expect(html).toContain('data-testid="sw-joy-hud"');
    expect(html).toContain('data-testid="sw-joy-seek"');
    expect(html).toContain('data-testid="sw-joy-look"');
    expect(html).toContain('data-side="left"');
    expect(html).toContain('data-side="right"');
    expect(html).toContain('data-testid="sw-joy-fullscreen"');
    expect(html).toContain('data-offer="true"');
    expect(html).toContain("Scrub");
    expect(html).toContain("Look");
  });

  it("renders nothing in portrait", () => {
    const html = renderToStaticMarkup(
      <LandscapeJoystickHud
        player={null}
        duration={42}
        visible={false}
        immersive={false}
        offerFullscreen={false}
        onToggleFullscreen={() => undefined}
      />,
    );
    expect(html).toBe("");
  });

  it("is mounted on the public chrome path and leaves sphere drag enabled", () => {
    const chrome = readFileSync("components/spatial-walkthrough/viewer/WalkthroughChrome.tsx", "utf8");
    expect(chrome).toMatch(/LandscapeJoystickHud/);
    expect(chrome).toMatch(/PublicWalkToolbar/);
    expect(chrome).toMatch(/data-testid="sw-timeline-scrub"/);
    expect(chrome).toMatch(/immersive\.toggle/);
    const player = readFileSync("components/spatial-walkthrough/viewer/WalkthroughPlayer.tsx", "utf8");
    expect(player).toMatch(/mousemove: true/);
    expect(player).not.toMatch(/mousemove:\s*false/);
    const experience = readFileSync("components/spatial-walkthrough/viewer/WalkthroughExperience.tsx", "utf8");
    expect(experience).toMatch(/authoring \? null : \(/);
    expect(experience).toMatch(/publicChrome/);
  });
});
