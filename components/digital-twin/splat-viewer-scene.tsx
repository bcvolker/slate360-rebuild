"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { extend, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  SparkRenderer as SparkRendererImpl,
  SplatMesh as SplatMeshImpl,
  type SplatMesh,
} from "@sparkjsdev/spark";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { InteriorCameraFrame } from "@/lib/digital-twin/interior-camera-frame";
import { SplatInteriorNavigation } from "@/components/digital-twin/splat-interior-navigation";
import { SplatOverviewNavigation } from "@/components/digital-twin/splat-overview-navigation";
import type { CameraMode, SplatViewerHandle, TwinPickPoint } from "@/components/digital-twin/splat-viewer-constants";
import {
  INTERIOR_MAX_ZOOM,
  INTERIOR_MIN_ZOOM,
  ZOOM_WHEEL_FACTOR,
  buildDownsampleIndices,
} from "@/components/digital-twin/splat-viewer-constants";
import { fetchSplatManifest, type SplatManifest } from "@/lib/digital-twin/twin-manifest";
import { estimateOrientationFromMesh } from "@/lib/digital-twin/splat-pca-orientation";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

function ControlsBridge({
  apiRef,
  cameraMode,
  onRecenter,
  zoomRef,
}: {
  apiRef: React.MutableRefObject<SplatViewerHandle | null>;
  cameraMode: CameraMode;
  onRecenter: () => void;
  zoomRef: React.MutableRefObject<number>;
}) {
  const { controls } = useThree();
  const orbit = controls as OrbitControlsImpl | null;

  useEffect(() => {
    apiRef.current = {
      zoomIn: () => {
        if (cameraMode === "orbit") {
          orbit?.dollyIn(1.12);
          orbit?.update();
          return;
        }
        zoomRef.current = THREE.MathUtils.clamp(
          zoomRef.current / ZOOM_WHEEL_FACTOR,
          INTERIOR_MIN_ZOOM,
          INTERIOR_MAX_ZOOM,
        );
      },
      zoomOut: () => {
        if (cameraMode === "orbit") {
          orbit?.dollyOut(1.12);
          orbit?.update();
          return;
        }
        zoomRef.current = THREE.MathUtils.clamp(
          zoomRef.current * ZOOM_WHEEL_FACTOR,
          INTERIOR_MIN_ZOOM,
          INTERIOR_MAX_ZOOM,
        );
      },
      recenter: onRecenter,
    };
    return () => {
      apiRef.current = null;
    };
  }, [apiRef, cameraMode, orbit, onRecenter, zoomRef]);

  return null;
}

export function SplatViewerScene({
  url,
  maxSplats,
  onReady,
  onProgress,
  onDownsampled,
  pickEnabled,
  onPick,
  cameraMode,
  modelVisible,
  overlay,
  resetToken,
  controlsApiRef,
  onRecenter,
  defaultFrameRef,
  zoomRef,
  interiorEntryHit,
  onInteriorEntryConsumed,
  onEnterInterior,
  repositionMode = false,
  onManifestChange,
}: {
  url: string;
  maxSplats: number;
  onReady: () => void;
  onProgress?: (loaded: number, total: number | null) => void;
  onDownsampled?: (originalCount: number, cappedCount: number) => void;
  pickEnabled: boolean;
  onPick?: (point: TwinPickPoint) => void;
  cameraMode: CameraMode;
  modelVisible: boolean;
  overlay?: ReactNode;
  resetToken: number;
  controlsApiRef: React.MutableRefObject<SplatViewerHandle | null>;
  onRecenter: () => void;
  defaultFrameRef: React.MutableRefObject<InteriorCameraFrame | null>;
  zoomRef: React.MutableRefObject<number>;
  interiorEntryHit: THREE.Vector3 | null;
  onInteriorEntryConsumed: () => void;
  /** V3: reports the resolved manifest (or null) once the fetch settles, so
   * callers can decide whether Walk mode has a confident floor to work with. */
  onManifestChange?: (manifest: SplatManifest | null) => void;
  onEnterInterior: (point: THREE.Vector3) => void;
  repositionMode?: boolean;
}) {
  const gl = useThree((state) => state.gl);
  const [loadedMesh, setLoadedMesh] = useState<SplatMesh | null>(null);
  // Worker-baked orientation correction (applied to the parent group, not the splat).
  const modelGroupRef = useRef<THREE.Group>(null);
  const manifestRef = useRef<SplatManifest | null>(null);
  // In-flight manifest fetch — onLoad awaits this so the baked orientation is
  // never skipped when the splat wins the race against the manifest request.
  const manifestPromiseRef = useRef<Promise<SplatManifest | null> | null>(null);

  useEffect(() => {
    setLoadedMesh(null);
    manifestRef.current = null;
    // Reset any previous model's correction before the new one loads.
    modelGroupRef.current?.quaternion.identity();
    modelGroupRef.current?.updateMatrixWorld(true);
    let cancelled = false;
    const promise = fetchSplatManifest(url);
    manifestPromiseRef.current = promise;
    void promise.then((m) => {
      if (!cancelled) {
        manifestRef.current = m;
        onManifestChange?.(m);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [url, onManifestChange]);

  // LOD is disabled deliberately: Spark's paged/LOD mode keeps the real splat count out
  // of `packedSplats.numSplats` (verified empirically — it reads 0 even after a full,
  // successful decode), so a hard, deterministic cap is unreachable through the public
  // API while LOD is active. Trading Spark's adaptive LOD for our own fixed downsample
  // is exactly the point of a HARD cap — the alternative (`maxSplats` alone) is only an
  // allocation hint that grows to fit the file, which is the bug this fixes.
  const sparkArgs = useMemo(() => ({ renderer: gl, enableLod: false }), [gl]);
  const splatArgs = useMemo(
    () => ({
      url,
      lod: false,
      maxSplats,
      onProgress: (event: ProgressEvent) => {
        onProgress?.(event.loaded, event.lengthComputable ? event.total : null);
      },
      onLoad: async (mesh: SplatMesh) => {
        // Enforce the hard splat cap: downsample deterministically once `onLoad` proves
        // the real splat count is populated, and BEFORE the mesh's first GPU texture
        // upload (which happens lazily on the first render frame, after this returns).
        const packedSplats = mesh.packedSplats;
        if (packedSplats && packedSplats.numSplats > maxSplats) {
          const originalCount = packedSplats.numSplats;
          const indices = buildDownsampleIndices(originalCount, maxSplats);
          const downsampled = packedSplats.extractSplats(indices, false);
          packedSplats.initialize({
            packedArray: downsampled.packedArray ?? undefined,
            numSplats: downsampled.numSplats,
          });
          onDownsampled?.(originalCount, maxSplats);
        }

        // Orient the model BEFORE framing runs. Precedence:
        //   1. worker-baked manifest quaternion (authoritative)
        //   2. client PCA fallback — only on clearly-misoriented, confidently-planar models
        //   3. nothing → identity → identical to prior behavior (zero regression)
        // The manifest may still be in-flight (small/cached models load fast), so
        // wait for it here — otherwise the baked orientation is silently skipped.
        let manifest = manifestRef.current;
        if (!manifest && manifestPromiseRef.current) {
          manifest = await manifestPromiseRef.current;
        }
        const group = modelGroupRef.current;
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
        setLoadedMesh(mesh);
        onReady();
      },
    }),
    [url, maxSplats, onReady, onProgress, onDownsampled],
  );

  useEffect(() => {
    if (!loadedMesh) return;
    loadedMesh.raycastable = true;
  }, [loadedMesh]);

  const handleOverviewEnter = useCallback(
    (point: THREE.Vector3) => onEnterInterior(point),
    [onEnterInterior],
  );

  return (
    <>
      <group ref={modelGroupRef} visible={modelVisible}>
        <sparkRenderer args={[sparkArgs]}>
          <splatMesh args={[splatArgs]} rotation={[Math.PI, 0, 0]} />
        </sparkRenderer>
      </group>
      {loadedMesh ? (
        <>
          {cameraMode === "orbit" ? (
            <SplatOverviewNavigation
              mesh={loadedMesh}
              active
              resetToken={resetToken}
              pickEnabled={pickEnabled}
              onPick={onPick}
              onEnterInterior={handleOverviewEnter}
              repositionMode={repositionMode}
              manifest={manifestRef.current}
            />
          ) : (
            <SplatInteriorNavigation
              mesh={loadedMesh}
              active
              pickEnabled={pickEnabled}
              onPick={onPick}
              defaultFrameRef={defaultFrameRef}
              resetToken={resetToken}
              zoomRef={zoomRef}
              entryHit={interiorEntryHit}
              onEntryHitConsumed={onInteriorEntryConsumed}
              manifest={manifestRef.current}
            />
          )}
        </>
      ) : null}
      {overlay}
      <ControlsBridge
        apiRef={controlsApiRef}
        cameraMode={cameraMode}
        onRecenter={onRecenter}
        zoomRef={zoomRef}
      />
    </>
  );
}
