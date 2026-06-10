"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  WALK_REVIEW_GRID_GAP_PX,
  WALK_REVIEW_ROW_HEIGHT_PX,
  WALK_REVIEW_VIRTUAL_THRESHOLD,
} from "./capture-v2-walk-review-tokens";
import type { WalkReviewStopCardModel } from "./capture-v2-walk-review-card-model";
import { CaptureV2WalkReviewStopCard } from "./CaptureV2WalkReviewStopCard";
import { walkReviewTokens } from "./capture-v2-walk-review-tokens";

const COLS = 2;
const OVERSCAN_ROWS = 2;

type Props = {
  cards: WalkReviewStopCardModel[];
};

export function CaptureV2WalkReviewGrid({ cards }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(0);

  const shouldVirtualize = cards.length > WALK_REVIEW_VIRTUAL_THRESHOLD;
  const rowCount = Math.ceil(cards.length / COLS);
  const rowHeight = WALK_REVIEW_ROW_HEIGHT_PX + WALK_REVIEW_GRID_GAP_PX;

  const syncViewport = useCallback(() => {
    const node = scrollRef.current;
    if (!node) return;
    setViewportHeight(node.clientHeight);
    setScrollTop(node.scrollTop);
  }, []);

  useEffect(() => {
    syncViewport();
    const node = scrollRef.current;
    if (!node) return;
    const observer = new ResizeObserver(syncViewport);
    observer.observe(node);
    return () => observer.disconnect();
  }, [syncViewport, cards.length]);

  const visibleRange = useMemo(() => {
    if (!shouldVirtualize) return { startRow: 0, endRow: rowCount };
    const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - OVERSCAN_ROWS);
    const endRow = Math.min(
      rowCount,
      Math.ceil((scrollTop + viewportHeight) / rowHeight) + OVERSCAN_ROWS,
    );
    return { startRow, endRow };
  }, [rowCount, rowHeight, scrollTop, shouldVirtualize, viewportHeight]);

  const paddingTop = shouldVirtualize ? visibleRange.startRow * rowHeight : 0;
  const paddingBottom = shouldVirtualize
    ? Math.max(0, (rowCount - visibleRange.endRow) * rowHeight)
    : 0;

  const visibleCards = useMemo(() => {
    if (!shouldVirtualize) return cards;
    const startIndex = visibleRange.startRow * COLS;
    const endIndex = visibleRange.endRow * COLS;
    return cards.slice(startIndex, endIndex);
  }, [cards, shouldVirtualize, visibleRange.endRow, visibleRange.startRow]);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div
        ref={scrollRef}
        className={`${walkReviewTokens.margin} min-h-0 flex-1 overflow-y-auto overscroll-contain no-scrollbar`}
        data-walk-review="grid-scroll"
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      >
        <div
          className="grid grid-cols-2 pb-3"
          style={{ gap: WALK_REVIEW_GRID_GAP_PX, paddingTop, paddingBottom }}
          data-walk-review="grid"
        >
          {visibleCards.map((card) => (
            <CaptureV2WalkReviewStopCard key={card.id} card={card} />
          ))}
        </div>
        <p className={`${walkReviewTokens.hint} pb-3`} data-walk-review="hint">
          Tap a card to edit that stop
        </p>
      </div>
    </div>
  );
}
