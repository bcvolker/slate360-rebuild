import * as THREE from "three";
import { CORRECTION_QUATERNION, EYE_Y, ROOM } from "./scene-config";
import { nearestWalkable } from "./walk-area";
import type { SpatialPin } from "./pins";

/** A pin anchor (file frame) in the room frame V = R_corr · FLIP · F. */
export function pinToRoom(pin: SpatialPin): { position: THREE.Vector3; normal: THREE.Vector3 } {
  const flip = (v: [number, number, number]) => new THREE.Vector3(v[0], -v[1], -v[2]).applyQuaternion(CORRECTION_QUATERNION);
  return { position: flip(pin.position), normal: flip(pin.normal).normalize() };
}

/**
 * "View in room": a Walk pose standing in front of the pin (≈1.6 units out along its horizontal normal, or from
 * the room centre for pins facing up), snapped to the walkable floor, looking straight at it. Zero roll.
 */
export function pinViewPose(pin: SpatialPin): { position: THREE.Vector3; yaw: number; pitch: number } {
  const { position: p, normal: n } = pinToRoom(pin);
  const out = new THREE.Vector3(n.x, 0, n.z);
  if (out.lengthSq() < 0.2) out.copy(ROOM.getCenter(new THREE.Vector3()).sub(p).setY(0)); // table-top pins
  out.normalize();
  const want = p.clone().addScaledVector(out, 1.6);
  const stand = nearestWalkable(want.x, want.z) ?? { x: want.x, z: want.z };
  const dx = p.x - stand.x;
  const dz = p.z - stand.z;
  const yaw = Math.atan2(-dx, -dz); // camera forward = (−sin yaw, 0, −cos yaw)
  const pitch = THREE.MathUtils.clamp(Math.atan2(p.y - EYE_Y, Math.hypot(dx, dz)), -1.1, 0.6);
  return { position: new THREE.Vector3(stand.x, EYE_Y, stand.z), yaw, pitch };
}
