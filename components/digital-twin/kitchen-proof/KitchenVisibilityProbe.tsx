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

const PATCH = 12;

function readCanvasProbe(gl: THREE.WebGLRenderer): PixelProbe {
  const canvas = gl.domElement;
  const width = canvas.width;
  const height = canvas.height;
  const regions: Array<[number, number]> = [
    [Math.floor(width / 2), Math.floor(height / 2)],
    [Math.floor(width * 0.22), Math.floor(height * 0.22)],
    [Math.floor(width * 0.78), Math.floor(height * 0.22)],
    [Math.floor(width * 0.22), Math.floor(height * 0.78)],
    [Math.floor(width * 0.78), Math.floor(height * 0.78)],
  ];
  const pixels = new Uint8Array(PATCH * PATCH * 4 * regions.length);
  let offset = 0;
  const ctx = gl.getContext();
  for (const [cx, cy] of regions) {
    const x = Math.max(0, Math.min(width - PATCH, cx - Math.floor(PATCH / 2)));
    const y = Math.max(0, Math.min(height - PATCH, cy - Math.floor(PATCH / 2)));
    const slice = pixels.subarray(offset, offset + PATCH * PATCH * 4);
    ctx.readPixels(x, y, PATCH, PATCH, ctx.RGBA, ctx.UNSIGNED_BYTE, slice);
    offset += PATCH * PATCH * 4;
  }
  return probeRgbaBuffer(pixels, PATCH * regions.length, PATCH);
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
