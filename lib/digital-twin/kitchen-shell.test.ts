import { describe, expect, it } from "vitest";

import { KITCHEN_APPEARANCE_TIMEOUT_MS, KITCHEN_HUMAN_FOV, KITCHEN_IDLE_MS } from "./kitchen-proof-world";

describe("kitchen viewer shell constants", () => {
  it("uses an architectural FOV in the 65–75 band", () => {
    expect(KITCHEN_HUMAN_FOV).toBeGreaterThanOrEqual(65);
    expect(KITCHEN_HUMAN_FOV).toBeLessThanOrEqual(75);
  });

  it("idles chrome after a short pause and stalls Reality after 8s without bytes", () => {
    expect(KITCHEN_IDLE_MS).toBe(2500);
    expect(KITCHEN_APPEARANCE_TIMEOUT_MS).toBe(8_000);
  });
});
