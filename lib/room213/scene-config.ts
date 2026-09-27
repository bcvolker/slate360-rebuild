import * as THREE from "three";
import data from "./presentation-data.json";

/**
 * Room 213 presentation constants. Authoritative derivation: scripts/ops/room213_presentation_data.py
 * (see docs/ops/room213-poc/COORDINATES.md).
 *
 * Frames
 *  - F (file frame): the golden PLY's own coordinates. Pins are stored here.
 *  - V (room frame): V = R_corr · FLIP · F — FLIP is the viewer's π-about-x mesh rotation, R_corr the manifest
 *    correction_quaternion (levelling). y up, walls axis-aligned. Crops, walkable area and cameras live here.
 * Everything below is precomputed: nothing at runtime scans the million splats for bounds.
 */

export const GOLDEN_SHA256 = data.golden_sha256;
export const CORRECTION_QUATERNION = new THREE.Quaternion(...(data.correction_quaternion as [number, number, number, number])).normalize();

/** Room shell in V (wall / floor / ceiling planes from splat density peaks). */
export const ROOM = new THREE.Box3(new THREE.Vector3(...data.room_V.min), new THREE.Vector3(...data.room_V.max));
export const FLOOR_Y = data.room_V.min[1];
export const CEILING_Y = data.room_V.max[1];

/** Tier-1 presentation volume: room shell + 1.0 unit on every side (hides only distant exterior content). */
export const PRESENTATION_MARGIN = 1.0;
export const PRESENTATION = ROOM.clone().expandByScalar(PRESENTATION_MARGIN);

/**
 * Dollhouse/Plan are exterior views: a tighter wall margin (0.2 unit beyond the wall planes) removes the
 * window/exterior halo that the conservative 1.0 margin keeps. Chosen from a 1.0 / 0.35 / 0.25 / 0.15 hero A/B
 * (docs/ops/room213-poc): walls, window reveals, door and railing intact at every tested margin.
 */
export const OPEN_WALL_MARGIN = 0.2;
/** Dollhouse/Plan open the room by cutting everything above this height (walls stay ~1.9 units tall). */
export const OPEN_TOP_Y = 0.1;
/** Walk "hide ceiling": cut just below the ceiling plane so the tiles and light panels disappear. */
export const WALK_CEILING_CUT_Y = CEILING_Y - 0.22;

/** Eye height above the floor in scene units (≈1.6 m at the solve's ~1.11 m/unit; scale unvalidated). */
export const EYE_HEIGHT = 1.4;
export const EYE_Y = FLOOR_Y + EYE_HEIGHT;

export type Vec3 = [number, number, number];
