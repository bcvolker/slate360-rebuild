import type { MutableRefObject } from "react";
import * as THREE from "three";
import type { SplatMesh } from "@sparkjsdev/spark";
import { CameraTweenRunner } from "@/lib/digital-twin/camera-tween";
import { INTERIOR_EYE_HEIGHT, sceneEyeHeight, sceneFloorY } from "@/lib/digital-twin/interior-camera-frame";
import { getSplatSceneBounds } from "@/lib/digital-twin/splat-camera-frame";

const TMP_SIZE = new THREE.Vector3();
const TMP_DELTA = new THREE.Vector3();

/** Normal ≈ a walking step. Leap ≈ 10 ft toward the click. */
export type WalkStride = "normal" | "leap";

const NORMAL_STEP_M = 0.85;
const LEAP_STEP_M = 3.05;

let walkStride: WalkStride = "normal";

export function setWalkStride(next: WalkStride): void {
  walkStride = next;
}

export function getWalkStride(): WalkStride {
  return walkStride;
}

function unitsPerMeter(box: THREE.Box3): number {
  const eye = sceneEyeHeight(box);
  if (eye >= 1.4 && eye <= 1.85) return 1;
  return eye / INTERIOR_EYE_HEIGHT;
}

export function maxWalkStep(box: THREE.Box3): number {
  box.getSize(TMP_SIZE);
  const ground = Math.max(TMP_SIZE.x, TMP_SIZE.z, 0.2);
  const wanted = (walkStride === "leap" ? LEAP_STEP_M : NORMAL_STEP_M) * unitsPerMeter(box);
  if (walkStride === "leap") {
    return THREE.MathUtils.clamp(wanted, ground * 0.07, Math.min(wanted, ground * 0.22));
  }
  return THREE.MathUtils.clamp(wanted, ground * 0.012, Math.min(wanted, ground * 0.04));
}

export function walkDestination(
  hitPoint: THREE.Vector3,
  cameraPosition: THREE.Vector3,
  box: THREE.Box3,
): THREE.Vector3 {
  const floorY = sceneFloorY(box);
  const eye = sceneEyeHeight(box);
  const maxStep = maxWalkStep(box);
  const dest = new THREE.Vector3(hitPoint.x, floorY + eye, hitPoint.z);
  TMP_DELTA.set(dest.x - cameraPosition.x, 0, dest.z - cameraPosition.z);
  const dist = TMP_DELTA.length();
  if (dist > maxStep && dist > 1e-6) {
    TMP_DELTA.multiplyScalar(maxStep / dist);
    dest.set(
      cameraPosition.x + TMP_DELTA.x,
      floorY + eye,
      cameraPosition.z + TMP_DELTA.z,
    );
  } else {
    dest.y = floorY + eye;
  }
  return dest;
}

/** Prefer the floor. High wall/sky hits still walk on the ground toward that XZ. */
export function pickWalkHit(
  splatHit: THREE.Vector3 | null,
  groundHit: THREE.Vector3 | null,
  box: THREE.Box3,
): THREE.Vector3 | null {
  const floorY = sceneFloorY(box);
  const eye = sceneEyeHeight(box);
  const ceiling = floorY + 1.25 * eye;
  if (splatHit && splatHit.y <= ceiling) return splatHit;
  return groundHit ?? splatHit;
}

export function flyInteriorFromHit(
  mesh: SplatMesh,
  camera: THREE.PerspectiveCamera,
  hit: THREE.Vector3,
  stateRef: MutableRefObject<{ yaw: number; pitch: number; position: THREE.Vector3 }>,
  tweenRef: MutableRefObject<CameraTweenRunner>,
) {
  const bounds = getSplatSceneBounds(mesh);
  const destination = walkDestination(hit, camera.position, bounds);
  const dist = Math.hypot(
    destination.x - stateRef.current.position.x,
    destination.z - stateRef.current.position.z,
  );
  const leap = walkStride === "leap";
  const duration = leap
    ? THREE.MathUtils.clamp(420 + dist * 220, 520, 1150)
    : THREE.MathUtils.clamp(280 + dist * 1400, 320, 700);
  tweenRef.current.start(
    {
      position: stateRef.current.position.clone(),
      yaw: stateRef.current.yaw,
      pitch: stateRef.current.pitch,
    },
    {
      position: destination,
      yaw: stateRef.current.yaw,
      pitch: stateRef.current.pitch,
    },
    duration,
  );
}
