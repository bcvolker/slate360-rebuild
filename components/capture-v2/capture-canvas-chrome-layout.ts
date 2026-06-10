/** Locked no-plans capture chrome spacing — clearance verified at 390×844 and 360×800. */
export const CAPTURE_CANVAS_CHROME = {
  topInsetPx: 12,
  topBarHeightPx: 44,
  topBarRadiusPx: 12,
  filmstripThumbPx: 56,
  filmstripThumbRadiusPx: 10,
  filmstripDropPadPx: 8,
  railButtonSizePx: 48,
  shutterSizePx: 72,
  shutterInnerPx: 58,
  hintSafeAreaPx: 16,
  shutterHintGapPx: 12,
  hintChipHeightPx: 28,
  labelGapPx: 4,
  labelRowPx: 18,
  sideInsetPx: 12,
  railSideInsetPx: 16,
  toolRailRightPx: 12,
  toolRailTopPx: 90,
  toolRailButtonPx: 52,
  angleThumbPx: 48,
  angleThumbRadiusPx: 10,
  detailsButtonPx: 48,
  markupToolbarGapPx: 8,
  railLabelBottomPx: 16 + 28 + 12,
  bottomChromeClearancePx: 16 + 28 + 12 + 72,
  angleThumbBottomPx: 16 + 28 + 12 + 72,
} as const;

export function measureCaptureCanvasClearance(viewportHeightPx: number) {
  const hintTopFromBottom =
    CAPTURE_CANVAS_CHROME.hintSafeAreaPx + CAPTURE_CANVAS_CHROME.hintChipHeightPx;
  const shutterBottomFromBottom =
    hintTopFromBottom + CAPTURE_CANVAS_CHROME.shutterHintGapPx;
  const shutterTopFromBottom = shutterBottomFromBottom + CAPTURE_CANVAS_CHROME.shutterSizePx;
  const shutterToHintGapPx = shutterBottomFromBottom - hintTopFromBottom;

  return {
    viewportHeightPx,
    shutterTopFromBottomPx: shutterTopFromBottom,
    shutterBottomFromBottomPx: shutterBottomFromBottom,
    hintTopFromBottomPx: hintTopFromBottom,
    shutterToHintGapPx,
  };
}
