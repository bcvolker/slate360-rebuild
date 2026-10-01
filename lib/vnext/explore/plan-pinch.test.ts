import { describe, expect, it } from "vitest";
import { pointerDistance, scaleFromPinch } from "./plan-pinch";

describe("plan pinch", () => {
  it("grows the scale when the fingers move apart", () => {
    expect(scaleFromPinch(1, 100, 200)).toBe(2);
  });

  it("shrinks the scale when the fingers move together", () => {
    expect(scaleFromPinch(2, 200, 100)).toBe(1);
  });

  it("ignores a zero distance", () => {
    expect(scaleFromPinch(1.5, 0, 40)).toBe(1.5);
    expect(pointerDistance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5);
  });
});
