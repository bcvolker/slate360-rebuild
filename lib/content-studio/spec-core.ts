import { z } from "zod";

/**
 * SlateContentEditSpec — the CORE contract for Content Studio.
 *
 * This is the single source of truth shared by the React client (timeline edit
 * state) and the Modal render worker. Adapters translate it outward to FFmpeg;
 * the spec itself never references FFmpeg, Editly, or any third-party schema.
 *
 * PROGRESSIVE FREEZE: this file holds only the CORE (clips, basic layers, basic
 * audio, output, viewing region). Advanced modules — full audio domain, library,
 * color looks, enhancement, 360 cameraPath, multicam — attach later via the
 * `extensions` bucket (`.passthrough()`), then graduate into typed modules at
 * their own build slices. Bump `version` only on a breaking change.
 */

export const SLATE_CONTENT_SPEC_VERSION = 1 as const;

/** Seconds on the master timeline (always >= 0). */
const Sec = z.number().finite().min(0);
/** Normalized 0..1 (positions, opacity, crop rects). */
const Unit = z.number().finite().min(0).max(1);

/** Output framing applied after composition: crop + pan/zoom on the canvas. */
export const ViewingRegionSchema = z.object({
  x: Unit.default(0),
  y: Unit.default(0),
  width: Unit.default(1),
  height: Unit.default(1),
  zoom: z.number().finite().min(1).max(8).default(1),
  panX: z.number().finite().min(-1).max(1).default(0),
  panY: z.number().finite().min(-1).max(1).default(0),
});
export type ViewingRegion = z.infer<typeof ViewingRegionSchema>;

/** Opacity keyframe on the master timeline. */
export const OpacityKeyframeSchema = z.object({
  timeSec: Sec,
  opacity: Unit,
  easing: z.enum(["linear", "smoothstep"]).default("linear"),
});

/** A text or logo overlay attached to a clip. Full title templates (ASS) come later. */
export const SlateLayerSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["text", "image"]),
  timelineStartSec: Sec,
  timelineEndSec: Sec,
  zIndex: z.number().int().default(0),
  // text
  text: z.string().optional(),
  // image / logo
  storageKey: z.string().optional(),
  position: z
    .object({
      x: z.union([z.number(), z.literal("center")]).default("center"),
      y: z.union([z.number(), z.literal("center")]).default("center"),
    })
    .default({ x: "center", y: "center" }),
  scale: z.number().finite().min(0).max(8).default(1),
  opacity: Unit.default(1),
  opacityKeyframes: z.array(OpacityKeyframeSchema).max(64).optional(),
  style: z
    .object({
      fontSize: z.number().int().positive().optional(),
      color: z.string().optional(),
      fontFamily: z.string().optional(),
    })
    .optional(),
});
export type SlateLayer = z.infer<typeof SlateLayerSchema>;

/** A clip on the timeline. `mediaKind` covers flat video, still images, and 360 (typed cameraPath added later). */
export const SlateClipSchema = z.object({
  id: z.string().min(1),
  assetId: z.string().min(1),
  storageKey: z.string().min(1), // R2 key — authoritative (resolve to versioned object at enqueue)
  mediaKind: z.enum(["video", "image", "equirect_video"]),
  timelineStartSec: Sec,
  cutInSec: Sec.default(0),
  cutOutSec: Sec, // exclusive; must be > cutInSec (validated below)
  speed: z.number().finite().min(0.25).max(4).default(1),
  layer: z.number().int().min(0).default(0), // z-order among clips
  /** Embedded audio policy; full detached-audio domain arrives in the audio slice. */
  embeddedAudio: z.enum(["keep", "mute"]).default("keep"),
  layers: z.array(SlateLayerSchema).max(64).default([]),
  /** Per-clip output reframe (flat sources). */
  viewingRegion: ViewingRegionSchema.optional(),
});
export type SlateClip = z.infer<typeof SlateClipSchema>;

/** Basic audio track (the full first-class audio domain — automation, ducking — lands in the audio slice). */
export const SlateAudioTrackBasicSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["music", "voiceover", "source"]),
  storageKey: z.string().min(1),
  timelineStartSec: Sec.default(0),
  cutInSec: Sec.default(0),
  cutOutSec: Sec.optional(),
  gain: z.number().finite().min(0).max(2).default(1),
  fadeInSec: Sec.default(0),
  fadeOutSec: Sec.default(0),
});
export type SlateAudioTrackBasic = z.infer<typeof SlateAudioTrackBasicSchema>;

export const SlateOutputSchema = z.object({
  width: z.number().int().positive().default(1920),
  height: z.number().int().positive().default(1080),
  fps: z.number().int().positive().max(120).default(30),
  codec: z.literal("h264").default("h264"),
  crf: z.number().int().min(12).max(28).default(18),
  preset: z.enum(["veryfast", "fast", "medium", "slow"]).default("medium"),
  format: z.literal("mp4").default("mp4"),
  includeAudio: z.boolean().default(true),
});
export type SlateOutput = z.infer<typeof SlateOutputSchema>;

export const SlateContentEditSpecSchema = z
  .object({
    version: z.literal(SLATE_CONTENT_SPEC_VERSION),
    editProjectId: z.string().min(1),
    orgId: z.string().min(1),
    projectId: z.string().nullable().default(null),

    timeline: z.object({
      durationSec: Sec,
      clips: z.array(SlateClipSchema).max(64).default([]),
    }),

    audio: z
      .object({
        tracks: z.array(SlateAudioTrackBasicSchema).max(16).default([]),
        normalize: z.boolean().default(true),
      })
      .default({ tracks: [], normalize: true }),

    output: SlateOutputSchema.default({}),

    /**
     * Forward-compat bucket for not-yet-typed modules (audio domain, brandKit,
     * graphicsLayers, cameraPath, viewingRegion overrides, multicamGroups,
     * colorLooks). The render worker ignores unknown keys until a module graduates.
     */
    extensions: z.record(z.string(), z.unknown()).default({}),
  })
  .superRefine((spec, ctx) => {
    for (const clip of spec.timeline.clips) {
      if (clip.cutOutSec <= clip.cutInSec) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `clip ${clip.id}: cutOutSec must be > cutInSec`,
          path: ["timeline", "clips"],
        });
      }
    }
  });

export type SlateContentEditSpec = z.infer<typeof SlateContentEditSpecSchema>;

/** Build an empty, valid spec for a new edit project. */
export function emptyEditSpec(args: {
  editProjectId: string;
  orgId: string;
  projectId?: string | null;
}): SlateContentEditSpec {
  return SlateContentEditSpecSchema.parse({
    version: SLATE_CONTENT_SPEC_VERSION,
    editProjectId: args.editProjectId,
    orgId: args.orgId,
    projectId: args.projectId ?? null,
    timeline: { durationSec: 0, clips: [] },
    audio: { tracks: [], normalize: true },
    output: {},
    extensions: {},
  });
}
