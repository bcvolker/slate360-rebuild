import data from "./presentation-data.json";

/**
 * Curated walkable area (V frame, x/z): floor cells inside the walls, minus furniture footprints dilated by a
 * body radius. A navigation/collision aid baked by scripts/ops/room213_presentation_data.py — not survey
 * geometry. Bit order: row-major over z then x, numpy packbits (MSB first).
 */
const G = data.walk_grid;
const bits = (() => {
  const raw = typeof atob === "function" ? atob(G.bits_b64) : Buffer.from(G.bits_b64, "base64").toString("binary");
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
})();

export const WALK_GRID = { x0: G.x0, z0: G.z0, cell: G.cell, nx: G.nx, nz: G.nz };

function cellWalkable(ix: number, iz: number): boolean {
  if (ix < 0 || iz < 0 || ix >= G.nx || iz >= G.nz) return false;
  const i = iz * G.nx + ix;
  return ((bits[i >> 3] >> (7 - (i & 7))) & 1) === 1;
}

export function isWalkable(x: number, z: number): boolean {
  return cellWalkable(Math.floor((x - G.x0) / G.cell), Math.floor((z - G.z0) / G.cell));
}

/**
 * Last walkable point on the straight segment from (x0,z0) toward (x1,z1), sampled at quarter cells.
 * Returns null when the start itself is not walkable. Never jumps across a blocked cell.
 */
export function walkableAlong(x0: number, z0: number, x1: number, z1: number): { x: number; z: number } | null {
  if (!isWalkable(x0, z0)) return null;
  const len = Math.hypot(x1 - x0, z1 - z0);
  const steps = Math.max(1, Math.ceil(len / (G.cell / 4)));
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
  const cx = Math.floor((x - G.x0) / G.cell);
  const cz = Math.floor((z - G.z0) / G.cell);
  for (let r = 0; r <= maxRadiusCells; r += 1) {
    let best: { x: number; z: number; d: number } | null = null;
    for (let dz = -r; dz <= r; dz += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !cellWalkable(cx + dx, cz + dz)) continue;
        const px = G.x0 + (cx + dx + 0.5) * G.cell;
        const pz = G.z0 + (cz + dz + 0.5) * G.cell;
        const d = Math.hypot(px - x, pz - z);
        if (!best || d < best.d) best = { x: px, z: pz, d };
      }
    }
    if (best) return { x: best.x, z: best.z };
  }
  return null;
}
