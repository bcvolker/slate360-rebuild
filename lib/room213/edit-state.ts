import * as THREE from "three";
import { OPEN_TOP_Y, OPEN_WALL_MARGIN, PLAN_TOP_Y, PRESENTATION, ROOM, WALK_CEILING_CUT_Y } from "./scene-config";

export type Room213View = "dollhouse" | "walk" | "plan";

/** A box so large it removes nothing: Walk keeps every splat (see below). */
const NO_CROP = new THREE.Box3(new THREE.Vector3(-1000, -1000, -1000), new THREE.Vector3(1000, 1000, 1000));

/**
 * Independent presentation edit states, composed into ONE crop box (V frame) that Spark keeps:
 *  - Walk: NO crop. Splats beyond the walls are not debris for Walk — this reconstruction's walls are
 *    semi-transparent and those splats fill in the walls' appearance from inside; removing them (crop or derived
 *    PLY) put dark smears on the walls (physical test + A/B, 2026-09-28). Walk = the untouched golden model;
 *  - Dollhouse / Plan opening: cut above OPEN_TOP_Y and tighten the walls to OPEN_WALL_MARGIN (exterior views);
 *  - Walk ceiling hidden (user choice, default shown): cut just below the ceiling.
 * The ceiling choice is its own state — switching views never resets it.
 */
export function cropBoxFor(view: Room213View, walkCeilingHidden: boolean): THREE.Box3 {
  if (view === "walk") {
    const walk = NO_CROP.clone();
    if (walkCeilingHidden) walk.max.y = WALK_CEILING_CUT_Y;
    return walk;
  }
  const box = PRESENTATION.clone();
  if (view === "dollhouse" || view === "plan") {
    box.min.x = ROOM.min.x - OPEN_WALL_MARGIN;
    box.max.x = ROOM.max.x + OPEN_WALL_MARGIN;
    box.min.z = ROOM.min.z - OPEN_WALL_MARGIN;
    box.max.z = ROOM.max.z + OPEN_WALL_MARGIN;
    box.max.y = Math.min(box.max.y, view === "plan" ? PLAN_TOP_Y : OPEN_TOP_Y);
  }
  return box;
}
