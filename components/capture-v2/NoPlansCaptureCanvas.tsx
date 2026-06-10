"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useCamera } from "@/lib/hooks/useCamera";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
import { CAPTURE_CANVAS_CHROME } from "./capture-canvas-chrome-layout";
import { CaptureCanvasBottomRail } from "./CaptureCanvasBottomRail";
import { CaptureCanvasTopBar } from "./CaptureCanvasTopBar";
import { CaptureStopFilmstrip } from "./CaptureStopFilmstrip";
import { CaptureV2LiveCamera, CaptureV2LiveCameraBusyOverlay } from "./CaptureV2LiveCamera";
import { CaptureV2StaticPreview } from "./CaptureV2StaticPreview";
import { resolveCaptureV2PreviewUrl } from "./capture-v2-preview-url";
import type { CaptureV2Session } from "./session-types";
import type { CaptureV2Loop } from "./useCaptureV2Loop";

const CANVAS_ROOT_CLASS =
  "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--graphite-canvas)] touch-manipulation select-none [-webkit-touch-callout:none] [-webkit-user-select:none]";

type Props = {
  session: CaptureV2Session;
  loop: CaptureV2Loop;
  contextLabel: string;
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

export function NoPlansCaptureCanvas({ session, loop, contextLabel }: Props) {
  const camera = useCamera();
  const [chromeVisible, setChromeVisible] = useState(true);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  const showPreview = Boolean(loop.activePreview?.url);
  const previewUrl = resolveCaptureV2PreviewUrl(loop.activeItem, loop.activePreview?.url);
  const previewTitle = loop.activePreview?.title?.trim() || "Captured photo";
  const previewLocalFallback =
    loop.activePreview?.url?.startsWith("blob:") ? loop.activePreview.url : loop.activeItem?.local_preview_url ?? null;

  const orderedItems = useMemo(
    () => [...loop.items].sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at)),
    [loop.items],
  );

  const stopNumber = useMemo(() => {
    if (loop.activeItem) {
      const index = orderedItems.findIndex(
        (item) =>
          item.id === loop.activeItem?.id ||
          (loop.activeItem?.client_item_id &&
            item.client_item_id === loop.activeItem.client_item_id),
      );
      if (index >= 0) return index + 1;
    }
    return orderedItems.length + 1;
  }, [loop.activeItem, orderedItems]);

  const headerLabel = session.is_ad_hoc
    ? `QUICK WALK · STOP ${stopNumber}`
    : `${contextLabel.toUpperCase()} · STOP ${stopNumber}`;

  const handleCanvasTap = useCallback(() => {
    setChromeVisible((value) => !value);
  }, []);

  const ingestFile = useCallback(
    (file: File) => {
      loop.setIntent({ source: "quick_capture", input: "camera" });
      loop.handleFile(file, false);
      triggerHapticSuccess();
    },
    [loop],
  );

  const returnToLiveCamera = useCallback(async () => {
    loop.setActivePreview(null);
    if (!camera.isStreaming) {
      await camera.startCamera(facingMode);
    }
  }, [camera, facingMode, loop]);

  const handleShutterTap = useCallback(() => {
    if (showPreview) {
      void returnToLiveCamera();
      return;
    }
    if (!camera.isStreaming) return;
    const result = camera.capturePhoto();
    if (!result) return;
    const file = new File([result.blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    ingestFile(file);
  }, [camera, ingestFile, returnToLiveCamera, showPreview]);

  const handleShutterHold = useCallback(() => {
    loop.openPickerDirect("upload", "quick_capture");
  }, [loop]);

  const handleSelectStop = useCallback(
    (item: Parameters<typeof loop.focusFilmstripItem>[0]) => {
      loop.focusFilmstripItem(item);
    },
    [loop],
  );

  const handleDeleteStop = useCallback(
    async (item: Parameters<typeof loop.deleteStop>[0]) => {
      const result = await loop.deleteStop(item);
      if (!result.ok) return;
      if (showPreview) {
        await returnToLiveCamera();
      }
    },
    [loop, returnToLiveCamera, showPreview],
  );

  const safeBottom = "env(safe-area-inset-bottom)";

  return (
    <div className={CANVAS_ROOT_CLASS} data-capture-canvas="no-plans">
      <div
        role="button"
        tabIndex={0}
        className="relative min-h-0 flex-1 overflow-hidden"
        onClick={handleCanvasTap}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleCanvasTap();
          }
        }}
        aria-label="Toggle capture controls"
      >
        {showPreview && previewUrl ? (
          <CaptureV2StaticPreview
            imageUrl={previewUrl}
            title={previewTitle}
            localFallbackUrl={previewLocalFallback}
            fullBleed
          />
        ) : (
          <CaptureV2LiveCamera camera={camera} facingMode={facingMode} autoStart fullBleed />
        )}
        <CaptureV2LiveCameraBusyOverlay busy={loop.busy} />
      </div>

      <CaptureCanvasTopBar
        headerLabel={headerLabel}
        hidden={!chromeVisible}
        onToggleChrome={() => setChromeVisible((value) => !value)}
      />

      <div
        className="pointer-events-none absolute inset-x-0 z-20"
        style={{
          bottom: `calc(${CAPTURE_CANVAS_CHROME.filmstripBottomPx}px + ${safeBottom})`,
          paddingLeft: CAPTURE_CANVAS_CHROME.sideInsetPx,
          paddingRight: CAPTURE_CANVAS_CHROME.sideInsetPx,
        }}
      >
        <CaptureStopFilmstrip
          variant="overlay"
          loop={loop}
          hidden={!chromeVisible}
          onSelectItem={handleSelectStop}
          onDeleteItem={handleDeleteStop}
          deletingItemId={loop.deletingStopId}
        />
      </div>

      <CaptureCanvasBottomRail
        busy={loop.busy}
        hidden={!chromeVisible}
        onShutterTap={handleShutterTap}
        onShutterHold={handleShutterHold}
      />

      <CaptureV2HiddenFileInputs loop={loop} />
    </div>
  );
}
