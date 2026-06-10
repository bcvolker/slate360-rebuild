"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import { CAPTURE_PLAN_CANVAS_CHROME } from "@/lib/site-walk/capture-plan-canvas-tokens";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import { CaptureStopFilmstrip } from "../CaptureStopFilmstrip";
import { CaptureV2SourcePickerSheet } from "../CaptureV2SourcePickerSheet";
import { NoPlansCaptureCanvas } from "../NoPlansCaptureCanvas";
import type { CaptureV2Session } from "../session-types";
import type { CaptureV2Loop } from "../useCaptureV2Loop";
import { CapturePlanBottomRail } from "./CapturePlanBottomRail";
import { CapturePlanPinDetailSheet } from "./CapturePlanPinDetailSheet";
import { CapturePlanSheetPickerSheet } from "./CapturePlanSheetPickerSheet";
import { CapturePlanTopBar } from "./CapturePlanTopBar";
import { useWithPlansCaptureCanvas } from "./useWithPlansCaptureCanvas";
import { useWithPlansPinCapture } from "./useWithPlansPinCapture";

const PlanViewerLeaflet = dynamic(
  () =>
    import("@/components/site-walk/capture/PlanViewerLeaflet").then((module) => ({
      default: module.PlanViewerLeaflet,
    })),
  { ssr: false },
);

const CANVAS_ROOT_CLASS =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)] touch-manipulation select-none [-webkit-touch-callout:none] [-webkit-user-select:none]";

type Props = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  planSets: SiteWalkPlanSet[];
  planSheets: SiteWalkPlanSheet[];
  sheetImageUrls?: Record<string, string>;
  photo360Entitled?: boolean;
  onPlanCaptureSaved?: () => void;
  devExposeMap?: boolean;
};

export function WithPlansCaptureCanvas({
  session,
  loop,
  planSets,
  planSheets,
  sheetImageUrls,
  photo360Entitled = false,
  onPlanCaptureSaved,
  devExposeMap = false,
}: Props) {
  const [pinRefreshKey, setPinRefreshKey] = useState(0);
  const refreshPins = useCallback(() => {
    setPinRefreshKey((value) => value + 1);
    onPlanCaptureSaved?.();
  }, [onPlanCaptureSaved]);

  const canvas = useWithPlansCaptureCanvas({
    loop,
    planSets,
    planSheets,
    sheetImageUrls,
  });
  const pinCapture = useWithPlansPinCapture({
    session,
    loop,
    photo360Entitled,
    onPinsRefresh: refreshPins,
  });
  const safeBottom = "env(safe-area-inset-bottom)";

  if (pinCapture.captureActive) {
    return (
      <div className={CANVAS_ROOT_CLASS} data-capture-canvas="with-plans-capture">
        <NoPlansCaptureCanvas
          session={session}
          loop={loop}
          contextLabel={pinCapture.projectLabel}
          photo360Entitled={photo360Entitled}
          planPinFlow={{
            projectLabel: pinCapture.projectLabel,
            stopNumber: pinCapture.pendingStopNumber,
            onReturnToPlan: pinCapture.returnToPlan,
          }}
          initialDetailsOpen={pinCapture.openDetailsOnMount}
        />
      </div>
    );
  }

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
          allowPinPlacement
          useSourcePickerFlow
          pinRefreshKey={pinRefreshKey}
          pageIndex={canvas.pageIndex}
          onPageIndexChange={canvas.setPageIndex}
          sheetImageUrls={sheetImageUrls}
          fitPadding={canvas.fitPadding}
          onPinDropped={pinCapture.handlePinDropped}
          onSessionPinTap={pinCapture.handleSessionPinTap}
          devExposeMap={devExposeMap}
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

      <CaptureV2SourcePickerSheet
        open={pinCapture.sourcePicker.isOpen}
        title={pinCapture.sourcePicker.sheetTitle}
        subtitle={pinCapture.sourcePicker.sheetSubtitle}
        rows={pinCapture.sourcePicker.rows}
        onClose={pinCapture.sourcePicker.close}
        onSelect={pinCapture.handleSourcePickerRow}
      />
      <input
        ref={pinCapture.sourcePicker.cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={pinCapture.sourcePicker.onInputChange("take_photo")}
      />
      <input
        ref={pinCapture.sourcePicker.rollInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pinCapture.sourcePicker.onInputChange("camera_roll")}
      />
      <input
        ref={pinCapture.sourcePicker.fileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={pinCapture.sourcePicker.onInputChange("upload_file")}
      />
      <input
        ref={pinCapture.sourcePicker.photo360InputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={pinCapture.sourcePicker.onInputChange("photo_360")}
      />

      <CapturePlanPinDetailSheet
        open={Boolean(pinCapture.pinDetailPin)}
        pin={pinCapture.pinDetailPin}
        item={pinCapture.pinDetailItem}
        onClose={() => pinCapture.setPinDetailPin(null)}
        onOpenDetails={pinCapture.openPinDetails}
      />
    </div>
  );
}
