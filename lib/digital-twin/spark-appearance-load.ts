/**
 * Spark load flags for appearance: keep every primitive and SH band.
 * LOD is a renderer budget, not a destructive rebuild of PackedSplats.
 */
import type { SplatMesh } from "@sparkjsdev/spark";

export const BRUSH_B_PRIMITIVE_COUNT = 672_348;
export const SPARK_APPEARANCE_BLUR = 0;
export const DESKTOP_LOD_SPLAT_COUNT = 2_500_000;
export const MOBILE_LOD_SPLAT_COUNT = 400_000;

export type SplatLoadStats = {
  loaded: number;
  numSh: number;
};

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

export async function readSplatLoadStats(mesh: SplatMesh): Promise<SplatLoadStats> {
  const read = (): SplatLoadStats => {
    const packed = mesh.packedSplats;
    const ext = mesh.extSplats;
    const extra = (packed?.extra ?? ext?.extra ?? {}) as {
      sh1?: ArrayLike<unknown>;
      sh2?: ArrayLike<unknown>;
      sh3?: ArrayLike<unknown>;
    };
    const loaded =
      packed?.numSplats ||
      ext?.numSplats ||
      packed?.maxSplats ||
      mesh.splats?.getNumSplats?.() ||
      0;
    let numSh = mesh.getNumSh?.() ?? packed?.getNumSh?.() ?? ext?.getNumSh?.() ?? 0;
    if (!numSh) {
      if (extra.sh3 && extra.sh3.length) numSh = 3;
      else if (extra.sh2 && extra.sh2.length) numSh = 2;
      else if (extra.sh1 && extra.sh1.length) numSh = 1;
    }
    return { loaded, numSh };
  };
  const first = read();
  if (first.loaded && first.numSh) return first;
  try {
    await Promise.race([
      mesh.initialized,
      new Promise((resolve) => {
        setTimeout(resolve, 400);
      }),
    ]);
  } catch {
    /* Spark LOD can leave initialized pending; stats still render. */
  }
  return read();
}
