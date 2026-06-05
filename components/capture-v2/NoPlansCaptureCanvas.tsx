"use client";

import { useCallback, useRef, useState } from "react";
import { useCamera } from "@/lib/hooks/useCamera";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
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

export function NoPlansCaptureCanvas({ session, loop, contextLabel }: Props) {
  const camera = useCamera();
  const [topBarCollapsed, setTopBarCollapsed] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const holdStubRef = useRef(false);

  const stopCount = loop.items.length;
  const showPreview = Boolean(loop.activePreview?.url);
  const previewUrl = resolveCaptureV2PreviewUrl(loop.activeItem, loop.activePreview?.url);
  const previewTitle = loop.activePreview?.title?.trim() || "Captured photo";
  const previewLocalFallback =
    loop.activePreview?.url?.startsWith("blob:") ? loop.activePreview.url : loop.activeItem?.local_preview_url ?? null;

  const handleCanvasTap = useCallback(() => {
    setTopBarCollapsed((value) => !value);
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
    if (holdStubRef.current) return;
    if (showPreview) {
      void returnToLiveCamera();
      return;
    }
    if (!camera.isStreaming) return;
    const video = camera.videoRef.current;
    if (!video) return;
    const result = camera.capturePhoto();
    if (!result) return;
    const file = new File([result.blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    ingestFile(file);
  }, [camera, ingestFile, returnToLiveCamera, showPreview]);

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

  const handleFlipCamera = useCallback(async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    camera.stopCamera();
    await camera.startCamera(next);
  }, [camera, facingMode]);

  return (
    <div className={CANVAS_ROOT_CLASS} data-capture-canvas="no-plans">
      <CaptureCanvasTopBar
        sessionId={session.id}
        contextLabel={contextLabel}
        stopCount={stopCount}
        collapsed={topBarCollapsed}
        overlay={false}
        flashOn={flashOn}
        onToggleFlash={() => setFlashOn((value) => !value)}
        showFlip={!showPreview && camera.isStreaming}
        showFlash={!showPreview && camera.isStreaming}
        onFlipCamera={() => void handleFlipCamera()}
      />

      <div
        role="button"
        tabIndex={0}
        className="relative mx-2 mb-0 mt-1 flex min-h-0 flex-[3] flex-col overflow-hidden rounded-2xl border border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)]"
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
          />
        ) : (
          <CaptureV2LiveCamera camera={camera} facingMode={facingMode} autoStart />
        )}
        <CaptureV2LiveCameraBusyOverlay busy={loop.busy} />
      </div>

      <CaptureStopFilmstrip
        loop={loop}
        onSelectItem={handleSelectStop}
        onDeleteItem={handleDeleteStop}
        deletingItemId={loop.deletingStopId}
      />

      <CaptureCanvasBottomRail
        busy={loop.busy}
        showHint={!showPreview && !camera.isStreaming}
        onShutterTap={handleShutterTap}
        onShutterHoldStart={() => {
          holdStubRef.current = true;
        }}
        onShutterHoldEnd={() => {
          holdStubRef.current = false;
        }}
      />
    </div>
  );
}
