import data from "./presentation-data.json";

/**
 * Walk navigation bounds (V frame, x/z). Only the WALLS limit movement: the room interior inset by a body margin.
 * Furniture is deliberately NOT an obstacle — the baked furniture mask (walk_grid in presentation-data.json)
 * left 10–20 cm gaps between table rows, so the joystick / taps dead-ended everywhere except the centre aisle and
 * the perimeter (physical test). Walking "through" a table at eye height is far better than being stuck.
 */
const W = data.walls_V;
const MARGIN = 0.35; // keep the eye this far inside the walls
const CELL = 0.1;
const X0 = W.x_min + MARGIN;
const X1 = W.x_max - MARGIN;
const Z0 = W.z_min + MARGIN;
const Z1 = W.z_max - MARGIN;

export const WALK_GRID = { x0: W.x_min, z0: W.z_min, cell: CELL, nx: Math.ceil((W.x_max - W.x_min) / CELL), nz: Math.ceil((W.z_max - W.z_min) / CELL) };

function cellWalkable(ix: number, iz: number): boolean {
  return isWalkable(WALK_GRID.x0 + (ix + 0.5) * CELL, WALK_GRID.z0 + (iz + 0.5) * CELL);
}

export function isWalkable(x: number, z: number): boolean {
  return x >= X0 && x <= X1 && z >= Z0 && z <= Z1;
}

/**
 * Last walkable point on the straight segment from (x0,z0) toward (x1,z1), sampled at quarter cells.
 * Returns null when the start itself is not walkable. Never jumps across a blocked cell.
 */
export function walkableAlong(x0: number, z0: number, x1: number, z1: number): { x: number; z: number } | null {
  if (!isWalkable(x0, z0)) return null;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const steps = Math.max(1, Math.ceil(len / (CELL / 4)));
  let lastX = x0;
  let lastZ = z0;
  for (let s = 1; s <= steps; s += 1) {
    const t = s / steps;
    const x = x0 + (x1 - x0) * t;
    const z = z0 + (z1 - z0) * t;
    if (!isWalkable(x, z)) break;
    lastX = x;
    lastZ = z;
  }
  return { x: lastX, z: lastZ };
}

/** Slide-along-obstacles motion for continuous input (keys, joystick, wheel): try the full move, then each axis. */
export function slideMove(x: number, z: number, dx: number, dz: number): { x: number; z: number } {
  if (isWalkable(x + dx, z + dz)) return { x: x + dx, z: z + dz };
  if (isWalkable(x + dx, z)) return { x: x + dx, z };
  if (isWalkable(x, z + dz)) return { x, z: z + dz };
  return { x, z };
}

/** Nearest walkable cell centre to (x,z) by expanding ring search (for starting poses and recovery). */
export function nearestWalkable(x: number, z: number, maxRadiusCells = 30): { x: number; z: number } | null {
  const cx = Math.floor((x - WALK_GRID.x0) / CELL);
  const cz = Math.floor((z - WALK_GRID.z0) / CELL);
  for (let r = 0; r <= maxRadiusCells; r += 1) {
    let best: { x: number; z: number; d: number } | null = null;
    for (let dz = -r; dz <= r; dz += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !cellWalkable(cx + dx, cz + dz)) continue;
        const px = WALK_GRID.x0 + (cx + dx + 0.5) * CELL;
        const pz = WALK_GRID.z0 + (cz + dz + 0.5) * CELL;
        const d = Math.hypot(px - x, pz - z);
        if (!best || d < best.d) best = { x: px, z: pz, d };
      }
    }
    if (best) return { x: best.x, z: best.z };
  }
  return null;
}
