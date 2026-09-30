import { describe, expect, it } from "vitest";
import { brandInitials, brandMarkAlt, resolveProjectBrand, snapshotShareBrand } from "./brand";

describe("project brand", () => {
  it("falls back to Slate360 when no client logo exists", () => {
    const brand = resolveProjectBrand({});
    expect(brand.clientLogoUrl).toBeNull();
    expect(brand.slate360Mark).toBe(true);
    expect(brandMarkAlt(brand)).toBe("Slate360");
    expect(brandInitials(brand)).toBeNull();
  });

  it("never invents initials without a client name", () => {
    expect(brandInitials(resolveProjectBrand({ clientLogoUrl: "/x.png" }))).toBeNull();
    const named = resolveProjectBrand({ clientDisplayName: "Pinnacle Construction" });
    expect(brandInitials(named)).toEqual({ letters: "PC", label: "Pinnacle Construction" });
  });

  it("snapshots share brand", () => {
    const snap = snapshotShareBrand(resolveProjectBrand({ clientDisplayName: "ASU", whiteLabel: true }), "2026-08-17T00:00:00.000Z");
    expect(snap.snapshotAt).toBe("2026-08-17T00:00:00.000Z");
    expect(snap.whiteLabel).toBe(true);
    expect(snap.poweredBySlate360).toBe(true);
  });
});
