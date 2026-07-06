import * as THREE from "three";
import type { SplatManifest } from "@/lib/digital-twin/twin-manifest";

export const INTERIOR_EYE_HEIGHT = 1.6;
export const INTERIOR_FIT_PADDING = 1.12;
export const INTERIOR_STANDOFF = 0.45;

/** Portrait + landscape aspect ratios used to guarantee whole-scene fit. */
const FIT_ASPECTS = [9 / 16, 16 / 9, 1];

export type InteriorCameraFrame = {
  position: THREE.Vector3;
  target: THREE.Vector3;
  yaw: number;
  pitch: number;
  zoom: number;
};

const TMP_CENTER = new THREE.Vector3();
const TMP_FORWARD = new THREE.Vector3();
const TMP_RIGHT = new THREE.Vector3();
const TMP_REL = new THREE.Vector3();

function boxCorners(box: THREE.Box3, out: THREE.Vector3[]) {
  out.length = 0;
  const { min, max } = box;
  for (const x of [min.x, max.x]) {
    for (const y of [min.y, max.y]) {
      for (const z of [min.z, max.z]) {
        out.push(new THREE.Vector3(x, y, z));
      }
    }
  }
}

function computeFitZoom(
  eye: THREE.Vector3,
  forward: THREE.Vector3,
  corners: THREE.Vector3[],
  fovDeg: number,
): number {
  const baseFovRad = THREE.MathUtils.degToRad(fovDeg);
  TMP_RIGHT.set(forward.z, 0, -forward.x).normalize();

  let minZoom = 1;

  for (const aspect of FIT_ASPECTS) {
    const halfV = baseFovRad * 0.5;
    const halfH = Math.atan(Math.tan(halfV) * aspect);

    for (const corner of corners) {
      TMP_REL.copy(corner).sub(eye);
      const depth = Math.max(TMP_REL.dot(forward), 0.05);
      const lateral = Math.abs(TMP_REL.dot(TMP_RIGHT));
      const vertical = Math.abs(TMP_REL.y);

      const needHalfH = Math.atan(lateral / depth);
      const needHalfV = Math.atan(vertical / depth);

      if (needHalfH > halfH) {
        minZoom = Math.min(minZoom, halfH / needHalfH);
      }
      if (needHalfV > halfV) {
        minZoom = Math.min(minZoom, halfV / needHalfV);
      }
    }
  }

  return minZoom;
}

const TMP_INTERIOR_QUAT = new THREE.Quaternion();
const TMP_INTERIOR_FORWARD = new THREE.Vector3();

/** R8.2: walk mode starts AT the capture pose (X/Z) at eye height on the
 * detected floor (box.min.y — same floor estimate the bounds-based path
 * already uses), facing the capture pose's own horizontal look direction.
 * Pitch stays level (0), matching the existing bounds-based frame's
 * convention, since a comfortable walk-mode start looks straight ahead
 * regardless of whether the capture frame itself looked slightly up/down. */
function computeInteriorStartFrameFromCapture(
  box: THREE.Box3,
  cam: NonNullable<SplatManifest["initial_camera"]>,
): InteriorCameraFrame | null {
  if (!cam.position || cam.position.length < 3 || !cam.rotation || cam.rotation.length < 4) return null;
  const floorY = box.min.y;
  const position = new THREE.Vector3(cam.position[0], floorY + INTERIOR_EYE_HEIGHT, cam.position[2]);
  TMP_INTERIOR_QUAT.set(cam.rotation[0], cam.rotation[1], cam.rotation[2], cam.rotation[3]);
  TMP_INTERIOR_FORWARD.set(0, 0, -1).applyQuaternion(TMP_INTERIOR_QUAT);
  const { yaw } = yawPitchFromDirection(TMP_INTERIOR_FORWARD.normalize());
  const target = position.clone().add(directionFromYawPitch(yaw, 0));
  return { position, target, yaw, pitch: 0, zoom: 1 };
}

export function computeInteriorStartFrame(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
  manifest?: SplatManifest | null,
): InteriorCameraFrame {
  if (manifest?.initial_camera) {
    const captureFrame = computeInteriorStartFrameFromCapture(box, manifest.initial_camera);
    if (captureFrame) return captureFrame;
  }

  box.getCenter(TMP_CENTER);

  const eyeY = box.min.y + INTERIOR_EYE_HEIGHT;
  const position = new THREE.Vector3(TMP_CENTER.x, eyeY, TMP_CENTER.z);
  const corners: THREE.Vector3[] = [];
  boxCorners(box, corners);

  let bestYaw = 0;
  let bestZoom = 1;

  for (let i = 0; i < 4; i += 1) {
    const yaw = (i * Math.PI) / 2;
    TMP_FORWARD.set(Math.sin(yaw), 0, Math.cos(yaw));
    const zoom = computeFitZoom(position, TMP_FORWARD, corners, camera.fov);
    if (zoom < bestZoom) {
      bestZoom = zoom;
      bestYaw = yaw;
    }
  }

  TMP_FORWARD.set(Math.sin(bestYaw), 0, Math.cos(bestYaw));
  const target = position.clone().add(TMP_FORWARD);

  return {
    position,
    target,
    yaw: bestYaw,
    pitch: 0,
    zoom: THREE.MathUtils.clamp(bestZoom * INTERIOR_FIT_PADDING, 0.45, 1.2),
  };
}

export function applyInteriorCameraFrame(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void } | null,
  frame: InteriorCameraFrame,
) {
  camera.position.copy(frame.position);
  camera.lookAt(frame.target);
  camera.fov = THREE.MathUtils.clamp(60 / frame.zoom, 25, 85);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(frame.target);
    controls.update();
  }
}

export function yawPitchFromDirection(direction: THREE.Vector3) {
  const yaw = Math.atan2(direction.x, direction.z);
  const pitch = Math.asin(THREE.MathUtils.clamp(direction.y, -1, 1));
  return { yaw, pitch };
}

export function directionFromYawPitch(yaw: number, pitch: number, out = new THREE.Vector3()) {
  out.set(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    Math.cos(yaw) * Math.cos(pitch),
  );
  return out.normalize();
}

export function eyePositionFromHit(
  hitPoint: THREE.Vector3,
  floorY: number,
  cameraPosition: THREE.Vector3,
): THREE.Vector3 {
  const dest = new THREE.Vector3(hitPoint.x, floorY + INTERIOR_EYE_HEIGHT, hitPoint.z);

  const away = dest.clone().sub(cameraPosition);
  away.y = 0;
  if (away.lengthSq() > 1e-6) {
    away.normalize().multiplyScalar(INTERIOR_STANDOFF);
    dest.add(away);
  }

  dest.y = floorY + INTERIOR_EYE_HEIGHT;
  return dest;
}
