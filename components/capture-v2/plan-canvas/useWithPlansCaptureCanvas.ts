"use client";

import { useCallback, useMemo, useState } from "react";
import { capturePlanFitPadding } from "@/lib/site-walk/capture-plan-canvas-tokens";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import type { CaptureItemRecord } from "@/lib/types/site-walk-capture";
import type { CaptureV2Loop } from "../useCaptureV2Loop";

type PlanPage = {
  key: string;
  label: string;
  pageNumber: number;
  sheetId: string;
};

type Args = {
  loop: CaptureV2Loop;
  planSets: SiteWalkPlanSet[];
  planSheets: SiteWalkPlanSheet[];
  sheetImageUrls?: Record<string, string>;
};

function buildSortedPlanPages(planSet: SiteWalkPlanSet | null, sheets: SiteWalkPlanSheet[]): PlanPage[] {
  if (!planSet) return [];
  return sheets
    .filter((sheet) => sheet.plan_set_id === planSet.id)
    .sort((a, b) => a.sort_order - b.sort_order || a.sheet_number - b.sheet_number)
    .map((sheet, index) => ({
      key: sheet.id,
      label: sheet.sheet_name?.trim() || `Sheet ${sheet.sheet_number}`,
      pageNumber: index + 1,
      sheetId: sheet.id,
    }));
}

export function useWithPlansCaptureCanvas({ loop, planSets, planSheets, sheetImageUrls }: Args) {
  const [pageIndex, setPageIndex] = useState(0);
  const [sheetPickerOpen, setSheetPickerOpen] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  // Stop the map pans to when a stop is selected (filmstrip/pin) — drives the
  // additive focus pan in PlanViewerLeaflet. Stop-to-stop nav for the common
  // (same-sheet) case; cross-sheet switching is a later on-device pass. The tick
  // forces a re-pan even when the same stop is re-selected.
  const [focusItemId, setFocusItemId] = useState<string | null>(null);
  const [focusTick, setFocusTick] = useState(0);

  const activePlanSet = useMemo(
    () => planSets.find((set) => set.processing_status === "ready") ?? planSets[0] ?? null,
    [planSets],
  );

  const sortedSheets = useMemo(
    () =>
      activePlanSet
        ? [...planSheets.filter((sheet) => sheet.plan_set_id === activePlanSet.id)].sort(
            (a, b) => a.sort_order - b.sort_order || a.sheet_number - b.sheet_number,
          )
        : [],
    [activePlanSet, planSheets],
  );

  const pages = useMemo(() => buildSortedPlanPages(activePlanSet, planSheets), [activePlanSet, planSheets]);

  const safePageIndex = pages.length > 0 ? Math.min(pageIndex, pages.length - 1) : 0;
  const activePage = pages[safePageIndex] ?? null;
  const activeSheet = sortedSheets.find((sheet) => sheet.id === activePage?.sheetId) ?? sortedSheets[safePageIndex] ?? null;

  const sheetLabel = activeSheet?.sheet_name?.trim() || activePage?.label || "Sheet";
  const sheetPosition = pages.length > 0 ? `${safePageIndex + 1}/${pages.length}` : "0/0";

  const selectSheetById = useCallback(
    (sheetId: string) => {
      const nextIndex = pages.findIndex((page) => page.sheetId === sheetId);
      if (nextIndex >= 0) setPageIndex(nextIndex);
    },
    [pages],
  );

  const goPrevSheet = useCallback(() => {
    setPageIndex((current) => Math.max(0, current - 1));
  }, []);

  const goNextSheet = useCallback(() => {
    setPageIndex((current) => Math.min(Math.max(pages.length - 1, 0), current + 1));
  }, [pages.length]);

  const handleSelectStop = useCallback(
    (item: CaptureItemRecord) => {
      loop.focusFilmstripItem(item);
      setFocusItemId(item.id);
      setFocusTick((tick) => tick + 1);
    },
    [loop],
  );

  const handleDeleteStop = useCallback(
    async (item: CaptureItemRecord) => {
      await loop.deleteStop(item);
    },
    [loop],
  );

  return {
    pageIndex: safePageIndex,
    setPageIndex,
    sheetPickerOpen,
    openSheetPicker: () => setSheetPickerOpen(true),
    closeSheetPicker: () => setSheetPickerOpen(false),
    chromeVisible,
    setChromeVisible,
    activePlanSet,
    sortedSheets,
    activeSheet,
    sheetLabel,
    sheetPosition,
    selectSheetById,
    goPrevSheet,
    goNextSheet,
    canGoPrev: safePageIndex > 0,
    canGoNext: safePageIndex < pages.length - 1,
    handleSelectStop,
    handleDeleteStop,
    focusItemId,
    focusTick,
    fitPadding: capturePlanFitPadding(),
    sheetImageUrls,
  };
}
