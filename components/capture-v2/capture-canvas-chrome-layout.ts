/** Locked no-plans capture chrome spacing — clearance verified at 390×844 and 360×800. */
export const CAPTURE_CANVAS_CHROME = {
  topInsetPx: 12,
  topBarHeightPx: 44,
  topBarRadiusPx: 12,
  filmstripBottomPx: 168,
  filmstripThumbPx: 44,
  filmstripThumbRadiusPx: 10,
  railLabelBottomPx: 44,
  ghostButtonBottomPx: 55,
  ghostButtonSizePx: 50,
  endButtonBottomPx: 55,
  endButtonSizePx: 44,
  shutterBottomPx: 116,
  shutterSizePx: 72,
  shutterInnerPx: 58,
  shutterRaisePx: 16,
  hintBottomPx: 12,
  sideInsetPx: 12,
  railSideInsetPx: 16,
  shutterFilmstripClearancePx: 20,
  toolRailRightPx: 12,
  toolRailTopPx: 90,
  toolRailButtonPx: 52,
  angleThumbPx: 48,
  angleThumbRadiusPx: 10,
  detailsButtonPx: 64,
} as const;

export function measureCaptureCanvasClearance(viewportHeightPx: number) {
  const shutterTopFromBottom =
    CAPTURE_CANVAS_CHROME.shutterBottomPx + CAPTURE_CANVAS_CHROME.shutterSizePx;
  const filmstripBottomFromBottom = CAPTURE_CANVAS_CHROME.filmstripBottomPx;
  const filmstripGapPx = shutterTopFromBottom - filmstripBottomFromBottom;
  const angleThumbTopFromBottom =
    filmstripBottomFromBottom + CAPTURE_CANVAS_CHROME.angleThumbPx;
  const hintTopFromBottom = CAPTURE_CANVAS_CHROME.hintBottomPx + 14;
  const shutterHintGapPx = CAPTURE_CANVAS_CHROME.shutterBottomPx - hintTopFromBottom;

  return {
    viewportHeightPx,
    filmstripBottomFromBottomPx: filmstripBottomFromBottom,
    angleThumbTopFromBottomPx: angleThumbTopFromBottom,
    shutterTopFromBottomPx: shutterTopFromBottom,
    filmstripToShutterGapPx: filmstripGapPx,
    shutterBottomFromBottomPx: CAPTURE_CANVAS_CHROME.shutterBottomPx,
    hintTopFromBottomPx: hintTopFromBottom,
    shutterToHintGapPx: shutterHintGapPx,
  };
}
