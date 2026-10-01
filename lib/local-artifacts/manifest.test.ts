import { describe, expect, it } from "vitest";
import { isClientServing, validateManifest } from "./manifest";

const base = {
  version: 1,
  projectKey: "FIELD",
  visitDate: "2026-01-15",
  title: "Field visit",
};

describe("artifact manifest", () => {
  it("rejects a rejected gaussian for client serving", () => {
    const { manifest } = validateManifest({
      ...base,
      artifacts: [{ id: "g1", kind: "gaussian_web", path: "out/scene.spz", role: "client", qaStatus: "rejected" }],
    });
    expect(manifest).not.toBeNull();
    expect(isClientServing(manifest!.artifacts[0])).toBe(false);
  });

  it("requires stationId on ERP stations", () => {
    const { issues } = validateManifest({
      ...base,
      artifacts: [{ id: "s1", kind: "station_erp", path: "a.jpg", role: "client" }],
    });
    expect(issues.some((i) => i.path.includes("stationId"))).toBe(true);
  });
});
