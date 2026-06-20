# Content Studio — Build Plan (LOCKED)
> Authoritative build plan for Slate360 **Content Studio**: a cloud-rendered (and
> optionally fully-local/offline) video + 360 + photo editor. Synthesized across
> many cross-AI research rounds. This document captures **locked decisions** so the
> plan survives context resets. Status as of 2026-06-20.
---
## 0. What this is
An internal power tool (CEO-only for now) for editing **regular video, 360 video,
and photos (single + batch)**, producing branded deliverables with **titles, music,
voiceovers, captions, multicam, and AI enhancement**. Architecture is **cloud-first**
(thin client → Trigger.dev → Modal Python workers → R2/SlateDrop), but deliberately
designed so the render engine is **pluggable** (a future offline desktop build can run
everything locally on a GPU with zero rework to the UI or data model).
Goal: rival server-side editors (Shotstack/Creatomate/Editframe class) and, for our
construction/360 use case, exceed them — while staying **easy, intuitive, and
preset-driven**. The one honest trade vs CapCut/Premiere: preview is **proxy-approximate**;
final render is cloud/GPU-authoritative.
---
## 1. Architecture principles (LOCKED)
1. **Cloud-first, thin client.** Heavy work (render, 360 flatten, enhance, stabilize,
   multicam sync) runs server-side on Modal. The client holds JSON state + proxy preview.
2. **Canonical spec is the contract.** `SlateContentEditSpec` (+ enhancement/multicam
   specs) is owned by Slate360. Adapters translate outward to FFmpeg/etc. **Never couple
   the DB or UI to Editly/VideoFlow/any third-party schema.**
3. **Pluggable render engine.** Keep a clean engine interface so a `CloudEngine` (Modal)
   and a future `LocalEngine` (offline desktop GPU) consume the *same* spec. This makes
   the offline/air-gapped desktop build a backend swap, not a rewrite.
4. **SlateDrop is the source of truth** for assets and outputs.
5. **Determinism.** Content-hash the spec; freeze a snapshot at enqueue; same spec +
   same source versions + same worker image ⇒ byte-stable output.
6. **Files < 300 lines.** Decompose timeline/inspector/panels aggressively.
7. **Preset-driven simplicity.** Surface presets/toggles in the UI; keep raw params in
   the spec behind the **level-disclosure pattern** (§9). No knob-soup.
8. **Python workers** for consistency with thermal/twin/design workers.
9. **Atomic State Management.** Use Zustand (or similar) for transient editor state (playhead, selection, spec mutations) to prevent prop-drilling across dockview panels and easily satisfy the <300 LOC rule.
---
## 2. Locked technology decisions
| Area | Decision |
|---|---|
| Dockable workspace | **dockview** (MIT) themed to Graphite Glass; flexlayout fallback only |
| Timeline UI | `react-timeline-editor` (MIT) + `wavesurfer.js` audio lanes |
| State Management | **Zustand** for cross-panel transient state (playhead, spec, selection) |
| Preview compositor | **Hybrid:** pooled hidden `<video>` (proxies) → Canvas2D/WebGL compositor → Web Audio graph → Three.js for 360 → one master sync clock |
| Render spec → engine | Python `ffmpeg-python` filtergraph builder from `SlateContentEditSpec` (port Editly *logic*, never embed Node) |
| 360 flatten | **FFmpeg `v360` driven by Python-precomputed quaternion-slerp keyframes** (sendcmd/segmented). OpenCV per-frame only as golden-frame validator. |
| Titles/text | **ASS/libass** for all text + captions; **PNG overlay** for logos. Reject `drawtext` as title engine. |
| Captions | Whisper (existing path) → timed caption layer → burn-in (ASS) or sidecar VTT/SRT |
| Stabilization | FFmpeg `deshake` default; `vidstab` two-pass opt-in (GPL — isolated worker). **Defer true IMU stabilization.** |
| Gyro/IMU | Probe only via `telemetry-parser` (MIT/Apache); store sidecar; **never import Gyroflow (GPL)** |
| AI enhancement | Separate `SlateEnhancementSpec`, separate job table, GPU worker. Produces a **new derivative asset**, never mutates source or the timeline. |
| Multicam sync | **Audio waveform cross-correlation** (scipy BSD, ~60 LOC; `audalign` MIT optional). Pre-process Modal job. "Sync & Stack" UX. |
| Voiceover/webcam | Browser `getUserMedia` + `MediaRecorder`; record-against-timeline; server-side cleanup chain |
| Cost control | Preflight scoring + hard caps + proxy ladder; realtime job status (Design Studio pattern) |
| Design language | **Graphite Glass** (Design Studio sibling). **No pills, no chips, no amber, no glow, no rounded-full.** |
| Control pattern | **Level-disclosure:** every effect = toggle, with a 0–100% strength slider revealed on demand, collapsed by default. |
---
## 3. Canonical contracts (freeze first)
Live under `lib/content-studio/` as Zod schemas. Bump `version` only on breaking change.
- **`SlateContentEditSpec`** — timeline (clips, trims, speed, transitions), video clips,
  **audio domain** (independent lanes, detach, gain automation keyframes, fades,
  crossfades, sidechain ducking), **graphics layers** (titles/captions/logo via ASS),
  **brand kit**, **cameraPath** (360 keyframes), **viewingRegion** (crop/pan/zoom),
  **multicamGroups**, output settings, content hash, `extensions` bucket.
- **`SlateEnhancementSpec`** — ordered ops (denoise/sharpen/color/stabilize/fps_normalize/
  realesrgan/realbasicvsr/rife/gfpgan), per-op strength, limits block. Orthogonal to timeline.
- **`MulticamGroup`** — angles (assetKey, syncOffsetSec, confidence, method),
  programCuts (hard cuts v1), programAudioAngleId.
- **`RenderJobRequest` / `RenderCallback`** — job_type, specRef + contentHash, idempotency
  key, preflight estimate, progress, outputs, actual cost, error.
Determinism: sort clips/tracks by id before hashing; resolve `storageKey` to versioned
objects; fixed encoder settings; no `Date.now()`/random in filtergraphs.
---
## 4. Subsystems
### 4.1 Workspace (dockview)
Panels: MediaBin, Preview, Inspector, Timeline, CameraPath (360), plus Enhance/Titles/
Voiceover surfaces. Each panel its own component (<300 LOC); dock host only registers +
wires. Layout serialized to `content_edit_projects.ui_state_json.layout`; per-project,
debounced autosave, restore on open, reset-to-default. Mobile/tablet (<1024px): drop
dockview → stacked non-draggable layout.
### 4.2 Preview compositor
Master clock (audio-clock during play, manual during scrub). **Use Web Audio API `AudioContext.currentTime` as the absolute master clock** to prevent browser media drift. Hidden `<video>` pool (≤3)
on proxies slaved to master clock → Canvas2D/WebGL draw (opacity keyframes, transitions, crop) via `requestVideoFrameCallback` for frame accuracy. Text/logo via
canvas/DOM overlay (preview-approx). 360 via Three.js equirect sphere driven by the same
camera-path keyframes the worker uses. Web Audio graph mirrors the FFmpeg mix
(gain automation, approximate ducking). Documented preview≠final divergences; "Render
Preview Range" job for the unpreviewable (AI enhance, exact ASS, stabilization, loudnorm).
### 4.3 Render worker (regular video)
Concat/trim/speed with **mandatory `setpts=PTS-STARTPTS` / `asetpts=PTS-STARTPTS`** after
every trim/speed. Text/logo overlay, audio mix. Output to SlateDrop `Renders/`. **Always log the raw FFmpeg command string** to Modal logs for easier filtergraph debugging.
### 4.4 360 flatten
Python quaternion-slerp interpolation of `{time,yaw,pitch,roll,fov}` → dense per-frame
table → FFmpeg `v360` (sendcmd/segmented). Flatten **before** any stabilize; never
`vidstab` on raw equirect. Output flattened MP4 + sidecar JSON.
### 4.5 Audio (first-class domain)
Detach audio from a video clip → independent lane (video clip mutes embedded). Trim,
offset, gain, fades, **volume automation keyframes**, **crossfades**, **sidechain
ducking** (music auto-ducks under voiceover). Engineering rules: 48kHz stereo `aformat`
on every branch before `amix`; `amix normalize=0`; mono sidechain split for
`sidechaincompress`. wavesurfer per-lane + SVG automation overlay + duck-zone viz.
### 4.6 Multicam
Pre-process Modal job: audio cross-correlation → offsets + confidence per angle. **Optimization:** Ingest worker (Slice 4) extracts a tiny low-bitrate mono audio proxy. The sync worker downloads only these tiny files, making cross-correlation lightning fast and cheap.
"Sync & Stack" — place synced angles on stacked tracks; razor what you don't want.
Program cuts (hard cuts v1) render via segment-trim + concat (normalize res/fps per
segment). Defer: live 4-up angle grid (browser can't decode 4×4K), xfade, visual sync,
timecode. Cap 2–4 angles v1.
### 4.7 AI enhancement (Enhance Jobs)
Separate GPU worker, models baked into Modal image (T4 for ESRGAN/GFPGAN, A10G for
RIFE/VSR). Ship first: CPU FFmpeg ops (denoise/sharpen/color/stabilize/fps) → Real-ESRGAN
(photo + short clip) → RIFE (slow-mo/fps). Defer: RealBasicVSR (benchmark), GFPGAN
(commercial-license review). Preset buttons: "Site Photo Enhance", "Drone Clip Cleanup",
"Low Light Fix". Hard caps + credit/GPU-cost preflight before enqueue.
### 4.8 Titles / brand kit / captions / export
ASS templates: lower-third, full-screen title, caption bar, disclaimer bug, logo bug.
Animations: fade/slide (ship), typewriter/karaoke (defer). Brand kit resolved from org
settings (logo, colors, fonts, disclaimer), snapshotted into render for determinism.
Whisper → editable caption layer → burn-in or sidecar. Export presets: 16:9 master/YouTube,
9:16 vertical, 1:1; vertical reframe reuses 360/viewingRegion crop math. Render order:
video composite → viewingRegion crop/scale → ASS burn → logo overlay → export
scale/pad/crop → upload + callback.
### 4.9 Voiceover + webcam recording
Browser `getUserMedia` + `MediaRecorder` — no native app. Mic VO + webcam/PiP.
**Record-against-timeline:** playback (music ducked) while narrating to playhead; take
lands on narration lane aligned to clock; punch-in re-record. Live monitoring (Web Audio
high-pass + light compression). Server cleanup chain: high-pass → noise reduction
(`afftdn`/`arnndn`, or RNNoise/DeepFilterNet for jobsite noise) → de-ess → compressor →
`loudnorm`. Optional later: AI TTS voiceover (ElevenLabs/Piper).
---
## 5. Cost & preflight
Scoring `f(duration, out_resolution, fps, effect_count, is360)`; hard caps reject
oversized jobs **before enqueue**; proxy ladder (thumb/scrub-480p/preview-720p/source).
Realtime cost+progress like Design Studio (`design_generation_jobs` + realtime hooks).
Typical render $0.01–0.25; 60s 360 flatten ~$0.10–0.50. AI enhance is the expensive tier —
metered separately, opt-in. **(Cost layer becomes moot in offline/local mode.)**
---
## 6. Level-disclosure control pattern (LOCKED)
Every effect/enhancement is a **toggle** (one click, sensible default strength). When on,
a disclosure reveals **one Strength slider (0–100%), collapsed by default** — dial back if
too strong. Maps directly to the `strength`/`scale`/`amount` fields already in the specs;
on the worker, strength scales FFmpeg filter params. Default = one click; power = one
expand away. This is the standard control idiom across the whole Content Studio.
---
## 7. Design constraints (LOCKED)
Graphite Glass — sibling of Design Studio (center viewport, dual sidebars, bottom
timeline), but dockable/customizable. **No pills, no chips, no amber, no glow, no
rounded-full.** Per-app accent (Design-Studio blue for this CEO tool). Single-screen,
no full-page scroll inside the editor. See `[[slate360-design-system]]`.
---
## 8. Build order (DEPRECATED — canonical order is §A.2; this kept for the CEO-gate note only)
1. Freeze contracts (`SlateContentEditSpec` + enhancement + multicam + audio) as Zod.
2. Migrations + SlateDrop taxonomy (`content_edit_projects`, `content_render_jobs`,
   `content_enhancement_jobs`, multicam) + `Content Studio/{Raw,Proxies,Projects,Renders,Assets}`.
3. Ingest worker — ffprobe + short-GOP proxy ladder + thumbnail sprite + audio extract.
4. `content-studio.render` in **mock mode** (prove job→callback→SlateDrop loop, zero compute).
5. Render worker — regular video (concat/trim/text/overlay/audio mix, PTS rules).
6. Dockview shell + timeline + preview compositor (+ master clock).
7. Audio (detach + 2-lane + preset duck) → Multicam (sync + Sync&Stack) → 360 flatten →
   Enhance jobs → Titles/export → Voiceover/recording.
CEO-gate via `isSlateCeo` layout (Thermal Studio pattern); `ceoOnly` nav entry.
---
## 9. Offline / local desktop option (future, possible)
Because the spec is the contract, an **offline air-gapped desktop app** is a backend swap:
Tauri/Electron shell wraps the same web UI; a **bundled Python sidecar** runs FFmpeg +
OpenCV + PyTorch (CUDA) locally; **local SQLite job queue** replaces Trigger.dev; **local
folders** replace R2; **local IPC** replaces HMAC callback. Bundle FFmpeg + Python +
**all model weights** + fonts at install → runs fully offline forever. Requires NVIDIA +
CUDA (RTX-class). Faster + free on strong hardware; tied to one machine. Keep the render
engine behind a clean interface so cloud + local share one codebase.
---
### 4.10 Reusable Asset Library (LOCKED)
A persistent **Library** tab in the Media Bin, separate from per-project media, stored
**org-level** in SlateDrop (`Content Studio/Library/`). Import-once / save / reuse across
**all** projects: transitions, sound effects, music beds, title templates, logos/brand
kits, and saved presets. "Save to Library" is a one-action affordance from any asset or
effect; reuse = drag-from-Library. Spec: `LibraryAsset` references (not embedded copies).
This is the user's growing toolkit — the thing that makes it feel like a real studio.
### 4.11 Color correction + savable Looks (LOCKED, promoted to first-class)
Simple grade controls via the **level-disclosure pattern** (exposure, contrast,
saturation, temperature/tint, basic lift/gamma/gain). The entire grade is **savable as a
named "Look"** (the user's own preset/LUT), stored in the Library. Apply a Look to **one
clip, all clips, or a whole project**, and **"Match" a Look across footage from different
cameras** (drone + 360 flatten + phone) for one consistent cinematic feel that carries
**between videos**. Spec: a `ColorLook` object (color params + optional baked LUT) that
attaches to clips and serializes into the Library. Worker applies via FFmpeg
`lut3d`/`eq`/`curves`. Promoted from "minor/folded into enhancement" to its own system.
---
## A. UI design (LOCKED — synthesized across 8 platforms)
**Shell:** one dockview workspace, sibling of Design Studio — Top Bar, Media Bin (left,
~240px), **Preview (center, protected)**, Inspector (right, ~280px), **Timeline (bottom,
protected, resizable)**. Single-screen, no page scroll. Graphite Glass tokens; accent
`--twin360-blue` (#3D8EFF); Orbitron section headers; **no pills/chips/rounded-full/amber/
glow**.
**Three modes (one shell):** Regular / 360 / Photo switch lanes + Preview behavior +
Inspector tabs, not geometry. 360 adds a Camera-Path lane + equirect sphere Preview +
drag-to-look keyframing. Photo replaces the timeline with a Batch Strip + before/after
split.
**Magnetic timeline:** FCP-style snap (1px blue flash at snap targets), CapCut prominence.
Lanes: Titles / Video(/V2 multicam) / Camera-Path(360) / Audio / Music / VO / SFX. Audio
**detach** → linked audio lane with muted-source icon. **Ducking** shown as hatched blue
band under VO regions. Square keyframe diamonds (selected = blue outline).
**Level-disclosure rows:** square toggle (ON = blue left-bar + fill); when ON, one 0–100%
strength slider revealed on demand (collapsed by default). Used in Inspector effects,
Enhance stack, Color, Audio advanced. No knob-soup; raw FFmpeg params under "Advanced".
**Customization:** drag/dock/tab/resize/float; toggle via Layout/View menu; **Preview +
Timeline cannot close** (locked in dockview); layout autosaves to
`ui_state_json.layout` per project (debounced); one-click **Reset Layout**; named layout
presets (Default / Focus Preview / Audio Mix). Coach mark on first customization.
**Async render:** non-blocking. Top-bar status chip (proxy generating → ready → queued →
rendering % → done / failed / **stale-since-edit**) + slide-in **Render Queue drawer**
(progress, est. cost/time, download/copy-link, keep-editing). "PREVIEW APPROX" watermark
only when preview≠final. Re-render creates a new job; prior render never auto-deleted.
**Voiceover:** Inspector tab / floating panel; mic + optional webcam PiP; level meter;
**record-against-timeline** (3-2-1 countdown overlay, timeline plays, music auto-ducks,
live waveform); non-destructive takes (keep / re-record / punch-in).
**Onboarding (<5 min):** first-run empty state with 3 numbered steps + Import buttons;
ghost/skeleton lanes; progressive disclosure (Advanced accordion hides razor, beat-snap,
multicam confidence, raw keyframe fields, render bitrate). No modal wizards.
**Mobile/tablet (<1024px):** drop dockview → fixed non-draggable stack (Preview →
Timeline/Batch → Inspector tabs → Media Bin); touch scrub; VO still works; no panel
rearrange.
**Five one-click controls per mode** — Regular: Play · Split · Add Title · Record VO ·
Export. 360: Play · Add Keyframe · Reframe · Stabilize · Export Flat. Photo: Enhance ·
Crop/Rotate · Before/After · Apply Brand · Export.
**Components (each <300 LOC):** `ContentStudioDockHost`, `ContentStudioCommandBar`,
panels (`MediaBin`/`Preview`/`Inspector`/`Timeline`/`CameraPath`/`Voiceover`/`Export`),
`LevelDisclosureRow`, `RenderStatusChip`, `RenderQueueDrawer`, `MagneticTimeline` +
lane/clip subcomponents, `defaultLayout.ts`, `mobileStack`. Extend `StudioWorkspaceShell`
tokens; `[data-content-studio]` globals block for Orbitron + dockview theme.
### A.1 Finalized default layout (exact)
Top bar 44px fixed. Below: dockview host.
- Center row: 72% of (vh−44), min 360px — horizontal split:
  - **Media Bin 260px** (min 200, max 360) — tabs `[Project][Library]`; closable.
  - **Preview flex** (min 480px) — **PROTECTED, cannot close**; HUD with 5 one-click controls.
  - **Inspector 300px** (min 260, max 420) — tabs `Clip·Color·Audio·Titles·Enhance·Export`
    (+360: View/Camera Path; Voiceover opens as tab/panel); closable.
- **Timeline 28% of (vh−44)** (min 180px, max 55%) — **PROTECTED, cannot close**; resize via top edge.
Splitters 4px; double-click splitter = reset that split. Layout autosaves to
`ui_state_json.layout` per project (~1s debounce). Layout ▾ menu: toggles, Reset Layout,
presets (Default / Focus Preview / Audio Mix).
**Library placement:** Media Bin → `[Library]` tab (org-level, persists across projects):
categories Transitions / Music / Sound FX / Titles / Logos·Brand / Looks / Presets +
search + "Import to Library"; right-click "Save to Library" anywhere; reuse = drag out.
**Looks:** create/edit in Inspector → Color tab (level-disclosure grade rows + [Save as
Look] [Apply to All] [Match Camera…]); browse/apply from Library → Looks (swatch grid).
### A.2 Build slices (execution order — each ≈ one session)
**Stage 0 — Foundation:**
(1) Freeze **CORE** contract only — `SlateContentEditSpec` core + `RenderJobRequest` +
`RenderCallback` (Zod). Audio / Library+Looks / Enhancement / 360+Multicam freeze
progressively at their own slices via the `extensions` bucket (`.passthrough()`). Don't
freeze everything day 1.
(2) Migrations + taxonomy: `content_edit_projects`, `content_render_jobs`,
`content_enhancement_jobs`, **`content_library_assets`** (org-scoped — add now, not at 15),
+ **`alter publication supabase_realtime add table …`** for the job tables. Clone the
`design_generation_jobs` table shape. SlateDrop: per-project `06_Content_Studio/{Raw,
Proxies,Projects,Renders}` + org-level `Content Studio/Library/` (update taxonomy files).
(3) CEO route at **`app/(dashboard)/content-studio-workspace/`** (copy
`thermal-studio/layout.tsx` `isSlateCeo` gate; `ceoOnly` entry in `dashboard-nav-config.ts`)
+ `npm install dockview` + shell skeleton + **read-only Media Bin** (lists SlateDrop Raw) +
**preview harness** `app/preview/content-studio-shell/` [first visible].
(4) Ingest/proxy worker — ffprobe + 720p proxy + thumbnail + **tiny mono audio proxy**
(for cheap multicam sync) + waveform metadata; updates `media_assets.metadata`.
(5) Render task MOCK mode — **writes a real fixture file to `Renders/`** + status chip/queue
+ realtime hook (`useContentRenderJobRealtime`, clone Design pattern) [full loop proven].
**Stage 1 — Core editor:** (6) Media Bin import + drag-to-timeline · (7) Magnetic timeline +
master clock [**spike the timeline lib first**; if it fights >2 days, build thin custom
div/SVG lanes, keep wavesurfer for audio only] · (8a) Preview compositor (playback & cuts) ·
(8b) Preview compositor (canvas overlays & crop) · (9) Render worker v1 — **single clip,
trim only, no audio/text first** (prove correct output), then unlock multi-clip + audio +
text in-slice [FIRST REAL EXPORT] · (10) Inspector Clip tab + `LevelDisclosureRow` +
Export presets.
**Stage 2 — Audio/branding:** (11) Audio domain + 2-track mix **+ sidechain ducking +
duck-zone viz** (merged — ducking untestable without lanes) · (12) Voiceover recorder ·
(13) Titles + Brand Kit + captions [**bake libass + Orbitron/Inter fonts into Modal image**].
**Stage 3 — Differentiators:** (14) Reusable Asset Library (Music/Titles/Logos/Looks/
Presets categories) · (15) Color grade + Save-as-Look + Apply-to-All [**FFmpeg `eq` v1**] ·
(15b) **Match Camera** (color constancy — research, deferred) · (16) AI Enhance: FFmpeg CPU
ops + Real-ESRGAN · (16b) **RIFE** (deferred — doubles frames).
**Stage 4 — 360/multicam:** **360 SPIKE (go/no-go gate before this stage)** — 60s 4K clip,
yaw 0→180 + ±180 wrap + FOV zoom; v360-segmented vs OpenCV-remap; lock renderer. Then
(17) 360 mode + flatten · (18) Multicam sync + Sync&Stack.
**Stage 5 — Reach/polish:** (19) Photo mode batch · (20) Mobile/tablet fallback ·
(21) Onboarding + polish.
Milestones: usable edit+export ~slice 9; voiceover/branding ~12–13; differentiators
(Library/Looks/Enhance) 14–16; 360/multicam after the spike passes.
---
## B. Execution guardrails (repo-verified 2026-06-20)

**Route & identity:** the existing `app/(apps)/content-studio/` (entitlement-gated DAM)
stays as-is. The CEO NLE is a **distinct** route: `app/(dashboard)/content-studio-workspace/`,
hard-gated by `isSlateCeo` (copy `app/(dashboard)/thermal-studio/layout.tsx`), `ceoOnly`
entry in `components/dashboard-desktop/dashboard-nav-config.ts`, not in mobile nav, not
entitlement-visible. Extend `media_assets`/`media_collections` — don't replace.

**Reuse (don't reinvent):** HMAC callbacks → `lib/twin/worker-signature.ts`
(`verifyWorkerSignature`); Modal secret → existing `GPU_WORKER_SECRET_KEY` (no new secret);
job table shape → clone `design_generation_jobs` migration; API routes → `withAppAuth` +
`parseBody(schema)`; realtime → clone `useThermalJobRealtime`/`useDesignVariantsRealtime`;
SlateDrop writes → bridge/taxonomy pattern (never bypass). State → `zustand` (installed).
360 preview → `@photo-sphere-viewer/core` (installed) before reaching for raw Three.js.

**Deps to install at their slice:** `dockview` (slice 3), `react-timeline-editor` (slice 7,
after spike — fallback custom lanes), `wavesurfer.js` (slice 11). `three`, `zustand`,
`@photo-sphere-viewer/core` already present.

**Frozen-spec storage:** live edit state in `content_edit_projects` (`timeline_json` =
spec, `ui_state_json` = layout/chrome — never sent to worker). At enqueue, write the frozen
snapshot to R2 `Content Studio/Projects/{id}/spec-{hash}.json`; the job row holds only the
R2 key + content hash (avoids enqueue races; keeps autosave from invalidating specHash).

**Maintainability & auditability (matches the "easy to add / debug / audit" requirement):**
- **Per-slice acceptance test** (3–6 bullets, "done means…") written *before* the slice; a
  slice isn't done until its bullets pass. This is the audit trail of what works.
- **Feature-status registry** — a single `lib/content-studio/feature-status.ts` map
  (`feature → 'live' | 'stub' | 'planned'`) surfaced in a CEO-only debug panel, so at any
  time you can see exactly what's wired vs stubbed.
- **Always log the raw FFmpeg command** to Modal logs (already in §4.3) — primary debug lever.
- **`<300 LOC` enforced** by aggressive component/hook extraction; Zustand prevents the
  prop-drilling that bloats files.
- **Progressive schema modules** (§A.2 slice 1) keep each contract small and independently
  versioned/debuggable.
- Worker deploy discipline: edited `workers/modal/content-studio/**` → redeploy Modal;
  edited `src/trigger/content-studio*` → redeploy Trigger (per CLAUDE.md rule).
- After every UI slice: `npm run guard:design` (+ scoped typecheck/eslint) before "done".

**Inspector tabs (reduce sprawl):** primary `Clip · Audio · Titles · Export`; `Color` +
`Enhance` secondary (sub-nav/"More"); Voiceover lives under Audio; 360 adds a Reframe tab.

**One open gate:** the 360 flatten spike (before Stage 4) is the only go/no-go item. GFPGAN
stays deferred pending commercial-license review. Everything else is decided.

---

## C. Effects / Transitions / Captions / Assets / Controls (LOCKED — cross-AI convergent)

Typed modules frozen in `lib/content-studio/spec-modules.ts` (`SlateTransition`,
`SlateClipEffect`, `SlateSpeedRamp`, `SlateLogoLayer`, `SlateCaptionTrack`+`Style`,
`SlateReframe`/aspect presets, `LibraryAsset`). Native-FFmpeg-first, importable-Library
second, GPU/GLSL/AI later.

**Transitions:** FFmpeg **`xfade`** (built-in, ~50–57 named: fade/dissolve/wipe*/slide*/
smooth*/cover*/reveal*/circlecrop/radial/pixelize/zoomin/…) v1 + `acrossfade` audio.
**gl-transitions** (MIT, ~121 GLSL) deferred to a custom EGL FFmpeg Modal image (`cut-fx`
or `ffmpeg-gl-transition`). UI groups names into Clean/Wipe/Slide/Modern/Reveal.

**Effects (native FFmpeg, each = a LevelDisclosureRow, strength→param):** grain
(`noise` or overlay plate), `vignette`, glow/bloom (`split→gblur→blend=screen`), halation
(threshold→blur→tint→screen), chromatic (`rgbashift`), atmosphere (curves lift + haze
plate), sharpen (`unsharp`/`cas`), denoise (`hqdn3d`/`nlmeans`), color (`eq`/`curves`/
`lut3d`). Stackable + reorderable (order = filter order). Grain/leak/atmosphere plates
come from the Library.

**Speed/slow-mo:** `setpts`+`atempo` constant; **segmented `setpts`** for ramps;
`minterpolate` CPU fallback; **RIFE** (`rife-ncnn-vulkan`, MIT) as a GPU **Enhance job**,
not on the timeline.

**Titles + captions:** **libass** (ISC) for ALL text (reject `drawtext` as title engine).
Generate ASS via **pysubs2** (MIT) from brand templates + Whisper. Captions:
**faster-whisper** (MIT) → editable timed track → burn-in (ASS BorderStyle=3/4 box) +
sidecar VTT/SRT. **Accessible caption controls**: text color, background color + opacity,
outline, font/size, position, safe margin (social default = white on 75% black box,
bottom safe, ≤2 lines).

**Logos:** PNG/SVG overlay; opacity via `colorchannelmixer=aa`; scale/position/fade/
shadow/blend; opacity keyframes. Default logo bug = Export/Brand Kit; custom animated logo
= overlay lane.

**Aspect/export presets:** 16:9 master, 9:16 vertical, 1:1 square, 4:5 portrait (+720p
review). Reframe via existing `viewingRegion` (fill/fit/manual/smart-center) — reuses the
360 crop math. One timeline → many ratio exports.

**Importable Library assets (import→validate→thumbnail→`content_library_assets`→drag-use):**
LUTs `.cube` (then `.3dl`), transitions (xfade-name first / `.glsl` later), grain &
atmosphere & light-leak plates (screen-blend MP4 first / ProRes-alpha MOV), music/SFX
`.wav`/`.mp3`/`.aac`, fonts `.ttf`/`.otf` (Google Fonts OFL baked), logos PNG/SVG, title
templates (JSON+ASS), caption-style presets. **Capture license + attribution metadata per
asset; ship NO bundled third-party media initially** (users import their own). Per-asset
size caps + format validation on upload.

**Control surface (discoverability — learnable <5 min):**
- **Clip right-click context menu** (the biggest win — few click targets today): Split ·
  Speed/ramp · Add transition ▸ · Add effect ▸ · Apply Look ▸ · Detach audio · Replace
  media · Add title/logo/caption · Save to Library · Delete.
- **Inspector tabs:** Clip · Color · Effects (stack + reorder) · Titles · Captions · Logo ·
  Export — all level-disclosure rows.
- **Transitions** = drag from Library onto a clip boundary (or context menu); a boundary
  node with a draggable duration handle; Inspector picks type/duration.
- **Speed ramp** = Constant/Ramp toggle → small curve editor (preset easings, not full
  bezier v1).
- **Keyframes** = a diamond toggle on any animatable param (opacity, position, scale, FOV,
  gain, effect strength) → keyframe lane; linear/smoothstep easing.
- **Toolbar:** Add Text/Title/Logo/Caption, Snap, **Aspect switcher**, Export.
- Rule the whole UI follows: *drag from Media Bin, select to inspect, right-click for
  verbs, toggle→slider for strength, diamond for keyframes.*

**OSS stack (all permissive, server-side):** FFmpeg+libass (LGPL/ISC), pysubs2 (MIT),
faster-whisper (MIT), rife-ncnn-vulkan (MIT), gl-transitions (MIT, later), scipy/numpy
(BSD), Noto/Inter (OFL). Avoid: Editly/ffmpeg-concat (Node), Gyroflow/frei0r (GPL — study
only), browser/Chromium caption renderers, `drawtext` as title engine.

### C.1 New slice — 14B (lands before AI Enhance / 360 / Multicam)
**Effects + Transitions + Captions + Logos + Export presets** — makes the editor feel real:
xfade transitions + boundary UI, Inspector effect stack (denoise/sharpen/color/LUT/grain/
vignette), `.cube` LUT import, logo overlay (opacity/scale/position/fade), accessible
captions (Whisper→pysubs2→libass, text/bg color+opacity), export presets 16:9/9:16/1:1/4:5
with reframe + burn-in/sidecar. P1 follow-ons: light-leak/atmosphere plates, saved
caption/effect presets, speed ramps, PiP. P2: gl-transitions image, RIFE, glow/bloom.

---

## 10. Status
All surfaces, UI, and execution guardrails (§B) specced and repo-verified. No major
research gaps; **one go/no-go gate remains: the 360 flatten spike before Stage 4.** Build
starts with repo reconciliation already done (§B). Slice 1 = freeze the **CORE** contract
only (`SlateContentEditSpec` core + `RenderJobRequest`/`RenderCallback`); advanced schema
modules freeze progressively at their slices. Canonical slice order = §A.2 (§8 deprecated).