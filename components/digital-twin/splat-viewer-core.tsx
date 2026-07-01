"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas } from "@react-three/fiber";
import { AlertTriangle, Loader2 } from "lucide-react";
import * as THREE from "three";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import type { InteriorCameraFrame } from "@/lib/digital-twin/interior-camera-frame";
import { SplatViewerScene } from "@/components/digital-twin/splat-viewer-scene";
import {
  DESKTOP_MAX_SPLATS,
  MOBILE_MAX_SPLATS,
  type CameraMode,
  type SplatViewerHandle,
  type TwinPickPoint,
} from "@/components/digital-twin/splat-viewer-constants";

export type { CameraMode, SplatViewerHandle, TwinPickPoint };

export const SPLAT_VIEWER_SURFACE =
  "relative min-h-0 w-full overflow-hidden bg-[var(--graphite-canvas)]";

type LoadState = "loading" | "ready" | "error";

function useMobileSplatBudget() {
  const [maxSplats, setMaxSplats] = useState(DESKTOP_MAX_SPLATS);

  useEffect(() => {
    const coarse = window.matchMedia("(max-width: 768px)").matches;
    const fine = window.matchMedia("(pointer: coarse)").matches;
    setMaxSplats(coarse || fine ? MOBILE_MAX_SPLATS : DESKTOP_MAX_SPLATS);
  }, []);

  return maxSplats;
}

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
  },
  ref,
) {
  const maxSplats = useMobileSplatBudget();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const [interiorEntryHit, setInteriorEntryHit] = useState<THREE.Vector3 | null>(null);
  const controlsApiRef = useRef<SplatViewerHandle | null>(null);
  const defaultFrameRef = useRef<InteriorCameraFrame | null>(null);
  const zoomRef = useRef(1);

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

  useImperativeHandle(
    ref,
    () => ({
      zoomIn: () => controlsApiRef.current?.zoomIn(),
      zoomOut: () => controlsApiRef.current?.zoomOut(),
      recenter: () => controlsApiRef.current?.recenter(),
    }),
    [],
  );

  useEffect(() => {
    setLoadState("loading");
    setErrorMessage(null);
    setResetToken(0);
    setInteriorEntryHit(null);
    zoomRef.current = 1;

    const timeout = window.setTimeout(() => {
      setLoadState((current) => {
        if (current === "loading") {
          setErrorMessage("The model took too long to load. Check your connection and try again.");
          return "error";
        }
        return current;
      });
    }, 45_000);

    return () => window.clearTimeout(timeout);
  }, [src]);

  if (loadState === "error") {
    return (
      <div
        className={cn(
          SPLAT_VIEWER_SURFACE,
          "flex min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-center",
          className,
        )}
      >
        <AlertTriangle className="size-8 text-red-300" aria-hidden />
        <p className="text-sm font-medium text-red-100">Unable to load 3D model</p>
        <p className="max-w-sm text-xs text-red-200/80">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className={cn(SPLAT_VIEWER_SURFACE, "absolute inset-0", className)}>
      {loadState === "loading" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--graphite-canvas)]/80 backdrop-blur-sm">
          <Loader2 className={cn("size-7 animate-spin", twinAccent.spinner)} aria-hidden />
          <p className="text-xs font-medium tracking-wide text-zinc-300">Loading 3D twin…</p>
        </div>
      ) : null}

      <Canvas
        className="absolute inset-0 touch-none"
        style={{ width: "100%", height: "100%" }}
        resize={{ scroll: false, offsetSize: true }}
        camera={{ position: [4, 3, 4], fov: 55, near: 0.01, far: 2000 }}
        gl={{ antialias: false, alpha: true }}
      >
        <color attach="background" args={["#0B0F15"]} />
        <SplatViewerScene
          url={src}
          maxSplats={maxSplats}
          onReady={handleReady}
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
        />
      </Canvas>
    </div>
  );
});
