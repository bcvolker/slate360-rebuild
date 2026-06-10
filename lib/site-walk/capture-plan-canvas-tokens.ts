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

export function capturePlanFitPadding(): CapturePlanFitPadding {
  const safeTop = 12;
  return {
    top: safeTop + CAPTURE_PLAN_CANVAS_CHROME.planTopBarHeightPx + 8,
    bottom: CAPTURE_PLAN_CANVAS_CHROME.planFilmstripBottomPx + 8,
    left: CAPTURE_PLAN_CANVAS_CHROME.sideInsetPx,
    right: CAPTURE_PLAN_CANVAS_CHROME.sideInsetPx,
  };
}
