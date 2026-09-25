/**
 * Spark renderer profile — how a splat is DRAWN, chosen from the model's own provenance.
 *
 * Two Spark 2.1.0 settings decide whether a trained model looks the way its trainer rendered it:
 *
 * 1. `accumExtSplats` (the per-frame ACCUMULATOR, not the input). `SplatMesh({ extSplats: true })` only
 *    controls how the file is held after loading (fp32 centres, fp16 colour). Every frame Spark
 *    re-packs the visible splats into an accumulator, and the default accumulator
 *    (`accumExtSplats: false`) stores each splat in 16 bytes with its colour as 8 bits CLAMPED to
 *    [0, 1]. Trained models legitimately use per-splat colours above 1: a semi-transparent splat on a
 *    bright surface only contributes `alpha * colour`, so the optimizer brightens it. On the Room 213
 *    Spirula models ~62 % of the carpet splats exceed 1. Clamping them made the carpet ~6 grey
 *    levels darker and removed ~35 % of its source-matching fine detail (measured:
 *    branch feature/room213-viewer-fidelity, docs/ops/ROOM213_VIEWER_FIDELITY_2026-09-25.md). The ext accumulator stores colour as fp16, unclamped.
 *    The model's colours are never altered; only the viewer stops truncating them.
 *
 * 2. `blurAmount` / `preBlurAmount` (screen-space filter). Spark's default adds 0.3 px² to every
 *    projected covariance AND scales opacity by sqrt(det_before / det_after) (a Mip-style
 *    anti-alias filter). That is right only for models trained with that filter. Spirula's `3dgut`
 *    primitive evaluates each Gaussian along the pixel ray with NO screen-space blur, so its models
 *    are drawn with blur 0. Classic 3DGS / splatfacto models were trained with a 0.3 dilation and are
 *    left on Spark's default — this module never applies zero blur to a model that did not ask for it.
 *
 * SparkRenderer settings are scene-wide (one renderer draws every SplatMesh under it). Every Slate360
 * viewer mounts exactly one SplatMesh per SparkRenderer, so a per-model profile is a per-renderer
 * profile. If a viewer ever puts several models under one renderer, `profileForScene` keeps the
 * shared settings only where every model agrees and otherwise falls back to the default profile.
 */
import type { SplatManifest } from "./twin-manifest";

export type { TrainingRasterizer } from "./twin-manifest";

export type SparkRenderProfileId = "spark-default" | "spirula-3dgut";

export type SparkRenderProfile = {
  id: SparkRenderProfileId;
  /** Accumulator storage: fp32 centres + fp16 unclamped colour (true) vs 16-byte packed, colour clamped (false). */
  accumExtSplats: boolean;
  /** Screen-space filter added WITH opacity compensation (Spark default 0.3). */
  blurAmount: number;
  /** Screen-space filter added WITHOUT compensation (Spark default 0). Always set explicitly. */
  preBlurAmount: number;
};

export const SPARK_DEFAULT_PROFILE: SparkRenderProfile = Object.freeze({
  id: "spark-default",
  accumExtSplats: false,
  blurAmount: 0.3,
  preBlurAmount: 0,
});

export const SPIRULA_3DGUT_PROFILE: SparkRenderProfile = Object.freeze({
  id: "spirula-3dgut",
  accumExtSplats: true,
  blurAmount: 0,
  preBlurAmount: 0,
});

/**
 * Trainer builds whose eval renderer was compared against Spark at matched cameras (Room 213 golden +
 * edge-aware models, 2026-09-25). Revisions are matched by full commit SHA prefix of the trainer source;
 * the worker's patched build id is `<sha>+resume-nsh-…` and shares the same renderer.
 */
const VERIFIED_SPIRULA_REVISIONS = ["fd1afca1c47f89c98c8e64929f1c73b82571e5f3"];

export function resolveSparkRenderProfile(manifest: SplatManifest | null | undefined): SparkRenderProfile {
  const r = manifest?.training_rasterizer;
  if (!r || r.trainer !== "spirula" || r.primitive !== "3dgut") return SPARK_DEFAULT_PROFILE;
  const rev = r.trainer_revision ?? "";
  if (!VERIFIED_SPIRULA_REVISIONS.some((sha) => rev.startsWith(sha))) return SPARK_DEFAULT_PROFILE;
  if (r.screen_blur_px2 !== undefined && r.screen_blur_px2 !== 0) return SPARK_DEFAULT_PROFILE;
  return SPIRULA_3DGUT_PROFILE;
}

export function profileForScene(profiles: SparkRenderProfile[]): SparkRenderProfile {
  if (profiles.length === 0) return SPARK_DEFAULT_PROFILE;
  return profiles.every((p) => p.id === profiles[0].id) ? profiles[0] : SPARK_DEFAULT_PROFILE;
}

/** Constructor args for `new SparkRenderer(...)` / `<sparkRenderer args={[...]}>`. accumExtSplats is read
 * only at construction, so a profile change must mount a NEW renderer (key it by `profile.id`). */
export function sparkRendererArgsFor<R>(
  renderer: R,
  profile: SparkRenderProfile,
  lod: { lodSplatCount?: number; enableLod?: boolean } = {},
): {
  renderer: R;
  enableLod: boolean;
  accumExtSplats: boolean;
  blurAmount: number;
  preBlurAmount: number;
  lodSplatCount?: number;
} {
  return {
    renderer,
    enableLod: lod.enableLod ?? true,
    accumExtSplats: profile.accumExtSplats,
    blurAmount: profile.blurAmount,
    preBlurAmount: profile.preBlurAmount,
    ...(lod.lodSplatCount !== undefined ? { lodSplatCount: lod.lodSplatCount } : {}),
  };
}
