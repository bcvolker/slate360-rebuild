import {
  WALK_REVIEW_GRID_GAP_PX,
  WALK_REVIEW_ROW_HEIGHT_PX,
} from "@/components/capture-v2/capture-v2-walk-review-tokens";

export type WalkReviewMeasure = {
  stopCount: number;
  variant: "quick" | "project";
  viewportWidth: number;
  viewportHeight: number;
  gridGapPx: number;
  firstCardTopY: number;
  secondCardTopY: number | null;
  rowGapPx: number | null;
  actionsTopY: number;
  scrollBottomY: number;
  scrollToActionsGapPx: number;
  overlapPx: number;
  attachVisible: boolean;
  expectedRowHeightPx: number;
};

export function measureWalkReviewLayout(
  stopCount: number,
  variant: "quick" | "project",
): WalkReviewMeasure | null {
  const frame =
    document.querySelector<HTMLElement>('[data-dev-device="mobile"]') ??
    document.querySelector<HTMLElement>('[data-walk-review="screen"]');
  const grid = document.querySelector<HTMLElement>('[data-walk-review="grid"]');
  const cards = Array.from(document.querySelectorAll<HTMLElement>('[data-walk-review="stop-card"]'));
  const actions = document.querySelector<HTMLElement>('[data-walk-review="actions"]');
  const scroll = document.querySelector<HTMLElement>('[data-walk-review="grid-scroll"]');

  if (!frame || !grid || !actions || !scroll) return null;

  const frameRect = frame.getBoundingClientRect();
  const gridStyle = window.getComputedStyle(grid);
  const gridGapPx = Number.parseFloat(gridStyle.gap || gridStyle.rowGap || "0") || WALK_REVIEW_GRID_GAP_PX;
  const firstCardRect = cards[0]?.getBoundingClientRect();
  const secondCardRect = cards[1]?.getBoundingClientRect();
  const thirdCardRect = cards[2]?.getBoundingClientRect();
  const actionsRect = actions.getBoundingClientRect();
  const scrollRect = scroll.getBoundingClientRect();

  const rowGapPx =
    firstCardRect && thirdCardRect
      ? Math.round(thirdCardRect.top - firstCardRect.bottom)
      : firstCardRect && secondCardRect
        ? Math.round(secondCardRect.top - firstCardRect.top)
        : null;

  const scrollToActionsGapPx = Math.round(actionsRect.top - scrollRect.bottom);
  const overlapPx = scrollRect.bottom - actionsRect.top;

  return {
    stopCount,
    variant,
    viewportWidth: frameRect.width,
    viewportHeight: frameRect.height,
    gridGapPx,
    firstCardTopY: firstCardRect ? Math.round(firstCardRect.top) : 0,
    secondCardTopY: secondCardRect ? Math.round(secondCardRect.top) : null,
    rowGapPx,
    actionsTopY: Math.round(actionsRect.top),
    scrollBottomY: Math.round(scrollRect.bottom),
    scrollToActionsGapPx,
    overlapPx,
    attachVisible: Boolean(
      actions.querySelector("button")?.textContent?.toLowerCase().includes("attach"),
    ),
    expectedRowHeightPx: WALK_REVIEW_ROW_HEIGHT_PX,
  };
}
