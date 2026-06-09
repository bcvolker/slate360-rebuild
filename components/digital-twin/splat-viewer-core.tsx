"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Canvas, extend, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PointerLockControls } from "@react-three/drei";
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import * as THREE from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import {
  SparkRenderer as SparkRendererImpl,
  SplatMesh as SplatMeshImpl,
  type SplatMesh,
} from "@sparkjsdev/spark";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { frameSplatMesh, type SplatCameraFrame } from "@/lib/digital-twin/splat-camera-frame";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

export const SPLAT_VIEWER_SURFACE =
  "relative min-h-0 w-full overflow-hidden bg-[var(--graphite-canvas)]";

const MOBILE_MAX_SPLATS = 80_000;
const DESKTOP_MAX_SPLATS = 250_000;

type LoadState = "loading" | "ready" | "error";
type CameraMode = "orbit" | "walk";

export type TwinPickPoint = { x: number; y: number; z: number };

function useMobileSplatBudget() {
  const [maxSplats, setMaxSplats] = useState(DESKTOP_MAX_SPLATS);

  useEffect(() => {
    const coarse = window.matchMedia("(max-width: 768px)").matches;
    const fine = window.matchMedia("(pointer: coarse)").matches;
    setMaxSplats(coarse || fine ? MOBILE_MAX_SPLATS : DESKTOP_MAX_SPLATS);
  }, []);

  return maxSplats;
}

function PickProxy({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick?: (point: TwinPickPoint) => void;
}) {
  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      if (!enabled || !onPick) return;
      event.stopPropagation();
      const p = event.point;
      onPick({ x: p.x, y: p.y, z: p.z });
    },
    [enabled, onPick],
  );

  return (
    <mesh visible={false} onClick={handleClick}>
      <sphereGeometry args={[4, 32, 32]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function SplatCameraController({
  mesh,
  resetToken,
  onDefaultFrame,
}: {
  mesh: SplatMesh | null;
  resetToken: number;
  onDefaultFrame: (frame: SplatCameraFrame) => void;
}) {
  const { camera, controls } = useThree();
  const framedRef = useRef(false);

  useEffect(() => {
    framedRef.current = false;
  }, [mesh]);

  const applyDefaultFrame = useCallback(() => {
    if (!mesh?.isInitialized || !(camera instanceof THREE.PerspectiveCamera)) return;
    const orbit = controls as OrbitControlsImpl | null;
    const frame = frameSplatMesh(mesh, camera, orbit);
    onDefaultFrame(frame);
  }, [mesh, camera, controls, onDefaultFrame]);

  useEffect(() => {
    if (!mesh?.isInitialized || framedRef.current) return;
    const id = window.requestAnimationFrame(() => {
      framedRef.current = true;
      applyDefaultFrame();
    });
    return () => window.cancelAnimationFrame(id);
  }, [mesh, applyDefaultFrame]);

  useEffect(() => {
    if (resetToken <= 0) return;
    applyDefaultFrame();
  }, [resetToken, applyDefaultFrame]);

  return null;
}

function SparkSplatScene({
  url,
  maxSplats,
  onReady,
  onMeshReady,
  pickEnabled,
  onPick,
  cameraMode,
  modelVisible,
  overlay,
  resetToken,
  onDefaultFrame,
}: {
  url: string;
  maxSplats: number;
  onReady: () => void;
  onMeshReady: (mesh: SplatMesh) => void;
  pickEnabled: boolean;
  onPick?: (point: TwinPickPoint) => void;
  cameraMode: CameraMode;
  modelVisible: boolean;
  overlay?: ReactNode;
  resetToken: number;
  onDefaultFrame: (frame: SplatCameraFrame) => void;
}) {
  const gl = useThree((state) => state.gl);
  const [loadedMesh, setLoadedMesh] = useState<SplatMesh | null>(null);

  useEffect(() => {
    setLoadedMesh(null);
  }, [url]);

  const sparkArgs = useMemo(() => ({ renderer: gl, enableLod: true }), [gl]);
  const splatArgs = useMemo(
    () => ({
      url,
      lod: true,
      maxSplats,
      onLoad: (mesh: SplatMesh) => {
        onMeshReady(mesh);
        setLoadedMesh(mesh);
        onReady();
      },
    }),
    [url, maxSplats, onMeshReady, onReady],
  );

  return (
    <>
      <group visible={modelVisible}>
        <sparkRenderer args={[sparkArgs]}>
          <splatMesh args={[splatArgs]} rotation={[Math.PI, 0, 0]} />
        </sparkRenderer>
      </group>
      {loadedMesh ? (
        <SplatCameraController
          mesh={loadedMesh}
          resetToken={resetToken}
          onDefaultFrame={onDefaultFrame}
        />
      ) : null}
      {overlay}
      <PickProxy enabled={pickEnabled} onPick={onPick} />
      {cameraMode === "orbit" ? (
        <OrbitControls makeDefault enablePan enableZoom enableRotate />
      ) : (
        <PointerLockControls makeDefault />
      )}
    </>
  );
}

export function SplatViewerCore({
  src,
  className,
  pickEnabled = false,
  onPick,
  cameraMode = "orbit",
  modelVisible = true,
  overlay,
  showResetView = true,
}: {
  src: string;
  className?: string;
  pickEnabled?: boolean;
  onPick?: (point: TwinPickPoint) => void;
  cameraMode?: CameraMode;
  modelVisible?: boolean;
  overlay?: ReactNode;
  showResetView?: boolean;
}) {
  const maxSplats = useMobileSplatBudget();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const handleReady = useCallback(() => setLoadState("ready"), []);
  const handleMeshReady = useCallback((_mesh: SplatMesh) => {}, []);
  const handleDefaultFrame = useCallback((_frame: SplatCameraFrame) => {}, []);

  useEffect(() => {
    setLoadState("loading");
    setErrorMessage(null);
    setResetToken(0);

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
    <div className={cn(SPLAT_VIEWER_SURFACE, "h-full min-h-[280px]", className)}>
      {loadState === "loading" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[var(--graphite-canvas)]/80 backdrop-blur-sm">
          <Loader2 className={cn("size-7 animate-spin", twinAccent.spinner)} aria-hidden />
          <p className="text-xs font-medium tracking-wide text-zinc-300">Loading 3D twin…</p>
        </div>
      ) : null}

      {showResetView && loadState === "ready" ? (
        <button
          type="button"
          onClick={() => setResetToken((n) => n + 1)}
          className={cn(
            twinAccent.button,
            "absolute right-3 top-3 z-20 inline-flex items-center gap-1.5 text-[11px] shadow-[0_4px_20px_rgba(0,0,0,0.35)]",
          )}
        >
          <RotateCcw className="size-3.5" aria-hidden />
          Reset view
        </button>
      ) : null}

      <Canvas
        className="absolute inset-0 touch-none"
        style={{ width: "100%", height: "100%" }}
        resize={{ scroll: false, offsetSize: true }}
        camera={{ position: [0, 0, 3], fov: 60, near: 0.01, far: 1000 }}
        gl={{ antialias: false, alpha: true }}
      >
        <color attach="background" args={["#0B0F15"]} />
        <SparkSplatScene
          url={src}
          maxSplats={maxSplats}
          onReady={handleReady}
          onMeshReady={handleMeshReady}
          pickEnabled={pickEnabled}
          onPick={onPick}
          cameraMode={cameraMode}
          modelVisible={modelVisible}
          overlay={overlay}
          resetToken={resetToken}
          onDefaultFrame={handleDefaultFrame}
        />
      </Canvas>
    </div>
  );
}
