import { CAPTURE_CANVAS_CHROME } from "@/components/capture-v2/capture-canvas-chrome-layout";

/** Locked with-plans capture chrome — verified at 390×844. Reuses no-plans rail spacing. */
export const CAPTURE_PLAN_CANVAS_CHROME = {
  ...CAPTURE_CANVAS_CHROME,
  planTopBarHeightPx: CAPTURE_CANVAS_CHROME.topBarHeightPx,
  planFilmstripBottomPx: CAPTURE_CANVAS_CHROME.bottomChromeClearancePx,
  planRailSideButtonPx: CAPTURE_CANVAS_CHROME.railButtonSizePx,
  planSheetPickerThumbPx: 56,
  planSheetPickerThumbRadiusPx: 10,
} as const;

export type CapturePlanFitPadding = {
  top: number;
  bottom: number;
  left: number;
  right: number;
};

// Horizontal breathing room so the sheet doesn't hug the side edges on fit.
// Portrait is typically width-constrained (wide sheets), so side gutters read as
// "a little less zoomed in" there. We deliberately do NOT pad top/bottom extra:
// a landscape phone is short, and vertical gutters would shrink the plan instead
// of giving the large view we want in landscape.
const PLAN_FIT_SIDE_GUTTER_PX = 26;

export function capturePlanFitPadding(): CapturePlanFitPadding {
  const safeTop = 12;
  return {
    top: safeTop + CAPTURE_PLAN_CANVAS_CHROME.planTopBarHeightPx + 8,
    bottom: CAPTURE_PLAN_CANVAS_CHROME.planFilmstripBottomPx + 8,
    left: CAPTURE_PLAN_CANVAS_CHROME.sideInsetPx + PLAN_FIT_SIDE_GUTTER_PX,
    right: CAPTURE_PLAN_CANVAS_CHROME.sideInsetPx + PLAN_FIT_SIDE_GUTTER_PX,
  };
}
