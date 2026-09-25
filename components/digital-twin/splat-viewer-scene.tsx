"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { extend, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  SparkRenderer as SparkRendererImpl,
  SplatMesh as SplatMeshImpl,
  type SplatMesh,
} from "@sparkjsdev/spark";
import type { InteriorCameraFrame } from "@/lib/digital-twin/interior-camera-frame";
import { SplatInteriorNavigation } from "@/components/digital-twin/splat-interior-navigation";
import { SplatOverviewNavigation } from "@/components/digital-twin/splat-overview-navigation";
import type {
  CameraMode,
  SplatCameraPose,
  SplatViewerHandle,
  TwinPickPoint,
} from "@/components/digital-twin/splat-viewer-constants";
import { buildDownsampleIndices } from "@/components/digital-twin/splat-viewer-constants";
import { fetchSplatManifest, type SplatManifest } from "@/lib/digital-twin/twin-manifest";
import { applyAerialGravity, estimateOrientationFromMesh } from "@/lib/digital-twin/splat-pca-orientation";
import { applyEditListToMesh } from "@/lib/digital-twin/splat-edit-runtime";
import { ControlsBridge } from "@/components/digital-twin/splat-viewer-controls-bridge";
import { useSplatBytes } from "@/hooks/useSplatBytes";
import {
  resolveSparkRenderProfile,
  sparkRendererArgsFor,
  type SparkRenderProfile,
} from "@/lib/digital-twin/spark-render-profile";
import { useSparkProfileCheck, type SparkProfileCheck } from "@/components/digital-twin/use-spark-profile-check";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

export function SplatViewerScene({
  url,
  maxSplats,
  onReady,
  onProgress,
  onLoadError,
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
  onCameraChange,
  freeOrbit = false,
  invertOrbit = false,
  planView = false,
  onRenderProfileCheck,
}: {
  url: string;
  maxSplats: number;
  onReady: () => void;
  onProgress?: (loaded: number, total: number | null) => void;
  onLoadError?: (message: string) => void;
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
  /** D2: live orbit-camera pose changes, for cross-viewer sync (progression compare). */
  onCameraChange?: (pose: SplatCameraPose) => void;
  freeOrbit?: boolean;
  invertOrbit?: boolean;
  planView?: boolean;
  /** Reports the renderer settings Spark is ACTUALLY using vs the model's provenance profile. */
  onRenderProfileCheck?: (check: SparkProfileCheck) => void;
}) {
  const gl = useThree((state) => state.gl);
  const [loadedMesh, setLoadedMesh] = useState<SplatMesh | null>(null);
  const sparkRef = useRef<SparkRendererImpl | null>(null);
  // How Spark draws THIS model, from the model's own manifest provenance (spark-render-profile.ts).
  // accumExtSplats is fixed when the SparkRenderer is constructed, so the renderer mounts only once
  // the manifest fetch has settled (a failed fetch resolves to Spark's defaults).
  const [renderProfile, setRenderProfile] = useState<SparkRenderProfile | null>(null);
  // Worker-baked orientation correction (applied to the parent group, not the splat).
  const modelGroupRef = useRef<THREE.Group>(null);
  const manifestRef = useRef<SplatManifest | null>(null);
  // In-flight manifest fetch — onLoad awaits this so the baked orientation is
  // never skipped when the splat wins the race against the manifest request.
  const manifestPromiseRef = useRef<Promise<SplatManifest | null> | null>(null);

  useEffect(() => {
    setLoadedMesh(null);
    setRenderProfile(null);
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
        setRenderProfile(resolveSparkRenderProfile(m));
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
  // A verified Spirula 3dgut model is drawn as validated (spark-render-profile.ts): ext (fp16 colour) input,
  // unclamped ext accumulator, no screen blur, every splat (no source downsample). LoD stays OFF here as for
  // every model in this viewer: with Spark LoD the source ExtSplats are emptied into the LoD tree, which blinds
  // forEachSplat-based bounds, raycast (tap-to-walk) and orientation. LoD on/off measured identical on Room 213.
  const verified = renderProfile?.id === "spirula-3dgut";
  const sparkArgs = useMemo(
    () =>
      !renderProfile
        ? null
        : verified
          ? sparkRendererArgsFor(gl, renderProfile, { enableLod: false })
          : { renderer: gl, enableLod: false },
    [gl, renderProfile, verified],
  );
  useSparkProfileCheck(sparkRef, renderProfile, loadedMesh, onRenderProfileCheck);
  // Download the file here (real byte progress) and hand Spark the bytes. Spark's
  // own url loader never surfaced progress for this viewer, so the stall watchdog
  // failed healthy loads with "Connection stalled" over a model that was still coming in.
  const { bytes: splatBytes, error: splatFetchError } = useSplatBytes(url, onProgress);
  useEffect(() => {
    if (splatFetchError) onLoadError?.(`Could not download the model (${splatFetchError}).`);
  }, [splatFetchError, onLoadError]);

  const splatArgs = useMemo(
    () => ({
      fileBytes: splatBytes ?? new Uint8Array(0),
      // Spark sniffs the real format from the bytes; the name is only a fallback hint.
      fileName: verified ? "model.ply" : "model.spz",
      ...(verified ? { lod: false, extSplats: true } : { lod: false, maxSplats }),
      onLoad: async (mesh: SplatMesh) => {
        // Enforce the hard splat cap: downsample deterministically once `onLoad` proves
        // the real splat count is populated, and BEFORE the mesh's first GPU texture
        // upload (which happens lazily on the first render frame, after this returns).
        const packedSplats = mesh.packedSplats;
        if (!verified && packedSplats && packedSplats.numSplats > maxSplats) {
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
          } else if (/splat-lab|stadium-sep15/i.test(url) || freeOrbit) {
            mesh.rotation.set(Math.PI, 0, 0);
            mesh.updateMatrixWorld(true);
            applyAerialGravity(mesh, group);
          } else {
            const est = estimateOrientationFromMesh(mesh);
            if (est?.apply) {
              const [x, y, z, w] = est.quaternion;
              group.quaternion.set(x, y, z, w);
              group.updateMatrixWorld(true);
            }
          }
        }
        // A1: apply the desktop editor's non-destructive edit_list here too, so
        // shares/mobile/cinematic/compare all show what the operator cleaned up —
        // previously this only ran inside DesktopSplatViewport.
        if (manifest?.edit_list?.length || manifest?.dollhouse_edit_list?.length) {
          applyEditListToMesh(mesh, manifest.edit_list ?? []);
        }
        setLoadedMesh(mesh);
        onReady();
      },
    }),
    [splatBytes, maxSplats, onReady, onDownsampled, url, freeOrbit, verified],
  );

  useEffect(() => {
    if (!loadedMesh) return;
    loadedMesh.raycastable = true;
  }, [loadedMesh]);

  // Dollhouse-only edits (manifest.dollhouse_edit_list): on in the exterior orbit view, off in Walk.
  useEffect(() => {
    const m = manifestRef.current;
    if (!loadedMesh || !m?.dollhouse_edit_list?.length) return;
    applyEditListToMesh(loadedMesh, [...(m.edit_list ?? []), ...(cameraMode === "orbit" ? m.dollhouse_edit_list : [])]);
  }, [loadedMesh, cameraMode]);

  const handleOverviewEnter = useCallback(
    (point: THREE.Vector3) => onEnterInterior(point),
    [onEnterInterior],
  );

  return (
    <>
      <group ref={modelGroupRef} visible={modelVisible}>
        {sparkArgs && renderProfile ? (
          <sparkRenderer ref={sparkRef} key={`${url}#${renderProfile.id}`} args={[sparkArgs]}>
            {splatBytes ? <splatMesh args={[splatArgs]} rotation={[Math.PI, 0, 0]} /> : null}
          </sparkRenderer>
        ) : null}
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
              freeOrbit={freeOrbit}
              invertOrbit={invertOrbit}
              planView={planView}
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
        onCameraChange={onCameraChange}
      />
    </>
  );
}
