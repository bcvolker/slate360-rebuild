/**
 * Spark load flags for appearance: keep every primitive and SH band.
 * LOD is a renderer budget, not a destructive rebuild of PackedSplats.
 */
import type { SplatMesh } from "@sparkjsdev/spark";

export const BRUSH_B_PRIMITIVE_COUNT = 672_348;
export const SPARK_APPEARANCE_BLUR = 0;
export const DESKTOP_LOD_SPLAT_COUNT = 2_500_000;
export const MOBILE_LOD_SPLAT_COUNT = 400_000;

export type SplatLoadStatus = "ready" | "still_loading" | "failed";

export type SplatLoadStats = {
  loaded: number;
  numSh: number;
  status?: SplatLoadStatus;
};

const SPLAT_POLL_MS = 50;
const SPLAT_WAIT_MS = 20_000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Live splat count only. Never use buffer capacity as success. */
export function splatCountFromMesh(mesh: SplatMesh): number {
  const packed = mesh.packedSplats;
  const ext = mesh.extSplats;
  return packed?.numSplats || ext?.numSplats || mesh.splats?.getNumSplats?.() || 0;
}

function readSplatBands(mesh: SplatMesh): SplatLoadStats {
  const packed = mesh.packedSplats;
  const ext = mesh.extSplats;
  const extra = (packed?.extra ?? ext?.extra ?? {}) as {
    sh1?: ArrayLike<unknown>;
    sh2?: ArrayLike<unknown>;
    sh3?: ArrayLike<unknown>;
  };
  const loaded = splatCountFromMesh(mesh);
  const shMesh = mesh as SplatMesh & { getNumSh?: () => number };
  let numSh = shMesh.getNumSh?.() ?? packed?.getNumSh?.() ?? ext?.getNumSh?.() ?? 0;
  if (!numSh) {
    if (extra.sh3 && extra.sh3.length) numSh = 3;
    else if (extra.sh2 && extra.sh2.length) numSh = 2;
    else if (extra.sh1 && extra.sh1.length) numSh = 1;
  }
  return { loaded, numSh };
}

export function sparkRendererAppearanceArgs(
  renderer: unknown,
  lodSplatCount: number,
): {
  renderer: unknown;
  enableLod: true;
  blurAmount: number;
  lodSplatCount: number;
} {
  return {
    renderer,
    enableLod: true,
    blurAmount: SPARK_APPEARANCE_BLUR,
    lodSplatCount,
  };
}

export function sparkSplatAppearanceArgs(
  url: string,
  onLoad: (mesh: SplatMesh) => void | Promise<void>,
): {
  url: string;
  lod: true;
  enableLod: true;
  extSplats: true;
  nonLod: true;
  onLoad: (mesh: SplatMesh) => void | Promise<void>;
} {
  return { url, lod: true, enableLod: true, extSplats: true, nonLod: true, onLoad };
}

export async function readSplatLoadStats(
  mesh: SplatMesh,
  opts?: { timeoutMs?: number },
): Promise<SplatLoadStats> {
  const timeoutMs = opts?.timeoutMs ?? SPLAT_WAIT_MS;
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const stats = readSplatBands(mesh);
    if (stats.loaded > 0) return { ...stats, status: "ready" };
    await sleep(SPLAT_POLL_MS);
  }
  const last = readSplatBands(mesh);
  return { ...last, status: last.loaded > 0 ? "ready" : "still_loading" };
}
