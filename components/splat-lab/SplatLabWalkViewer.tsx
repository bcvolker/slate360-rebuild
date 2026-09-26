"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import {
  SplatViewerCore,
  type SparkProfileCheck,
  type SplatViewerHandle,
} from "@/components/digital-twin/splat-viewer-core";
import { SplatWalkBar, type SplatViewMode, type WalkStride } from "@/components/splat-lab/SplatWalkBar";
import { setWalkStride } from "@/lib/digital-twin/walk-step";

function webglOk(): boolean {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

export function SplatLabWalkViewer({
  src,
  signedSrc,
  kicker,
  title,
  note,
  showPlan = true,
  showZoom = true,
  allowFullscreen = false,
  expectedProfile,
  onRenderProfileCheck,
  internalPanel,
}: {
  src: string;
  /** Optional endpoint returning a short-lived direct download URL for `src` (see useSplatBytes). */
  signedSrc?: string;
  kicker: string;
  title: string;
  note?: string;
  showPlan?: boolean;
  showZoom?: boolean;
  allowFullscreen?: boolean;
  /** When set, a live renderer that does not match this profile shows a visible notice (never silent). */
  expectedProfile?: SparkProfileCheck["expected"];
  onRenderProfileCheck?: (check: SparkProfileCheck) => void;
  internalPanel?: ReactNode;
}) {
  const ref = useRef<SplatViewerHandle | null>(null);
  const [gl, setGl] = useState<boolean | null>(null);
  const [view, setView] = useState<SplatViewMode>("dollhouse");
  const [stride, setStride] = useState<WalkStride>("normal");
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [canFullscreen, setCanFullscreen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [profileCheck, setProfileCheck] = useState<SparkProfileCheck | null>(null);
  useEffect(() => {
    setCanFullscreen(allowFullscreen && Boolean(document.fullscreenEnabled));
    const onChange = () => setIsFullscreen(document.fullscreenElement === rootRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [allowFullscreen]);
  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void rootRef.current?.requestFullscreen?.();
  }, []);
  const handleProfileCheck = useCallback(
    (check: SparkProfileCheck) => {
      setProfileCheck(check);
      onRenderProfileCheck?.(check);
    },
    [onRenderProfileCheck],
  );
  // Model decoded (overlay gone) but nothing drawn yet / at all: say so instead of a blank canvas.
  const [modelReady, setModelReady] = useState(false);
  const nothingDrawn = profileCheck !== null && (profileCheck.effective.activeSplats ?? 1) === 0;
  const reducedFidelity =
    expectedProfile !== undefined && profileCheck !== null && (!profileCheck.ok || profileCheck.expected !== expectedProfile);

  useEffect(() => { setGl(webglOk()); }, []);
  useEffect(() => { setWalkStride(stride); }, [stride]);

  const cameraMode = view === "walk" ? "interior" : "orbit";

  return (
    <div ref={rootRef} className="relative h-[100dvh] w-full overflow-hidden overscroll-none bg-[var(--graphite-canvas)] text-[var(--mkt-canvas)] touch-manipulation">
      <header className="pointer-events-none absolute inset-x-0 top-0 z-20 px-4 py-3 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] pt-[max(0.75rem,env(safe-area-inset-top))] landscape:py-2 sm:px-5 sm:py-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--mkt-accent)] sm:text-xs">
          {kicker}
        </p>
        <h1 className="font-serif text-xl font-normal text-[var(--mkt-canvas)] landscape:text-lg sm:text-2xl sm:text-[1.75rem]">
          {title}
        </h1>
        {note ? (
          <p className="mt-1 hidden max-w-lg text-[12px] leading-relaxed text-[var(--mkt-canvas)]/70 md:block landscape:hidden">
            {note}
          </p>
        ) : null}
      </header>
      {gl === false ? (
        <div className="absolute inset-0 z-30 flex items-center justify-center px-8 text-center text-sm text-[var(--mkt-canvas)]/70">
          This browser cannot draw 3D. Open the page in Edge, or turn on hardware acceleration in Chrome.
        </div>
      ) : (
        <SplatViewerCore
          ref={ref}
          src={src}
          signedSrc={signedSrc}
          onModelReady={setModelReady}
          className="absolute inset-0 h-full w-full"
          cameraMode={cameraMode}
          onCameraModeChange={(mode) => setView(mode === "interior" ? "walk" : view === "plan" ? "plan" : "dollhouse")}
          onRenderProfileCheck={handleProfileCheck}
        />
      )}
      <SplatWalkBar
        view={view}
        onView={setView}
        stride={stride}
        onStride={setStride}
        onReset={() => {
          setView("dollhouse");
          ref.current?.recenter();
        }}
        onZoomIn={() => ref.current?.zoomIn()}
        onZoomOut={() => ref.current?.zoomOut()}
        showPlan={showPlan}
        showZoom={showZoom}
        onFullscreen={canFullscreen ? toggleFullscreen : undefined}
        fullscreen={isFullscreen}
      />
      {nothingDrawn || (modelReady && expectedProfile !== undefined && profileCheck === null) ? (
        <p role={nothingDrawn ? "alert" : "status"} className="pointer-events-none absolute inset-x-0 top-1/2 z-20 mx-auto w-fit max-w-[85vw] -translate-y-1/2 rounded-md bg-[var(--mkt-surface)]/92 px-3 py-1.5 text-center text-[12px] text-[var(--mkt-ink)]">
          {nothingDrawn ? "The model loaded but the renderer is drawing 0 splats. Tap Reset, or reload the page." : "Rendering…"}
        </p>
      ) : null}
      {reducedFidelity ? (
        <p role="status" className="pointer-events-none absolute inset-x-0 top-[max(4.5rem,env(safe-area-inset-top))] z-20 mx-auto w-fit rounded-md bg-[var(--mkt-surface)]/92 px-3 py-1 text-[11px] text-[var(--mkt-ink)]">
          This device is showing a reduced-quality view of the model.
        </p>
      ) : null}
      {internalPanel}
    </div>
  );
}
