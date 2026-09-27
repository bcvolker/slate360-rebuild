import * as THREE from "three";
import { EYE_Y } from "@/lib/room213/scene-config";
import { nearestWalkable } from "@/lib/room213/walk-area";
import type { WalkPose } from "@/components/room213/WalkRig";

/**
 * Curated Walk entry: the open centre aisle between the two table blocks (V z ≈ 0.36), at the whiteboard end,
 * looking down the aisle toward the windows' end of the room. Snapped to the walkable area.
 */
const ENTRY = { x: 3.3, z: 0.36, yaw: Math.PI / 2, pitch: THREE.MathUtils.degToRad(-6) };

export function walkEntryPose(): WalkPose {
  const p = nearestWalkable(ENTRY.x, ENTRY.z) ?? { x: ENTRY.x, z: ENTRY.z };
  return { position: new THREE.Vector3(p.x, EYE_Y, p.z), yaw: ENTRY.yaw, pitch: ENTRY.pitch };
}
