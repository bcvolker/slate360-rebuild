import * as THREE from "three";
import type { SplatMesh } from "@sparkjsdev/spark";

const raycaster = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const hits: THREE.Intersection[] = [];

export type SplatRayHit = {
  point: THREE.Vector3;
  distance: number;
};

export function raycastSplatMesh(
  mesh: SplatMesh,
  camera: THREE.Camera,
  clientX: number,
  clientY: number,
  canvas: HTMLCanvasElement,
): SplatRayHit | null {
  const rect = canvas.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;

  ndc.set(
    ((clientX - rect.left) / rect.width) * 2 - 1,
    -(((clientY - rect.top) / rect.height) * 2 - 1),
  );

  raycaster.setFromCamera(ndc, camera);
  hits.length = 0;
  mesh.raycast(raycaster, hits);
  if (hits.length === 0) return null;

  hits.sort((a, b) => a.distance - b.distance);
  const first = hits[0];
  return {
    point: first.point.clone(),
    distance: first.distance,
  };
}

/** R8.2: world-space ray (origin + direction, no camera/screen-coords involved)
 * — used to find the orbit pivot along a baked initial_camera's view direction. */
export function raycastSplatMeshFromRay(
  mesh: SplatMesh,
  origin: THREE.Vector3,
  direction: THREE.Vector3,
): SplatRayHit | null {
  raycaster.set(origin, direction);
  hits.length = 0;
  mesh.raycast(raycaster, hits);
  if (hits.length === 0) return null;

  hits.sort((a, b) => a.distance - b.distance);
  const first = hits[0];
  return {
    point: first.point.clone(),
    distance: first.distance,
  };
}
