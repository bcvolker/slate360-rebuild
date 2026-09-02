import { describe, expect, it } from "vitest";
import { isProductSurface } from "./product-routes";

describe("product surfaces hide install chrome", () => {
  it("covers creator and walk routes", () => {
    expect(isProductSurface("/dashboard")).toBe(true);
    expect(isProductSurface("/projects/abc")).toBe(true);
    expect(isProductSurface("/spatial-walkthrough/1")).toBe(true);
    expect(isProductSurface("/w/token")).toBe(true);
    expect(isProductSurface("/portal/token")).toBe(true);
    expect(isProductSurface("/")).toBe(false);
    expect(isProductSurface("/login")).toBe(false);
  });
});
