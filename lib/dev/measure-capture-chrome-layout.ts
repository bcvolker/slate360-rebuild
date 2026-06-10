export type CaptureChromeMeasure = {
  thumbCount: number;
  viewportWidth: number;
  viewportCenterX: number;
  shutterCenterX: number;
  shutterCenterDeltaX: number;
  filmstripBottomY: number;
  shutterTopY: number;
  filmstripToShutterGapPx: number;
  ghostCenterY: number;
  endCenterY: number;
  shutterCenterY: number;
  ghostToShutterCenterDeltaY: number;
  endToShutterCenterDeltaY: number;
  sourcePickerOpen: boolean;
  sourcePickerHeightPx: number | null;
  sourcePickerRowHeightPx: number | null;
  sourcePickerBottomPadPx: number | null;
  shutterCenterDeltaXWithPicker: number | null;
};

function centerX(rect: DOMRect) {
  return rect.left + rect.width / 2;
}

function centerY(rect: DOMRect) {
  return rect.top + rect.height / 2;
}

export function measureCaptureChromeLayout(thumbCount: number): CaptureChromeMeasure | null {
  const frame =
    document.querySelector<HTMLElement>('[data-dev-device="mobile"]') ??
    document.querySelector<HTMLElement>('[data-capture-canvas="no-plans"]');
  const shutter = document.querySelector<HTMLElement>('[data-capture-chrome="shutter"]');
  const ghost = document.querySelector<HTMLElement>('[data-capture-chrome="ghost-button"]');
  const end = document.querySelector<HTMLElement>('[data-capture-chrome="end-button"]');
  const filmstrip = document.querySelector<HTMLElement>('[data-capture-chrome="filmstrip"]');

  if (!frame || !shutter || !ghost || !end || !filmstrip) return null;

  const frameRect = frame.getBoundingClientRect();
  const viewportWidth = frameRect.width;
  const viewportCenterX = frameRect.left + frameRect.width / 2;
  const shutterRect = shutter.getBoundingClientRect();
  const ghostRect = ghost.getBoundingClientRect();
  const endRect = end.getBoundingClientRect();
  const filmstripRect = filmstrip.getBoundingClientRect();

  const shutterCenterX = centerX(shutterRect);
  const shutterCenterDeltaX = shutterCenterX - viewportCenterX;
  const sheet = document.querySelector<HTMLElement>('[data-capture-chrome="source-picker-sheet"]');
  const firstRow = document.querySelector<HTMLElement>('[data-capture-chrome="source-picker-row"]');
  const sheetRect = sheet?.getBoundingClientRect();
  const rowRect = firstRow?.getBoundingClientRect();
  const sheetStyle = sheet ? window.getComputedStyle(sheet) : null;
  const bottomPad = sheetStyle
    ? Number.parseFloat(sheetStyle.paddingBottom || "0")
    : null;

  return {
    thumbCount,
    viewportWidth,
    viewportCenterX,
    shutterCenterX,
    shutterCenterDeltaX,
    filmstripBottomY: filmstripRect.bottom,
    shutterTopY: shutterRect.top,
    filmstripToShutterGapPx: shutterRect.top - filmstripRect.bottom,
    ghostCenterY: centerY(ghostRect),
    endCenterY: centerY(endRect),
    shutterCenterY: centerY(shutterRect),
    ghostToShutterCenterDeltaY: centerY(ghostRect) - centerY(shutterRect),
    endToShutterCenterDeltaY: centerY(endRect) - centerY(shutterRect),
    sourcePickerOpen: Boolean(sheet),
    sourcePickerHeightPx: sheetRect?.height ?? null,
    sourcePickerRowHeightPx: rowRect?.height ?? null,
    sourcePickerBottomPadPx: bottomPad,
    shutterCenterDeltaXWithPicker: sheet ? shutterCenterDeltaX : null,
  };
}
