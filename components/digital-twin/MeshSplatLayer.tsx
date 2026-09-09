"use client";

/// <reference path="../../types/spark-r3f.d.ts" />

/**
 * Spark splat as a LOOK layer inside the mesh walkthrough canvas.
 *
 * This does not own the camera. Walk, dollhouse, and floor plan stay on the
 * mesh (or, for splat-only twins, the invisible walk plane). The splat is never
 * raycastable — click-to-walk never lands on fuzz.
 *
 * Orientation matches the production splat viewer: Spark X-flip, then baked
 * manifest quaternion, then PCA only if no bake exists. `metric_scale` from a
 * walk_from_colmap manifest is applied to the same group so stations, eye
 * height and click distance are in metres. The bytes are downloaded here (real
 * progress, no silent stall) and handed to Spark as `fileBytes`.
 */

import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { extend, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  SparkRenderer as SparkRendererImpl,
  SplatEdit,
  SplatMesh as SplatMeshImpl,
  type SplatMesh,
} from "@sparkjsdev/spark";

import {
  DESKTOP_MAX_SPLATS,
  buildDownsampleIndices,
  useMobileSplatBudget,
} from "@/components/digital-twin/splat-viewer-constants";
import type { CeilingState } from "@/components/digital-twin/mesh-body";
import { useSplatBytes } from "@/hooks/useSplatBytes";
import { estimateOrientationFromMesh } from "@/lib/digital-twin/splat-pca-orientation";
import { createSweepEdit } from "@/lib/digital-twin/splat-edit-runtime";
import { fetchSplatManifest, type SplatManifest } from "@/lib/digital-twin/twin-manifest";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

function orientGroup(group: THREE.Group, mesh: SplatMesh, manifest: SplatManifest | null) {
  const baked = manifest?.correction_quaternion;
  if (baked) {
    group.quaternion.set(baked[0], baked[1], baked[2], baked[3]);
  } else {
    const est = estimateOrientationFromMesh(mesh);
    if (est?.apply) {
      const [x, y, z, w] = est.quaternion;
      group.quaternion.set(x, y, z, w);
    }
  }
  const s = manifest?.metric_scale;
  if (typeof s === "number" && Number.isFinite(s) && s > 0) group.scale.setScalar(s);
  group.updateMatrixWorld(true);
}

export function MeshSplatLayer({
  url,
  visible,
  ceilingCutY,
  ceilingState = "closed",
  onProgress,
  onLoaded,
  onManifest,
}: {
  url: string;
  visible: boolean;
  /** World Y of the lid; splats above it are hidden unless ceilingState is "closed". */
  ceilingCutY?: number | null;
  ceilingState?: CeilingState;
  onProgress?: (loaded: number, total: number | null) => void;
  onLoaded?: (mesh: SplatMesh) => void;
  onManifest?: (manifest: SplatManifest | null) => void;
}): ReactElement {
  const gl = useThree((state) => state.gl);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<SplatMesh | null>(null);
  const lidEditRef = useRef<SplatEdit | null>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const manifestRef = useRef<SplatManifest | null>(null);
  const manifestPromiseRef = useRef<Promise<SplatManifest | null> | null>(null);
  const maxSplats = useMobileSplatBudget();
  const sparkArgs = useMemo(() => ({ renderer: gl, enableLod: false }), [gl]);
  const { bytes } = useSplatBytes(url, onProgress);

  useEffect(() => {
    groupRef.current?.quaternion.identity();
    groupRef.current?.scale.setScalar(1);
    groupRef.current?.updateMatrixWorld(true);
    meshRef.current = null;
    manifestRef.current = null;
    let cancelled = false;
    const promise = fetchSplatManifest(url);
    manifestPromiseRef.current = promise;
    void promise.then((manifest) => {
      if (cancelled) return;
      manifestRef.current = manifest;
      onManifest?.(manifest);
    });
    return () => {
      cancelled = true;
    };
  }, [url, onManifest]);

  useEffect(() => {
    if (meshRef.current) meshRef.current.visible = visible;
  }, [visible]);

  // Dollhouse lid: a horizontal plane edit that zeroes opacity above the cut.
  // The plane is positioned in the MESH's local frame, so the group's rotation
  // and metric scale and the mesh's own X-flip are all undone first.
  useEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const wantLid = ceilingState !== "closed" && typeof ceilingCutY === "number";
    if (!wantLid) {
      if (lidEditRef.current) {
        mesh.remove(lidEditRef.current);
        lidEditRef.current = null;
      }
      return;
    }
    if (!lidEditRef.current) {
      lidEditRef.current = createSweepEdit();
      mesh.add(lidEditRef.current);
    }
    mesh.updateMatrixWorld(true);
    const local = mesh.worldToLocal(new THREE.Vector3(0, ceilingCutY, 0));
    const inv = new THREE.Matrix4().copy(mesh.matrixWorld).invert();
    const localUp = new THREE.Vector3(0, 1, 0).transformDirection(inv).normalize();
    const edit = lidEditRef.current;
    edit.position.copy(local);
    // Spark's PLANE SDF is `distance = sdfPos.z`: the plane's normal is the edit's local Z
    // and the "inside" (edited -> opacity 0) is the local -Z half-space. Point local +Z at
    // the FLOOR so everything above the cut is inside and hides.
    edit.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localUp.negate());
  }, [ceilingCutY, ceilingState, bytes]);

  const splatArgs = useMemo(
    () => ({
      fileBytes: bytes ?? new Uint8Array(0),
      fileName: "model.spz",
      lod: false,
      maxSplats: maxSplats || DESKTOP_MAX_SPLATS,
      onLoad: async (mesh: SplatMesh) => {
        mesh.raycastable = false;
        mesh.visible = visibleRef.current;
        const packed = mesh.packedSplats;
        const cap = maxSplats || DESKTOP_MAX_SPLATS;
        if (packed && packed.numSplats > cap) {
          const indices = buildDownsampleIndices(packed.numSplats, cap);
          const downsampled = packed.extractSplats(indices, false);
          packed.initialize({
            packedArray: downsampled.packedArray ?? undefined,
            numSplats: downsampled.numSplats,
          });
        }
        let manifest = manifestRef.current;
        if (!manifest && manifestPromiseRef.current) {
          manifest = await manifestPromiseRef.current;
        }
        const group = groupRef.current;
        if (group) orientGroup(group, mesh, manifest);
        meshRef.current = mesh;
        onLoaded?.(mesh);
      },
    }),
    [bytes, maxSplats, onLoaded],
  );

  return (
    <group ref={groupRef} visible={visible}>
      <sparkRenderer args={[sparkArgs]}>
        {bytes ? <splatMesh args={[splatArgs]} rotation={[Math.PI, 0, 0]} /> : null}
      </sparkRenderer>
    </group>
  );
}
