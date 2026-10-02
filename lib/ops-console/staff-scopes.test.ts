import { describe, expect, it } from "vitest";
import { sanitizeStaffAccessScope } from "./staff-scopes";

describe("sanitizeStaffAccessScope", () => {
  it("drops market and athlete360 and does not default either back in", () => {
    expect(sanitizeStaffAccessScope(["market", "athlete360"])).toEqual([]);
    expect(sanitizeStaffAccessScope(["market"])).toEqual([]);
    expect(sanitizeStaffAccessScope(["athlete360"])).toEqual([]);
    expect(sanitizeStaffAccessScope(undefined)).toEqual([]);
    expect(sanitizeStaffAccessScope(null)).toEqual([]);
    expect(sanitizeStaffAccessScope(["something-else"])).toEqual([]);
  });
});
