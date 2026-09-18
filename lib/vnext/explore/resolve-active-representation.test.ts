import { describe, expect, it } from "vitest";
import { normalizeExploreRep, resolveActiveRepresentation } from "./resolve-active-representation";

describe("normalizeExploreRep", () => {
  it("lowercases and accepts a valid representation id", () => {
    expect(normalizeExploreRep("Reality")).toBe("reality");
    expect(normalizeExploreRep("360")).toBe("360");
    expect(normalizeExploreRep("THERMAL")).toBe("thermal");
  });

  it("rejects unknown values, including 'drone'", () => {
    expect(normalizeExploreRep("drone")).toBeNull();
    expect(normalizeExploreRep("dRoNe")).toBeNull();
    expect(normalizeExploreRep("nonsense")).toBeNull();
    expect(normalizeExploreRep(null)).toBeNull();
    expect(normalizeExploreRep(undefined)).toBeNull();
    expect(normalizeExploreRep("")).toBeNull();
  });
});

describe("resolveActiveRepresentation", () => {
  it("picks the requested representation when it is available", () => {
    const result = resolveActiveRepresentation(["reality", "plan"], "plan");
    expect(result).toEqual({ representation: "plan", unavailableError: null });
  });

  it("defaults to the priority order (reality > geometry > 360 > plan > thermal) when nothing is requested", () => {
    expect(resolveActiveRepresentation(["plan", "reality", "360"], null).representation).toBe("reality");
    expect(resolveActiveRepresentation(["plan", "360"], null).representation).toBe("360");
    expect(resolveActiveRepresentation(["thermal", "plan"], null).representation).toBe("plan");
    expect(resolveActiveRepresentation(["thermal"], null).representation).toBe("thermal");
  });

  it("returns null with no error when nothing is available and nothing was requested", () => {
    expect(resolveActiveRepresentation([], null)).toEqual({ representation: null, unavailableError: null });
  });

  it("falls back to a real available representation and reports a concise error when the requested one is unavailable — never a dead/empty viewer", () => {
    const result = resolveActiveRepresentation(["plan"], "reality");
    expect(result.representation).toBe("plan");
    expect(result.unavailableError).toBe('"Reality" isn\'t available for this project.');
  });

  it("returns null representation with an error when the requested representation is unavailable and nothing else is available either", () => {
    const result = resolveActiveRepresentation([], "thermal");
    expect(result.representation).toBeNull();
    expect(result.unavailableError).toBe('"Thermal" isn\'t available for this project.');
  });

  it("never resolves to 'drone' even if a caller somehow requests it (normalizeExploreRep already excludes it, but the decision fn itself is drone-blind by type)", () => {
    // @ts-expect-error — "drone" is not a VnextExploreRepresentation; this proves the type system itself blocks it.
    const result = resolveActiveRepresentation(["reality"], "drone");
    expect(result.representation).toBe("reality");
  });
});
