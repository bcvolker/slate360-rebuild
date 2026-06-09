import * as THREE from "three";
import type { SplatMesh } from "@sparkjsdev/spark";
import {
  applyInteriorCameraFrame,
  computeInteriorStartFrame,
  type InteriorCameraFrame,
} from "@/lib/digital-twin/interior-camera-frame";

export type SplatCameraFrame = InteriorCameraFrame;

const TMP_CENTER = new THREE.Vector3();
const TMP_SIZE = new THREE.Vector3();

/** Trim axis-aligned bounds toward the centroid to de-emphasize edge floaters. */
export function trimSplatBounds(box: THREE.Box3, trimFraction = 0.12): THREE.Box3 {
  if (box.isEmpty()) return box.clone();

  box.getCenter(TMP_CENTER);
  box.getSize(TMP_SIZE);

  const inset = trimFraction * 0.5;
  const trimmed = new THREE.Box3(
    new THREE.Vector3(
      box.min.x + TMP_SIZE.x * inset,
      box.min.y + TMP_SIZE.y * inset,
      box.min.z + TMP_SIZE.z * inset,
    ),
    new THREE.Vector3(
      box.max.x - TMP_SIZE.x * inset,
      box.max.y - TMP_SIZE.y * inset,
      box.max.z - TMP_SIZE.z * inset,
    ),
  );

  return trimmed.isEmpty() ? box.clone() : trimmed;
}

export function getSplatSceneBounds(mesh: SplatMesh): THREE.Box3 {
  return trimSplatBounds(mesh.getBoundingBox(true));
}

export function applySplatCameraFrame(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void } | null,
  frame: SplatCameraFrame,
) {
  applyInteriorCameraFrame(camera, controls, frame);
}

export function frameSplatMesh(
  mesh: SplatMesh,
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void } | null,
): SplatCameraFrame {
  const frame = computeInteriorStartFrame(getSplatSceneBounds(mesh), camera);
  applyInteriorCameraFrame(camera, controls, frame);
  return frame;
}
