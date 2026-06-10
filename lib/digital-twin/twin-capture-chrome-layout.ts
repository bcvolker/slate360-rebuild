/** Locked twin capture chrome spacing — clearance verified at 390×844 and 360×800. */
export const TWIN_CAPTURE_CHROME = {
  topInsetPx: 12,
  topBarHeightPx: 44,
  topBarRadiusPx: 12,
  sideInsetPx: 12,
  railSideInsetPx: 16,
  railLabelBottomPx: 44,
  shutterBottomPx: 116,
  shutterSizePx: 72,
  shutterInnerPx: 58,
  shutterRaisePx: 16,
  shutterStopPx: 22,
  hintBottomPx: 12,
  lightButtonSizePx: 50,
  doneButtonSizePx: 56,
  modeSelectorRowPx: 36,
  modeSelectorBottomPx: 208,
  clipChipsBottomPx: 256,
  lidarChipTopGapPx: 8,
  chromeClearancePx: 20,
} as const;

export function measureTwinCaptureClearance(viewportHeightPx: number) {
  const shutterTopFromBottom =
    TWIN_CAPTURE_CHROME.shutterBottomPx + TWIN_CAPTURE_CHROME.shutterSizePx;
  const modeBottomFromBottom = TWIN_CAPTURE_CHROME.modeSelectorBottomPx;
  const modeTopFromBottom = modeBottomFromBottom + TWIN_CAPTURE_CHROME.modeSelectorRowPx;
  const clipBottomFromBottom = TWIN_CAPTURE_CHROME.clipChipsBottomPx;
  const hintTopFromBottom = TWIN_CAPTURE_CHROME.hintBottomPx + 14;
  const shutterHintGapPx = TWIN_CAPTURE_CHROME.shutterBottomPx - hintTopFromBottom;

  return {
    viewportHeightPx,
    shutterTopFromBottomPx: shutterTopFromBottom,
    modeSelectorBottomFromBottomPx: modeBottomFromBottom,
    modeSelectorTopFromBottomPx: modeTopFromBottom,
    modeToShutterGapPx: modeTopFromBottom - shutterTopFromBottom,
    clipChipsBottomFromBottomPx: clipBottomFromBottom,
    clipToModeGapPx: clipBottomFromBottom - modeTopFromBottom,
    shutterBottomFromBottomPx: TWIN_CAPTURE_CHROME.shutterBottomPx,
    hintTopFromBottomPx: hintTopFromBottom,
    shutterToHintGapPx: shutterHintGapPx,
  };
}
