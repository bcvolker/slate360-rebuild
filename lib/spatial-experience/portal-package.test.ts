import { describe, expect, it } from "vitest";
import { effectiveDeliverables, isPackaged, normalizeDeliverables, type PortalPackage } from "./portal-package";

const pkg = (deliverables: PortalPackage["deliverables"]): PortalPackage => ({
  deliverables,
  tourHistoryEnabled: true,
  currentVisitId: null,
});

describe("portal package resolution", () => {
  it("is not enforced when the org switch is off (legacy tabs)", () => {
    expect(effectiveDeliverables({ enforced: false, pkg: null, shareOverride: null })).toBeNull();
    expect(isPackaged(null, "twin")).toBe(true);
  });

  it("fails closed: enforced with no package shows nothing", () => {
    const allowed = effectiveDeliverables({ enforced: true, pkg: null, shareOverride: null });
    expect(allowed?.size).toBe(0);
    expect(isPackaged(allowed, "walkthrough")).toBe(false);
  });

  it("inherits the project package when the share has no override", () => {
    const allowed = effectiveDeliverables({ enforced: true, pkg: pkg(["walkthrough", "evidence"]), shareOverride: null });
    expect([...(allowed ?? [])].sort()).toEqual(["evidence", "walkthrough"]);
  });

  it("lets a share narrow but never widen the package", () => {
    const allowed = effectiveDeliverables({
      enforced: true,
      pkg: pkg(["walkthrough", "evidence"]),
      shareOverride: ["walkthrough", "twin", "issues"],
    });
    expect([...(allowed ?? [])]).toEqual(["walkthrough"]);
  });

  it("ignores unknown and duplicate deliverable ids", () => {
    expect(normalizeDeliverables(["twin", "twin", "thermal", 3, null, "tour"])).toEqual(["twin", "tour"]);
    expect(normalizeDeliverables("walkthrough")).toEqual([]);
  });
});
