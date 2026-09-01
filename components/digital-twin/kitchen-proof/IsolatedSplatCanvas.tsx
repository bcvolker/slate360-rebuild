"use client";

import { Canvas, extend, useFrame, useThree } from "@react-three/fiber";
import { useMemo, useRef, type ReactElement } from "react";
import * as THREE from "three";
import { SparkRenderer as SparkRendererImpl, SplatMesh as SplatMeshImpl, type SplatMesh } from "@sparkjsdev/spark";

import { ForensicsProbe } from "@/components/digital-twin/kitchen-proof/ForensicsProbe";
import { cssColor, MESH_GROUND_FALLBACK } from "@/lib/digital-twin/css-color";
import {
  FORENSICS_ARKIT_POSITION,
  FORENSICS_ARKIT_QUAT_XYZW,
  FORENSICS_FAR,
  FORENSICS_NEAR,
  FORENSICS_SIM3_MATRIX,
  FORENSICS_VFOV_DEG,
} from "@/lib/digital-twin/appearance-forensics-camera";

extend({ SparkRenderer: SparkRendererImpl, SplatMesh: SplatMeshImpl });

export type IsolatedSplatOpts = {
  url: string;
  dpr: number;
  maxSh: number;
  blurAmount: number;
  splatScale: number;
  toneMapping: "none" | "aces";
  applySim3: boolean;
  maxSplats: number;
  onReady?: () => void;
};

function CameraLock(): null {
  const { camera, size } = useThree();
  const apply = () => {
    camera.position.set(FORENSICS_ARKIT_POSITION[0], FORENSICS_ARKIT_POSITION[1], FORENSICS_ARKIT_POSITION[2]);
    camera.quaternion.set(
      FORENSICS_ARKIT_QUAT_XYZW[0],
      FORENSICS_ARKIT_QUAT_XYZW[1],
      FORENSICS_ARKIT_QUAT_XYZW[2],
      FORENSICS_ARKIT_QUAT_XYZW[3],
    );
    const persp = camera as THREE.PerspectiveCamera;
    if (persp.isPerspectiveCamera) {
      persp.fov = FORENSICS_VFOV_DEG;
      persp.near = FORENSICS_NEAR;
      persp.far = FORENSICS_FAR;
      persp.aspect = size.width / Math.max(1, size.height);
      persp.updateProjectionMatrix();
    }
  };
  useFrame(apply);
  return null;
}

function SplatBody({
  url,
  maxSh,
  blurAmount,
  splatScale,
  applySim3,
  maxSplats,
  onReady,
}: Omit<IsolatedSplatOpts, "dpr" | "toneMapping">): ReactElement {
  const gl = useThree((s) => s.gl);
  const readyRef = useRef(onReady);
  readyRef.current = onReady;
  const sparkArgs = useMemo(
    () => ({ renderer: gl, enableLod: false, blurAmount, preBlurAmount: 0, encodeLinear: false }),
    [gl, blurAmount],
  );
  const pose = useMemo(() => {
    if (!applySim3) return null;
    const m = new THREE.Matrix4().fromArray(FORENSICS_SIM3_MATRIX as unknown as number[]);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    const scale = new THREE.Vector3();
    m.decompose(position, quaternion, scale);
    return { position, quaternion, scale };
  }, [applySim3]);
  const splatArgs = useMemo(
    () => ({
      url,
      lod: false,
      maxSplats,
      onLoad: (mesh: SplatMesh) => {
        mesh.raycastable = false;
        mesh.maxSh = maxSh;
        mesh.packedSplats?.setMaxSh(maxSh);
        readyRef.current?.();
      },
    }),
    [url, maxSh, maxSplats],
  );
  const sx = (pose?.scale.x ?? 1) * splatScale;
  const sy = (pose?.scale.y ?? 1) * splatScale;
  const sz = (pose?.scale.z ?? 1) * splatScale;
  return (
    <group
      position={pose ? [pose.position.x, pose.position.y, pose.position.z] : [0, 0, 0]}
      quaternion={pose ? pose.quaternion : undefined}
      scale={[sx, sy, sz]}
    >
      <sparkRenderer args={[sparkArgs]}>
        <splatMesh args={[splatArgs]} rotation={[0, 0, 0]} />
      </sparkRenderer>
    </group>
  );
}

export function IsolatedSplatCanvas(opts: IsolatedSplatOpts): ReactElement {
  const tone = opts.toneMapping === "aces" ? THREE.ACESFilmicToneMapping : THREE.NoToneMapping;
  return (
    <Canvas
      camera={{ fov: FORENSICS_VFOV_DEG, near: FORENSICS_NEAR, far: FORENSICS_FAR, position: [...FORENSICS_ARKIT_POSITION] }}
      dpr={[opts.dpr, opts.dpr]}
      gl={{ antialias: false, powerPreference: "high-performance", alpha: false }}
      onCreated={({ gl, camera }) => {
        gl.setClearColor(cssColor("--graphite-canvas", MESH_GROUND_FALLBACK), 1);
        gl.toneMapping = tone;
        gl.outputColorSpace = THREE.SRGBColorSpace;
        camera.quaternion.set(
          FORENSICS_ARKIT_QUAT_XYZW[0],
          FORENSICS_ARKIT_QUAT_XYZW[1],
          FORENSICS_ARKIT_QUAT_XYZW[2],
          FORENSICS_ARKIT_QUAT_XYZW[3],
        );
      }}
    >
      <CameraLock />
      <SplatBody {...opts} />
      <ForensicsProbe label="isolated" />
    </Canvas>
  );
}
