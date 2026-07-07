# Content Studio — External Review Brief & Research Prompt

**Purpose:** a self-contained technical brief for an outside AI/engineer to (1) understand the current Slate360 Content Studio, (2) compare it to Final Cut Pro / CapCut / DaVinci Resolve, and (3) recommend whether to adopt an existing open-source/GitHub project instead of continuing a custom build. Includes a ready-to-paste research prompt (Part C).

**Date:** 2026-06-22 · **Status:** current-state snapshot.

---

## PART A — What Content Studio is

Content Studio is a **CEO-only, cloud-rendered video/360/photo editor** embedded in Slate360, a construction field-documentation SaaS. Design intent: a browser editor that runs on a **low-end laptop with little storage and no GPU**, offloading all heavy compute to the cloud, targeting **construction / social content** (site walkthroughs, before/after, branded client deliverables, YouTube-style talking-head + b-roll).

**Core bet / differentiator:** proxy-based cloud editing — the browser edits lightweight 720p proxies and a JSON spec; final render happens on cloud workers (GPU/CPU) and is authoritative. Preview is proxy-approximate; export is cloud-rendered. Users' assets and outputs live in **SlateDrop** (the app's Dropbox-like file system on Cloudflare R2).

**Honest trade vs desktop NLEs:** live preview cannot composite two videos (crossfades) or burn text the exact way the final render does — those are shown approximately in-browser and rendered exactly server-side.

---

## PART B — Technical architecture (what an external AI needs)

### B.1 Stack
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind v4. Design system "Graphite Glass" (dark canvas `#0B0F15`, glass panels, one accent `--twin360-blue #3D8EFF`, IBM Plex Mono labels; **bans: amber, glow, rounded-full, pills/chips, hardcoded hex**).
- **Editor state:** Zustand v5 + zundo v2 (undo/redo via `temporal`, partialized to timeline arrays). No prop-drilling; panels subscribe to slices.
- **Panels/layout:** react-resizable-panels v2.1.9 (dockview planned, not yet used). Custom timeline (no third-party timeline lib currently).
- **Preview engine (custom):** double-buffered pooled `<video>` elements playing R2 proxies, driven by a master clock off `timeupdate`; seamless clip-boundary swaps; live CSS filter for color; DOM text overlay for titles; `<audio>` pool for audio lanes. (No WebGL compositor yet — Canvas2D/PixiJS planned.)
- **Backend runtime:** Vercel (Next.js API routes, Fluid Compute). Deploys via git push to `main` (auto prod deploy; the commit SHA drives a service-worker cache-bust).
- **DB/auth:** Supabase (Postgres + RLS + Realtime). Org-scoped, CEO-gated (`isSlateCeo`).
- **Object storage:** Cloudflare **R2** (S3-compatible via `@aws-sdk/client-s3`), bucket `slate360-storage`. Signed GET/PUT URLs (1h). **R2 egress is free** — a key cost advantage for delivery/download.
- **Job orchestration:** **Trigger.dev v4** (tasks dispatch to Modal, handle mock vs real modes). Redeploy required after editing `src/trigger/*`.
- **Heavy compute:** **Modal** (Python, serverless CPU/GPU). Workers: `slate360-content-ingest` (ffprobe + 720p proxy + thumbnail + mono audio proxy) and `slate360-content-render` (FFmpeg concat/trim/speed/reverse/color → R2 → HMAC callback). GPU workers planned for AI enhance.
- **Callback security:** HMAC (`x-worker-signature`, shared `GPU_WORKER_SECRET_KEY`).

### B.2 Data model — the canonical contract
`SlateContentEditSpec` (Zod, `lib/content-studio/spec-core.ts`) is the single source of truth shared by client and render worker. Client never sends FFmpeg; it sends the spec. Adapters translate outward. Progressive-freeze: core is frozen; advanced modules attach via an `extensions` passthrough bucket.

Core shape (abridged):
```
SlateContentEditSpec {
  version, editProjectId, orgId, projectId,
  timeline: { durationSec, clips: SlateClip[] },   // max 64 clips
  audio:    { tracks: SlateAudioTrackBasic[], normalize },
  output:   { width, height, fps, codec:h264, crf, preset, format:mp4, includeAudio },
  extensions: {}                                   // forward-compat
}
SlateClip { id, assetId, storageKey, mediaKind(video|image|equirect_video),
  timelineStartSec, cutInSec, cutOutSec, speed(0.25–4), reverse,
  color?{exposure,contrast,saturation,temperature},  // 0-centered [-100,100]
  layers: SlateLayer[](text|image), viewingRegion?(crop/pan/zoom) }
```
At enqueue, the API builds+validates the spec, **freezes a snapshot to R2** (`Projects/{id}/spec-{hash}.json`), stores the key+content-hash on the job row; the worker renders from the frozen snapshot (deterministic).

**Editor-side (transient) model** (`editor-store.ts`): sequential `TimelineClip[]` (each abuts the previous — no absolute positions/gaps for video yet) + absolutely-positioned `OverlayItem[]` on overlay lanes (audio/title), each with `startSec/durationSec` and per-kind payload (audio: src/gain/fades; title: text + titleStyle). Persisted to `content_edit_projects.timeline_json` with debounced autosave; signed URLs re-resolved on reload.

### B.3 Supabase tables (content studio)
- `content_edit_projects` (timeline_json spec, ui_state_json, mode, last_render_job_id)
- `content_render_jobs` (job_type ingest|render|enhance|…, status, progress, spec_snapshot_key, content_hash, output_storage_key, estimated_credits) — Realtime-published
- `content_enhancement_jobs` (separate GPU lane, derivative assets)
- `content_media_assets` (proxy_key, thumbnail_key, audio_proxy_key, duration/width/height/fps/has_audio)
- `content_library_assets` (org-level reusable library: transition|music|sfx|title_template|logo|look|preset + license/attribution metadata)
All org-scoped with RLS; anon revoked.

### B.4 API routes (`app/api/content-studio/*`)
`media/presign` (R2 PUT), `media/ingest` (create asset + enqueue), `media` (list + signed URLs), `render` (build+freeze spec, enqueue, GET recent jobs + signed download), `projects` (GET ensure-default, PATCH autosave), `jobs/callback` (HMAC), `library` (catalog). Plus legacy DAM routes `assets`/`collections`.

### B.5 Pipelines
- **Ingest:** browser presigns → PUT to R2 → `media/ingest` creates asset+job → Trigger `content-studio.ingest` → Modal `ingest.py` (720p proxy + thumb + mono audio proxy) → HMAC callback updates asset → media bin shows it.
- **Render:** ExportDialog → `render` API builds+freezes spec → Trigger `content-studio.render` → Modal `render.py` (per-clip trim `-ss/-to` + speed `setpts/atempo` + reverse + color `eq/colorbalance` + scale/pad → concat filter → encode → R2 `Renders/`) → HMAC callback → queue drawer download.

### B.6 Deploy discipline
- Edited Next.js app/API → `git push main` (Vercel auto-deploy). Do NOT `vercel --prod` (breaks SW cache-bust).
- Edited `workers/modal/content-studio/**` → redeploy Modal (`python -m modal deploy render.py`).
- Edited `src/trigger/**` → redeploy Trigger (`npx trigger.dev deploy`).

### B.7 Hard constraints (must inform any recommendation)
- **No GPL in the frontend/app bundle** (proprietary SaaS). FFmpeg/libass/whisper/etc. run **server-side on Modal only** (LGPL/permissive server use OK). Frontend libs must be MIT/BSD/Apache/ISC/MPL.
- **Cloud-first:** heavy compute never in the browser or on the mobile app — dispatched to Trigger→Modal.
- **Files <300 lines**, tokens-only styling, CEO-gated + hidden.
- **Determinism:** content-hash the spec; frozen snapshot; fixed encoder settings.

---

## PART C — Current feature inventory (live / partial / stub / missing)

Ground truth = `lib/content-studio/feature-status.ts` (a living registry). Summary:

**LIVE (works end-to-end):**
- Media import → R2 → Modal proxy/thumbnail → media bin (full ingest pipeline).
- Timeline: add/remove, trim (edge + numeric), split at playhead, drag-reorder, speed 0.25–4×, reverse (+ badge, renders), duplicate, right-click context menu, undo/redo.
- Multi-lane timeline: Video (sequential) + Audio + Titles overlay lanes; drag Library items to a position; drag-to-move; vertical scroll.
- Preview: double-buffered playback + scrub; **live color** (exposure/contrast/saturation/temperature) via CSS filter + temp overlay; **live title overlays** (text/size/color/bg/position/align, time-ranged).
- Color: per-clip AND master ("all clips" adjustment layer); Library Looks apply to whole edit; serialized to spec + rendered (FFmpeg eq/colorbalance).
- Titles: full authoring UI + WYSIWYG preview (burn-in on export still pending).
- Audio: **detach audio** (clip→audio lane, video muted) plays in preview with per-item volume + linear fades (render mix + import still pending).
- Export: dialog (aspect 16:9/9:16/1:1/4:5, resolution, quality) + preflight credits → enqueue → status/queue drawer → **download of real assembled multi-clip MP4** (trim+speed+reverse+color).
- Project persistence: autosave + reload-safe hydrate. Starter Library catalog (~96 items, 8 categories).

**PARTIAL:** magnetic snap (toggle only), preview overlays (titles yes; logo/crop no).

**STUB:** transitions attach-to-boundary (catalog exists, click = toast only), Enhance tab (disconnected sliders), Audio inspector when nothing selected.

**MISSING:** transition rendering, audio export mix, audio import (accept + ingest audio path), voiceover recording, sidechain ducking, auto-captions (Whisper), logo/watermark, effects stack (blur/vignette/grain/sharpen/denoise/stabilize), save-as-Look, keyframing, markers, PiP/multi-video-track compositing, 360 mode (sphere/camera-path/flatten), Photo mode (crop/annotate/batch), multicam, replace-media, mobile layout, onboarding, AI assistant.

---

## PART D — Gap analysis vs FCP / CapCut / DaVinci Resolve

| Capability | Content Studio today | FCP / Premiere / Resolve | CapCut |
|---|---|---|---|
| Basic cut/trim/split/reorder/speed | ✅ | ✅ | ✅ |
| Multi-track / overlay lanes | ✅ (audio+title; video single-track) | ✅ full | ✅ |
| Transitions | ❌ (catalog only) | ✅ | ✅ |
| PiP / multiple video tracks / compositing | ❌ | ✅ | ✅ |
| Color grade + LUTs | ✅ basic (eq); ⚠️ no curves/wheels/scopes | ✅ pro (Resolve best-in-class) | ✅ basic |
| Titles / motion titles | ✅ static; ❌ motion/animated | ✅ | ✅ (templated, strong) |
| Auto captions | ❌ | ⚠️ (Premiere/Resolve yes) | ✅ (signature feature) |
| Audio: volume/fades/detach | ✅ (preview; not yet in export) | ✅ | ✅ |
| Music/SFX library + import | ⚠️ catalog metadata; no playback/import yet | ✅ | ✅ (huge library) |
| Voiceover record-to-timeline | ❌ | ✅ | ✅ |
| Ducking / noise reduction | ❌ | ✅ | ✅ (auto) |
| Effects (blur/vignette/grain/stabilize) | ❌ | ✅ | ✅ |
| Keyframing | ❌ | ✅ | ✅ |
| Auto-reframe / aspect exports | ⚠️ export presets; no smart reframe | ✅ | ✅ (auto-reframe) |
| Multicam | ❌ | ✅ | ⚠️ |
| 360 / equirect | ❌ (stub) | ⚠️ | ⚠️ |
| Runs on weak hardware / cloud render | ✅ (unique) | ❌ (desktop, GPU) | ⚠️ (mobile/desktop local) |
| AI assistant / prompt-driven editing | ❌ | ⚠️ (emerging) | ⚠️ |

**Content Studio's unique lane:** cloud proxy editing on weak hardware + free R2 egress + tight integration with a construction file system (SlateDrop) + org branding. Its biggest missing table-stakes: transitions render, audio in export, captions, effects, PiP, keyframing.

---

## PART E — Product goals to optimize for (from the product owner)
1. **YouTube-style talking-head:** record/import a person talking, **overlay project b-roll over their voice**, **picture-in-picture**, lower-thirds.
2. **Full content toolkit:** narration/voiceover, music, SFX, special effects, transitions, titles + **motion titles**, **branding** (logo/colors/fonts), **auto-generated subtitles**.
3. **Cloud performance:** advanced proxy/multicam workflows so users on low-storage/no-GPU machines edit smoothly; single-clip and multicam.
4. **Distribution:** streamline to many platforms/aspect ratios; use SlateDrop for assets/outputs; free R2 egress for delivery.
5. **AI assistant:** prompt-driven control/automation of the editor ("add captions", "make a 30s vertical cut with my logo", "duck music under my voice").
6. **Construction-industry fit:** before/after, site walkthroughs, branded client reports, redaction (blur faces/plates), date/location stamps.

---

## PART F — Open questions for the external reviewer
1. **Buy vs build:** is there a permissively-licensed OSS web NLE (or headless render engine) we should adopt as the core instead of extending the custom editor? Candidates seen: OpenCut (MIT), Remotion (commercial license), Etro (GPL), Editly (MIT, server-side), Motion Canvas/Revideo, designcombo, FreeCut, Shotstack (SaaS). Which best fits a proprietary SaaS + R2 + Modal + Supabase, and what's the migration cost vs. keeping our `SlateContentEditSpec`?
2. **Preview compositor:** stay DOM/CSS + `<video>`, or move to PixiJS/WebGL/WebCodecs for PiP + transitions + effects preview? Trade-offs on weak hardware.
3. **Render engine:** keep hand-rolled FFmpeg filtergraphs in Modal, or adopt a declarative renderer (Editly-style JSON, or Remotion/Revideo server render) — and how to keep determinism + our spec?
4. **Auto-captions + AI:** best OSS ASR (faster-whisper vs WhisperX for word-level) on Modal; and an AI-assistant architecture that maps natural-language prompts → validated `SlateContentEditSpec` mutations (tool-calling over our Zod schema).
5. **Multicam + proxies:** best cloud approach (audio cross-correlation sync; proxy ladder) for weak clients.
6. **Cost:** maximize the free-R2-egress advantage; where GPU is truly needed vs CPU.

---

## PART G — Constraints recap for recommendations
- Proprietary SaaS: **frontend must be MIT/BSD/Apache/ISC/MPL** (no GPL in the bundle; GPL OK only as an isolated server-side binary/worker).
- Cloud-first: heavy work on Modal; browser stays light.
- Must interop with: Supabase (Postgres/RLS/Realtime), Cloudflare R2 (S3 API, free egress), Trigger.dev, Modal (Python), Vercel/Next.js 15, our Zod `SlateContentEditSpec`.
- Graphite-Glass design system; CEO-gated; determinism (hash+freeze); files <300 lines.

---

## PART H — READY-TO-PASTE RESEARCH PROMPT (give this to other AI assistants)

> **Context:** I'm building "Content Studio," a **cloud-rendered, browser-based video/360/photo editor** inside a construction-industry SaaS. It targets users on **low-end laptops with little storage and no GPU** — all heavy compute is offloaded to the cloud. Stack: **Next.js 15 / React 19 / TypeScript / Tailwind**, **Zustand** state, **Supabase** (Postgres/RLS/Realtime), **Cloudflare R2** object storage (**egress is FREE** — a deliberate cost advantage), **Trigger.dev** job orchestration, **Modal** (Python, serverless CPU/GPU) running **FFmpeg/libass** for ingest (720p proxies) and render (concat/trim/speed/reverse/color → MP4 → R2). The canonical contract is a Zod schema `SlateContentEditSpec` (timeline of clips with trim/speed/reverse/color, audio tracks, text/image layers, output settings) that the client builds and the worker renders deterministically (content-hashed + frozen to R2).
>
> **Hard constraints:** (1) it's a **proprietary SaaS**, so any code linked into the **frontend/app bundle must be permissively licensed (MIT/BSD/Apache/ISC/MPL) — NO GPL/AGPL** in the bundle; GPL is acceptable ONLY as an isolated server-side binary/worker (e.g., FFmpeg on Modal). (2) Heavy compute stays cloud-side. (3) Must interoperate with Supabase, R2 (S3 API), Trigger.dev, Modal, Vercel.
>
> **What already works:** media import→proxy pipeline; timeline (trim/split/reorder/speed/reverse/duplicate/undo); multi-lane timeline (video + audio + title overlay lanes); live preview with color grade + title overlays; per-clip and master ("adjustment layer") color; detach-audio playback with volume/fades; export to a real assembled MP4 via cloud FFmpeg; project autosave.
>
> **What's missing / desired (rank by ROI):** transitions (render), audio mix into export, audio import, **auto-generated subtitles** (ASR), **voiceover recording to timeline**, music/SFX, **special effects** (blur/redaction, vignette, grain, sharpen, denoise, stabilize), **keyframing**, **picture-in-picture / multiple video tracks / compositing** (for **YouTube-style talking-head with project b-roll over the voice**), **motion titles**, **branding** (logo/colors/fonts), **auto-reframe** to many aspect ratios (16:9/9:16/1:1/4:5), **multicam**, 360/equirect, photo/batch mode, and an **AI assistant** that turns natural-language prompts into editor actions.
>
> **Please deliver:**
> 1. **Buy-vs-build:** Do an open-source / public-GitHub search for **permissively-licensed web video editors and headless render engines** we could adopt as the CORE (or major subsystem) instead of extending our custom build. For each candidate give: repo URL, license (flag GPL/commercial traps), last-commit/maintenance, architecture, whether it's drop-in vs fork vs study-only, and the migration cost vs. keeping our `SlateContentEditSpec`. Consider at least: OpenCut, Remotion/Revideo/Motion Canvas, Etro, Editly, designcombo, FreeCut, Shotstack/Creatomate/Editframe (SaaS APIs), @xzdarcy/react-timeline-editor, wavesurfer.js, PixiJS, mediabunny, WebCodecs, and anything newer/better. Explicitly recommend **what to adopt vs build**, and give a concrete integration plan for the top pick on our stack (R2 + Modal + Supabase + our spec).
> 2. **Cloud-editing architecture:** the best modern approach for **proxy-based editing on weak hardware** — proxy ladders, WebCodecs vs `<video>`, WebGL/PixiJS compositor for PiP/transitions/effects preview, and how to keep preview≈final. How to exploit **free R2 egress** for delivery/streaming and minimize GPU cost (CPU vs GPU boundaries).
> 3. **Render engine:** keep hand-rolled FFmpeg filtergraphs on Modal, or adopt a declarative renderer (Editly-style JSON, Remotion/Revideo server render, or a filtergraph builder)? Show how transitions (xfade), PiP/compositing, audio mix (amix + ducking via sidechain), libass captions, and motion titles map to the chosen engine — while preserving determinism + our Zod spec.
> 4. **Auto-captions & audio:** best OSS ASR on Modal for **word-level** captions (faster-whisper vs WhisperX vs others), plus noise reduction / loudness normalization / ducking pipelines.
> 5. **AI assistant:** design a **prompt-driven editing assistant** that maps natural language → validated `SlateContentEditSpec` mutations via LLM tool-calling over our Zod schema (e.g., "add captions," "make a 30s vertical cut with my logo lower-third," "duck the music under my voice," "overlay this clip as PiP top-right from 0:10–0:15"). Include the tool/function schema design, guardrails, and how to preview/confirm changes.
> 6. **Construction-industry features:** highest-value editing features for contractors (before/after, site walkthroughs, redaction/blur of faces & plates, date/location stamps, branded client reports) and how to streamline multi-platform/multi-aspect publishing.
> 7. **Multicam + talking-head:** the cheapest reliable cloud approach to multicam sync (audio cross-correlation) and a great **talking-head + b-roll + PiP** workflow.
>
> For every recommendation, state the **license**, whether it runs **client or server**, the **maintenance risk**, and a **concrete "how to implement on our stack" step list**. Prefer adopting proven OSS over reinventing; call out where a custom build is genuinely warranted. End with a **prioritized roadmap** (highest ROI first) distinguishing "adopt OSS" vs "build custom."
