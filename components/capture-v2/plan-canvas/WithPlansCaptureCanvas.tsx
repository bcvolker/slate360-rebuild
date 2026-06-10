"use client";

import { PlanViewerLeaflet } from "@/components/site-walk/capture/PlanViewerLeaflet";
import { CAPTURE_PLAN_CANVAS_CHROME } from "@/lib/site-walk/capture-plan-canvas-tokens";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import { CaptureStopFilmstrip } from "../CaptureStopFilmstrip";
import type { CaptureV2Session } from "../session-types";
import type { CaptureV2Loop } from "../useCaptureV2Loop";
import { CapturePlanBottomRail } from "./CapturePlanBottomRail";
import { CapturePlanSheetPickerSheet } from "./CapturePlanSheetPickerSheet";
import { CapturePlanTopBar } from "./CapturePlanTopBar";
import { useWithPlansCaptureCanvas } from "./useWithPlansCaptureCanvas";

const CANVAS_ROOT_CLASS =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)] touch-manipulation select-none [-webkit-touch-callout:none] [-webkit-user-select:none]";

type Props = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  planSets: SiteWalkPlanSet[];
  planSheets: SiteWalkPlanSheet[];
  sheetImageUrls?: Record<string, string>;
};

export function WithPlansCaptureCanvas({
  session,
  loop,
  planSets,
  planSheets,
  sheetImageUrls,
}: Props) {
  const canvas = useWithPlansCaptureCanvas({
    loop,
    planSets,
    planSheets,
    sheetImageUrls,
  });
  const safeBottom = "env(safe-area-inset-bottom)";

  return (
    <div className={CANVAS_ROOT_CLASS} data-capture-canvas="with-plans">
      <div className="relative min-h-0 flex-1 overflow-hidden">
        <PlanViewerLeaflet
          projectId={session.project_id}
          sessionId={session.id}
          planSets={planSets}
          sheets={planSheets}
          items={loop.items}
          hideToolbar
          allowPinPlacement={false}
          pageIndex={canvas.pageIndex}
          onPageIndexChange={canvas.setPageIndex}
          sheetImageUrls={sheetImageUrls}
          fitPadding={canvas.fitPadding}
          onSelectItem={(itemId) => {
            const item = loop.items.find((entry) => entry.id === itemId);
            if (item) canvas.handleSelectStop(item);
          }}
        />
      </div>

      <CapturePlanTopBar
        sheetLabel={canvas.sheetLabel}
        sheetPosition={canvas.sheetPosition}
        hidden={!canvas.chromeVisible}
        onOpenSheetPicker={canvas.openSheetPicker}
      />

      <div
        className="pointer-events-none absolute inset-x-0 z-20"
        style={{ bottom: `calc(${CAPTURE_PLAN_CANVAS_CHROME.planFilmstripBottomPx}px + ${safeBottom})` }}
      >
        <CaptureStopFilmstrip
          variant="overlay"
          loop={loop}
          defaultCollapsed
          hidden={!canvas.chromeVisible}
          onSelectItem={canvas.handleSelectStop}
          onDeleteItem={canvas.handleDeleteStop}
          deletingItemId={loop.deletingStopId}
        />
      </div>

      <CapturePlanBottomRail
        hidden={!canvas.chromeVisible}
        canGoPrev={canvas.canGoPrev}
        canGoNext={canvas.canGoNext}
        onPrev={canvas.goPrevSheet}
        onNext={canvas.goNextSheet}
      />

      <CapturePlanSheetPickerSheet
        open={canvas.sheetPickerOpen}
        sheets={canvas.sortedSheets}
        activeSheetId={canvas.activeSheet?.id ?? null}
        sheetImageUrls={sheetImageUrls}
        onClose={canvas.closeSheetPicker}
        onSelectSheet={canvas.selectSheetById}
      />
    </div>
  );
}
