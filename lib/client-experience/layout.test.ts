import { describe, expect, it } from "vitest";
import { experienceFor } from "./aob205-variants";
import { clampPathOpacity, heroActions, navFor, overviewSections, pathHudDefault, realityTiles, safeAccent } from "./layout";
import { defaultPaidBrand } from "../spatial-experience/brand";

describe("capability-aware client layout", () => {
  it("hides the rejected AOB205 twin everywhere", () => {
    const rich = experienceFor({ state: "E" });
    expect(rich.capabilities.twin).toBe(false);
    expect(realityTiles(rich)).toEqual(["walkthrough", "stations"]);
    expect(heroActions(rich).map((a) => a.key)).toEqual(["walk", "plan"]);
    expect(navFor(rich)).not.toContain("twin");
  });

  it("walk-only project: one primary action, no empty rails", () => {
    const a = experienceFor({ state: "A" });
    expect(heroActions(a)).toHaveLength(1);
    expect(heroActions(a)[0]).toMatchObject({ key: "walk", primary: true });
    expect(overviewSections(a)).toEqual([]);
    expect(navFor(a)).toEqual(["overview", "reality"]);
  });

  it("360-only project opens documentation as the primary action", () => {
    const b = experienceFor({ state: "B" });
    expect(heroActions(b)[0]).toMatchObject({ key: "stations", primary: true });
    expect(realityTiles(b)).toEqual(["stations"]);
  });

  it("simulated accepted twin is the only way a twin tile appears", () => {
    const d = experienceFor({ state: "D" });
    expect(d.twin?.simulated).toBe(true);
    expect(realityTiles(d)).toEqual(["walkthrough", "twin"]);
  });

  it("path HUD defaults differ by device", () => {
    expect(pathHudDefault(1440)).toEqual({ visible: true, opacity: 0.28 });
    expect(pathHudDefault(768).visible).toBe(true);
    expect(pathHudDefault(375).visible).toBe(false);
    expect(clampPathOpacity(0.9)).toBe(0.45);
    expect(clampPathOpacity(NaN)).toBe(0.28);
  });

  it("brand accent is lifted to a legible interaction colour", () => {
    expect(safeAccent(defaultPaidBrand())).toBeNull();
    const dark = safeAccent({ ...defaultPaidBrand(), accentColor: "#102030" });
    expect(dark).not.toBe("#102030");
    expect(safeAccent({ ...defaultPaidBrand(), accentColor: "#4FA3FF" })).toBe("#4fa3ff");
  });

  it("brand fallback never shows initials without a client name", () => {
    const slate = experienceFor({ state: "E", brand: "slate" });
    expect(slate.brand.clientDisplayName).toBeNull();
    expect(slate.brand.slate360Mark).toBe(true);
    const client = experienceFor({ state: "E", brand: "client" });
    expect(client.brand.clientDisplayName).toBeTruthy();
  });
});
