# Content Studio — Status & Build Strategy (Reconciled)

**Date**: 2026-06-21 · **Audited at**: commit `22d0eba9` (slices 6–9 + 14A merged from two parallel build streams).

This document reconciles the two prior planning docs ([BUILD_PLAN](CONTENT_STUDIO_BUILD_PLAN.md), [CONTROL_SPEC](CONTENT_STUDIO_CONTROL_SPEC.md)) against the **actual code state**. The feature inventory is unchanged (~165 controls in CONTROL_SPEC); what changed is the *order*, because parallel work landed slices out of sequence (9 and 14A done; 10–13 + the foundational substrate skipped). Living per-feature status lives in [`lib/content-studio/feature-status.ts`](../../lib/content-studio/feature-status.ts).

---

## 1. The core finding

The visible foundation works — **timeline editing, preview/playback, media ingest, and the export dialog + render queue are all LIVE end-to-end.** But a **load-bearing substrate was skipped**, and it silently makes every downstream feature inert:

1. **No project persistence.** Clips exist only in browser memory (Zustand). A reload wipes the entire timeline. There is no `timeline_json` write or hydrate.
2. **No spec bridge.** The editor never assembles a `SlateContentEditSpec`. The render API receives only a thin `{assetId, trimIn, trimOut, speedFactor}` manifest. **So even a perfectly-wired Color/Transition/Audio UI has nowhere to send its data.**
3. **No real render worker.** There is no `render.py`; `MODAL_CONTENT_ENDPOINT` is unset, so render is mock/passthrough (downloads the first clip's proxy, not the assembled edit).

**Consequence:** Color, Transitions, Audio, Titles all *look* present (catalogs + panels) but are catalog + local-UI only — nothing serializes into a spec, nothing renders them, and nothing survives a reload. Adding more feature UI on this base just produces more disconnected stubs (which is exactly the pattern the audit found).

**Strategic rule going forward:** *No new feature UI until it has (a) a spec field to write to and (b) a worker that renders it.* Every feature ships as a **triple — UI → spec field → worker filter — or not at all.**

---

## 2. Status snapshot by category

| Category | State | Detail |
|---|---|---|
| **Foundation** (persistence, spec bridge, render worker) | 🔴 missing | The substrate everything depends on. |
| Timeline & clip editing | 🟢 live | add/trim/speed/split/reorder/undo. Missing: context menu, ripple delete, real multi-lane. Reverse = flag only. |
| Preview / playback | 🟢 live | seamless double-buffer + scrub. Missing: canvas overlay layer (titles/logo/crop). |
| Inspector — Clip | 🟢 live | speed/trim/reverse/split. |
| Inspector — Export | 🟢 live | aspect/res/quality/preflight → enqueue. |
| Inspector — Color | 🟠 stub | sliders have no onChange; not per-clip; not serialized. |
| Inspector — Audio/Titles/Enhance | 🟠 stub | notes only / disconnected sliders. |
| Transitions | 🟠 stub | 24-item catalog; click = pending+toast; no boundary attach, no spec. |
| Effects | 🔴 missing | schema only; no catalog, no UI. |
| Color / Looks | 🟠 partial | apply Look → local colorGrade; not per-clip, not serialized, lost on reload. |
| Audio domain | 🟠 stub | music/SFX catalog live; lanes/detach/volume/VO/duck all missing. |
| Titles / captions / logo | 🟠 stub | catalogs live; no lane, overlay, libass, captions, logo. |
| Library | 🟢 live (catalog) | ~96 items, 8 categories; drag wired only for Looks. |
| Export / render | 🟡 live (mock) | dialog/enqueue/queue/download all live; **render is passthrough, not assembled.** |
| Media ingest | 🟢 live | upload→proxy→thumbnail→asset, end-to-end (real Modal worker). |
| 360 / Photo modes | 🟠 stub | mode toggle + label only. |
| Undo / redo | 🟢 live | zundo, clips-scoped. |

---

## 3. Remaining work, reorganized into categories

### Category 0 — Foundation / substrate (must come first)
The keystone. Until this exists, feature work cannot render or persist.
- **0a. Spec bridge** — `buildEditSpec(state) → SlateContentEditSpec` (clips + per-clip color/effects/transitions + audio tracks + titles + output). One function every feature writes through.
- **0b. Real render worker** — `workers/modal/content-studio/render.py`: download proxies by key, per-clip trim (`-ss/-to`) + speed (`setpts/atempo`) + reverse, concat with `setpts=PTS-STARTPTS`, upload to R2, HMAC callback. Flip `MODAL_CONTENT_ENDPOINT` on. **(= slice 9B, now expanded to also consume the spec.)**
- **0c. Spec freeze** — write the frozen snapshot to R2 at enqueue; job row carries `spec_snapshot_key` + hash.
- **0d. Project persistence** — debounced autosave of `timeline_json` + hydrate on load. *Highest-severity UX gap after the worker.*

### Category 1 — Clip editing completeness
- Clip **right-click context menu** (split / duplicate / detach audio / add transition / apply look / delete) — the plan's "biggest win".
- Ripple delete, duplicate, replace media. Reverse honored by worker. Magnetic snap applied to drags.

### Category 2 — Color & effects (serialize + render)
- Wire grade sliders (onChange) → **per-clip** color in spec → worker `eq`/`curves`/`lut3d`.
- Look apply attaches to clip(s) + serializes; Save-as-Look; Apply-to-All.
- Effect stack UI (LevelDisclosureRow list) → spec effects → worker filters (denoise/sharpen/vignette/grain).

### Category 3 — Transitions (wire end-to-end)
- Drop transition on a cut boundary → boundary node on timeline → spec `transitions[]` → worker `xfade`/`acrossfade`.

### Category 4 — Audio domain
- Audio lanes (wavesurfer) · detach audio · per-clip volume/fades · music/SFX drag-to-lane · voiceover record-against-timeline · sidechain ducking → spec audio tracks → worker mix.

### Category 5 — Titles / captions / logo
- Title + caption lanes + preview overlay · auto-captions (Whisper) · logo/watermark → spec graphics layers → worker libass + PNG overlay.

### Category 6 — Modes
- 360: equirect sphere preview, camera-path lane, `v360` flatten (behind the go/no-go spike). Photo: batch strip, crop/rotate, annotations, before/after.

### Category 7 — Enhance (separate GPU jobs)
- denoise/sharpen/stabilize/upscale (Real-ESRGAN) / RIFE — separate job + derivative asset, never mutates the timeline.

### Category 8 — Polish
- Markers, keyframing, mobile/tablet stack, onboarding, render-status realtime (vs polling).

---

## 4. Revised execution order (dependency-aware)

The original slice numbers are kept for traceability, but the **order is corrected** so the substrate lands before more feature UI:

1. **9B + 0a/0b/0c — Spec bridge + real render worker + freeze.** Export produces the actual assembled multi-clip video (trim + speed + reverse). *In progress now.*
2. **0d — Project persistence (autosave + hydrate).** Stop losing work on reload.
3. **Category 1 — Clip context menu + ripple/duplicate.** Cheap, high-discoverability, all store-level.
4. **Category 2 — Color/effects triple.** First feature to ride the new spec+worker substrate end-to-end (proves the pattern).
5. **Category 3 — Transitions triple.**
6. **Category 4 — Audio domain.**
7. **Category 5 — Titles/captions/logo.**
8. **Category 6–8 — Modes, Enhance, polish** (360 behind its spike gate).

Each step from #4 on is a **UI → spec field → worker filter** triple, verifiable end-to-end (export the change, confirm it's in the output), and updates `feature-status.ts`.

---

## 5. What does NOT change
- The ~165-control inventory and surface/mode/priority mapping in [CONTROL_SPEC](CONTENT_STUDIO_CONTROL_SPEC.md) stays authoritative.
- The locked architecture in [BUILD_PLAN](CONTENT_STUDIO_BUILD_PLAN.md) (cloud-first, canonical spec, pluggable engine, level-disclosure, Graphite Glass, CEO-only) stays.
- The Starter Library (slice 14A) stays — it just needs its drag targets wired into the timeline (Categories 2–5).

The only correction is **sequencing**: build the substrate (Category 0) before any more feature surfaces, and ship every remaining feature as a render-verified triple.
