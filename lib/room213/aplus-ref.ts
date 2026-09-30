import { OFFICIAL_RENDER_PROFILE, type ModelTransform } from "./official-ref";

/**
 * TEMPORARY subjective-evaluation viewer (2026-09-30): the frozen A+ MULTI-PASS model (9/29 capture, X4 clips
 * 077+078+079+080, official Spirula Studio v2026.9.24 / 183b2c6 `360-camera` preset, own SfM, 1M splats) in the SAME
 * viewer as golden and official. Served as trained (sha below). Not evidence of reconstruction superiority by itself.
 *
 * Placement: A+'s verified similarity to the official reference (aligned through A's shared cameras + ICP, 6 mm residual;
 * spirula-worker-hardening docs/ops/room213-capture-2026-09-29/Aplus/Aplus_align.json) composed with the official → golden
 * frame similarity. The composition equals that file's `cond_to_golden` exactly (0.0°, 0 m).
 * NOTE: the furniture was rearranged on 9/29, so chairs/tables will not match the golden pins or walk collisions.
 */
export const APLUS_SHA256 = "11e394077cae5db1ab8033ec4d9ab80550cf2e82cee2ecbd38060185bfc760a2";
export const APLUS_BYTES = 247_692_275;
export const APLUS_FILE = `aplus-${APLUS_SHA256.slice(0, 16)}.ply`;
export const APLUS_KEY = "experimental/spirula-hardened/aplus-2026-09-29/splat.ply";

export const APLUS_TO_GOLDEN_FRAME: ModelTransform = {
  quaternion: [-0.09045762357985336, -0.6716983486456655, 0.7286541351853012, -0.09849821338649868],
  position: [-0.046690362736617086, 1.825784111637018, -0.48068875448901777],
  scale: 1.0199875520682264,
};

/** Identical Spark settings to the R213-OFFICIAL-REF page (which are the golden page's). */
export const APLUS_RENDER_PROFILE = OFFICIAL_RENDER_PROFILE;
