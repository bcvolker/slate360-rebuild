# Thermal Studio — Workflow Reimagining (v3 plan)

> **⚠️ HISTORICAL — NOT A BUILD PLAN (marked 2026-07-10).** This document's diagnosis
> remains useful context, but its 3-tab IA lost to the locked 5-tab V2 design. The
> executable plan is `THERMAL_STUDIO_V2_REBUILD_LOCKED.md` +
> `THERMAL_STUDIO_V2_2_BUILD_SPECS.md` (Addendum G roster, frozen). Do not build from
> this file.

**Status:** Plan only — no code beyond the draggable level/span scale (shipped 2026-06-23).
**Decisions locked (Brian, 2026-06-23):** keep the Content-Studio-style layout; present
**Auto-process** and **Manual-tune** as **two equal, explicit modes**; reduce buttons and
ambiguity; reimagine every screen except Upload. Engine stays as-is (it works).

---

## 1. Diagnosis — the problem is over-build, not under-build

The Studio already contains far more than a user can parse. The confusion comes from:

- **5 top tabs** — `ThermalStudioShell.tsx` renders Library / Inspect / **Time-lapse-Video** /
  Report Builder / Deliver. The v2 plan called for **4**; the Time-lapse/Video tab is not
  part of the core inspect→report flow and adds noise.
- **Nested sub-tabs** — Inspect (`ThermalAnalyzeTune` → `ThermalStudioWorkView`) wraps the
  viewer in Tune/Detection sub-tabs; Deliver has Share / Branding / Twin sub-tabs. Tabs
  inside tabs hide the workflow.
- **~17 panels** with overlapping jobs — `ThermalProcessPanel`, `ThermalBatchTunePanel`,
  `ThermalInspectionProfiles`, plus the report-set / auto-pair cards all live in the
  Library right rail at once.
- **Cryptic buttons** — "Clear baked", "Panel ◨", bare-icon zoom reset, an Auto/Manual
  toggle that reads like a mode switch. (Inventory in §6.)
- **The toggles model the wrong thing** — the decode/find/report checkboxes ask the user to
  understand the pipeline. Users want "analyze these" — not to choose `extract_analyze` vs
  `full_pipeline`. (This is also where the DB-constraint bug lived.)

**Keep (works, do not rewrite):** the Trigger→Modal pipeline, the NPZ radiometric grid,
the probe viewer + measurement targets, palettes, the (now draggable) level/span scale,
anomaly detection, report.py per-image FLIR layout, SlateDrop import, share + Q&A.

---

## 2. Target information architecture — 4 tabs, no nesting

```
[ Library ]  [ Inspect ]  [ Report ]  [ Deliver ]      ← persistent summary bar above
```

Drop the **Time-lapse / Video** tab from the core shell (park the component; it can return
as a Deliver export option later). Flatten the Inspect and Deliver sub-tabs into single
scrollless workspaces (the Design-Studio flex pattern already proven in the codebase —
see v2 plan "CANONICAL no-scroll workspace pattern").

---

## 3. The two-mode framing (the core of this redesign)

After upload, the **Library** is the home. It presents **two equal, clearly-labelled entry
points** at the top of the right rail — not buried in toggles:

### Mode A — Auto-process (batch)
- One primary button: **“Analyze all images”** (or “Analyze N selected”).
- Runs the full automatic path: **decode temperatures → find anomalies**, in the cloud.
- No checkboxes in the default view. A small **“Advanced…”** disclosure reveals the
  granular decode / find / report controls for power users only.
- Clear status: a single progress line ("Analyzing 4 images… ~2 min") wired to the
  existing `useThermalJobRealtime` + the post-job refetch.
- This is the "I just want my anomalies" path.

### Mode B — Manual tune (per image)
- Button: **“Open in Inspect”** (also: click any thumbnail).
- Goes to the Inspect workbench where the user adjusts **level/span by dragging the scale**
  (shipped), changes palette, places measurement spots, sets emissivity/reflected, and
  writes findings — all instant and client-side.
- "Batch tune" (apply a tuning/palette to a selection) stays, but is grouped under Mode B's
  heading ("Manual tune") so it reads as part of the same mental model, not a stray panel.

**Framing rule for the UI copy:** Auto = "let the cloud decode + detect for you." Manual =
"open an image and adjust it yourself." Both visible, same weight, on the Library screen.

---

## 4. Per-tab specification

### 4.1 Library (curate + the two modes)
- **Center:** thumbnail grid (`ThermalImageGrid`) — ✓ select, ★ include-in-report, anomaly
  badge. Keep.
- **Right rail, top:** the **two-mode block** from §3 (Auto-process / Manual-tune), visually
  separated and equal.
- **Right rail, below:** Report set (add/auto-pair) + Inspection profiles, collapsed by
  default so the two modes dominate.
- **Empty state:** merges Import (file + SlateDrop) — already built.

### 4.2 Inspect (single-image workbench — Manual mode home)
- **Left:** vertical filmstrip (existing, w-28, flagged filter).
- **Center:** the dominant image with zoom/pan + the **draggable level/span legend**
  (shipped) + measurement targets + loupe.
- **Right:** collapsible sections (`CollapsibleSection`) — Tuning & palette / Measurements
  (Sp/Dt) / Findings / Image data. **Remove the Tune/Detection sub-tab nesting** — these
  become sections in one rail.
- **Toolbar cleanup** (see §6): rename "Clear baked" → "Clear imported spots"; "Panel ◨" →
  "Hide panel"; label the zoom-reset.

### 4.3 Report (assemble + generate)
- Keep `ThermalReportBuilder`: ordered set, conditions form, visual template gallery,
  generate + history. Already no-scroll-fixed in v2. Minor: surface "which images are in the
  report" more clearly from Library (the ★).

### 4.4 Deliver (share + export + branding)
- Flatten Share / Branding / Twin sub-tabs into one scrollable panel with headings, OR keep
  as a simple segmented control (not full tabs). Twin overlay stays a roadmap stub.

### 4.5 Persistent summary bar
- Mount `ThermalSessionSummaryBar` above all tabs: captures · action anomalies ·
  in-report count · last job status. (Built; ensure it's mounted.)

---

## 5. The "stuck on uploading" + double-session bug (fold into this work)
- Upload finalize never moves the session off `status: "uploading"` — fix the finalize
  route to set a "ready" status so the session doesn't look broken.
  (`app/api/ops/thermal/upload/route.ts` finalize phase.)
- The upload page created **two sessions 4s apart**. Make `ensureSession()` idempotent /
  guard against double-create. (`components/ops/thermal/ThermalUploadClient.tsx`.)

---

## 6. Button / label cleanup (do as a pass)

| Current | Problem | New |
|---|---|---|
| Decode / Find / Build report checkboxes (default) | Exposes pipeline jargon | Hide behind "Advanced…"; default = "Analyze all images" |
| "Clear baked" | "baked" is meaningless to users | "Clear imported spots" |
| "Panel ◨" | cryptic icon | "Hide panel" (text + icon) |
| Zoom "⟲" | icon-only | tooltip "Reset zoom (1:1)" |
| Display range "Auto / Manual" | reads like a mode switch | "Auto span" toggle, near the (now draggable) scale |
| "Start processing" | no scope cue | "Analyze all images" / "Analyze N selected" |

---

## 7. Build slices (when approved)
- **R1 — Two-mode Library rail** (Auto-process button + Advanced disclosure; Manual-tune
  block; demote profiles/report-set). Highest clarity ROI.
- **R2 — Drop Time-lapse tab; flatten Inspect sub-tabs** into the single rail.
- **R3 — Button/label cleanup pass** (§6) + mount summary bar.
- **R4 — Upload fixes** (finalize status + double-session guard) (§5).
- **R5 — Deliver flatten.**
- Verify each in `/preview/thermal-studio` by measuring the DOM (screenshots time out).

## 7b. The 2×2 processing model (recommended core simplification)

Collapse the four scattered processing entry points (upload "Start Analysis",
Library "Start processing", Batch Tune, Inspection Profiles) into ONE mental model
mapped to TWO screens — no redundant buttons:

| | Single (one image) | Batch (selected / all) |
|---|---|---|
| **Auto** (cloud: decode + detect) | "Analyze this image" in **Inspect** | "Analyze N selected / all" in **Library** |
| **Manual** (client: scale/span, palette, spots, emissivity) | tune the open image in **Inspect** (draggable scale shipped) | "Apply tune to N" in **Library** |

- Library = batch home: one scope-aware **Analyze** button + **Apply tune to N**;
  decode/find/report toggles behind "Advanced".
- Inspect = single + manual home: tune controls + one **Analyze this image** button.

## 8. Resilience (SHIPPED 2026-06-23)
- `ThermalJobStatusBar` now shows a "Cloud processing hasn't started — likely paused on
  Trigger.dev (credits/billing)" warning when a job stays queued > 90s, instead of an
  endless spinner. (`created_at` added to `useThermalJobRealtime` snapshot.)
- Fixed a pre-existing SSR crash: `ThermalTwinOverlayMap` (Leaflet, touches `window`) is
  now loaded via `next/dynamic({ ssr:false })` in `ThermalTwinLayerPanel` — the Deliver tab
  / preview were 500ing on server render.

## 9. Prompt for external AI review
A self-contained prompt describing all 5 tabs, components, buttons, the 2×2 goal, and the
known problems (overflow, unusable reports, redundant buttons) is maintained for gathering
outside workflow advice — see the session where this was produced. Question set: tab count,
how to trigger each 2×2 cell with minimal buttons, end-to-end happy paths (full-auto vs
hand-tune), keeping each tab no-scroll, ideal report page contents, and what to delete.

## 9b. FINALIZED after external AI review (4 assistants converged)

**Tabs: 3 core + Motion-as-tool.** Images · Inspect · Report (Deliver MERGED into Report's
right rail). Motion/Time-lapse is NOT deleted (Brian wants it capable) — it moves to a
**Tools (···) menu** as a full secondary workspace (keep all `ThermalMotionStudio` editing
tools) + a contextual "Create sequence video" action in Images for same-location series.

**2×2 → exactly two controls:**
- Automated = one **Run analysis** button on Images + scope toggle (Selected N / All) +
  **preset dropdown** that replaces BOTH the decode/find/report checkboxes AND the
  Inspection Profiles panel: Full inspection (default, full_pipeline) / Prepare images only
  (extract) / Find problems only (analyze) / Refresh report data (report) / [saved profiles].
- Manual = Inspect tab (single) + Images **selection-bar "Apply settings to N" sheet**
  (batch; absorbs ThermalBatchTunePanel). Auto-single = "Re-analyze" in Inspect.
- Kills all 4 duplicate processing entry points (upload screen, Library checkboxes, Batch
  Tune card, Profiles card) → two paths.

**Right-rail rule:** ONE context-aware panel / accordion per tab. Never 4 stacked cards
(this was the overflow root cause).

**Generic cross-trade language (from AI #4 — important):** Thermal Studio is a GENERAL
thermal inspection platform, NOT trade-locked. Use "thermal anomaly / temperature
differential / pattern / observation"; severity = Informational / Monitor / Review
Recommended / Action Recommended / Priority Action. Inspection profiles OPTIONAL: General
Thermal Inspection (default) / Building-Facility / Electrical-Equipment / Roof-Envelope /
Mechanical-HVAC / Drone Survey / Custom. No moisture/electrical defaults.

**Report = P0 (not P2):** Brian flagged reports unusable. Per-finding detail page: thermal +
matching visible photo side-by-side, measurement/ΔT table, severity, generic observation +
inspector narrative, conditions, logo + Level III cert. Front matter (cover/exec/method) +
back matter (recommendations/disclaimer/signature).

**Build order:** P0 = retab 5→3 (merge Deliver→Report; Motion→Tools), Images right rail →
one Actions panel w/ Run+preset, selection bar + Batch Tune sheet, remove dup entry points,
+ report detail-layout rebuild. P1 = first-upload 2×2 banner, Inspect accordion rail,
generic language + profiles. P2 = Motion polish, rename cryptic controls, overflow sweep.

**Layout = Content Studio continuity (Brian requirement):** thin top bar → stage tabs →
flex body, ONLY center pane fills, fixed-width rails w/ internal scroll, 100dvh /
overflow-hidden. Same skeleton as components/content-studio + design-studio workspaces.

## 9c. Import safety (LOCKED) + analysis interpretation fix

**Import wizard — LOCKED design (teach once, default-safe, validate always):**
- Default the import CTA to "Import original files" (document picker / Files / drag-drop —
  preserves embedded radiometric data); make "from Photos/camera roll" secondary with a
  caution (Photos/AirDrop recompression strips the thermal data).
- Folded-in "?" helper next to the dropzone → lightweight sheet with the 3 safe methods
  (SD reader→Files, USB-C, share the original). Expanded once on first use, then collapses
  to "?". NOT a mandatory per-import wizard (expert friction).
- **Radiometric validation on import = the real guardrail.** Per-image badge: ✓ Radiometric
  vs ⚠ "No temperature data — re-import the original." Reuse existing is_radiometric /
  npz_data_path; optionally a fast header pre-check (FLIR APP1 / DJI / HikMicro markers)
  before spending a job. Optional later: EXIF camera model → camera-specific instructions.
- Part of P0 Images work.

**Analysis interpretation — ROOT CAUSE FOUND + fix (Brian: front door described as
"electrical"):** `lib/thermal/anomaly-describe.ts:114` hardcodes cause guesses by anomaly
SHAPE (focal→"electrical resistance/loose connection/mechanical friction",
diffuse→air-leak/moisture, linear→piping/wiring) with NO scene understanding. Detection is
fine; the interpretation is a canned assumption → absurd for envelope/energy/leak work.
Fix in 3 layers:
1. **Observation-first default (easy, contained):** describe the pattern (focal hot spot,
   peak, ΔT vs surroundings, shape) WITHOUT asserting a cause. Same fix in report.py's
   describe copy. Principle: detection objective; interpretation = expert.
2. **Cause hints scoped to selected inspection profile** (Electrical→connection, Building→
   air-leak/bridging/insulation, General default→neutral).
3. **Vision pass (real upgrade):** feed thermal + paired visible image (visual_pair_id) +
   anomaly geometry + metadata to a VLM → scene-grounded, editable DRAFT finding the
   thermographer confirms; never assert a cause the model can't see. External-AI prompt for
   architecture options recorded this session.

## 9d. Context-aware analysis pipeline (LOCKED after 4 external AIs — unanimous)

**Principle: SHAPE ≠ CAUSE.** Detector (analyze.py) is correct; replace the hardcoded
interpretation in `anomaly-describe.ts` entirely. Agreed pipeline:
`detect (keep) → scene-classify (VLM on VISIBLE photo) → per-anomaly interpret (inject
numeric facts, NOT colors) → code validator/gate → expert confirms → report`.

**Non-negotiables (all 4 agreed):**
1. VLM on VISIBLE photo primary; NEVER false-color thermal as primary (hue read as
   semantics → the door→electrical bug). If thermal sent: grayscale + bbox only.
2. Temperatures authoritative from analyze.py; VLM never estimates temps (inject as facts).
3. Profile sets vocabulary priors; SCENE wins on conflict.
   `allowed_causes = PROFILE_CAUSES ∩ SCENE_CAUSES`; empty → neutral + "⚠ Profile mismatch".
4. Validator in CODE (strip model numbers, enforce taxonomy, veto unsupported causes,
   confidence gate, fallback to neutral observation — NEVER shape→electrical).
5. Observation-first defensible language: Observation / Possible contributors / Recommended
   follow-up. Ban "caused by/proves/failure/defect"; allow "may indicate/consistent with/at
   the time of capture". Renderer enforces (not prompt). Only expert-CONFIRMED suggestions
   ship. Immutable measurement layer + audit trail for legal/insurance.
6. Expert confirms all; suggestions default unchecked; edits = future training data.

**My calls on differences:** ship Response-2 two-stage MVP + Response-1 validator gates +
Response-2 bbox-on-visible grounding trick; Response-4 approved-phrase library = phase 2;
fine-tune only after 2000+ expert-edited pairs.

**Model caveat:** all 4 (incl. neutral ones) picked Claude 3.5 Sonnet for visual grounding
(GPT-4o/Gemini close). Current `lib/server/ai-provider.ts` = Groq/OpenAI Llama TEXT-ONLY
(not multimodal) → this ADDS a vision model; key in MODAL secret (heavy-keys-in-Modal rule).

**Codebase map:** new `workers/modal/.../interpret.py` (scene+interpret after analyze, before
report); validator + cause-taxonomy JSON (versioned, per discipline) in `lib/thermal/`;
extend `InspectionProfile` with discipline + cause_taxonomy_id; `ThermalFindingDraft`
(measurement immutable / observation / suggestions w/ confirmed flag / provenance) →
capture.metadata.findings; reuse existing draft-findings API + expert review UI; report.py
renderer enforces copy rules + ships only confirmed. Meter AI credits per capture.

**Phasing:** P0 = neutral observation-first language NOW (no AI, contained — kills absurd
output, ship with workflow rebuild). P1 = interpret.py pipeline + validator + confidence/
conflict badges + credit metering. P2 = phrase library + discipline taxonomies + few-shot
+ expert-edit feedback log. P3 = fine-tune small model.

## 10. Hard dependency (not UI)
None of this lets a user see results until the **Trigger.dev account dequeues jobs** — runs
currently sit `queued` (0 attempts, correct config) = concurrency/billing limit on
cloud.trigger.dev. Clear that first; otherwise even a perfect UI ends at a spinner.
