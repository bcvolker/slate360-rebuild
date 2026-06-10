import * as THREE from "three";

export const ORBIT_HOME_ZOOM_MIN = 0.5;
export const ORBIT_HOME_ZOOM_MAX = 8;

const BOX_CORNERS = Array.from({ length: 8 }, () => new THREE.Vector3());
const PROJECTED = new THREE.Vector3();

export function clampOrbitTargetToBounds(target: THREE.Vector3, bounds: THREE.Box3): THREE.Vector3 {
  if (bounds.isEmpty()) return target;
  target.x = THREE.MathUtils.clamp(target.x, bounds.min.x, bounds.max.x);
  target.y = THREE.MathUtils.clamp(target.y, bounds.min.y, bounds.max.y);
  target.z = THREE.MathUtils.clamp(target.z, bounds.min.z, bounds.max.z);
  return target;
}

export function orbitDistanceLimitsFromHome(homeDistance: number) {
  const safe = Math.max(homeDistance, 0.5);
  return {
    minDistance: safe * ORBIT_HOME_ZOOM_MIN,
    maxDistance: safe * ORBIT_HOME_ZOOM_MAX,
  };
}

function fillBoxCorners(box: THREE.Box3, out: THREE.Vector3[]) {
  const { min, max } = box;
  const pts: [number, number, number][] = [
    [min.x, min.y, min.z],
    [max.x, min.y, min.z],
    [min.x, max.y, min.z],
    [max.x, max.y, min.z],
    [min.x, min.y, max.z],
    [max.x, min.y, max.z],
    [min.x, max.y, max.z],
    [max.x, max.y, max.z],
  ];
  for (let i = 0; i < 8; i++) {
    out[i]!.set(pts[i]![0], pts[i]![1], pts[i]![2]);
  }
}

export type ScreenBoundsRect = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

export function projectBoundsToScreen(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): ScreenBoundsRect | null {
  if (box.isEmpty() || width <= 0 || height <= 0) return null;
  fillBoxCorners(box, BOX_CORNERS);

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  let anyInFront = false;

  for (const corner of BOX_CORNERS) {
    PROJECTED.copy(corner).project(camera);
    if (PROJECTED.z < 1) anyInFront = true;
    const x = (PROJECTED.x * 0.5 + 0.5) * width;
    const y = (-PROJECTED.y * 0.5 + 0.5) * height;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  if (!anyInFront) return null;
  return { minX, maxX, minY, maxY };
}

export function isBoundsVisibleOnScreen(
  box: THREE.Box3,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
  marginPx = 4,
): boolean {
  const rect = projectBoundsToScreen(box, camera, width, height);
  if (!rect) return false;
  return (
    rect.maxX >= marginPx &&
    rect.minX <= width - marginPx &&
    rect.maxY >= marginPx &&
    rect.minY <= height - marginPx
  );
}

export type TwinSplatFramingReport = {
  viewport: { width: number; height: number };
  screenRect: ScreenBoundsRect | null;
  fullyVisible: boolean;
  homeDistance: number;
  cameraPosition: [number, number, number];
  orbitTarget: [number, number, number];
};
