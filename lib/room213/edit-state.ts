import * as THREE from "three";
import { OPEN_TOP_Y, OPEN_WALL_MARGIN, PLAN_TOP_Y, PRESENTATION, ROOM, WALK_CEILING_CUT_Y } from "./scene-config";

export type Room213View = "dollhouse" | "walk" | "plan";

/**
 * Independent presentation edit states, composed into ONE crop box (V frame) that Spark keeps:
 *  - exterior cleanup (always): the tier-1 presentation volume;
 *  - Dollhouse / Plan opening: cut above OPEN_TOP_Y and tighten the walls to OPEN_WALL_MARGIN (exterior views);
 *  - Walk ceiling hidden (user choice, default shown): cut just below the ceiling.
 * The ceiling choice is its own state — switching views never resets it.
 */
export function cropBoxFor(view: Room213View, walkCeilingHidden: boolean): THREE.Box3 {
  const box = PRESENTATION.clone();
  if (view === "dollhouse" || view === "plan") {
    box.min.x = ROOM.min.x - OPEN_WALL_MARGIN;
    box.max.x = ROOM.max.x + OPEN_WALL_MARGIN;
    box.min.z = ROOM.min.z - OPEN_WALL_MARGIN;
    box.max.z = ROOM.max.z + OPEN_WALL_MARGIN;
    box.max.y = Math.min(box.max.y, view === "plan" ? PLAN_TOP_Y : OPEN_TOP_Y);
  }
  else if (walkCeilingHidden) box.max.y = Math.min(box.max.y, WALK_CEILING_CUT_Y);
  return box;
}
