"use client";

import { useCallback, useRef, useState } from "react";
import { useCamera } from "@/lib/hooks/useCamera";
import { triggerHapticSuccess } from "@/lib/utils/trigger-haptic";
import { CaptureCanvasBottomRail } from "./CaptureCanvasBottomRail";
import { CaptureCanvasTopBar } from "./CaptureCanvasTopBar";
import { CaptureStopFilmstrip } from "./CaptureStopFilmstrip";
import { CaptureV2LiveCamera, CaptureV2LiveCameraBusyOverlay } from "./CaptureV2LiveCamera";
import { CaptureV2Viewfinder } from "./CaptureV2Viewfinder";
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

  const handleShutterTap = useCallback(() => {
    if (holdStubRef.current) return;
    if (showPreview) {
      loop.openPickerDirect("camera", "next_item");
      return;
    }
    if (!camera.isStreaming) return;
    const video = camera.videoRef.current;
    if (!video) return;
    const result = camera.capturePhoto();
    if (!result) return;
    const file = new File([result.blob], `capture-${Date.now()}.jpg`, { type: "image/jpeg" });
    ingestFile(file);
  }, [camera, ingestFile, loop, showPreview]);

  const handleSelectStop = useCallback(
    (item: Parameters<typeof loop.focusFilmstripItem>[0]) => {
      loop.focusFilmstripItem(item);
    },
    [loop],
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
        flashOn={flashOn}
        onToggleFlash={() => setFlashOn((value) => !value)}
        showFlip={!showPreview && camera.isStreaming}
        showFlash={!showPreview && camera.isStreaming}
        onFlipCamera={() => void handleFlipCamera()}
      />

      <button
        type="button"
        className="relative mx-2 mb-1 mt-2 flex min-h-0 flex-[3] flex-col overflow-hidden rounded-2xl border border-[var(--surface-zinc-border)] bg-[var(--surface-zinc)]"
        onClick={handleCanvasTap}
        aria-label="Toggle capture controls"
      >
        {showPreview ? (
          <div className="pointer-events-none min-h-0 flex-1">
            <CaptureV2Viewfinder
              sessionId={session.id}
              loop={loop}
              markupEnabled={false}
            />
          </div>
        ) : (
          <CaptureV2LiveCamera camera={camera} facingMode={facingMode} />
        )}
        <CaptureV2LiveCameraBusyOverlay busy={loop.busy} />
      </button>

      <CaptureStopFilmstrip loop={loop} onSelectItem={handleSelectStop} />

      <CaptureCanvasBottomRail
        busy={loop.busy}
        showHint={!camera.isStreaming && !showPreview}
        onShutterTap={handleShutterTap}
        onShutterHoldStart={() => {
          holdStubRef.current = true;
        }}
        onShutterHoldEnd={() => {
          holdStubRef.current = false;
        }}
      />

      <CaptureV2HiddenInputs loop={loop} />
    </div>
  );
}

function CaptureV2HiddenInputs({ loop }: { loop: CaptureV2Loop }) {
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
