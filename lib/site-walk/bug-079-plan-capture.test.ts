import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { buildPlanPin } from "@/components/site-walk/capture/planViewerModel";
import { calculateCenteredPlanTransform } from "@/components/site-walk/capture/planViewerGeometry";
import { capturePlanFitPadding } from "@/lib/site-walk/capture-plan-canvas-tokens";
import { fitPlanLeafletMap } from "@/lib/site-walk/plan-leaflet-fit";
import {
  openNativePickerInGesture,
  pinPressCancelledByMove,
  shouldOpenDeferredCameraPicker,
  walkModeAfterPlanSave,
} from "@/lib/site-walk/plan-capture-gesture";
import { choosePlanSurface } from "@/lib/site-walk/plan-surface-choice";

function box(width: number, height: number) {
  return {
    offsetWidth: width,
    offsetHeight: height,
    clientWidth: width,
    clientHeight: height,
    getBoundingClientRect: () => ({ left: 10, top: 20, width, height, right: width + 10, bottom: height + 20, x: 10, y: 20, toJSON() { return {}; } }),
  };
}

describe("BUG-079 plan surface", () => {
  it("does not choose the desktop PDF canvas before the phone viewport is known", () => {
    expect(choosePlanSurface({ viewportKnown: false, isPhone: false, hasRasterizedSheet: true })).toBe("pending");
  });

  it("uses the server raster on a phone and keeps PDF on desktop", () => {
    expect(choosePlanSurface({ viewportKnown: true, isPhone: true, hasRasterizedSheet: true })).toBe("mobile-raster");
    expect(choosePlanSurface({ viewportKnown: true, isPhone: true, hasRasterizedSheet: false })).toBe("mobile-processing");
    expect(choosePlanSurface({ viewportKnown: true, isPhone: false, hasRasterizedSheet: true })).toBe("desktop-pdf");
  });

  it("fits a raster sheet inside a 390px phone without horizontal overflow", () => {
    const viewport = box(390, 844);
    const surface = box(2048, 1448);
    const fit = calculateCenteredPlanTransform({
      maxScale: 1,
      minScale: 0.05,
      padding: 16,
      reservedBottom: 44,
      reservedTop: 44,
      surface: surface as unknown as HTMLElement,
      viewport: viewport as unknown as HTMLElement,
    });
    expect(2048 * fit.scale).toBeLessThanOrEqual(390);
    expect(1448 * fit.scale).toBeLessThanOrEqual(844);
    expect(fit.x).toBeGreaterThanOrEqual(0);
    expect(fit.y).toBeGreaterThanOrEqual(0);
  });

  it("still centers the desktop surface inside a wide viewport", () => {
    const fit = calculateCenteredPlanTransform({
      maxScale: 1,
      minScale: 0.25,
      padding: 16,
      surface: box(1200, 858) as unknown as HTMLElement,
      viewport: box(1440, 900) as unknown as HTMLElement,
    });
    expect(fit.scale).toBe(1);
    expect(fit.x).toBeCloseTo((1440 - 1200) / 2);
  });

  it("asks Leaflet to fit the sheet once, without animation", () => {
    const calls: Array<{ options: { animate?: boolean } }> = [];
    const fitBounds = (_bounds: unknown, options: { animate?: boolean }) => {
      calls.push({ options });
    };
    fitPlanLeafletMap(
      { fitBounds } as never,
      null,
      2048,
      1448,
      capturePlanFitPadding(),
    );
    expect(calls).toHaveLength(1);
    expect(calls[0]?.options.animate).toBe(false);
  });

  it("treats equal fit padding as the same fit even when the object identity changes", () => {
    const first = capturePlanFitPadding();
    const second = capturePlanFitPadding();
    expect(first).not.toBe(second);
    expect(first).toEqual(second);
  });
});

describe("BUG-079 pins and gestures", () => {
  it("stores a pin as sheet percentages, not screen pixels", () => {
    const pin = buildPlanPin({ x: 110, y: 164 }, box(200, 400) as unknown as HTMLDivElement, 1, "session-1");
    expect(pin).not.toBeNull();
    expect(pin?.x_pct).toBeCloseTo(50);
    expect(pin?.y_pct).toBeCloseTo(36);
    expect(pin?.x_pct).toBeLessThanOrEqual(100);
    expect(pin?.y_pct).toBeLessThanOrEqual(100);
  });

  it("lets a pan cancel a pin press and lets a tap stay a pin press", () => {
    expect(pinPressCancelledByMove(0, 0)).toBe(false);
    expect(pinPressCancelledByMove(4, 4)).toBe(false);
    expect(pinPressCancelledByMove(11, 0)).toBe(true);
  });
});

describe("BUG-079 capture handoff", () => {
  it("clicks the file input inside the gesture, after clearing the previous file", () => {
    const order: string[] = [];
    const input = {
      set value(next: string) {
        order.push(`value:${next}`);
      },
      click() {
        order.push("click");
      },
    };
    openNativePickerInGesture(input as unknown as HTMLInputElement);
    expect(order).toEqual(["value:", "click"]);
  });

  it("does not open a second deferred picker while the capture context owns the gesture", () => {
    expect(shouldOpenDeferredCameraPicker({ mounted: true, autoOpenCamera: true, hasCaptureContext: true })).toBe(false);
    expect(shouldOpenDeferredCameraPicker({ mounted: true, autoOpenCamera: true, hasCaptureContext: false })).toBe(true);
    expect(shouldOpenDeferredCameraPicker({ mounted: false, autoOpenCamera: true, hasCaptureContext: false })).toBe(false);
  });

  it("returns to the plan after a plan-pin save and can start a second capture", () => {
    expect(walkModeAfterPlanSave({ fromPlanPin: true, armedReturn: false })).toBe("plan");
    expect(walkModeAfterPlanSave({ armedReturn: true })).toBe("plan");
    expect(walkModeAfterPlanSave({ fromPlanPin: true, armedReturn: true })).toBe("plan");
    expect(walkModeAfterPlanSave({ armedReturn: false })).toBe("camera");
  });
});

describe("BUG-079 capture chrome", () => {
  it("gives the capture task the viewport and does not render the module nav", () => {
    const layout = readFileSync("app/site-walk/(act-2-inputs)/capture/layout.tsx", "utf8");
    const markup = layout.slice(layout.indexOf("return"));
    expect(markup).toContain("fixed inset-0 z-50");
    expect(markup).toContain("overflow-hidden");
    expect(markup).toContain("100dvh");
    expect(markup).not.toContain("<SiteWalkModuleNav");
  });
});
