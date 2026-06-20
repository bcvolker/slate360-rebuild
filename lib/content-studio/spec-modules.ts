import { z } from "zod";

/**
 * Content Studio feature modules — transitions, per-clip effects, speed ramps,
 * logo layers, captions, aspect/export, and Library asset refs.
 *
 * These are FROZEN typed modules that attach to the core spec (via clip fields or
 * the `extensions` bucket) and graduate into the timeline render path at their
 * build slices. Decisions locked from cross-AI research: FFmpeg `xfade` transitions
 * first (gl-transitions later), native FFmpeg effect filters, libass for all text,
 * `lut3d` for LUTs, overlay for logos/plates, reframe via viewingRegion.
 */

const Sec = z.number().finite().min(0);
const Pct = z.number().finite().min(0).max(100); // strength sliders (level-disclosure)
const Easing = z.enum(["linear", "smoothstep", "ease_in", "ease_out", "ease_in_out"]);

// ── Transitions (clip-boundary) ───────────────────────────────
export const SlateTransitionSchema = z.object({
  id: z.string().min(1),
  /** xfade = FFmpeg built-in (v1); gl = gl-transitions GLSL (later); overlay = pre-rendered plate. */
  kind: z.enum(["xfade", "gl", "overlay"]).default("xfade"),
  name: z.string().min(1), // e.g. "fade", "dissolve", "wipeleft", "circlecrop", or GLSL/library id
  durationSec: z.number().finite().min(0.1).max(3).default(0.5),
  easing: Easing.default("linear"),
  /** GLSL/library transitions only */
  libraryAssetId: z.string().optional(),
  uniforms: z.record(z.string(), z.number()).optional(),
});
export type SlateTransition = z.infer<typeof SlateTransitionSchema>;

// ── Per-clip effect stack (ordered = filter order) ────────────
export const SlateClipEffectSchema = z.object({
  id: z.string().min(1),
  type: z.enum([
    "denoise",
    "sharpen",
    "grain",
    "vignette",
    "glow",
    "halation",
    "light_leak",
    "atmosphere",
    "chromatic",
    "lut",
    "color",
    "stabilize",
  ]),
  enabled: z.boolean().default(true),
  strength: Pct.default(50),
  /** LUT/grain/leak overlays reference a Library asset (e.g. .cube file, grain plate). */
  libraryAssetId: z.string().optional(),
  params: z.record(z.string(), z.unknown()).optional(),
});
export type SlateClipEffect = z.infer<typeof SlateClipEffectSchema>;

// ── Speed ramp (variable speed) ───────────────────────────────
export const SlateSpeedRampSchema = z.object({
  enabled: z.boolean().default(false),
  /** Segment-based ramp: piecewise setpts in the worker. RIFE smoothing is a separate Enhance job. */
  keyframes: z
    .array(z.object({ timeSec: Sec, speed: z.number().finite().min(0.1).max(8), easing: Easing.default("smoothstep") }))
    .min(2)
    .max(16),
});
export type SlateSpeedRamp = z.infer<typeof SlateSpeedRampSchema>;

// ── Logo / image overlay (opacity, scale, position, fade, shadow) ──
export const SlateLogoLayerSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  storageKey: z.string().min(1), // PNG with alpha (SVG rasterized on ingest)
  position: z.enum(["top_left", "top_right", "bottom_left", "bottom_right", "center", "custom"]).default("bottom_right"),
  x: z.number().optional(), // % when custom
  y: z.number().optional(),
  widthPct: z.number().finite().min(1).max(100).default(20),
  opacity: z.number().finite().min(0).max(1).default(1),
  opacityKeyframes: z.array(z.object({ timeSec: Sec, opacity: z.number().min(0).max(1) })).max(64).optional(),
  fadeInSec: Sec.default(0),
  fadeOutSec: Sec.default(0),
  shadow: z.boolean().default(false),
  blendMode: z.enum(["normal", "screen", "multiply"]).default("normal"),
  timelineStartSec: Sec.default(0),
  timelineEndSec: Sec.optional(),
});
export type SlateLogoLayer = z.infer<typeof SlateLogoLayerSchema>;

// ── Captions (accessible, ASS/libass) ─────────────────────────
export const SlateCaptionStyleSchema = z.object({
  fontFamily: z.string().default("Inter"),
  fontSize: z.number().int().positive().default(22),
  textColor: z.string().default("#FFFFFF"),
  backgroundColor: z.string().default("#000000"),
  backgroundOpacity: z.number().finite().min(0).max(1).default(0.75), // ASS BorderStyle=3/4 box
  outlineColor: z.string().default("#000000"),
  outlineWidth: z.number().finite().min(0).max(6).default(2),
  shadow: z.boolean().default(false),
  position: z.enum(["bottom", "middle", "top"]).default("bottom"),
  maxCharsPerLine: z.number().int().positive().default(32),
  safeMarginPx: z.number().int().nonnegative().default(120),
});
export type SlateCaptionStyle = z.infer<typeof SlateCaptionStyleSchema>;

export const SlateCaptionTrackSchema = z.object({
  id: z.string().min(1),
  source: z.enum(["whisper", "upload", "manual"]).default("whisper"),
  language: z.string().default("en"),
  segments: z.array(z.object({ startSec: Sec, endSec: Sec, text: z.string() })).default([]),
  style: SlateCaptionStyleSchema.default({}),
  burnIn: z.boolean().default(true),
  sidecar: z.array(z.enum(["srt", "vtt"])).default(["vtt"]),
});
export type SlateCaptionTrack = z.infer<typeof SlateCaptionTrackSchema>;

// ── Aspect / export reframe ───────────────────────────────────
export const SlateAspectPresetSchema = z.enum([
  "master_16x9",
  "vertical_9x16",
  "square_1x1",
  "portrait_4x5",
  "review_720p",
  "custom",
]);
export type SlateAspectPreset = z.infer<typeof SlateAspectPresetSchema>;

export const SlateReframeSchema = z.object({
  preset: SlateAspectPresetSchema.default("master_16x9"),
  mode: z.enum(["fill", "fit", "manual", "smart_center"]).default("fill"),
});
export type SlateReframe = z.infer<typeof SlateReframeSchema>;

// ── Library asset (mirrors content_library_assets table) ──────
export const LibraryAssetSchema = z.object({
  id: z.string().min(1),
  orgId: z.string().min(1),
  assetType: z.enum(["transition", "music", "sfx", "title_template", "logo", "look", "preset", "lut", "grain", "font"]),
  name: z.string().min(1),
  storageKey: z.string().optional(),
  thumbnailKey: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  lookJson: z.record(z.string(), z.unknown()).optional(),
  license: z.string().optional(), // "org" | "CC0" | "CC-BY" | attribution string
});
export type LibraryAsset = z.infer<typeof LibraryAssetSchema>;
