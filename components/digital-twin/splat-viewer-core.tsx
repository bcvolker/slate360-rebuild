"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { Loader2 } from "lucide-react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { formatTwinBytes } from "@/lib/digital-twin/format-bytes";
import type { InteriorCameraFrame } from "@/lib/digital-twin/interior-camera-frame";
import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";
import { SplatViewerScene } from "@/components/digital-twin/splat-viewer-scene";
import {
  ErrorCard,
  SplatErrorBoundary,
  SPLAT_VIEWER_SURFACE,
} from "@/components/digital-twin/splat-viewer-error-boundary";
import {
  LOAD_DECODE_TIMEOUT_MS,
  LOAD_STALL_TIMEOUT_MS,
  useMobileSplatBudget,
  type CameraMode,
  type SplatViewerHandle,
  type TwinPickPoint,
} from "@/components/digital-twin/splat-viewer-constants";

export type { CameraMode, SplatViewerHandle, TwinPickPoint };
export { SPLAT_VIEWER_SURFACE };

type LoadState = "loading" | "ready" | "error";

export const SplatViewerCore = forwardRef<
  SplatViewerHandle,
  {
    src: string;
    className?: string;
    pickEnabled?: boolean;
    onPick?: (point: TwinPickPoint) => void;
    cameraMode?: CameraMode;
    modelVisible?: boolean;
    overlay?: ReactNode;
    onCameraModeChange?: (mode: CameraMode) => void;
    repositionMode?: boolean;
    /** V3: reports the resolved manifest (or null) once the fetch settles —
     * consumers use manifest?.up_axis to decide whether Walk mode has a
     * confident floor to work with. */
    onManifestChange?: (manifest: SplatManifest | null) => void;
  }
>(function SplatViewerCore(
  {
    src,
    className,
    pickEnabled = false,
    onPick,
    cameraMode = "orbit",
    modelVisible = true,
    overlay,
    onCameraModeChange,
    repositionMode = false,
    onManifestChange,
  },
  ref,
) {
  const maxSplats = useMobileSplatBudget();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [interiorEntryHit, setInteriorEntryHit] = useState<THREE.Vector3 | null>(null);
  const [bytesLoaded, setBytesLoaded] = useState(0);
  const [bytesTotal, setBytesTotal] = useState<number | null>(null);
  const [downsampleNotice, setDownsampleNotice] = useState<string | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);
  const [canvasKey, setCanvasKey] = useState(0);
  const [contextLost, setContextLost] = useState(false);
  const [canvasEl, setCanvasEl] = useState<HTMLCanvasElement | null>(null);
  const controlsApiRef = useRef<SplatViewerHandle | null>(null);
  const defaultFrameRef = useRef<InteriorCameraFrame | null>(null);
  const zoomRef = useRef(1);
  const lastProgressAtRef = useRef(Date.now());
  const fullyDownloadedAtRef = useRef<number | null>(null);

  // Cache-bust on manual retry so a fresh network request is issued even if the
  // browser/proxy cached a failed or partial response for the original URL.
  const effectiveSrc = useMemo(() => {
    if (retryNonce === 0) return src;
    const sep = src.includes("?") ? "&" : "?";
    return `${src}${sep}_retry=${retryNonce}`;
  }, [src, retryNonce]);

  const handleReady = useCallback(() => setLoadState("ready"), []);
  const handleRecenter = useCallback(() => {
    setInteriorEntryHit(null);
    onCameraModeChange?.("orbit");
    setResetToken((n) => n + 1);
  }, [onCameraModeChange]);

  const handleEnterInterior = useCallback(
    (point: THREE.Vector3) => {
      setInteriorEntryHit(point.clone());
      onCameraModeChange?.("interior");
    },
    [onCameraModeChange],
  );

  const handleProgress = useCallback((loaded: number, total: number | null) => {
    lastProgressAtRef.current = Date.now();
    setBytesLoaded(loaded);
    setBytesTotal(total);
    if (total != null && total > 0 && loaded >= total && fullyDownloadedAtRef.current === null) {
      fullyDownloadedAtRef.current = Date.now();
    }
  }, []);

  const handleDownsampled = useCallback((originalCount: number, cappedCount: number) => {
    setDownsampleNotice(
      `Showing ${cappedCount.toLocaleString()} of ${originalCount.toLocaleString()} points (capped for performance)`,
    );
  }, []);

  const handleRetry = useCallback(() => {
    setRetryNonce((n) => n + 1);
    setCanvasKey((k) => k + 1);
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => controlsApiRef.current?.zoomIn(),
      zoomOut: () => controlsApiRef.current?.zoomOut(),
      recenter: () => controlsApiRef.current?.recenter(),
    }),
    [],
  );

  // D1: progress-aware loading. Errors only on STALL (no bytes for
  // LOAD_STALL_TIMEOUT_MS) or a stuck on-device decode after all bytes are in
  // (LOAD_DECODE_TIMEOUT_MS) — never on total duration, so a large-but-healthy
  // transfer on a slow connection is allowed to keep going.
  useEffect(() => {
    setLoadState("loading");
    setErrorMessage(null);
    setResetToken(0);
    setInteriorEntryHit(null);
    setBytesLoaded(0);
    setBytesTotal(null);
    setDownsampleNotice(null);
    zoomRef.current = 1;
    lastProgressAtRef.current = Date.now();
    fullyDownloadedAtRef.current = null;

    const interval = window.setInterval(() => {
      setLoadState((current) => {
        if (current !== "loading") return current;
        const now = Date.now();
        if (fullyDownloadedAtRef.current !== null) {
          if (now - fullyDownloadedAtRef.current > LOAD_DECODE_TIMEOUT_MS) {
            setErrorMessage(
              "The model finished downloading but took too long to process. Check your connection and try again.",
            );
            return "error";
          }
          return current;
        }
        if (now - lastProgressAtRef.current > LOAD_STALL_TIMEOUT_MS) {
          setErrorMessage("Connection stalled — no data received recently. Check your connection and try again.");
          return "error";
        }
        return current;
      });
    }, 2000);

    return () => window.clearInterval(interval);
  }, [effectiveSrc, canvasKey]);

  // D3: WebGL context-loss recovery. On loss, preventDefault (required for the
  // browser to ever fire "restored") and show a designed non-blank recovery state;
  // on restore, fully remount the Canvas (fresh GL context + fresh splat load) rather
  // than attempting to hand-restore Spark's internal GPU resources.
  useEffect(() => {
    if (!canvasEl) return;
    const handleLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    const handleRestored = () => {
      setContextLost(false);
      setCanvasKey((k) => k + 1);
    };
    canvasEl.addEventListener("webglcontextlost", handleLost, false);
    canvasEl.addEventListener("webglcontextrestored", handleRestored, false);
    return () => {
      canvasEl.removeEventListener("webglcontextlost", handleLost, false);
      canvasEl.removeEventListener("webglcontextrestored", handleRestored, false);
    };
  }, [canvasEl]);

  if (loadState === "error") {
    return <ErrorCard message={errorMessage ?? "Unknown error."} onRetry={handleRetry} className={className} />;
  }

  if (contextLost) {
    return (
      <div
        className={cn(
          SPLAT_VIEWER_SURFACE,
          "flex min-h-[280px] flex-col items-center justify-center gap-2 rounded-xl",
          className,
        )}
      >
        <Loader2 className={cn("size-7 animate-spin", twinAccent.spinner)} aria-hidden />
        <p className="text-xs font-medium tracking-wide text-zinc-300">3D view interrupted — reconnecting…</p>
      </div>
    );
  }

  const progressPct =
    bytesTotal != null && bytesTotal > 0 ? Math.min(100, Math.round((bytesLoaded / bytesTotal) * 100)) : null;

  return (
    <div className={cn(SPLAT_VIEWER_SURFACE, "absolute inset-0", className)}>
      {loadState === "loading" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--graphite-canvas)]/80 backdrop-blur-sm px-6">
          <Loader2 className={cn("size-7 animate-spin", twinAccent.spinner)} aria-hidden />
          <p className="text-xs font-medium tracking-wide text-zinc-300">Loading 3D twin…</p>
          {progressPct != null ? (
            <div className="mt-1 w-full max-w-[220px]">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                <div
                  className="h-full rounded-full bg-[var(--twin360-blue)] transition-[width]"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
              <p className="mt-1.5 text-center font-mono text-[10px] tracking-wide text-zinc-500">
                {formatTwinBytes(bytesLoaded)} / {formatTwinBytes(bytesTotal ?? 0)}
              </p>
            </div>
          ) : bytesLoaded > 0 ? (
            <p className="mt-1 font-mono text-[10px] tracking-wide text-zinc-500">
              {formatTwinBytes(bytesLoaded)} loaded…
            </p>
          ) : null}
        </div>
      ) : null}

      {downsampleNotice ? (
        <p className="pointer-events-none absolute left-2 top-2 z-10 max-w-[80%] rounded-md border border-white/10 bg-[color-mix(in_srgb,var(--graphite-canvas)_80%,transparent)] px-2 py-1 font-mono text-[10px] tracking-wide text-zinc-400 backdrop-blur-sm">
          {downsampleNotice}
        </p>
      ) : null}

      <SplatErrorBoundary resetKey={canvasKey} onRetry={handleRetry}>
        <Canvas
          key={canvasKey}
          className="absolute inset-0 touch-none"
          style={{ width: "100%", height: "100%" }}
          resize={{ scroll: false, offsetSize: true }}
          camera={{ position: [4, 3, 4], fov: 55, near: 0.01, far: 2000 }}
          gl={{ antialias: false, alpha: true }}
          onCreated={(state) => setCanvasEl(state.gl.domElement)}
        >
          <color attach="background" args={["#0B0F15"]} />
          <SplatViewerScene
            url={effectiveSrc}
            maxSplats={maxSplats}
            onReady={handleReady}
            onProgress={handleProgress}
            onDownsampled={handleDownsampled}
            pickEnabled={pickEnabled}
            onPick={onPick}
            cameraMode={cameraMode}
            modelVisible={modelVisible}
            overlay={overlay}
            repositionMode={repositionMode}
            resetToken={resetToken}
            controlsApiRef={controlsApiRef}
            onRecenter={handleRecenter}
            defaultFrameRef={defaultFrameRef}
            zoomRef={zoomRef}
            interiorEntryHit={interiorEntryHit}
            onInteriorEntryConsumed={() => setInteriorEntryHit(null)}
            onEnterInterior={handleEnterInterior}
            onManifestChange={onManifestChange}
          />
        </Canvas>
      </SplatErrorBoundary>
    </div>
  );
});
