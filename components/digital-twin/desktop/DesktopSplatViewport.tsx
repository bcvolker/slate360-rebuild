"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, extend, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
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
import { fetchSplatManifest, type SplatManifest } from "@/lib/digital-twin/twin-manifest";
import { estimateOrientationFromMesh } from "@/lib/digital-twin/splat-pca-orientation";
import { applyOverviewHomeFrame } from "@/lib/digital-twin/splat-overview-home";

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
  // Parent group carries the orientation correction (on top of the splat's
  // base [Math.PI,0,0] flip) — mirrors the shared viewer's structure.
  const groupRef = useRef<THREE.Group>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const editListRef = useRef(editList);
  editListRef.current = editList;
  const gl = useThree((state) => state.gl);
  const camera = useThree((state) => state.camera);
  const manifestRef = useRef<SplatManifest | null>(null);
  const manifestPromiseRef = useRef<Promise<SplatManifest | null> | null>(null);

  useEffect(() => {
    manifestRef.current = null;
    groupRef.current?.quaternion.identity();
    groupRef.current?.updateMatrixWorld(true);
    let cancelled = false;
    const promise = fetchSplatManifest(url);
    manifestPromiseRef.current = promise;
    void promise.then((m) => {
      if (!cancelled) manifestRef.current = m;
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  // Center + fit the model on open, then hand zoom freedom back to the editor.
  // R8.2: pass the manifest through so this gets the same initial_camera /
  // fallback_camera precedence as the shared viewer, instead of always
  // falling through to pure client-side bounds framing.
  const frameToModel = useCallback(
    (mesh: SplatMesh) => {
      if (!(camera instanceof THREE.PerspectiveCamera)) return;
      const controls = controlsRef.current;
      if (!controls) {
        window.requestAnimationFrame(() => frameToModel(mesh));
        return;
      }
      applyOverviewHomeFrame(mesh, camera, controls, { manifest: manifestRef.current });
      // Keep the good initial framing but don't constrain editing zoom.
      controls.minDistance = 0;
      controls.maxDistance = Infinity;
      controls.update();
    },
    [camera],
  );

  const splatArgs = useMemo(
    () => ({
      url,
      lod: true,
      maxSplats: DESKTOP_MAX_SPLATS,
      editable: true,
      onLoad: async (mesh: SplatMesh) => {
        applyEditListToMesh(mesh, editListRef.current);
        // Orient before framing (same precedence as the shared viewer): baked
        // manifest quaternion → PCA fallback → identity. Wait for the manifest
        // so a fast splat load can't skip the correction.
        let manifest = manifestRef.current;
        if (!manifest && manifestPromiseRef.current) {
          manifest = await manifestPromiseRef.current;
        }
        const group = groupRef.current;
        if (group) {
          const baked = manifest?.correction_quaternion;
          if (baked) {
            group.quaternion.set(baked[0], baked[1], baked[2], baked[3]);
            group.updateMatrixWorld(true);
          } else {
            const est = estimateOrientationFromMesh(mesh);
            if (est?.apply) {
              const [x, y, z, w] = est.quaternion;
              group.quaternion.set(x, y, z, w);
              group.updateMatrixWorld(true);
            }
          }
        }
        onMeshReady(mesh);
        frameToModel(mesh);
        onReady();
      },
    }),
    [url, onMeshReady, onReady, frameToModel],
  );

  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh?.isInitialized) return;
    applyEditListToMesh(mesh, editList);
  }, [editList]);

  return (
    <>
      <group ref={groupRef}>
        <sparkRenderer args={[{ renderer: gl, enableLod: true }]}>
          <splatMesh ref={meshRef} args={[splatArgs]} rotation={[Math.PI, 0, 0]} />
        </sparkRenderer>
      </group>
      <PickProxy enabled={pickEnabled} onPick={onPick} />
      <OrbitControls ref={controlsRef} makeDefault enablePan enableZoom enableRotate />
    </>
  );
}

export function DesktopSplatViewport({
  src,
  editList,
  pickEnabled,
  onPick,
  meshRef: externalMeshRef,
  className,
}: {
  src: string;
  editList: TwinEditList;
  pickEnabled: boolean;
  onPick?: (point: PickPoint) => void;
  meshRef?: React.RefObject<SplatMesh | null>;
  className?: string;
}) {
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const meshRef = useRef<SplatMesh | null>(null);
  const handleReady = useCallback(() => setLoadState("ready"), []);
  const handleMeshReady = useCallback((mesh: SplatMesh) => {
    meshRef.current = mesh;
    if (externalMeshRef) externalMeshRef.current = mesh;
  }, [externalMeshRef]);

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
