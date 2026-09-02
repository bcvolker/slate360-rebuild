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
  const w = Math.max(48, Math.floor(srcW / 6));
  const h = Math.max(48, Math.floor(srcH / 6));
  const x = Math.max(0, Math.floor((srcW - w) / 2));
  const y = Math.max(0, Math.floor((srcH - h) / 2));
  const pixels = new Uint8Array(w * h * 4);
  ctx.readPixels(x, y, w, h, ctx.RGBA, ctx.UNSIGNED_BYTE, pixels);
  return probeRgbaBuffer(pixels, w, h);
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
    console.info("[twin-vis] camera/bbox", {
      bbox,
      camera: [cam.position.x, cam.position.y, cam.position.z],
      near: cam.near,
      far: cam.far,
      cameraInsideBbox: see.cameraInsideBbox,
      lookHitsBbox: see.lookHitsBbox,
    });
    if (!see.cameraInsideBbox && !see.lookHitsBbox) {
      const next = fallbackEyeInBox(bbox);
      loco.setPose({ x: next.position[0], y: next.position[1], z: next.position[2], yaw: next.yaw, pitch: 0 });
      console.info("[twin-vis] snapped camera into display bbox", next);
    }
    done.current = true;
  });
  return null;
}
