"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef, type ReactElement } from "react";
import * as THREE from "three";

import type { KitchenLocomotion } from "@/hooks/useKitchenLocomotion";
import {
  cameraSeesBox,
  fallbackEyeInBox,
  probeRgbaBuffer,
  type PixelProbe,
  type VisibleLayer,
} from "@/lib/digital-twin/scene-visibility";

function readCanvasProbe(gl: THREE.WebGLRenderer): PixelProbe {
  const canvas = gl.domElement;
  const ctx = gl.getContext();
  const srcW = canvas.width;
  const srcH = canvas.height;
  const w = Math.max(48, Math.floor(srcW / 5));
  const h = Math.max(48, Math.floor(srcH / 5));
  const merge = (x: number, y: number) => {
    const pixels = new Uint8Array(w * h * 4);
    ctx.readPixels(x, y, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
    return probeRgbaBuffer(pixels, w, h);
  };
  const cx = Math.max(0, Math.floor((srcW - w) / 2));
  const cy = Math.max(0, Math.floor((srcH - h) / 2));
  const lower = merge(cx, Math.max(0, Math.floor(srcH * 0.12)));
  const mid = merge(cx, cy);
  const ratio = Math.max(lower.nonBackgroundPixelRatio, mid.nonBackgroundPixelRatio);
  const variance = Math.max(lower.frameVariance, mid.frameVariance);
  return {
    nonBackgroundPixelRatio: ratio,
    frameVariance: variance,
    visible: ratio >= 0.04 && variance >= 8,
    samples: lower.samples + mid.samples,
  };
}

export function KitchenVisibilityProbe({
  armed,
  layer,
  onResult,
}: {
  armed: boolean;
  layer: VisibleLayer;
  onResult: (layer: VisibleLayer, probe: PixelProbe) => void;
}): null {
  const { gl } = useThree();
  const frames = useRef(0);
  const fired = useRef(false);
  const onResultRef = useRef(onResult);
  onResultRef.current = onResult;

  useEffect(() => {
    frames.current = 0;
    fired.current = false;
  }, [armed, layer]);

  useFrame(() => {
    if (!armed || fired.current) return;
    frames.current += 1;
    if (frames.current < 2) return;
    fired.current = true;
    const probe = readCanvasProbe(gl);
    onResultRef.current(layer, probe);
  });
  return null;
}

export function KitchenCameraGuard({
  geometry,
  loco,
  enabled,
}: {
  geometry: THREE.BufferGeometry | null;
  loco: KitchenLocomotion;
  enabled: boolean;
}): ReactElement | null {
  const { camera } = useThree();
  const done = useRef(false);

  useEffect(() => {
    done.current = false;
  }, [geometry, enabled]);

  useFrame(() => {
    if (!enabled || !geometry || done.current) return;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    if (!box || box.isEmpty()) return;
    const bbox = {
      min: [box.min.x, box.min.y, box.min.z] as [number, number, number],
      max: [box.max.x, box.max.y, box.max.z] as [number, number, number],
    };
    const cam = camera as THREE.PerspectiveCamera;
    const look = new THREE.Vector3(0, 0, -1).applyQuaternion(cam.quaternion);
    const see = cameraSeesBox({
      position: [cam.position.x, cam.position.y, cam.position.z],
      look: [look.x, look.y, look.z],
      near: cam.near,
      far: cam.far,
      box: bbox,
    });
    const next = fallbackEyeInBox(bbox);
    loco.setPose({ x: next.position[0], y: next.position[1], z: next.position[2], yaw: Math.PI, pitch: -0.08 });
    console.info("[twin-vis] camera/bbox", {
      bbox,
      camera: [cam.position.x, cam.position.y, cam.position.z],
      near: cam.near,
      far: cam.far,
      cameraInsideBbox: see.cameraInsideBbox,
      lookHitsBbox: see.lookHitsBbox,
      snapped: next,
    });
    done.current = true;
  });
  return null;
}
