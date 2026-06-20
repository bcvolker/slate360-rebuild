# Content Studio — Control Spec & Starter Library (Implementation Contract)

**Status**: Locked for build (2026-06-20) · **Design system**: Graphite Glass · **Scope**: CEO-only cloud editor (video / 360 / photo) for construction + social.

This is the actionable companion to `CONTENT_STUDIO_BUILD_PLAN.md`. It maps every user-visible control to a surface, mode, priority, OSS/asset source, implementation location, and build slice. Derived from an 8-platform cross-AI convergence (CapCut / Premiere / Resolve / FCP / Photoshop / Lightroom / Affinity / GIMP). ~165 controls total.

---

## 1. Surface & mode legend

**Surfaces** — TB Top Command Bar · PV-HUD Preview HUD · TT Timeline Toolbar · TL Timeline direct manipulation · INS Inspector tabs · LIB Media Bin (Project + Library) · CM Context menu · EXP Export dialog/drawer · MB Menu bar (deferred).

**Modes** (one shell; mode switch changes content, not chrome) — Regular (video) · 360 · Photo (batch filmstrip replaces timeline).

**Priority** — P0 ship v1 (slices 6–10) · P1 feels-complete (11–16) · P2 pro/defer.

---

## 2. Curated Starter Library (CC0 / OFL / MIT — ~150–250 MB)

Stored in `content_library_assets` with `license`, `sourceUrl`, `attribution` metadata (required even for CC0). One-time ingest script → R2 under `library/`. **No GPL in frontend. No bulk dumps.**

| Category | Count | Source (License) | Path | Gap closed |
|---|---|---|---|---|
| Transitions | ~50 metadata | FFmpeg `xfade` built-ins (LGPL, server-side) | `library/transitions/` (JSON only) | Add transition / cross dissolve / wipe / slide |
| Looks / LUTs | 16 `.cube` | three.js examples (MIT) + OpenShot freshluts (CC0) + Film-Luts (MIT) | `library/looks/` | Apply Look / Save as Look |
| SFX | ~50 WAV | Kenney Impact/Digital/Foley (CC0) | `library/sfx/` | Add SFX |
| Music beds | ~20 MP3 | FreePD (CC0) + Kenney music (CC0) | `library/music/` | Add music (store BPM/mood) |
| Fonts | 6 OFL | Inter / Orbitron / Roboto / Open Sans | `library/fonts/` | Title + caption typography |
| Title/caption templates | ~10 JSON+ASS | Custom | `lib/content-studio/templates/` | Title templates / caption styles |
| Caption styles | 6 presets | Custom → `SlateCaptionStyleSchema` | `library/caption-styles/` | a11y default = white on 75% black box |
| Grain / atmosphere | 5–8 plates | CC0 + FFmpeg `noise` | `library/overlays/` | P1 finishing |

---

## 3. Control → implementation map (by category)

> Columns: Control · Surface · Mode · Priority · OSS/Asset · Implementation location · Slice. ⭐ = one of the ~15 video / ~12 photo essentials.

### A. Project & workflow
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| ⭐ Import / add media | LIB, TB, drag-drop | All | P0 | — | `use-media-upload.ts` + Modal ingest | 6 |
| ⭐ Undo / redo | TB, kbd | All | P0 | `zundo` | `editor-store` temporal | 7 |
| Save / autosave | TB status | All | P0 | — | `content_edit_projects` debounced patch | 7 |
| Project settings (fps, canvas) | INS Export | All | P1 | — | spec `output` | 10 |
| Render status chip + queue | TB, EXP | All | P0 | — | `RenderQueueDrawer` + Trigger realtime | 9 |
| Before/after compare | PV-HUD | Photo | P0 | — | `PhotoCanvas` split | 19 |
| Batch filmstrip | bottom panel | Photo | P0 | — | `PhotoBatchStrip` | 19 |

### B. Clip operations (video / 360)
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| ⭐ Select / move clip | TL, TT | R/360 | P0 | `@xzdarcy/react-timeline-editor` (ref) | custom lane model | 6 |
| ⭐ Trim in/out (edge drag) | TL handles | R/360 | P0 | custom handles | `TimelineClip.trimIn/Out` + spec bridge | 7 |
| ⭐ Split / blade at playhead | TT, PV-HUD, CM, B/S | R/360 | P0 | — | `splitAtPlayhead` action | 7 |
| ⭐ Delete / ripple delete | TT, Del, CM | R/360 | P0 | — | `removeClip` (+ripple) | 6/7 |
| ⭐ Speed / duration (0.25–4×) | INS Clip | R/360 | P0 | FFmpeg `setpts`/`atempo` | `InspectorClipTab` → `SlateClip.speed` | 10 |
| ⭐ Detach / unlink audio | CM, INS Audio | R/360 | P0 | — | `detachAudio` + audio lane | 11 |
| Mute source audio | INS Audio, CM | R/360 | P0 | — | `muteSource` flag | 11 |
| Reverse clip | INS Clip, CM | R/360 | P1 | FFmpeg `reverse` | toggle | 10 |
| Speed ramp / curve | INS Clip (Adv) | R/360 | P1 | segmented `setpts` | `SlateSpeedRampSchema` | 12 |
| Duplicate / copy attrs | CM | R/360 | P1 | — | clipboard ops | 11 |
| Auto-reframe | INS Transform, TB | R | P1 | — | Modal job | 16 |

### C. Transitions
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| ⭐ Add transition at cut | TL boundary, LIB | R/360 | P0 | `xfade` metadata | boundary drop | 14 |
| Cross dissolve (default) | LIB, TL | R/360 | P0 | `xfade=fade` | default on cut | 7 |
| Wipe / slide / push | LIB | R/360 | P1 | `xfade=wipeleft…` | Starter Library (50) | 14 |
| Transition duration | INS, TL handle | R/360 | P0 | — | `InspectorTransitionTab` | 7 |
| Remove transition | CM, Del | R/360 | P0 | — | boundary CM | 7 |

### D. Effects / filters (level-disclosure: toggle + 0–100% strength)
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| Effect stack (ordered) | INS Enhance | All | P0 | — | `LevelDisclosureRow` list | 10 |
| Denoise | INS Enhance | All | P0 | FFmpeg `hqdn3d`/`nlmeans` | strength → worker | 16 |
| Sharpen | INS Enhance | All | P0 | FFmpeg `unsharp`/`cas` | same | 16 |
| Stabilize | INS Enhance | R/360 | P1 | FFmpeg `deshake`/vidstab | Enhance job | 16 |
| Vignette / grain / glow | INS Enhance | All | P1 | FFmpeg `vignette`/`noise` + plates | Starter plates | 16 |
| Blur / mosaic (redact) | INS Enhance | All | P1 | FFmpeg `boxblur`/`gblur` | privacy row | 16 |
| LUT / look as effect | INS Color + LIB | All | P1 | 16 `.cube` | `lut3d` | 14 |
| Reset effects | INS | All | P0 | — | reset per stack | 10 |

### E. Color (basic grade)
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| ⭐ Exposure / brightness | INS Color | All | P0 | — | `LevelDisclosureRow` → `SlateColor` | 10 |
| Contrast | INS Color | All | P0 | — | same | 10 |
| Saturation / vibrance | INS Color | All | P0 | — | same | 10 |
| Temperature / tint | INS Color | All | P0 | — | same | 10 |
| ⭐ Apply Look / preset | LIB Looks, INS | All | P0 | 16 `.cube` | dropdown / drag | 14 |
| Save as Look | INS Color | All | P1 | — | persist to library | 15 |
| Auto color / WB | INS Color, TB | All | P1 | — | one-click job | 16 |
| Before/after grade | INS Color, PV | All | P1 | — | split view | 10 |

### F. Titles / text / captions / brand
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| ⭐ Add text / title | TB, PV-HUD, LIB | All | P0 | 10 JSON+ASS | `addTitleLayer` | 13 |
| Title templates | LIB Titles | All | P0 | Starter 10 | same | 13 |
| Font / size / weight / color | INS Titles | All | P0 | 6 OFL fonts | `SlateTextLayer` | 13 |
| Stroke / shadow / box | INS Titles | All | P0 | — | → ASS | 13 |
| Alignment + safe-area | INS Titles, PV | All | P0 | — | PV-HUD toggle | 13 |
| Position drag in preview | PV handles | All | P0 | — | Canvas drag → spec | 13 |
| Text duration on timeline | TL Titles lane | All | P0 | — | titles lane | 13 |
| ⭐ Auto captions | TB | All | P0 | `faster-whisper` | job → editable track | 13 |
| Caption edit + timing | INS Captions, TL | All | P0 | — | caption lane | 13 |
| Caption style presets | INS Captions, LIB | All | P0 | 6 styles | library | 13 |
| Burn-in captions | EXP toggle | All | P0 | libass | worker flag | 9 |
| ⭐ Logo / watermark | TB, INS Logo, LIB | All | P0 | org brand | `SlateLogoLayer` | 13 |
| Logo size / pos / opacity | INS Logo | All | P0 | — | controls | 13 |

### G. Audio
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| ⭐ Per-clip volume / gain | INS Audio, TL | R/360 | P0 | `wavesurfer.js` Envelope | rubber-band | 11 |
| ⭐ Fade in / out | INS Audio, TL | R/360 | P0 | `wavesurfer.js` Regions | handles | 11 |
| Mute / solo track | TL header | R/360 | P0 | — | header | 11 |
| Waveform display | TL audio lanes | R/360 | P0 | `wavesurfer.js` | renderer | 11 |
| Detach audio → lane | CM | R/360 | P0 | — | new lane | 11 |
| Add music / SFX | LIB drag | R/360 | P1 | 20 music + 50 SFX | drag to lane | 14 |
| ⭐ Record voiceover | TB, INS VO | R/360 | P0 | `getUserMedia`/`MediaRecorder` | `VoiceoverPanel` | 12 |
| Duck music under VO | INS Audio | R/360 | P0 | — | sidechain toggle | 12 |
| Clean voice / NR | INS Audio | R/360 | P1 | FFmpeg `afftdn` | preset | 12 |

### H. Transform / reframe
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| ⭐ Crop / manual reframe | INS Transform, PV | All | P0 | `react-advanced-cropper` (photo) | Transform tab + PV | 9 |
| Fit / fill / stretch | INS Transform | All | P0 | — | presets | 10 |
| ⭐ Position X/Y | INS Transform, PV | All | P0 | — | numeric + drag | 9 |
| ⭐ Scale / zoom | INS Transform, PV | All | P0 | — | same | 9 |
| Opacity | INS Transform | All | P0 | — | `SlateLayer.opacity` | 9 |
| ⭐ Aspect presets (16:9/9:16/1:1/4:5) | TB, EXP, INS | All | P0 | — | mode-aware bar | 10 |
| Safe zone / grid | PV toggle | All | P0 | — | PV-HUD | 9 |

### I. Keyframing
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| Keyframe diamond | INS | All | P1 | — | per animatable field | 11 |
| Position/scale/opacity keys | INS, PV | All | P1 | — | keyframe lane | 11 |
| Volume keyframes | INS Audio, TL | R/360 | P1 | `wavesurfer.js` Envelope | same | 11 |
| Camera path keys | TL Camera-Path, PV | 360 | P0 | Three.js + PSV | 360 lane | 17 |
| Speed ramp keys | INS Clip | R/360 | P1 | — | 3–5 presets | 12 |

### J–K. Playback / transport + timeline nav
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| ⭐ Play / pause | PV-HUD, Space | All | P0 | — | `usePlayback` pool | 6 |
| ⭐ Playhead scrub | TL ruler, PV | All | P0 | — | master clock | 6 |
| Timecode + duration | PV-HUD | All | P0 | — | `formatTimecode` | 6 |
| ⭐ Timeline zoom + Fit | TT, wheel | All | P0 | `@xzdarcy` ref | zoom + Fit | 7 |
| ⭐ Snap toggle | TT | All | P0 | custom grid | magnet | 7 |
| Multi-track lanes | TL | R/360 | P0 | custom | `TimelinePanel` lanes | 7 |
| Markers | TT, M | All | P1 | — | `SlateMarker` | 11 |

### L. Export / share
| Control | Surface | Mode | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|---|
| ⭐ Export / render CTA | TB | All | P0 | — | `ExportDialog` | 9 |
| Aspect presets | EXP | All | P0 | — | Export tab | 10 |
| Resolution / quality / CRF | EXP | All | P0 | — | same | 10 |
| Burn captions / watermark | EXP | All | P0 | libass + PNG | worker flags | 9 |
| Branded export presets | EXP | All | P0 | — | saved rows | 10 |
| Preflight token estimate | EXP modal | All | P0 | — | `preflightEstimate` RPC | 9 |
| Progress + cancel + queue | EXP drawer | All | P0 | Trigger realtime | drawer | 9 |
| Download / share link | post-export | All | P0 | — | R2 signed + share token | 9 |

### M. Photo mode (batch)
| Control | Surface | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|
| ⭐ Crop + aspect presets | Photo toolbar, PV | P0 | `react-advanced-cropper` | crop mode | 19 |
| ⭐ Straighten / rotate / flip | Photo toolbar | P0 | Konva/Fabric | controls | 19 |
| ⭐ Exposure/contrast/sat/temp | INS Adjust | P0 | — | LevelDisclosure | 19 |
| ⭐ Sharpen + denoise | INS Detail | P0 | FFmpeg | same | 19 |
| Spot heal / clone / redact | Photo tools | P0–P1 | Konva brush | brushes | 19 |
| ⭐ Text / arrow / shape | Photo toolbar | P0 | Konva/Fabric | annotation toolbar | 19 |
| ⭐ Apply Look / brand | LIB Looks | P0 | 16 `.cube` | batch apply | 19 |
| ⭐ Before/after split | PV | P0 | — | split toggle | 19 |
| ⭐ Batch apply + export | Batch strip + EXP | P0 | — | multiselect + sync | 19 |

### N. 360 additions
| Control | Surface | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|
| Equirect sphere preview | PV | P0 | `@photo-sphere-viewer/core` | 360 mode | 17 |
| Camera path lane + keys | TL, PV | P0 | Three.js | 360 lane | 17 |
| Drag-to-look while scrubbing | PV | P0 | — | pointer lock + quaternion | 17 |
| Reframe / FOV | INS View | P0 | — | `SlateViewingRegion` | 17 |
| Export flattened MP4 | TB Export | P0 | FFmpeg `v360` + slerp | flatten job | 17 |

### O. Multicam (P1)
| Control | Surface | P | OSS/Asset | Impl | Slice |
|---|---|---|---|---|---|
| Sync & stack (audio xcorr) | TB / wizard | P1 | `scipy`/`audalign` | Modal pre-process | 18 |
| Program cuts | TL | P1 | — | multicam lane | 18 |

---

## 4. Locked placement summary

**Top Command Bar (≤7 visible)** — Import · Captions · Record VO · Logo · Enhance · Export · Undo/Redo + status chip + mode switch.

**Preview HUD (5/mode)** — Regular: Play · Split · Add Title · Record VO · Safe guides · 360: Play · Add Keyframe · Reframe · Stabilize · Safe guides · Photo: Enhance · Crop · Before/After · Apply Brand · Zoom.

**Timeline Toolbar** — Select · Split · Delete · Snap · Zoom −/+/Fit · Add Transition (cut selected) · Marker.

**Inspector tabs** — Regular: Clip · Transform · Color · Audio · Titles · Captions · Logo · Enhance · Export · 360 adds View/Camera Path · Photo: Adjust · Detail · Annotate · Layers · Looks · Export.

**Library categories** — Transitions · Music · SFX · Titles · Logos · Looks · Fonts · Caption Styles · Presets.

**Clip context menu (single CM, slice 7)** — Split · Trim to Playhead · Duplicate · Delete · Ripple delete · Detach audio · Mute source · Add transition in/out · Add title above · Apply look · Copy/paste effects · Replace media · Reveal in bin · Export clip.

---

## 5. Build sequence (slices → gaps)

- **6–7** trim, split, snap, undo (`zundo`), spec bridge, context menu, multi-track lanes, default crossfade.
- **8–9** preview overlays, transform/crop handles, first real export dialog + queue.
- **10** INS Clip/Transform/Export tabs, aspect presets, wired Color rows, LevelDisclosureRow.
- **11–12** audio lanes + `wavesurfer.js`, detach, duck, VO record, speed ramps.
- **13** titles, captions (Whisper), logo, brand kit, 10 title templates.
- **14–15** Library populated (50 transitions, 16 LUTs, 20 music, 50 SFX), Looks save/apply, drag-to-timeline.
- **16** Enhance jobs (denoise/sharpen/stabilize/upscale RIFE).
- **17–18** 360 camera path + sphere + flatten, multicam sync & stack.
- **19–21** Photo batch strip + crop/rotate/annotate/before-after, mobile stack, onboarding.

---

## 6. Non-negotiable rules

- Level-disclosure everywhere (toggle + 0–100% strength, collapsed by default; no knob soup).
- Progressive disclosure: Basic (P0) → Advanced accordion (curves, keyframes, numeric in/out).
- Library = reuse; TB only has "add" shortcuts.
- Preview ≠ final; status chip communicates proxy vs render state.
- **No GPL in frontend**: `wavesurfer.js` (BSD), `@xzdarcy/react-timeline-editor` (MIT), `konva`/`fabric`/`react-advanced-cropper` (MIT). FFmpeg + faster-whisper + RIFE run server-side on Modal only.
- Every Library asset row carries license + sourceUrl + attribution.
- Do NOT npm-install Etro/OpenShot/Shotcut/Editly into the Next.js app (GPL/commercial). Editly = render-logic reference for the Modal worker only. Remotion = commercial, avoid for core.
