import { SPIRULA_3DGUT_PROFILE, type SparkRenderProfile } from "../digital-twin/spark-render-profile";

/**
 * A/B viewing test (2026-09-29): the frozen OFFICIAL Spirula Studio reference model (R213-OFFICIAL-REF, release
 * v2026.9.24 / 183b2c6, `360-camera` preset, own SfM from the original .insv) shown in the SAME viewer as the golden
 * model. Nothing about the splats is changed: the PLY bytes are served as trained (sha below). Only the scene graph
 * places it: the model was reconstructed in its own SfM frame, so one fixed similarity (fitted from same-instant frame
 * pairs + ICP on 14,148 SfM points, 5 mm median; docs in the spirula-worker-hardening branch,
 * room213-spark-gate-2026-09-29/golden_to_ref_similarity.json) maps it into the golden file frame F, so the golden
 * viewer's cameras, crops, walkable area and pins apply unchanged.
 */
export const OFFICIAL_SHA256 = "0053c5003a029a4ea94e9b5c00a7dd03ea83e313eca8fac3f1df0588b1ac47ba";
export const OFFICIAL_BYTES = 247_396_163;
export const OFFICIAL_FILE = `official-${OFFICIAL_SHA256.slice(0, 16)}.ply`;
export const OFFICIAL_KEY = "experimental/spirula-hardened/official-ref-2026-09-29/splat.ply";

/** Model file frame -> golden file frame F: X_F = position + quaternion · (scale · X_model). */
export type ModelTransform = { quaternion: [number, number, number, number]; position: [number, number, number]; scale: number };
export const OFFICIAL_TO_GOLDEN_FRAME: ModelTransform = {
  quaternion: [-0.03279053557013603, -0.6766358262298502, 0.7347263132039695, -0.03558067066504045],
  position: [-0.29801611744274226, 1.8048394780768136, -0.6764308309869792],
  scale: 0.9714884875281153,
};

/**
 * Render settings: exactly the Spark 2.1.0 configuration of the SPARK_MINOR_DEGRADATION gate, which is also the golden
 * viewer's (accumExtSplats, blur 0, preBlur 0; LoD off is set by the scene). Pinned explicitly for this A/B page rather
 * than resolved from provenance, so both pages draw with identical renderer settings.
 */
export const OFFICIAL_RENDER_PROFILE: SparkRenderProfile = SPIRULA_3DGUT_PROFILE;

/** Per-page overrides for the A/B page. The golden page passes none. */
export type Room213Variant = {
  profile?: SparkRenderProfile;
  modelTransform?: ModelTransform;
  poster?: { portrait: string; landscape: string };
};
