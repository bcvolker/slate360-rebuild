export type CapturePlanChromeMeasure = {
  viewportWidth: number;
  viewportHeight: number;
  topBarBottomY: number;
  sheetPillCenterX: number;
  filmstripBottomY: number;
  planRailBottomY: number;
  prevSheetCenterX: number;
  nextSheetCenterX: number;
  sheetPickerOpen: boolean;
  activeSheetLabel: string | null;
};

function centerX(rect: DOMRect) {
  return rect.left + rect.width / 2;
}

export function measurePlanCaptureChromeLayout(): CapturePlanChromeMeasure | null {
  const frame =
    document.querySelector<HTMLElement>('[data-dev-device="mobile"]') ??
    document.querySelector<HTMLElement>('[data-capture-canvas="with-plans"]');
  const topBar = document.querySelector<HTMLElement>('[data-capture-chrome="plan-top-bar"]');
  const sheetPill = document.querySelector<HTMLElement>('[data-capture-chrome="plan-sheet-pill"]');
  const filmstrip = document.querySelector<HTMLElement>('[data-capture-chrome="filmstrip"]');
  const rail = document.querySelector<HTMLElement>('[data-capture-chrome="plan-bottom-rail"]');
  const prev = document.querySelector<HTMLElement>('[data-capture-chrome="plan-prev-sheet"]');
  const next = document.querySelector<HTMLElement>('[data-capture-chrome="plan-next-sheet"]');
  const picker = document.querySelector<HTMLElement>('[data-capture-chrome="plan-sheet-picker"]');

  if (!frame || !topBar || !sheetPill || !filmstrip || !rail || !prev || !next) return null;

  const frameRect = frame.getBoundingClientRect();
  const topBarRect = topBar.getBoundingClientRect();
  const sheetPillRect = sheetPill.getBoundingClientRect();
  const filmstripRect = filmstrip.getBoundingClientRect();
  const railRect = rail.getBoundingClientRect();
  const prevRect = prev.getBoundingClientRect();
  const nextRect = next.getBoundingClientRect();

  return {
    viewportWidth: frameRect.width,
    viewportHeight: frameRect.height,
    topBarBottomY: topBarRect.bottom,
    sheetPillCenterX: centerX(sheetPillRect),
    filmstripBottomY: filmstripRect.bottom,
    planRailBottomY: railRect.bottom,
    prevSheetCenterX: centerX(prevRect),
    nextSheetCenterX: centerX(nextRect),
    sheetPickerOpen: Boolean(picker),
    activeSheetLabel: sheetPill.textContent?.trim() ?? null,
  };
}
