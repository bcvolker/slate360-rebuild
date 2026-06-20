/**
 * Content Studio canonical contracts — barrel.
 *
 * Import from here (`@/lib/content-studio/contracts`) so call sites get a single,
 * stable surface as the spec grows. CORE only for now; advanced modules (audio
 * domain, library/looks, enhancement, 360, multicam) re-export here as they freeze.
 */

export {
  SLATE_CONTENT_SPEC_VERSION,
  SlateContentEditSpecSchema,
  SlateClipSchema,
  SlateLayerSchema,
  SlateAudioTrackBasicSchema,
  SlateOutputSchema,
  ViewingRegionSchema,
  OpacityKeyframeSchema,
  emptyEditSpec,
} from "./spec-core";
export type {
  SlateContentEditSpec,
  SlateClip,
  SlateLayer,
  SlateAudioTrackBasic,
  SlateOutput,
  ViewingRegion,
} from "./spec-core";

export {
  RENDER_JOB_REQUEST_VERSION,
  RENDER_CALLBACK_VERSION,
  ContentJobTypeSchema,
  RenderJobStatusSchema,
  RenderJobRequestSchema,
  RenderCallbackSchema,
  SpecRefSchema,
  PreflightSchema,
} from "./render-job";
export type {
  ContentJobType,
  RenderJobStatus,
  RenderJobRequest,
  RenderCallback,
  SpecRef,
  Preflight,
} from "./render-job";

export { canonicalJson, hashEditSpec } from "./spec-hash";
