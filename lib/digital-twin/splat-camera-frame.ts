import * as THREE from "three";
import type { SplatMesh } from "@sparkjsdev/spark";

export type SplatCameraFrame = {
  position: THREE.Vector3;
  target: THREE.Vector3;
};

const TMP_CENTER = new THREE.Vector3();
const TMP_SIZE = new THREE.Vector3();
const TMP_DIR = new THREE.Vector3();

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

export function computeSplatCameraFrame(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
  padding = 1.3,
): SplatCameraFrame {
  box.getCenter(TMP_CENTER);
  box.getSize(TMP_SIZE);

  const maxDim = Math.max(TMP_SIZE.x, TMP_SIZE.y, TMP_SIZE.z, 0.25);
  const aspect = Math.max(camera.aspect || 1, 0.25);
  const fovRad = THREE.MathUtils.degToRad(camera.fov);

  const fitHeightDistance = maxDim / (2 * Math.tan(fovRad / 2));
  const fitWidthDistance = fitHeightDistance / aspect;
  const distance = padding * Math.max(fitHeightDistance, fitWidthDistance);

  TMP_DIR.set(0, 0.28, 1).normalize();
  const position = TMP_CENTER.clone().add(TMP_DIR.multiplyScalar(distance));

  return {
    position,
    target: TMP_CENTER.clone(),
  };
}

export function applySplatCameraFrame(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void } | null,
  frame: SplatCameraFrame,
) {
  camera.position.copy(frame.position);
  camera.lookAt(frame.target);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(frame.target);
    controls.update();
  }
}

export function frameSplatMesh(
  mesh: SplatMesh,
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void } | null,
): SplatCameraFrame {
  const frame = computeSplatCameraFrame(getSplatSceneBounds(mesh), camera);
  applySplatCameraFrame(camera, controls, frame);
  return frame;
}
