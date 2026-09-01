"use client";

/// <reference path="../../types/spark-r3f.d.ts" />

/**
 * Spark splat as a LOOK layer inside the mesh walkthrough canvas.
 *
 * This does not own the camera. Walk, dollhouse, and floor plan stay on the
 * mesh path. The splat is never raycastable — click-to-walk stays on LiDAR.
 *
 * When worldMatrix is set, it is the object transform (EXACT_FRAME_SIM3 for
 * native Brush). Spark Rx(π)/PCA are skipped. LOD is Spark-native; SH is kept.
 */

import { useEffect, useMemo, useRef, type ReactElement } from "react";
import { extend, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  SparkRenderer as SparkRendererImpl,
  SplatMesh as SplatMeshImpl,
  type SplatMesh,
} from "@sparkjsdev/spark";

import { useSparkLodSplatCount } from "@/components/digital-twin/splat-viewer-constants";
import { estimateOrientationFromMesh } from "@/lib/digital-twin/splat-pca-orientation";
import {
  readSplatLoadStats,
  sparkRendererAppearanceArgs,
  sparkSplatAppearanceArgs,
  type SplatLoadStats,
} from "@/lib/digital-twin/spark-appearance-load";
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
  group.updateMatrixWorld(true);
}

export function MeshSplatLayer({
  url,
  visible,
  worldMatrix = null,
  sparkPiFlip = true,
  lodSplatCount: lodSplatCountProp,
  onReady,
}: {
  url: string;
  visible: boolean;
  /** Column-major 4×4 into S360_WORLD. Skips Spark Rx(π)/PCA when set. */
  worldMatrix?: readonly number[] | null;
  sparkPiFlip?: boolean;
  lodSplatCount?: number;
  onReady?: (stats?: SplatLoadStats) => void;
}): ReactElement {
  const gl = useThree((state) => state.gl);
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<SplatMesh | null>(null);
  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const manifestRef = useRef<SplatManifest | null>(null);
  const manifestPromiseRef = useRef<Promise<SplatManifest | null> | null>(null);
  const budget = useSparkLodSplatCount();
  const lodSplatCount = lodSplatCountProp ?? budget;
  const sparkArgs = useMemo(
    () => sparkRendererAppearanceArgs(gl, lodSplatCount),
    [gl, lodSplatCount],
  );
  const pose = useMemo(() => {
    if (!worldMatrix) return null;
    const m = new THREE.Matrix4().fromArray(worldMatrix as number[]);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    m.decompose(position, quaternion, scale);
    return { position, quaternion, scale };
  }, [worldMatrix]);

  useEffect(() => {
    meshRef.current = null;
    manifestRef.current = null;
    let cancelled = false;
    const promise = fetchSplatManifest(url);
    manifestPromiseRef.current = promise;
    void promise.then((manifest) => {
      if (!cancelled) manifestRef.current = manifest;
    });
    return () => {
      cancelled = true;
    };
  }, [url]);

  useEffect(() => {
    if (meshRef.current) meshRef.current.visible = visible;
  }, [visible]);

  const splatArgs = useMemo(
    () =>
      sparkSplatAppearanceArgs(url, async (mesh: SplatMesh) => {
        mesh.raycastable = false;
        mesh.visible = visibleRef.current;
        let manifest = manifestRef.current;
        if (!manifest && manifestPromiseRef.current) {
          manifest = await manifestPromiseRef.current;
        }
        const group = groupRef.current;
        if (group && !worldMatrix) orientGroup(group, mesh, manifest);
        meshRef.current = mesh;
        readyRef.current?.(await readSplatLoadStats(mesh));
      }),
    [url, worldMatrix],
  );

  return (
    <group
      ref={groupRef}
      visible={visible}
      position={pose ? [pose.position.x, pose.position.y, pose.position.z] : undefined}
      quaternion={pose ? pose.quaternion : undefined}
      scale={pose ? [pose.scale.x, pose.scale.y, pose.scale.z] : undefined}
    >
      <sparkRenderer args={[sparkArgs]}>
        <splatMesh args={[splatArgs]} rotation={sparkPiFlip ? [Math.PI, 0, 0] : [0, 0, 0]} />
      </sparkRenderer>
    </group>
  );
}
