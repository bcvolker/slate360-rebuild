import { describe, expect, it } from "vitest";
import {
  createMapTapGate,
  mapClickAction,
  pinToolFromPicker,
} from "./pin-placement";

describe("map pin placement", () => {
  it("ignores map clicks until place mode is on", () => {
    expect(mapClickAction("explore", true)).toBe("ignore");
    expect(mapClickAction(pinToolFromPicker("select"), true)).toBe("ignore");
    expect(mapClickAction("place", true)).toBe("place");
    expect(mapClickAction(pinToolFromPicker("marker"), true)).toBe("place");
  });

  it("keeps boundary drawing on its own tool", () => {
    expect(mapClickAction("boundary", true)).toBe("boundary-vertex");
    expect(mapClickAction(pinToolFromPicker("polygondraw"), true)).toBe("boundary-vertex");
    expect(mapClickAction("boundary", false)).toBe("ignore");
  });

  it("rejects a pan and a pinch, then accepts the next real tap", () => {
    const gate = createMapTapGate();

    gate.pointerDown(1, 0, 0);
    gate.pointerMove(1, 24, 0);
    gate.pointerUp(1);
    expect(mapClickAction("place", gate.consumeClick())).toBe("ignore");

    gate.pointerDown(1, 10, 10);
    gate.pointerDown(2, 40, 10);
    gate.pointerUp(1);
    gate.pointerUp(2);
    expect(mapClickAction("place", gate.consumeClick())).toBe("ignore");

    gate.pointerDown(1, 8, 8);
    gate.pointerUp(1);
    expect(mapClickAction("place", gate.consumeClick())).toBe("place");
    expect(mapClickAction("explore", true)).toBe("ignore");
  });

  it("does not place while a finger is still down", () => {
    const gate = createMapTapGate();
    gate.pointerDown(1, 0, 0);
    expect(gate.consumeClick()).toBe(false);
    gate.pointerUp(1);
    expect(gate.consumeClick()).toBe(true);
  });

  it("treats an untracked click as a tap so desktop placement still works", () => {
    const gate = createMapTapGate();
    expect(mapClickAction("place", gate.consumeClick())).toBe("place");
    expect(mapClickAction("explore", gate.consumeClick())).toBe("ignore");
  });
});
