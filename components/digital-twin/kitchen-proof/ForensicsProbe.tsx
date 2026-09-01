"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useRef, type ReactElement } from "react";

type Dump = {
  css: [number, number];
  drawingBuffer: [number, number];
  dpr: number;
  visualScale: number;
  zoomApprox: number;
  fov: number;
  aspect: number;
  cameraPosition: [number, number, number];
  cameraQuat: [number, number, number, number];
  toneMapping: number;
  outputColorSpace: string;
  antialias: boolean;
  numSplats: number | null;
  packedShDegree: number | null;
  meshMaxSh: number | null;
  blurAmount: number | null;
  preBlurAmount: number | null;
  minPixelRadius: number | null;
  maxPixelRadius: number | null;
  encodeLinear: boolean | null;
  enableLod: boolean | null;
  minAlpha: number | null;
  maxStdDev: number | null;
};

function findSpark(scene: { traverse: (fn: (o: Record<string, unknown>) => void) => void }) {
  let mesh: Record<string, unknown> | null = null;
  let spark: Record<string, unknown> | null = null;
  scene.traverse((obj) => {
    if (obj.packedSplats) mesh = obj;
    if (typeof obj.blurAmount === "number" && typeof obj.minPixelRadius === "number") spark = obj;
  });
  return { mesh, spark };
}

export function ForensicsProbe({ label = "forensics" }: { label?: string }): ReactElement | null {
  const { gl, camera, scene, size } = useThree();
  const last = useRef(0);
  useFrame(() => {
    const now = performance.now();
    if (now - last.current < 250) return;
    last.current = now;
    const canvas = gl.domElement;
    const ctx = gl.getContext() as WebGLRenderingContext;
    const { mesh, spark } = findSpark(scene);
    const packed = mesh?.packedSplats as
      | { numSplats?: number; getNumSh?: () => number; maxSh?: number }
      | undefined;
    const persp = camera as typeof camera & { fov?: number; aspect?: number };
    const dump: Dump = {
      css: [canvas.clientWidth, canvas.clientHeight],
      drawingBuffer: [ctx.drawingBufferWidth, ctx.drawingBufferHeight],
      dpr: window.devicePixelRatio,
      visualScale: window.visualViewport?.scale ?? 1,
      zoomApprox: window.outerWidth && window.innerWidth ? window.outerWidth / window.innerWidth : 1,
      fov: persp.fov ?? 0,
      aspect: persp.aspect ?? size.width / Math.max(1, size.height),
      cameraPosition: [camera.position.x, camera.position.y, camera.position.z],
      cameraQuat: [camera.quaternion.x, camera.quaternion.y, camera.quaternion.z, camera.quaternion.w],
      toneMapping: gl.toneMapping,
      outputColorSpace: String(gl.outputColorSpace),
      antialias: Boolean((gl.getContext() as WebGLRenderingContext).getContextAttributes()?.antialias),
      numSplats: packed?.numSplats ?? null,
      packedShDegree: packed?.getNumSh ? packed.getNumSh() : null,
      meshMaxSh: typeof mesh?.maxSh === "number" ? (mesh.maxSh as number) : packed?.maxSh ?? null,
      blurAmount: typeof spark?.blurAmount === "number" ? (spark.blurAmount as number) : null,
      preBlurAmount: typeof spark?.preBlurAmount === "number" ? (spark.preBlurAmount as number) : null,
      minPixelRadius: typeof spark?.minPixelRadius === "number" ? (spark.minPixelRadius as number) : null,
      maxPixelRadius: typeof spark?.maxPixelRadius === "number" ? (spark.maxPixelRadius as number) : null,
      encodeLinear: typeof spark?.encodeLinear === "boolean" ? (spark.encodeLinear as boolean) : null,
      enableLod: typeof spark?.enableLod === "boolean" ? (spark.enableLod as boolean) : null,
      minAlpha: typeof spark?.minAlpha === "number" ? (spark.minAlpha as number) : null,
      maxStdDev: typeof spark?.maxStdDev === "number" ? (spark.maxStdDev as number) : null,
    };
    (window as unknown as { __forensics?: Dump & { label: string } }).__forensics = { ...dump, label };
  });
  return null;
}
