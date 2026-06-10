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
  };
}
