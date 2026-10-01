import { describe, expect, it } from "vitest";
import { decideShareOpen, shareOpenCookiePath } from "./share-open-session";

describe("share open session", () => {
  it("claims the first active entry and skips later navigation in the same session", () => {
    expect(decideShareOpen({ active: true, counted: false })).toBe("claim");
    expect(decideShareOpen({ active: true, counted: true })).toBe("skip");
  });

  it("does not claim a revoked or expired link, even when this browser was counted before", () => {
    expect(decideShareOpen({ active: false, counted: false })).toBe("skip");
    expect(decideShareOpen({ active: false, counted: true })).toBe("skip");
    expect(shareOpenCookiePath("token")).toBe("/share/project/token");
  });
});
