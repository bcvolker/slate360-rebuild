import * as THREE from "three";

/** Target fill: model bbox occupies ~60% of the shorter viewport axis. */
export const EXTERIOR_FILL_FRACTION = 0.6;
export const EXTERIOR_AZIMUTH = 0.55;
export const EXTERIOR_ELEVATION = 0.38;
export const EXTERIOR_DISTANCE_PADDING = 1.18;

export type ExteriorCameraFrame = {
  position: THREE.Vector3;
  target: THREE.Vector3;
};

const TMP_SIZE = new THREE.Vector3();
const TMP_CENTER = new THREE.Vector3();
const TMP_DIR = new THREE.Vector3();

export function computeExteriorOverviewFrame(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
): ExteriorCameraFrame {
  box.getCenter(TMP_CENTER);
  box.getSize(TMP_SIZE);

  const maxDim = Math.max(TMP_SIZE.x, TMP_SIZE.y, TMP_SIZE.z, 0.5);
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = Math.max(camera.aspect, 0.25);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const limitingFov = Math.min(vFov, hFov);
  const distance =
    (maxDim / EXTERIOR_FILL_FRACTION / (2 * Math.tan(limitingFov / 2))) *
    EXTERIOR_DISTANCE_PADDING;

  TMP_DIR.set(
    Math.sin(EXTERIOR_AZIMUTH) * Math.cos(EXTERIOR_ELEVATION),
    Math.sin(EXTERIOR_ELEVATION),
    Math.cos(EXTERIOR_AZIMUTH) * Math.cos(EXTERIOR_ELEVATION),
  ).normalize();

  return {
    position: TMP_CENTER.clone().add(TMP_DIR.multiplyScalar(distance)),
    target: TMP_CENTER.clone(),
  };
}

export function applyExteriorCameraFrame(
  camera: THREE.PerspectiveCamera,
  controls: { target: THREE.Vector3; update: () => void } | null,
  frame: ExteriorCameraFrame,
) {
  camera.position.copy(frame.position);
  camera.lookAt(frame.target);
  camera.updateProjectionMatrix();

  if (controls) {
    controls.target.copy(frame.target);
    controls.update();
  }
}

export function exteriorOrbitDistanceLimits(box: THREE.Box3) {
  box.getSize(TMP_SIZE);
  const maxDim = Math.max(TMP_SIZE.x, TMP_SIZE.y, TMP_SIZE.z, 0.5);
  return {
    minDistance: maxDim * 0.35,
    maxDistance: maxDim * 6.5,
  };
}
