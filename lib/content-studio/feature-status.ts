/**
 * Content Studio — living feature-status registry.
 *
 * Single source of truth for "what is actually wired vs stubbed vs missing",
 * reconciling work from parallel build streams. Update the `status` field as
 * each feature lands. Surfaced (read-only) in a CEO debug panel.
 *
 * status:
 *   live    — wired end-to-end and functional
 *   partial — UI exists but not fully wired to spec/worker, or not persisted
 *   stub    — visible element that only toasts / notes / placeholder
 *   missing — not present
 *
 * Audited 2026-06-21 against commit 22d0eba9 (slices 6–9 + 14A merged);
 * updated post-9B (spec bridge + real render worker live).
 */

export type FeatureState = "live" | "partial" | "stub" | "missing";

export type FeatureCategory =
  | "foundation" // persistence, spec bridge, render worker — load-bearing
  | "timeline"
  | "preview"
  | "inspector"
  | "transitions"
  | "effects"
  | "color"
  | "audio"
  | "titles"
  | "library"
  | "export"
  | "ingest"
  | "mode360"
  | "modePhoto"
  | "history";

export type Feature = {
  key: string;
  label: string;
  category: FeatureCategory;
  status: FeatureState;
  note: string;
};

export const FEATURES: Feature[] = [
  // ── Foundation (load-bearing — blocks every downstream feature) ──
  { key: "project.persistence", label: "Project autosave + reload", category: "foundation", status: "live", note: "Cat0d: /api/content-studio/projects (ensure-default GET + autosave PATCH) + useProjectPersistence (debounced save, hydrate with fresh proxy URLs)." },
  { key: "spec.bridge", label: "Build SlateContentEditSpec from editor", category: "foundation", status: "live", note: "9B: buildEditSpec() assembles + validates the spec in the render API." },
  { key: "spec.freeze", label: "Freeze spec snapshot to R2 at enqueue", category: "foundation", status: "live", note: "9B: render API writes Projects/{id}/spec-{hash}.json + sets spec_snapshot_key." },
  { key: "render.worker", label: "Real Modal FFmpeg render worker", category: "foundation", status: "live", note: "9B: render.py deployed (slate360-content-render); trim+speed+reverse→concat→R2. MODAL_CONTENT_ENDPOINT on. Prod e2e (authed) pending Brian's confirm." },

  // ── Timeline & clip editing ──
  { key: "clip.add", label: "Add / remove clips", category: "timeline", status: "live", note: "editor-store addClip/removeClip + drag-from-bin." },
  { key: "clip.trim", label: "Trim in/out (edge drag + numeric)", category: "timeline", status: "live", note: "setClipTrim, clamped to source." },
  { key: "clip.speed", label: "Speed / retime 0.25–4×", category: "timeline", status: "live", note: "setClipSpeed; layout + playbackRate honor it." },
  { key: "clip.reverse", label: "Reverse clip", category: "timeline", status: "live", note: "Toggle + REV badge on clip; render worker reverses (9B). Preview playback itself still plays forward." },
  { key: "clip.split", label: "Split at playhead (B)", category: "timeline", status: "live", note: "splitAtPlayhead interior cut." },
  { key: "clip.reorder", label: "Drag to move / reorder", category: "timeline", status: "live", note: "moveClipTo via pointer; one undo step." },
  { key: "clip.snap", label: "Snap toggle", category: "timeline", status: "partial", note: "Toggle state exists; magnetic snap not yet applied to drags." },
  { key: "clip.contextMenu", label: "Clip right-click context menu", category: "timeline", status: "live", note: "Cat1: ClipContextMenu (split/duplicate/reverse/delete); detach/transitions/look join as those land." },
  { key: "clip.duplicate", label: "Duplicate clip", category: "timeline", status: "live", note: "Cat1: duplicateClip inserts a copy after the source." },
  { key: "clip.replace", label: "Replace media", category: "timeline", status: "missing", note: "Pending. (Ripple delete = plain delete in the sequential model — no gap concept yet.)" },
  { key: "timeline.multilane", label: "Real multi-track lanes", category: "timeline", status: "live", note: "Audio + Titles overlay lanes hold free-positioned items (drag-to-place from Library, drag-to-move, select, delete); vertical scroll container. Render of overlays = Cat4/Cat5." },

  // ── Preview / playback ──
  { key: "preview.playback", label: "Double-buffered playback + scrub", category: "preview", status: "live", note: "use-playback seamless boundaries, timeupdate-driven." },
  { key: "preview.overlays", label: "Canvas overlays (titles/logo/crop)", category: "preview", status: "missing", note: "No compositor overlay layer yet." },

  // ── Inspector ──
  { key: "ins.clip", label: "Clip tab (speed/trim/reverse/split)", category: "inspector", status: "live", note: "Bound to selected clip." },
  { key: "ins.color", label: "Color tab grade sliders", category: "inspector", status: "live", note: "Cat2: bound sliders, all/clip scope, live CSS preview + temp overlay, serialized → worker eq/colorbalance." },
  { key: "ins.export", label: "Export tab / dialog", category: "inspector", status: "live", note: "Aspect/res/quality/preflight → enqueue." },
  { key: "ins.audio", label: "Audio tab", category: "inspector", status: "stub", note: "Note only." },
  { key: "ins.titles", label: "Titles tab", category: "inspector", status: "stub", note: "Note only." },
  { key: "ins.enhance", label: "Enhance tab", category: "inspector", status: "stub", note: "Sliders disconnected, no job wiring." },

  // ── Transitions ──
  { key: "transitions.catalog", label: "Transition catalog (24 xfade)", category: "transitions", status: "live", note: "starter-library/transitions.ts." },
  { key: "transitions.attach", label: "Attach to cut boundary", category: "transitions", status: "stub", note: "Click sets pendingTransition + toast; no timeline mutation, no spec field built." },

  // ── Effects ──
  { key: "effects.stack", label: "Per-clip effect stack", category: "effects", status: "missing", note: "SlateClipEffect schema exists; no catalog, no UI." },

  // ── Color ──
  { key: "color.look.apply", label: "Apply Look from Library", category: "color", status: "live", note: "Cat2: applyLibraryLook maps look→master grade for ALL clips, previews live + serializes." },
  { key: "color.look.save", label: "Save as Look", category: "color", status: "missing", note: "Not built." },

  // ── Audio ──
  { key: "audio.catalog", label: "Music + SFX catalog (24)", category: "audio", status: "live", note: "starter-library/audio.ts." },
  { key: "audio.lanes", label: "Audio lanes (volume/fade/detach)", category: "audio", status: "partial", note: "Audio lane + drag-to-place/move music/SFX items exists; volume/fades/detach + render mix = Cat4." },
  { key: "audio.voiceover", label: "Voiceover record-against-timeline", category: "audio", status: "missing", note: "Not built." },
  { key: "audio.duck", label: "Sidechain ducking", category: "audio", status: "missing", note: "Not built." },

  // ── Titles / captions / logo ──
  { key: "titles.catalog", label: "Title + caption-style catalog", category: "titles", status: "live", note: "starter-library title-templates + caption-styles." },
  { key: "titles.lane", label: "Title/caption lane + overlay", category: "titles", status: "partial", note: "Titles lane + drag-to-place/move title items exists; text editing + preview overlay + libass render = Cat5." },
  { key: "titles.captions", label: "Auto captions (Whisper)", category: "titles", status: "missing", note: "Not built." },
  { key: "titles.logo", label: "Logo / watermark overlay", category: "titles", status: "missing", note: "Schema only." },

  // ── Library ──
  { key: "library.catalog", label: "Library tab (8 categories, ~96 items)", category: "library", status: "live", note: "Catalog API + panel + counts." },
  { key: "library.drag", label: "Drag library items into the edit", category: "library", status: "live", note: "Looks apply to all; music/SFX → Audio lane, titles → Titles lane (placed at drop position). Transitions boundary-attach = Cat3." },

  // ── Export / render pipeline ──
  { key: "export.dialog", label: "Export dialog + preflight", category: "export", status: "live", note: "ExportDialog." },
  { key: "export.enqueue", label: "Enqueue + status + queue drawer", category: "export", status: "live", note: "render API + useRenderJobs + RenderQueueDrawer." },
  { key: "export.download", label: "Download finished render", category: "export", status: "live", note: "9B: real assembled multi-clip MP4 from render.py (was mock passthrough)." },

  // ── Ingest ──
  { key: "ingest.pipeline", label: "Upload → proxy → thumbnail → asset", category: "ingest", status: "live", note: "presign + Modal ingest.py + HMAC callback, end-to-end." },

  // ── Modes ──
  { key: "mode360", label: "360 mode (sphere, camera path, flatten)", category: "mode360", status: "stub", note: "Mode toggle + label only." },
  { key: "modePhoto", label: "Photo mode (batch, crop, annotate)", category: "modePhoto", status: "stub", note: "Mode toggle + label; images can be added as clips only." },

  // ── History ──
  { key: "history.undo", label: "Undo / redo (clips)", category: "history", status: "live", note: "zundo temporal, partialized to clips." },
];

export const STATUS_COUNTS = (): Record<FeatureState, number> =>
  FEATURES.reduce(
    (acc, f) => ({ ...acc, [f.status]: acc[f.status] + 1 }),
    { live: 0, partial: 0, stub: 0, missing: 0 } as Record<FeatureState, number>,
  );
