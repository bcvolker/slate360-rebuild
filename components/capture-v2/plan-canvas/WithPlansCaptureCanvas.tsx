"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";
import type { SiteWalkPlanSet, SiteWalkPlanSheet } from "@/lib/types/site-walk";
import { CaptureStopFilmstrip } from "../CaptureStopFilmstrip";
import { CaptureV2SourcePickerSheet } from "../CaptureV2SourcePickerSheet";
import { SlateDropFilePickerModal } from "@/components/slatedrop/SlateDropFilePickerModal";
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
  const [filmstripExpanded, setFilmstripExpanded] = useState(false);
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
          focusItemId={canvas.focusItemId}
          focusTick={canvas.focusTick}
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
        showFilmstripToggle
        filmstripExpanded={filmstripExpanded}
        onFilmstripToggle={() => setFilmstripExpanded((value) => !value)}
        filmstripPanel={
          <CaptureStopFilmstrip
            variant="topBar"
            loop={loop}
            collapsed={!filmstripExpanded}
            hidden={!canvas.chromeVisible}
            onSelectItem={canvas.handleSelectStop}
            onDeleteItem={canvas.handleDeleteStop}
            deletingItemId={loop.deletingStopId}
          />
        }
      />

      <CapturePlanBottomRail
        hidden={!canvas.chromeVisible}
        canGoPrev={canvas.canGoPrev}
        canGoNext={canvas.canGoNext}
        onPrev={canvas.goPrevSheet}
        onNext={canvas.goNextSheet}
        sheetPosition={canvas.sheetPosition}
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
        onClick={(event) => { (event.target as HTMLInputElement).value = ""; }}
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={pinCapture.sourcePicker.onInputChange("take_photo")}
      />
      <input
        ref={pinCapture.sourcePicker.rollInputRef}
        type="file"
        onClick={(event) => { (event.target as HTMLInputElement).value = ""; }}
        accept="image/*"
        className="hidden"
        onChange={pinCapture.sourcePicker.onInputChange("camera_roll")}
      />
      <input
        ref={pinCapture.sourcePicker.fileInputRef}
        type="file"
        onClick={(event) => { (event.target as HTMLInputElement).value = ""; }}
        accept="*/*"
        className="hidden"
        onChange={pinCapture.sourcePicker.onInputChange("upload_file")}
      />
      <input
        ref={pinCapture.sourcePicker.photo360InputRef}
        type="file"
        onClick={(event) => { (event.target as HTMLInputElement).value = ""; }}
        accept="image/*"
        className="hidden"
        onChange={pinCapture.sourcePicker.onInputChange("photo_360")}
      />

      <CapturePlanPinDetailSheet
        open={Boolean(pinCapture.pinDetailPin)}
        pin={pinCapture.pinDetailPin}
        item={pinCapture.pinDetailItem}
        deleting={Boolean(pinCapture.pinDetailPin && pinCapture.deletingPinId === pinCapture.pinDetailPin.id)}
        onClose={() => pinCapture.setPinDetailPin(null)}
        onOpenDetails={pinCapture.openPinDetails}
        onCaptureInto={() => {
          if (pinCapture.pinDetailPin) pinCapture.captureIntoPin(pinCapture.pinDetailPin, canvas.activeSheet?.id ?? "");
        }}
        onDelete={() => {
          if (pinCapture.pinDetailPin) void pinCapture.deletePin(pinCapture.pinDetailPin);
        }}
      />

      <SlateDropFilePickerModal
        open={pinCapture.project360PickerOpen}
        projectId={session.project_id}
        maxFiles={1}
        title="Pick a 360 photo"
        onClose={() => pinCapture.setProject360PickerOpen(false)}
        onConfirm={pinCapture.handleProject360Picked}
      />
    </div>
  );
}
