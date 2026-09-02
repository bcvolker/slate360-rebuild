import { describe, expect, it } from "vitest";

import housewalk from "./fixtures/housewalk-public.json";
import { mapSharePins, normalizeSharePayload } from "./share-payload";

describe("HouseWalk public payload", () => {
  it("normalizes the live share document including empty chapters", () => {
    const payload = normalizeSharePayload(housewalk);
    expect(payload.walkthrough.title).toBe("HouseWalk X4 live smoke");
    expect(payload.chapters).toEqual([]);
    expect(payload.clip?.id).toBe("f278d37f-1c2f-4511-aef5-437b3992d39d");
    expect(payload.waypoints.length).toBeGreaterThan(0);
    expect(payload.pins.length).toBeGreaterThan(0);
    expect(payload.theme.pageBgColor).toContain("graphite");
    expect(payload.operatorKeyframes.length).toBeGreaterThan(0);
    expect(payload.operatorPatch?.rearYawWidth).toBeGreaterThan(80);
    const pins = mapSharePins(payload.pins, payload.attachments, "tok", false);
    expect(pins[0]?.attachments).toBeDefined();
  });

  it("does not throw when optional capabilities are missing", () => {
    const payload = normalizeSharePayload({
      walkthrough: { title: "Legacy" },
      clip: { id: "c1", proxyUrl: "/v", posterUrl: "/p" },
    });
    expect(payload.chapters).toEqual([]);
    expect(payload.pins).toEqual([]);
    expect(payload.waypoints).toEqual([]);
    expect(payload.attachments).toEqual([]);
    expect(payload.redactions).toEqual([]);
    expect(payload.orientation).toBeNull();
    expect(payload.theme).toBeTruthy();
    expect(() => mapSharePins(undefined, undefined, "t", false)).not.toThrow();
    expect(mapSharePins(undefined, undefined, "t", false)).toEqual([]);
  });
});
