import { describe, expect, it } from "vitest";
import {
  isLandscapeOrientation,
  shouldExitImmersiveOnPortrait,
  showLandscapeJoystickHud,
  type ViewportSnap,
} from "./landscape-viewport";

function snap(partial: Partial<ViewportSnap> & Pick<ViewportSnap, "width" | "height">): ViewportSnap {
  return { coarsePointer: false, orientation: null, ...partial };
}

describe("landscape joystick viewport", () => {
  it("hides the HUD in phone portrait", () => {
    const phone = snap({ width: 390, height: 844, coarsePointer: true, orientation: "portrait" });
    expect(isLandscapeOrientation(phone)).toBe(false);
    expect(showLandscapeJoystickHud(phone)).toBe(false);
  });

  it("shows the HUD for phone and tablet landscape", () => {
    expect(showLandscapeJoystickHud(snap({
      width: 844,
      height: 390,
      coarsePointer: true,
      orientation: "landscape",
    }))).toBe(true);
    expect(showLandscapeJoystickHud(snap({
      width: 1180,
      height: 820,
      coarsePointer: true,
      orientation: "landscape",
    }))).toBe(true);
  });

  it("keeps desktop monitors free of sticks", () => {
    expect(showLandscapeJoystickHud(snap({
      width: 1440,
      height: 900,
      coarsePointer: false,
      orientation: "landscape",
    }))).toBe(false);
  });

  it("still shows sticks on a short landscape viewport when pointer detection is wrong", () => {
    expect(showLandscapeJoystickHud(snap({
      width: 800,
      height: 400,
      coarsePointer: false,
      orientation: "landscape",
    }))).toBe(true);
  });

  it("trusts the measured viewport when the orientation label is stale", () => {
    const lagged = snap({ width: 390, height: 844, coarsePointer: true, orientation: "landscape" });
    expect(isLandscapeOrientation(lagged)).toBe(false);
    expect(showLandscapeJoystickHud(lagged)).toBe(false);
    expect(shouldExitImmersiveOnPortrait(lagged)).toBe(true);
  });

  it("exits immersive mode on phone portrait and not on a tall desktop window", () => {
    expect(shouldExitImmersiveOnPortrait(snap({
      width: 390,
      height: 844,
      coarsePointer: true,
      orientation: "portrait",
    }))).toBe(true);
    expect(shouldExitImmersiveOnPortrait(snap({
      width: 900,
      height: 1400,
      coarsePointer: false,
      orientation: "portrait",
    }))).toBe(false);
    expect(shouldExitImmersiveOnPortrait(snap({
      width: 1440,
      height: 900,
      coarsePointer: false,
      orientation: "landscape",
    }))).toBe(false);
  });
});
