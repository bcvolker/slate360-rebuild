"use client";

import { useEffect, useMemo, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { SPIRULA_3DGUT_PROFILE, sparkRendererArgsFor } from "@/lib/digital-twin/spark-render-profile";
import { CORRECTION_QUATERNION } from "@/lib/room213/scene-config";

type Ctrl = Record<string, unknown>;

/** Minimal golden-PLY control scene (diagnostics only). Pose set via window.__ctrl.setPose. */
function ControlScene({ modelUrl }: { modelUrl: string }) {
  const gl = useThree((s) => s.gl);
  const camera = useThree((s) => s.camera) as THREE.PerspectiveCamera;
  const scene = useThree((s) => s.scene);
  const [spark] = useState(() => new SparkRenderer(sparkRendererArgsFor(gl, SPIRULA_3DGUT_PROFILE, { enableLod: false })));
  const group = useMemo(() => {
    const g = new THREE.Group();
    g.quaternion.copy(CORRECTION_QUATERNION);
    return g;
  }, []);
  useEffect(() => {
    scene.add(spark, group);
    const mesh = new SplatMesh({ url: modelUrl, extSplats: true, lod: false });
    mesh.rotation.set(Math.PI, 0, 0);
    group.add(mesh);
    const w = window as unknown as { __ctrl?: Ctrl };
    w.__ctrl = { ready: false, spark };
    void mesh.initialized.then(() => {
      w.__ctrl!.ready = true;
    });
    w.__ctrl.setPose = (x: number, y: number, z: number, yaw: number, pitch: number, fov = 62) => {
      camera.position.set(x, y, z);
      camera.rotation.set(pitch, yaw, 0, "YXZ");
      camera.fov = fov;
      camera.near = 0.05;
      camera.far = 500;
      camera.updateProjectionMatrix();
      return 1;
    };
    w.__ctrl.info = () => {
      const u = (spark as unknown as { material: { uniforms: Record<string, { value: unknown }> } }).material.uniforms;
      const k = spark as unknown as { accumExtSplats?: boolean; sorting?: boolean; sortDirty?: boolean; activeSplats?: number; sortedCenter?: THREE.Vector3; display?: unknown; current?: unknown };
      const size = gl.getDrawingBufferSize(new THREE.Vector2());
      const fy = (0.5 * size.y) / Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      return {
        css: [gl.domElement.clientWidth, gl.domElement.clientHeight], buffer: [size.x, size.y], dpr: gl.getPixelRatio(), fov: camera.fov,
        focalPx: +fy.toFixed(1), proj: camera.projectionMatrix.elements.map((v) => +v.toFixed(4)), cam: camera.matrixWorld.elements.map((v) => +v.toFixed(4)),
        accumExtSplats: k.accumExtSplats, blur: u.blurAmount?.value, preBlur: u.preBlurAmount?.value, sorting: k.sorting, sortDirty: k.sortDirty, activeSplats: k.activeSplats, sortedCenter: k.sortedCenter?.toArray().map((v) => +v.toFixed(2)), displayIsCurrent: k.display === k.current,
      };
    };
    return () => {
      group.remove(mesh);
      mesh.dispose();
      scene.remove(spark, group);
      spark.dispose();
    };
  }, [camera, gl, group, modelUrl, scene, spark]);
  useFrame(() => undefined);
  return null;
}

export function GoldenControl({ modelUrl, dpr }: { modelUrl: string; dpr?: number }) {
  const [px, setPx] = useState<number | null>(null);
  useEffect(() => setPx(dpr ?? Math.min(window.devicePixelRatio || 1, 2)), [dpr]);
  if (px === null) return null;
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--graphite-canvas)" }}>
      <Canvas dpr={px} gl={{ antialias: false, alpha: false }} camera={{ fov: 62, near: 0.05, far: 500 }}>
        <color attach="background" args={[new THREE.Color().setStyle(getComputedStyle(document.documentElement).getPropertyValue("--graphite-canvas").trim() || "black")]} />
        <ControlScene modelUrl={modelUrl} />
      </Canvas>
    </div>
  );
}
