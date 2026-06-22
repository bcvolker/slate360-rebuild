/** Locked twin capture chrome spacing — clearance verified at 390×844 and 360×800. */
export const TWIN_CAPTURE_CHROME = {
  topInsetPx: 12,
  topBarHeightPx: 44,
  topBarRadiusPx: 12,
  sideInsetPx: 12,
  railSideInsetPx: 16,
  railLabelBottomPx: 44,
  railLabelRowPx: 15,
  shutterSizePx: 72,
  shutterInnerPx: 58,
  shutterRaisePx: 16,
  shutterStopPx: 22,
  hintBottomPx: 12,
  lightButtonSizePx: 48,
  doneButtonSizePx: 56,
  modeSelectorRowPx: 36,
  modeSelectorBottomPx: 167,
  qualityLockBottomPx: 209,
  qualityLockRowPx: 32,
  clipChipsBottomPx: 215,
  clipChipsRowPx: 28,
  lidarChipTopGapPx: 8,
  chromeClearancePx: 20,
  clipToModeGapPx: 12,
} as const;

export function measureTwinCaptureClearance(viewportHeightPx: number) {
  const shutterBottomFromBottom =
    TWIN_CAPTURE_CHROME.railLabelBottomPx +
    TWIN_CAPTURE_CHROME.railLabelRowPx +
    TWIN_CAPTURE_CHROME.shutterRaisePx;
  const shutterTopFromBottom = shutterBottomFromBottom + TWIN_CAPTURE_CHROME.shutterSizePx;
  const modeBottomFromBottom = TWIN_CAPTURE_CHROME.modeSelectorBottomPx;
  const modeTopFromBottom = modeBottomFromBottom + TWIN_CAPTURE_CHROME.modeSelectorRowPx;
  const clipBottomFromBottom = TWIN_CAPTURE_CHROME.clipChipsBottomPx;
  const hintTopFromBottom = TWIN_CAPTURE_CHROME.hintBottomPx + 14;
  const shutterHintGapPx = shutterBottomFromBottom - hintTopFromBottom;

  return {
    viewportHeightPx,
    shutterTopFromBottomPx: shutterTopFromBottom,
    shutterBottomFromBottomPx: shutterBottomFromBottom,
    modeSelectorBottomFromBottomPx: modeBottomFromBottom,
    modeSelectorTopFromBottomPx: modeTopFromBottom,
    modeToShutterGapPx: modeBottomFromBottom - shutterTopFromBottom,
    clipChipsBottomFromBottomPx: clipBottomFromBottom,
    clipToModeGapPx: clipBottomFromBottom - modeTopFromBottom,
    hintTopFromBottomPx: hintTopFromBottom,
    shutterToHintGapPx: shutterHintGapPx,
  };
}
