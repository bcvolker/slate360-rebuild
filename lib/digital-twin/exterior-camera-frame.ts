import * as THREE from "three";

/** Target fill: model bbox occupies this fraction of the shorter viewport axis. */
export const EXTERIOR_FILL_FRACTION = 0.72;
export const EXTERIOR_AZIMUTH = 0.55;
export const EXTERIOR_ELEVATION = 0.38;
export const EXTERIOR_DISTANCE_PADDING = 1.06;

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
  const flat = TMP_SIZE.y < Math.max(TMP_SIZE.x, TMP_SIZE.z) * 0.35;
  const fill = flat ? 0.9 : EXTERIOR_FILL_FRACTION;
  const elevation = flat ? 0.72 : EXTERIOR_ELEVATION;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const aspect = Math.max(camera.aspect, 0.25);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);
  const limitingFov = Math.min(vFov, hFov);
  const distance =
    (maxDim / fill / (2 * Math.tan(limitingFov / 2))) *
    EXTERIOR_DISTANCE_PADDING;

  TMP_DIR.set(
    Math.sin(EXTERIOR_AZIMUTH) * Math.cos(elevation),
    Math.sin(elevation),
    Math.cos(EXTERIOR_AZIMUTH) * Math.cos(elevation),
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
