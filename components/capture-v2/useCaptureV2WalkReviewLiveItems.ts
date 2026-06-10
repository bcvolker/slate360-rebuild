"use client";

import { useEffect, useMemo } from "react";
import { useCaptureItems } from "@/components/site-walk/capture/useCaptureItems";
import {
  buildWalkReviewStopCards,
  mapSummaryItemsToCaptureRecords,
} from "./capture-v2-walk-review-card-model";
import type { CaptureV2SummaryItem } from "./capture-v2-summary-types";

type Args = {
  sessionId: string;
  projectId: string | null;
  initialItems: CaptureV2SummaryItem[];
  itemHref: (itemId: string) => string;
};

export function useCaptureV2WalkReviewLiveItems({
  sessionId,
  projectId,
  initialItems,
  itemHref,
}: Args) {
  const captureItems = useCaptureItems({ sessionId, projectId });

  useEffect(() => {
    const refresh = () => {
      void fetch(`/api/site-walk/items?session_id=${encodeURIComponent(sessionId)}`, {
        cache: "no-store",
      });
    };
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [sessionId]);

  const mergedItems = useMemo(() => {
    if (captureItems.items.length === 0) return mapSummaryItemsToCaptureRecords(initialItems);
    return captureItems.items;
  }, [captureItems.items, initialItems]);

  const cards = useMemo(
    () => buildWalkReviewStopCards(mergedItems, sessionId, itemHref),
    [itemHref, mergedItems, sessionId],
  );

  return { cards, liveItems: mergedItems };
}
