"use client";

import { getItemPhotoAttachmentPins } from "@/lib/site-walk/photo-attachments";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { CaptureCanvasAngleThumbs } from "./CaptureCanvasAngleThumbs";
import { CaptureCanvasBottomRail } from "./CaptureCanvasBottomRail";
import { CaptureCanvasCapturedPhoto } from "./CaptureCanvasCapturedPhoto";
import { CaptureCanvasMarkupToolbar } from "./CaptureCanvasMarkupToolbar";
import { CaptureCanvasRightToolRail } from "./CaptureCanvasRightToolRail";
import { CaptureCanvasTopBar } from "./CaptureCanvasTopBar";
import { CaptureStopFilmstrip } from "./CaptureStopFilmstrip";
import { CaptureV2NoteReviewContainer } from "./note-review/CaptureV2NoteReviewContainer";
import { CAPTURE_V2_LAYERS } from "./layers";
import { CaptureV2LiveCamera, CaptureV2LiveCameraBusyOverlay } from "./CaptureV2LiveCamera";
import type { CaptureV2Session } from "./session-types";
import type { CaptureV2Loop } from "./useCaptureV2Loop";
import { CaptureV2SourcePickerSheet } from "./CaptureV2SourcePickerSheet";
import { useNoPlansCaptureCanvas } from "./useNoPlansCaptureCanvas";

const CANVAS_ROOT_CLASS =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)] touch-manipulation select-none [-webkit-touch-callout:none] [-webkit-user-select:none]";

type Props = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  contextLabel: string;
  photo360Entitled?: boolean;
  devOpenSourcePicker?: boolean;
  returnFromSummary?: boolean;
  planPinFlow?: {
    projectLabel: string;
    stopNumber: number;
    onReturnToPlan: () => void;
  } | null;
  initialDetailsOpen?: boolean;
};

function CaptureV2HiddenFileInputs({ loop }: { loop: CaptureV2Loop }) {
  return (
    <>
      <input
        ref={loop.cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onClick={loop.resetFileInputClick}
        onChange={(event) => loop.handleDirectFileChange(event, false)}
      />
      <input
        ref={loop.uploadInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onClick={loop.resetFileInputClick}
        onChange={(event) => loop.handleDirectFileChange(event, false)}
      />
    </>
  );
}

export function NoPlansCaptureCanvas({
  session,
  loop,
  contextLabel,
  photo360Entitled = false,
  devOpenSourcePicker = false,
  returnFromSummary = false,
  planPinFlow = null,
  initialDetailsOpen = false,
}: Props) {
  const canvas = useNoPlansCaptureCanvas({
    session,
    loop,
    contextLabel,
    photo360Entitled,
    devOpenSourcePicker,
    returnFromSummary,
    planPinFlow,
    initialDetailsOpen,
  });
  const safeBottom = "env(safe-area-inset-bottom)";

  return (
    <div className={CANVAS_ROOT_CLASS} data-capture-canvas="no-plans">
      <div
        role={canvas.showPreview ? undefined : "button"}
        tabIndex={canvas.showPreview ? undefined : 0}
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={canvas.showPreview ? undefined : canvas.handleCanvasTap}
        onKeyDown={
          canvas.showPreview
            ? undefined
            : (event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  canvas.handleCanvasTap();
                }
              }
        }
        aria-label={canvas.showPreview ? undefined : "Toggle capture controls"}
      >
        {canvas.showPreview && canvas.displayUrl ? (
          <CaptureCanvasCapturedPhoto
            sessionId={session.id}
            imageUrl={canvas.displayUrl}
            title={canvas.previewTitle}
            markupEnabled={canvas.markupEnabled}
            pinMode={canvas.pinMode}
            initialPins={getItemPhotoAttachmentPins(canvas.activeItem)}
            initialMarkup={canvas.activeItem?.markup_data}
            onMarkupChange={(markup) => {
              if (canvas.itemId) void loop.saveMarkupData(canvas.itemId, markup);
            }}
            onPinsChange={(pins) => {
              if (canvas.itemId) void loop.savePhotoAttachmentPins(canvas.itemId, pins);
            }}
            onPinTap={canvas.handlePinTap}
            onAttachHere={canvas.handleAttachHere}
          />
        ) : (
          <CaptureV2LiveCamera camera={canvas.camera} facingMode={canvas.facingMode} autoStart fullBleed />
        )}
        <CaptureV2LiveCameraBusyOverlay busy={loop.busy} />
      </div>

      <CaptureCanvasTopBar
        headerLabel={canvas.showPreview ? canvas.capturedHeaderLabel : canvas.liveHeaderLabel}
        hidden={!canvas.chromeVisible}
        onToggleChrome={() => canvas.setChromeVisible((value) => !value)}
        onBack={planPinFlow ? planPinFlow.onReturnToPlan : undefined}
      />

      {canvas.showPreview && canvas.markupEnabled ? (
        <div
          className="pointer-events-auto absolute left-3 right-3 z-30 flex justify-center"
          style={{
            top: `calc(max(env(safe-area-inset-top), ${CAPTURE_CANVAS_CHROME.topInsetPx}px) + ${CAPTURE_CANVAS_CHROME.topBarHeightPx}px + 8px)`,
          }}
        >
          <CaptureCanvasMarkupToolbar />
        </div>
      ) : null}

      <CaptureCanvasRightToolRail
        hidden={!canvas.chromeVisible || !canvas.showPreview}
        activeTool={canvas.activeTool}
        onSelectTool={canvas.handleSelectTool}
      />

      {canvas.showPreview && canvas.activeItem ? (
        <CaptureCanvasAngleThumbs
          hidden={!canvas.chromeVisible}
          item={canvas.activeItem}
          activeAngleId={canvas.activeAngleId}
          onSelectMain={canvas.handleSelectMain}
          onSelectAngle={canvas.handleSelectAngle}
          onPromoteAngle={canvas.handlePromoteAngle}
        />
      ) : (
        <div
          className="pointer-events-none absolute inset-x-0 z-20"
          style={{ bottom: `calc(${CAPTURE_CANVAS_CHROME.filmstripBottomPx}px + ${safeBottom})` }}
        >
          <CaptureStopFilmstrip
            variant="overlay"
            loop={loop}
            hidden={!canvas.chromeVisible}
            onSelectItem={canvas.handleSelectStop}
            onDeleteItem={canvas.handleDeleteStop}
            deletingItemId={loop.deletingStopId}
          />
        </div>
      )}

      <CaptureCanvasBottomRail
        busy={loop.busy}
        hidden={!canvas.chromeVisible}
        variant={canvas.showPreview ? "captured" : "live"}
        onShutterTap={canvas.showPreview ? canvas.handleShutterTapCaptured : canvas.handleShutterTapLive}
        onShutterHold={canvas.showPreview ? undefined : canvas.handleShutterHold}
        onDetailsTap={() => canvas.setDetailsOpen(true)}
      />

      {canvas.detailsOpen && canvas.activeItem ? (
        <div className={`${CAPTURE_V2_LAYERS.drawer} absolute inset-0 z-50`}>
          <CaptureV2NoteReviewContainer
            loop={loop}
            sessionId={session.id}
            stopNumber={canvas.stopNumber}
            activeAngleId={canvas.activeAngleId}
            onSelectMain={canvas.handleSelectMain}
            onSelectAngle={canvas.handleSelectAngle}
            onPromoteAngle={canvas.handlePromoteAngle}
            onAddAngle={() => {
              canvas.setDetailsOpen(false);
              loop.addAnotherAngle();
            }}
            onBack={() => canvas.handleReviewBack()}
          />
        </div>
      ) : null}

      <CaptureV2HiddenFileInputs loop={loop} />
      <CaptureV2SourcePickerSheet
        open={canvas.sourcePicker.isOpen}
        title={canvas.sourcePicker.sheetTitle}
        subtitle={canvas.sourcePicker.sheetSubtitle}
        rows={canvas.sourcePicker.rows}
        onClose={canvas.sourcePicker.close}
        onSelect={canvas.sourcePicker.selectRow}
      />
      <input
        ref={canvas.sourcePicker.cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={canvas.sourcePicker.onInputChange("take_photo")}
      />
      <input
        ref={canvas.sourcePicker.rollInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={canvas.sourcePicker.onInputChange("camera_roll")}
      />
      <input
        ref={canvas.sourcePicker.fileInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={canvas.sourcePicker.onInputChange("upload_file")}
      />
      <input
        ref={canvas.sourcePicker.photo360InputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={canvas.sourcePicker.onInputChange("photo_360")}
      />
    </div>
  );
}
