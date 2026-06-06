"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { IconLoader2 } from "@tabler/icons-react";
import {
  SparkRenderer as SparkRendererImpl,
  SplatMesh as SplatMeshImpl,
} from "@sparkjsdev/spark";
import { cn } from "@/lib/utils";
import { twinAccent } from "@/lib/digital-twin/twin-accent";
import { samplePath, segmentDurations } from "@/lib/digital-twin/camera-path-math";
import type { TwinCameraPath } from "@/lib/digital-twin/camera-path-types";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

const DESKTOP_MAX_SPLATS = 250_000;

function CameraDriver({
  path,
  playing,
  scrubMs,
  userGrabbed,
  onScrub,
}: {
  path: TwinCameraPath;
  playing: boolean;
  scrubMs: number;
  userGrabbed: boolean;
  onScrub: (ms: number) => void;
}) {
  const { camera } = useThree();
  const startRef = useRef<number | null>(null);
  const baseScrubRef = useRef(scrubMs);

  useEffect(() => {
    baseScrubRef.current = scrubMs;
    startRef.current = performance.now();
  }, [scrubMs, playing]);

  useFrame(() => {
    if (userGrabbed || path.keyframes.length === 0) return;
    let elapsed = scrubMs;
    if (playing && startRef.current !== null) {
      elapsed = baseScrubRef.current + (performance.now() - startRef.current);
      onScrub(elapsed);
    }
    const sample = samplePath(path, elapsed);
    if (!sample) return;
    camera.position.copy(sample.position);
    camera.lookAt(sample.lookAt);
    camera.updateProjectionMatrix();
  });

  return null;
}

function SparkScene({ url, onReady }: { url: string; onReady: () => void }) {
  const gl = useThree((s) => s.gl);
  const splatArgs = useMemo(
    () => ({ url, lod: true, maxSplats: DESKTOP_MAX_SPLATS, onLoad: () => onReady() }),
    [url, onReady],
  );
  return (
    <sparkRenderer args={[{ renderer: gl, enableLod: true }]}>
      <splatMesh args={[splatArgs]} rotation={[Math.PI, 0, 0]} />
    </sparkRenderer>
  );
}

export function CinematicSplatViewport({
  src,
  path,
  playing,
  scrubMs,
  userGrabbed,
  onScrub,
  onUserGrab,
  className,
}: {
  src: string;
  path: TwinCameraPath;
  playing: boolean;
  scrubMs: number;
  userGrabbed: boolean;
  onScrub: (ms: number) => void;
  onUserGrab: () => void;
  className?: string;
}) {
  const [ready, setReady] = useState(false);
  const handleReady = useCallback(() => setReady(true), []);
  const handleGrab = useCallback(() => onUserGrab(), [onUserGrab]);
  const totalMs = segmentDurations(path).reduce((a, b) => a + b, 0);

  useEffect(() => {
    setReady(false);
  }, [src]);

  return (
    <div className={cn("relative min-h-[400px] flex-1 overflow-hidden rounded-xl", className)}>
      {!ready ? (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0B0F15]/80">
          <IconLoader2 className={cn("size-7 animate-spin", twinAccent.spinner)} aria-hidden />
        </div>
      ) : null}
      <Canvas
        className="h-full w-full"
        camera={{ position: [0, 2, 4], fov: 60, near: 0.01, far: 1000 }}
        gl={{ antialias: false, alpha: true }}
      >
        <color attach="background" args={["#0B0F15"]} />
        <SparkScene url={src} onReady={handleReady} />
        <CameraDriver
          path={path}
          playing={playing}
          scrubMs={scrubMs}
          userGrabbed={userGrabbed}
          onScrub={onScrub}
        />
        <OrbitControls makeDefault enablePan enableZoom enableRotate onStart={handleGrab} />
      </Canvas>
      {userGrabbed ? (
        <p className="absolute left-3 top-3 rounded-lg border border-white/10 bg-[#0B0F15]/90 px-2 py-1 text-[10px] text-zinc-300">
          Manual control — press Resume to continue path
        </p>
      ) : null}
      {totalMs > 0 ? (
        <p className="absolute bottom-3 right-3 text-[10px] text-zinc-500">
          {Math.round(scrubMs / 1000)}s / {Math.round(totalMs / 1000)}s
        </p>
      ) : null}
    </div>
  );
}
