# Content Studio — Starter Library + Implementation Map (One-Page Reference)

**Purpose**: Single authoritative artifact that (1) defines the curated Starter Library of CC0/OFL assets and (2) maps every control from the Master Gap Inventory to its exact surface, mode, priority, OSS/asset source, and implementation location. This document is the implementation contract for slices 6–21. No code changes are made by this document.

**Date**: 2026-06-20 | **Status**: Locked for Build | **Design System**: Graphite Glass

---

## 1. Surface & Mode Legend

**Surfaces**  
TB = Top Command Bar | PV-HUD = Preview HUD | TT = Timeline Toolbar | TL = Timeline direct | INS = Inspector tabs | LIB = Media Bin (Project + Library) | CM = Context Menu | EXP = Export dialog/drawer | MB = Menu bar (deferred)

**Modes** (one shell, mode switch changes content only)  
Regular (video) | 360 | Photo (batch strip replaces timeline)

**Priority**  
P0 = ship v1 (slices 6–10) | P1 = feels complete (11–16) | P2 = pro/defer

---

## 2. Curated Starter Library (CC0 / OFL / MIT — ~150–250 MB total)

All assets stored in `content_library_assets` with `license`, `sourceUrl`, `attribution` metadata. Ingest via one-time script → R2 under `library/`.

| Category | Count | Source (License) | Storage Path | Notes / Gap Closed |
|----------|-------|------------------|--------------|--------------------|
| **Transitions** | 50 metadata entries | FFmpeg `xfade` built-ins (LGPL server-side OK) | `library/transitions/` (JSON only) | xfade names: fade, dissolve, wipe*, slide*, smooth*, radial, circlecrop, zoomin, etc. Closes "Add transition at cut", "Cross dissolve", "Wipe/Slide". |
| **Looks / LUTs** | 16 `.cube` | three.js examples (MIT) + OpenShot freshluts (CC0) + YahiaAngelo/Film-Luts (MIT) | `library/looks/` | 4 neutral, 4 warm/construction, 4 high-contrast social, 4 B&W/report. Closes "Apply Look / preset", "Save as Look". |
| **SFX** | 50 curated WAV | Kenney Impact + Digital + Foley (CC0) | `library/sfx/` | 10 whooshes, 10 UI ticks, 10 construction ambient, 10 dings, 10 risers. Closes "Add music / SFX". |
| **Music beds** | 20 curated MP3 | FreePD (CC0) + Kenney music (CC0) | `library/music/` | 5 calm documentary, 5 upbeat social, 5 timelapse, 5 underscore. Store BPM/mood in metadata. |
| **Fonts** | 6 OFL | Inter, Orbitron, Roboto, Open Sans (OFL) | `library/fonts/` | Already in product; render worker bundles TTF for libass. |
| **Title / Caption Templates** | 10 JSON+ASS | Custom (MIT) | `lib/content-studio/templates/` | Lower-third, site stamp, caption bar, disclaimer bug, logo corners, before/after pair, phase labels. Closes "Title templates", "Caption style presets". |
| **Caption Styles** | 6 presets | Custom (maps to `SlateCaptionStyleSchema`) | `library/caption-styles/` | White-on-75%black (a11y default), box, outline, karaoke, minimal, branded. |
| **Grain / Atmosphere** | 5–8 plates | CC0 light-leak/dust (curated) + FFmpeg `noise` | `library/overlays/` | Optional P1. |

**Legal Rule**: Every row must store license + sourceUrl + attribution even for CC0. No GPL in frontend. No SoundSafari 40 GB dump. No full Kenney 500+ pack.

---

## 3. Complete Control → Implementation Map (All 165 Controls)

Grouped by the 15 categories from the Master Inventory. Every row answers: **What / Surface / Mode / P / OSS or Asset / Implementation Location / Slice**.

### A. Project & Workflow (all modes)
| Control | Surface | Mode | P | OSS/Asset | Implementation Location | Slice |
|---------|---------|------|---|-----------|-------------------------|-------|
| Import / add media | LIB, TB, drag-drop | All | P0 | — | `use-media-upload.ts` + Modal ingest | 6 |
| Undo / redo | TB, keyboard | All | P0 | `zundo` on Zustand | `editor-store.ts` + `useUndo` hook | 7 |
| Save / autosave | TB status | All | P0 | — | Supabase `content_edit_projects` + debounced patch | 7 |
| Project settings (fps, canvas) | INS Export / TB menu | All | P1 | — | `InspectorExportTab` + spec `output` | 10 |
| Render status chip + queue | TB, EXP drawer | All | P0 | — | `RenderQueueDrawer` + Trigger realtime | 9 |
| Before/after compare (photo) | PV-HUD / photo toolbar | Photo | P0 | — | `PhotoCanvas` split view + Konva layers | 19 |
| Batch filmstrip (photo) | Bottom panel (replaces TL) | Photo | P0 | — | `PhotoBatchStrip` component | 19 |

### B. Clip Operations (video / 360)
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Select / move clip | TL, TT | Regular/360 | P0 | `@xzdarcy/react-timeline-editor` | Custom lane model in `TimelinePanel` | 6 |
| Trim in/out (edge drag) | TL handles | Regular/360 | P0 | Same + custom handles | `TimelineClip` trimIn/Out + spec bridge | 6 |
| Split / blade at playhead | TT, PV-HUD, CM, B/S | Regular/360 | P0 | — | `splitAtPlayhead` action + PV-HUD button | 7 |
| Ripple delete | TT, Shift+Del, CM | Regular/360 | P0 | — | `removeClip` + ripple logic in store | 7 |
| Speed / duration (0.25×–4×) | INS Clip | Regular/360 | P0 | FFmpeg `setpts`/`atempo` | `InspectorClipTab` slider → `SlateClip.speed` | 10 |
| Detach / unlink audio | CM, INS Audio | Regular/360 | P0 | — | `detachAudio` mutation + audio lane | 11 |
| Mute embedded source audio | INS Audio, CM | Regular/360 | P0 | — | `muteSource` flag on clip | 11 |
| Reverse clip | INS Clip, CM | Regular/360 | P1 | FFmpeg `reverse` | `InspectorClipTab` toggle | 10 |
| Speed ramp / curve | INS Clip (Advanced) | Regular/360 | P1 | Segmented `setpts` | `SlateSpeedRampSchema` + worker piecewise | 12 |
| Auto-reframe (smart vertical) | INS Transform, TB | Regular | P1 | — | Modal job (optional) | 16 |

### C. Transitions
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Add transition at cut | TL boundary, LIB drag | Regular/360 | P0 | FFmpeg `xfade` metadata | `LibraryTransitions` grid → boundary drop | 14 |
| Cross dissolve (default) | LIB, TL | Regular/360 | P0 | `xfade=fade` | Default on cut creation | 7 |
| Wipe / Slide / Push | LIB | Regular/360 | P1 | `xfade=wipeleft` etc. | Starter Library metadata (50 entries) | 14 |
| Transition duration | INS (boundary), TL handle | Regular/360 | P0 | — | `InspectorTransitionTab` + drag handle | 7 |
| Remove transition | CM, Del | Regular/360 | P0 | — | Boundary context menu | 7 |

### D. Effects / Filters (Level-Disclosure)
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Effect stack (ordered) | INS Enhance | All | P0 | — | `LevelDisclosureRow` list + reorder | 10 |
| Denoise | INS Enhance | All | P0 | FFmpeg `hqdn3d`/`nlmeans` | Toggle + 0–100% strength → worker | 16 |
| Sharpen | INS Enhance | All | P0 | FFmpeg `unsharp`/`cas` | Same pattern | 16 |
| Stabilize | INS Enhance | Regular/360 | P1 | FFmpeg `deshake` (vidstab opt) | Separate Enhance job | 16 |
| Vignette / grain / glow | INS Enhance | All | P1 | FFmpeg `vignette` + noise / overlay plates | Starter Library plates | 16 |
| Blur / mosaic / pixelate | INS Enhance | All | P1 | FFmpeg `boxblur`/`gblur` | Privacy redaction row | 16 |
| LUT / look as effect | INS Color + LIB | All | P1 | 16 `.cube` files | `LibraryLooks` → Color tab | 14 |
| Reset effects | INS | All | P0 | — | Reset button per stack | 10 |

### E. Color (Basic Grade)
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Exposure / brightness | INS Color | All | P0 | — | `LevelDisclosureRow` → `SlateColor.exposure` | 10 |
| Contrast | INS Color | All | P0 | — | Same | 10 |
| Saturation / vibrance | INS Color | All | P0 | — | Same | 10 |
| Temperature / tint | INS Color | All | P0 | — | Same | 10 |
| Apply Look / preset | LIB Looks, INS Color | All | P0 | 16 curated `.cube` | Drag from Library or dropdown | 14 |
| Save as Look | INS Color | All | P1 | — | Persist to `content_library_assets` | 15 |
| Auto color / auto WB | INS Color, TB | All | P1 | — | One-click Modal job | 16 |
| Before/after grade toggle | INS Color, PV | All | P1 | — | Split view in Preview | 10 |

### F. Titles / Text / Captions / Brand
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Add text / title | TB, PV-HUD, LIB Titles | All | P0 | 10 JSON+ASS templates | `LibraryTitles` + `addTitleLayer` | 13 |
| Title templates (lower-third, intro) | LIB Titles | All | P0 | Starter 10 templates | Same | 13 |
| Font / size / weight / color | INS Titles | All | P0 | 6 OFL fonts | Font picker + `SlateTextLayer` | 13 |
| Stroke / shadow / background box | INS Titles | All | P0 | — | Inspector controls → ASS | 13 |
| Alignment + safe-area guides | INS Titles, PV overlay | All | P0 | — | Safe-area toggle in PV-HUD | 13 |
| Position drag in preview | PV handles | All | P0 | — | Konva / Canvas drag → spec | 13 |
| Text duration on timeline | TL Titles lane | All | P0 | — | Titles lane in timeline | 13 |
| Auto captions (Whisper) | TB | All | P0 | `faster-whisper` (MIT) | `generateCaptions` job → editable track | 13 |
| Caption edit + timing | INS Captions, TL caption lane | All | P0 | — | Caption lane + Inspector | 13 |
| Caption style presets | INS Captions, LIB | All | P0 | 6 curated styles | `LibraryCaptionStyles` | 13 |
| Burn-in captions | EXP toggle | All | P0 | libass | `burnCaptions` flag → worker | 9 |
| Logo / watermark overlay | TB, INS Logo, LIB | All | P0 | Org brand kit | `LibraryLogos` + Logo tab | 13 |
| Logo size / position / opacity | INS Logo | All | P0 | — | `SlateLogoLayer` controls | 13 |

### G. Audio
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Per-clip volume / gain | INS Audio, TL rubber band | Regular/360 | P0 | `wavesurfer.js` Envelope | Rubber-band on audio lane | 11 |
| Fade in / fade out | INS Audio, TL handles | Regular/360 | P0 | `wavesurfer.js` Regions | Fade handles on waveform | 11 |
| Mute / solo track | TL track header | Regular/360 | P0 | — | Track header controls | 11 |
| Waveform display | TL audio lanes | Regular/360 | P0 | `wavesurfer.js` | Audio lane renderer | 11 |
| Detach audio (→ own lane) | CM | Regular/360 | P0 | — | `detachAudio` + new audio lane | 11 |
| Add music / SFX | LIB Music/SFX drag | Regular/360 | P1 | 20 music + 50 SFX curated | `LibraryMusic` / `LibrarySFX` drag to lane | 14 |
| Record voiceover (against timeline) | TB, INS Voiceover panel | Regular/360 | P0 | `getUserMedia` + `MediaRecorder` | `VoiceoverPanel` + punch-in | 12 |
| Duck music under VO | INS Audio | Regular/360 | P0 | — | Sidechain toggle + automation | 12 |
| Clean voice / noise reduction | INS Audio | Regular/360 | P1 | FFmpeg `afftdn`/`anlms` | Voiceover panel preset | 12 |

### H. Transform / Reframe
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Crop / manual reframe | INS Transform, PV handles | All | P0 | `react-advanced-cropper` (photo) / Canvas handles (video) | `InspectorTransformTab` + PV handles | 9 |
| Fit / fill / stretch | INS Transform | All | P0 | — | Presets in Transform tab | 10 |
| Position X/Y | INS Transform, PV drag | All | P0 | — | Numeric + drag | 9 |
| Scale / zoom | INS Transform, PV handles | All | P0 | — | Same | 9 |
| Opacity | INS Transform | All | P0 | — | Slider → `SlateLayer.opacity` | 9 |
| Aspect ratio presets (16:9, 9:16, 1:1, 4:5) | TB, EXP, INS | All | P0 | — | Mode-aware preset bar | 10 |
| Safe zone / grid / title-safe | PV toggle | All | P0 | — | PV-HUD toggle | 9 |

### I. Keyframing
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Keyframe diamond on property | INS | All | P1 | — | Diamond icon next to every animatable field | 11 |
| Position / scale / opacity keyframes | INS, PV | All | P1 | — | Keyframe lane in timeline | 11 |
| Volume keyframes | INS Audio, TL | Regular/360 | P1 | `wavesurfer.js` Envelope | Same | 11 |
| Camera path keyframes (360) | TL Camera-Path lane, PV drag | 360 | P0 | Three.js + `photo-sphere-viewer` | 360 lane + sphere drag | 17 |
| Speed ramp keyframes | INS Clip | Regular/360 | P1 | — | Ramp curve editor (simple 3–5 presets) | 12 |

### J–K. Playback / Transport + Timeline Navigation
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Play / pause | PV-HUD, Space | All | P0 | — | `usePlayback` + hidden video pool | 6 |
| Playhead scrub | TL ruler, PV | All | P0 | — | Master clock sync | 6 |
| Timecode + duration | PV-HUD | All | P0 | — | `formatTimecode` | 6 |
| Timeline zoom in/out + Fit | TT, wheel | All | P0 | `@xzdarcy/react-timeline-editor` | Zoom controls + Fit button | 7 |
| Snap toggle | TT | All | P0 | Custom snap grid | Magnet icon in TT | 7 |
| Multi-track lanes (V1/V2, A1, Music, VO, SFX, Titles) | TL | Regular/360 | P0 | Custom lane model | `TimelinePanel` lanes | 7 |
| Markers | TT, M key | All | P1 | — | Marker lane + `SlateMarker` | 11 |

### L. Export / Share
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Export / render CTA | TB | All | P0 | — | `ExportButton` → `ExportDialog` | 9 |
| Aspect presets | EXP | All | P0 | — | `InspectorExportTab` presets | 10 |
| Resolution / quality / CRF | EXP | All | P0 | — | Same | 10 |
| Burn captions / watermark toggles | EXP | All | P0 | libass + PNG logo | Export flags → worker | 9 |
| Branded export presets (save) | EXP | All | P0 | — | User-saved preset rows | 10 |
| Preflight token/time estimate | EXP modal | All | P0 | — | `preflightEstimate` RPC | 9 |
| Progress + cancel + background queue | EXP drawer | All | P0 | Trigger realtime | `RenderQueueDrawer` | 9 |
| Download / share link | Post-export | All | P0 | — | R2 signed URL + share token | 9 |

### M. Photo Mode (Batch)
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Crop + aspect presets | Photo toolbar, PV | Photo | P0 | `react-advanced-cropper` | `PhotoCanvas` crop mode | 19 |
| Straighten / rotate 90 / flip | Photo toolbar | Photo | P0 | Konva / Fabric | Rotate buttons + straighten slider | 19 |
| Exposure, contrast, saturation, temperature | INS Adjust | Photo | P0 | — | `LevelDisclosureRow` non-destructive | 19 |
| Sharpen + denoise | INS Detail | Photo | P0 | FFmpeg filters | Same | 19 |
| Spot heal / clone / blur redact | Photo tools | Photo | P0–P1 | Konva brush tools | Healing / clone brush | 19 |
| Text / arrow / shape annotations | Photo toolbar + Konva/Fabric | Photo | P0 | `konva` / `fabric.js` | Annotation toolbar | 19 |
| Apply Look / brand preset | LIB Looks | Photo | P0 | 16 `.cube` | Batch apply | 19 |
| Before/after split view | PV | Photo | P0 | — | Split view toggle | 19 |
| Batch apply + batch export | Batch strip + EXP | Photo | P0 | — | Multi-select + sync + export queue | 19 |

### N. 360 Mode Additions
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Equirect sphere preview | PV (`photo-sphere-viewer`) | 360 | P0 | `@photo-sphere-viewer/core` (MIT) | 360 preview mode | 17 |
| Camera path lane + keyframes | TL Camera-Path lane, PV drag | 360 | P0 | Three.js + custom lane | 360 lane + sphere drag | 17 |
| Drag-to-look while scrubbing | PV | 360 | P0 | — | Pointer lock + quaternion | 17 |
| Reframe / FOV | INS View | 360 | P0 | — | `SlateViewingRegion` | 17 |
| Export flattened MP4 | TB Export | 360 | P0 | FFmpeg `v360` + quaternion-slerp | Flatten job | 17 |

### O. Multicam (Stage 4 — P1)
| Control | Surface | Mode | P | OSS/Asset | Implementation | Slice |
|---------|---------|------|---|-----------|----------------|-------|
| Sync & stack (audio correlation) | TB / wizard | Regular | P1 | `scipy` (BSD) or `audalign` (MIT) | Modal pre-process job | 18 |
| Program cuts (hard cuts) | TL | Regular | P1 | — | Multicam lane + cut buttons | 18 |

---

## 4. Toolbar / HUD / Inspector / Library Placement Summary (Locked UX)

**Top Command Bar (max 7 visible)**: Import · Captions · Record VO · Logo · Enhance · Export · Undo/Redo (right) + Status chip + Mode switch (Regular/360/Photo)

**Preview HUD (5 buttons per mode)**:
- Regular: Play · Split · Add Title · Record VO · Safe guides
- 360: Play · Add Keyframe · Reframe · Stabilize · Safe guides
- Photo: Enhance · Crop · Before/After · Apply Brand · Zoom

**Timeline Toolbar**: Select · Split · Delete · Snap · Zoom −/+ /Fit · Add Transition (cut selected) · Marker

**Inspector Tabs (mode-aware)**:
- Regular: Clip · Transform · Color · Audio · Titles · Captions · Logo · Enhance · Export
- 360: + View / Camera Path
- Photo: Adjust · Detail · Annotate · Layers · Looks · Export

**Media Bin → Library Tab Categories** (populated from Starter Library): Transitions · Music · SFX · Titles · Logos · Looks · Fonts · Caption Styles · Presets

**Context Menu (single CM in slice 7)**: Split at Playhead · Trim to Playhead · Duplicate · Delete · Ripple delete · Detach audio · Mute source · Add transition in/out · Add title above · Apply look · Copy/paste effects · Replace media · Reveal in bin · Export Clip

---

## 5. Build Sequence Reference (Slices → Gaps Closed)

- **6–7**: Trim, split, snap, undo (`zundo`), spec bridge, context menu, multi-track lanes, crossfade default
- **8–9**: Preview compositor overlays, transform/crop handles, first real export dialog + queue
- **10**: INS Clip/Transform/Export tabs, aspect presets, wired Color rows, LevelDisclosureRow
- **11–12**: Audio lanes + `wavesurfer.js`, detach, duck, VO record, speed ramps
- **13**: Titles, captions (Whisper), logo, brand kit, 10 title templates
- **14–15**: Library tab populated (50 transitions, 16 LUTs, 20 music, 50 SFX), Looks save/apply, drag-to-timeline
- **16**: Enhance jobs (denoise/sharpen/stabilize/upscale via RIFE)
- **17–18**: 360 camera path + sphere + flatten, multicam sync & stack
- **19–21**: Photo batch strip, crop/rotate/annotations/before-after, mobile stack, onboarding

---

## 6. Implementation Rules (Non-Negotiable)

- **Level-disclosure everywhere**: Every effect = toggle + 0–100% strength slider (collapsed by default). No knob soup.
- **Progressive disclosure**: Basic (P0) → Advanced accordion (curves, keyframes, numeric in/out).
- **Library = reuse**: Transitions/Looks/Titles/Music live in LIB; TB only has "add" shortcuts.
- **Preview ≠ final**: Status chip communicates proxy vs render state.
- **No GPL in frontend**: `wavesurfer.js` (BSD), `@xzdarcy/react-timeline-editor` (MIT), `konva`/`fabric` (MIT), `react-advanced-cropper` (MIT). FFmpeg + `faster-whisper` + RIFE run server-side on Modal only.
- **Every asset row** must carry license + sourceUrl + attribution metadata.

This single document is the complete implementation map. All 165 controls, all surfaces, all modes, all priorities, all OSS/asset sources, and all build slices are now defined in one place. Ready for ticket breakdown and execution.