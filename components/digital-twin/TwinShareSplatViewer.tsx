"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Canvas, extend, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls, PointerLockControls } from "@react-three/drei";
import { AlertTriangle, Loader2 } from "lucide-react";
import * as THREE from "three";
import { SparkRenderer as SparkRendererImpl, SplatMesh as SplatMeshImpl } from "@sparkjsdev/spark";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

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
  const meshRef = useRef<THREE.Mesh>(null);

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
    <mesh ref={meshRef} visible={false} onClick={handleClick}>
      <sphereGeometry args={[4, 32, 32]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function SparkSplatScene({
  url,
  maxSplats,
  onReady,
  pickEnabled,
  onPick,
  cameraMode,
  modelVisible,
  overlay,
}: {
  url: string;
  maxSplats: number;
  onReady: () => void;
  pickEnabled: boolean;
  onPick?: (point: TwinPickPoint) => void;
  cameraMode: CameraMode;
  modelVisible: boolean;
  overlay?: ReactNode;
}) {
  const gl = useThree((state) => state.gl);
  const sparkArgs = useMemo(() => ({ renderer: gl, enableLod: true }), [gl]);
  const splatArgs = useMemo(
    () => ({ url, lod: true, maxSplats, onLoad: () => onReady() }),
    [url, maxSplats, onReady],
  );

  return (
    <>
      <group visible={modelVisible}>
        <sparkRenderer args={[sparkArgs]}>
          <splatMesh args={[splatArgs]} rotation={[Math.PI, 0, 0]} />
        </sparkRenderer>
      </group>
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

export function TwinShareSplatViewer({
  src,
  className,
  pickEnabled = false,
  onPick,
  cameraMode = "orbit",
  modelVisible = true,
  overlay,
}: {
  src: string;
  className?: string;
  pickEnabled?: boolean;
  onPick?: (point: TwinPickPoint) => void;
  cameraMode?: CameraMode;
  modelVisible?: boolean;
  overlay?: ReactNode;
}) {
  const maxSplats = useMobileSplatBudget();
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const handleReady = useCallback(() => setLoadState("ready"), []);

  useEffect(() => {
    setLoadState("loading");
    setErrorMessage(null);
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
          "flex h-full min-h-[280px] flex-col items-center justify-center gap-3 rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-center",
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
    <div className={cn("relative h-full min-h-[280px] w-full overflow-hidden rounded-xl", className)}>
      {loadState === "loading" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#0B0F15]/80 backdrop-blur-sm">
          <Loader2 className={cn("size-7 animate-spin", twinAccent.spinner)} aria-hidden />
          <p className="text-xs font-medium tracking-wide text-zinc-300">Loading 3D twin…</p>
        </div>
      ) : null}
      <Canvas
        className="h-full w-full"
        camera={{ position: [0, 0, 3], fov: 60, near: 0.01, far: 1000 }}
        gl={{ antialias: false, alpha: true }}
      >
        <color attach="background" args={["#0B0F15"]} />
        <SparkSplatScene
          url={src}
          maxSplats={maxSplats}
          onReady={handleReady}
          pickEnabled={pickEnabled}
          onPick={onPick}
          cameraMode={cameraMode}
          modelVisible={modelVisible}
          overlay={overlay}
        />
      </Canvas>
    </div>
  );
}
