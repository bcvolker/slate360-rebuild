"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, extend, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { IconLoader2 } from "@tabler/icons-react";
import {
  SparkRenderer as SparkRendererImpl,
  SplatMesh as SplatMeshImpl,
  type SplatMesh,
} from "@sparkjsdev/spark";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { applyEditListToMesh } from "@/lib/digital-twin/splat-edit-runtime";
import type { TwinEditList } from "@/lib/digital-twin/edit-list-types";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

const DESKTOP_MAX_SPLATS = 250_000;

type PickPoint = { x: number; y: number; z: number };

function PickProxy({
  enabled,
  onPick,
}: {
  enabled: boolean;
  onPick?: (point: PickPoint) => void;
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
      <sphereGeometry args={[6, 16, 16]} />
      <meshBasicMaterial transparent opacity={0} depthWrite={false} />
    </mesh>
  );
}

function EditableSparkScene({
  url,
  editList,
  pickEnabled,
  onPick,
  onReady,
  onMeshReady,
}: {
  url: string;
  editList: TwinEditList;
  pickEnabled: boolean;
  onPick?: (point: PickPoint) => void;
  onReady: () => void;
  onMeshReady: (mesh: SplatMesh) => void;
}) {
  const meshRef = useRef<SplatMesh>(null);
  const editListRef = useRef(editList);
  editListRef.current = editList;
  const gl = useThree((state) => state.gl);

  const splatArgs = useMemo(
    () => ({
      url,
      lod: true,
      maxSplats: DESKTOP_MAX_SPLATS,
      editable: true,
      onLoad: (mesh: SplatMesh) => {
        applyEditListToMesh(mesh, editListRef.current);
        onMeshReady(mesh);
        onReady();
      },
    }),
    [url, onMeshReady, onReady],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh?.isInitialized) return;
    applyEditListToMesh(mesh, editList);
  }, [editList]);

  return (
    <>
      <sparkRenderer args={[{ renderer: gl, enableLod: true }]}>
        <splatMesh ref={meshRef} args={[splatArgs]} rotation={[Math.PI, 0, 0]} />
      </sparkRenderer>
      <PickProxy enabled={pickEnabled} onPick={onPick} />
      <OrbitControls makeDefault enablePan enableZoom enableRotate />
    </>
  );
}

export function DesktopSplatViewport({
  src,
  editList,
  pickEnabled,
  onPick,
  className,
}: {
  src: string;
  editList: TwinEditList;
  pickEnabled: boolean;
  onPick?: (point: PickPoint) => void;
  className?: string;
}) {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const meshRef = useRef<SplatMesh | null>(null);
  const handleReady = useCallback(() => setLoadState("ready"), []);
  const handleMeshReady = useCallback((mesh: SplatMesh) => {
    meshRef.current = mesh;
  }, []);

  useEffect(() => {
    setLoadState("loading");
    meshRef.current = null;
    const timeout = window.setTimeout(() => {
      setLoadState((s) => (s === "loading" ? "error" : s));
    }, 45_000);
    return () => window.clearTimeout(timeout);
  }, [src]);

  if (loadState === "error") {
    return (
      <div className={cn("flex min-h-[400px] items-center justify-center rounded-xl border border-red-500/25 bg-red-500/10 px-4 text-sm text-red-200", className)}>
        Unable to load splat model.
      </div>
    );
  }

  return (
    <div className={cn("relative min-h-[400px] flex-1 overflow-hidden rounded-xl", className)}>
      {loadState === "loading" ? (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-[#0B0F15]/80 backdrop-blur-sm">
          <IconLoader2 className={cn("size-7 animate-spin", twinAccent.spinner)} aria-hidden />
          <p className="text-xs font-medium text-zinc-300">Loading splat…</p>
        </div>
      ) : null}
      <Canvas
        className="h-full w-full"
        camera={{ position: [0, 0, 3], fov: 60, near: 0.01, far: 1000 }}
        gl={{ antialias: false, alpha: true }}
      >
        <color attach="background" args={["#0B0F15"]} />
        <EditableSparkScene
          url={src}
          editList={editList}
          pickEnabled={pickEnabled}
          onPick={onPick}
          onReady={handleReady}
          onMeshReady={handleMeshReady}
        />
      </Canvas>
    </div>
  );
}
