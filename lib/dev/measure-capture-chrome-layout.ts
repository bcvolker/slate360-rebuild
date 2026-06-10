import { CAPTURE_CANVAS_CHROME } from "@/components/capture-v2/capture-canvas-chrome-layout";

export type PinPopoverMeasure = {
  viewportWidth: number;
  viewportHeight: number;
  cardWidthPx: number;
  cardLeftPx: number;
  cardRightPx: number;
  cardTopPx: number;
  cardBottomPx: number;
  withinViewport: boolean;
  minActionRowHeightPx: number;
  minCloseTapPx: number;
  minLabelTapPx: number;
};

export type CaptureChromeMeasure = {
  thumbCount: number;
  viewportWidth: number;
  viewportCenterX: number;
  shutterCenterX: number;
  shutterCenterDeltaX: number;
  topBarBottomY: number;
  filmstripTopY: number;
  filmstripBottomY: number;
  shutterTopY: number;
  shutterBottomY: number;
  hintTopY: number;
  filmstripUnderTopBar: boolean;
  shutterToHintGapPx: number;
  ghostCenterY: number;
  endCenterY: number;
  shutterCenterY: number;
  ghostToShutterCenterDeltaY: number;
  endToShutterCenterDeltaY: number;
  overlapPairs: string[];
  lightButtonPresent: boolean;
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

function overlaps(a: DOMRect, b: DOMRect) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

export function measureCaptureChromeLayout(thumbCount: number): CaptureChromeMeasure | null {
  const frame =
    document.querySelector<HTMLElement>('[data-dev-device="mobile"]') ??
    document.querySelector<HTMLElement>('[data-capture-canvas="no-plans"]');
  const shutter = document.querySelector<HTMLElement>('[data-capture-chrome="shutter"]');
  const ghost = document.querySelector<HTMLElement>('[data-capture-chrome="ghost-button"]');
  const end = document.querySelector<HTMLElement>('[data-capture-chrome="end-button"]');
  const filmstrip = document.querySelector<HTMLElement>('[data-capture-chrome="filmstrip"]');
  const topBar = document.querySelector<HTMLElement>('[data-capture-chrome="top-bar"]');
  const hint = document.querySelector<HTMLElement>('[data-capture-chrome="hint"]');

  if (!frame || !shutter || !ghost || !end || !filmstrip || !topBar || !hint) return null;

  const frameRect = frame.getBoundingClientRect();
  const viewportWidth = frameRect.width;
  const viewportCenterX = frameRect.left + frameRect.width / 2;
  const shutterRect = shutter.getBoundingClientRect();
  const ghostRect = ghost.getBoundingClientRect();
  const endRect = end.getBoundingClientRect();
  const filmstripRect = filmstrip.getBoundingClientRect();
  const topBarRect = topBar.getBoundingClientRect();
  const hintRect = hint.getBoundingClientRect();
  const light = document.querySelector<HTMLElement>('[data-capture-chrome="light-button"]');

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

  const nodes = [
    { id: "shutter", rect: shutterRect },
    { id: "ghost", rect: ghostRect },
    { id: "end", rect: endRect },
    { id: "hint", rect: hintRect },
    light && { id: "light", rect: light.getBoundingClientRect() },
  ].filter(Boolean) as { id: string; rect: DOMRect }[];

  const overlapPairs: string[] = [];
  for (let i = 0; i < nodes.length; i += 1) {
    for (let j = i + 1; j < nodes.length; j += 1) {
      const a = nodes[i]!;
      const b = nodes[j]!;
      if (overlaps(a.rect, b.rect)) overlapPairs.push(`${a.id}×${b.id}`);
    }
  }

  const shutterToHintGapPx = Math.round(hintRect.top - shutterRect.bottom);
  const filmstripUnderTopBar = filmstripRect.top >= topBarRect.top - 1;

  return {
    thumbCount,
    viewportWidth,
    viewportCenterX,
    shutterCenterX,
    shutterCenterDeltaX,
    topBarBottomY: topBarRect.bottom,
    filmstripTopY: filmstripRect.top,
    filmstripBottomY: filmstripRect.bottom,
    shutterTopY: shutterRect.top,
    shutterBottomY: shutterRect.bottom,
    hintTopY: hintRect.top,
    filmstripUnderTopBar,
    shutterToHintGapPx,
    ghostCenterY: centerY(ghostRect),
    endCenterY: centerY(endRect),
    shutterCenterY: centerY(shutterRect),
    ghostToShutterCenterDeltaY: centerY(ghostRect) - centerY(shutterRect),
    endToShutterCenterDeltaY: centerY(endRect) - centerY(shutterRect),
    overlapPairs,
    lightButtonPresent: Boolean(light),
    sourcePickerOpen: Boolean(sheet),
    sourcePickerHeightPx: sheetRect?.height ?? null,
    sourcePickerRowHeightPx: rowRect?.height ?? null,
    sourcePickerBottomPadPx: bottomPad,
    shutterCenterDeltaXWithPicker: sheet ? shutterCenterDeltaX : null,
  };
}

export function assertCaptureChromeLayout(sample: CaptureChromeMeasure): string[] {
  const failures: string[] = [];

  if (Math.abs(sample.shutterCenterDeltaX) > 2) {
    failures.push(`shutter off-center by ${sample.shutterCenterDeltaX.toFixed(1)}px`);
  }
  if (!sample.filmstripUnderTopBar) {
    failures.push("filmstrip not under top bar");
  }
  if (sample.filmstripBottomY > sample.shutterTopY - 8) {
    failures.push("filmstrip overlaps shutter vertical band");
  }
  if (sample.shutterToHintGapPx > CAPTURE_CANVAS_CHROME.shutterHintGapPx + 4) {
    failures.push(`shutter-to-hint gap ${sample.shutterToHintGapPx}px exceeds ${CAPTURE_CANVAS_CHROME.shutterHintGapPx}px`);
  }
  if (sample.overlapPairs.length > 0) {
    failures.push(`overlaps: ${sample.overlapPairs.join(", ")}`);
  }

  return failures;
}

export function measurePinPopoverLayout(): PinPopoverMeasure | null {
  const frame =
    document.querySelector<HTMLElement>('[data-dev-device="mobile"]') ??
    document.querySelector<HTMLElement>('[data-capture-canvas="no-plans"]');
  const popover = document.querySelector<HTMLElement>('[data-capture-chrome="pin-popover"]');
  const actionRows = Array.from(
    document.querySelectorAll<HTMLElement>('[data-capture-chrome="pin-action-row"]'),
  );
  const closeButton = document.querySelector<HTMLElement>('[data-capture-chrome="pin-popover-close"]');
  const labelInput = document.querySelector<HTMLElement>('[data-capture-chrome="pin-label-input"]');
  if (!frame || !popover) return null;

  const frameRect = frame.getBoundingClientRect();
  const popoverRect = popover.getBoundingClientRect();
  const rowHeights = actionRows.map((row) => row.getBoundingClientRect().height);
  const closeRect = closeButton?.getBoundingClientRect();
  const labelRect = labelInput?.getBoundingClientRect();

  const withinViewport =
    popoverRect.left >= frameRect.left - 1 &&
    popoverRect.right <= frameRect.right + 1 &&
    popoverRect.top >= frameRect.top - 1 &&
    popoverRect.bottom <= frameRect.bottom + 1;

  return {
    viewportWidth: frameRect.width,
    viewportHeight: frameRect.height,
    cardWidthPx: Math.round(popoverRect.width),
    cardLeftPx: Math.round(popoverRect.left - frameRect.left),
    cardRightPx: Math.round(popoverRect.right - frameRect.left),
    cardTopPx: Math.round(popoverRect.top - frameRect.top),
    cardBottomPx: Math.round(popoverRect.bottom - frameRect.top),
    withinViewport,
    minActionRowHeightPx: rowHeights.length > 0 ? Math.min(...rowHeights) : 0,
    minCloseTapPx: closeRect ? Math.min(closeRect.width, closeRect.height) : 0,
    minLabelTapPx: labelRect ? Math.min(labelRect.width, labelRect.height) : 0,
  };
}

export function assertPinPopoverLayout(sample: PinPopoverMeasure): string[] {
  const failures: string[] = [];
  const MIN_TAP_PX = 44;
  const CARD_WIDTH_TARGET = 280;

  if (!sample.withinViewport) failures.push("pin popover overflows viewport");
  if (Math.abs(sample.cardWidthPx - CARD_WIDTH_TARGET) > 6) {
    failures.push(`pin popover width ${sample.cardWidthPx}px expected ~${CARD_WIDTH_TARGET}px`);
  }
  if (sample.minActionRowHeightPx > 0 && sample.minActionRowHeightPx < MIN_TAP_PX) {
    failures.push(`pin action row height ${sample.minActionRowHeightPx}px below ${MIN_TAP_PX}px`);
  }
  if (sample.minCloseTapPx > 0 && sample.minCloseTapPx < MIN_TAP_PX) {
    failures.push(`pin close tap ${sample.minCloseTapPx}px below ${MIN_TAP_PX}px`);
  }
  if (sample.minLabelTapPx > 0 && sample.minLabelTapPx < MIN_TAP_PX) {
    failures.push(`pin label tap ${sample.minLabelTapPx}px below ${MIN_TAP_PX}px`);
  }
  return failures;
}
