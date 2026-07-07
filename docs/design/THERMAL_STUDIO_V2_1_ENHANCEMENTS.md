# Thermal Studio V2.1 — Enhancement Addendum (approved by Brian, 2026-07-06)

> Extends `THERMAL_STUDIO_V2_REBUILD_LOCKED.md` (which stays authoritative for §0 product
> rules and §1b workflow guarantees — everything here inherits them). Inputs: Brian's
> live-preview design review (2026-07-06), the 19-screenshot FLIR Thermal Studio / FLIR
> Tools teardown, and a thermography-practice review. Goal: move from "viewer with
> measurements" to a genuine FLIR-replacement analysis suite with best-in-class deliverables.
>
> Status at time of writing: S1–S5 SHIPPED behind `/preview/thermal-v2` (flat shell,
> Library, Analyze viewer + measurements + tuning/display + scope batch with Keep/Undo).
> S6–S8.5 not yet built. S9 swap still HELD for Brian's approval.

---

## 0. Human-factors rules added to the §0 canon (apply to every remaining slice)

These are promoted to the same non-negotiable status as the original §0 rules:

1. **Open → work in one action.** Every tab must be workable the moment it opens: the
   Library accepts a drop anywhere on the window (global drop target, not just the rail
   dropzone); an empty session shows ONE primary action, not an explainer. No screen may
   greet the user with only descriptive text.
2. **The two most-used controls sit together.** Tool switching and palette/span live in one
   toolbar cluster (left-anchored), not at opposite ends of the bar. A thermographer's
   loop is look → measure → re-palette → re-span; that loop must never cross the screen.
3. **Prev/next is always one key away.** `[` `]` (and ←/→ when the canvas has focus) move
   through the working set from ANY tab that shows an image. Inline ‹ › arrows flank the
   image counter in the Analyze toolbar (FLIR's "1/161" pattern).
4. **Every number the operator reads is trustworthy.** All readouts derive from the one
   tuned grid (§1b.2). Anything estimated or non-radiometric is labeled so ("display-only").
5. **Copy/paste settings as a first-class verb.** Alongside scope-apply: `Copy settings`
   (palette + span + tuning + alarm) on any image, `Paste settings` on any image/selection —
   a clipboard mental model operators already have. Keyboard: Ctrl+Shift+C / Ctrl+Shift+V.
6. **Command palette.** ⌘K opens the platform command palette scoped to Thermal Studio
   (jump to image by name, switch tab, run decode/AI, toggle °C/°F, apply palette by name).

## 1. Analyze tab — completing the measurement suite (S5.5)

New slice **S5.5 — Analyze completeness** (build next, before S6):

- **Tuning fields:** add `Ext. optics temp`, `Ext. optics transmission`, `Reference temp`
  (the 3 missing FLIR parameters; PATCH route already accepts arbitrary tuning keys —
  verify against `TuningPayload` and extend the type additively if needed).
- **Notes & photo data accordion (real):** findings note textarea (autosave to existing
  `findings` PATCH field), camera model/serial/lens/filter + resolution + file size +
  created/modified (from `qualityMetrics`/`metadata`), GPS coordinates + mini-map +
  compass when present, capture range. This is the stubbed placeholder made real.
- **Auto Min/Max spotmeters:** one-click "Mark hottest / Mark coldest" places managed
  markers on the extreme pixels of the CURRENT scope (image or within an area shape).
  They re-seat live when tuning/span changes the grid. Deletable like any measurement.
- **Circle area tool:** expose the `areaShape: "circle"` the type already supports as a
  toolbar option (Area ▾ → Box | Circle).
- **Polygon area tool:** click-to-add-vertices, double-click/Enter to close; stats via
  point-in-polygon sampling in `spot-stats` (additive helper, keep the lib pure).
- **Δ between any two measurements:** long-press/right-click a row → "Compare to…" (in
  addition to the single global reference star).
- **Line profile chart:** selecting a Line measurement opens a temperature-vs-distance
  chart in the right rail (we already sample along the segment in `spotStats`; render the
  samples, don't just average them). Min/max/avg markers on the chart.
- **Loupe upgrades:** crosshair + center-pixel temp readout burned into the loupe; at
  ≥6× show the pixel grid. Optional "snap loupe to hottest pixel under cursor (3×3)".

## 2. Alarms — generalize the isotherm (S5.6)

FLIR ships 6 alarm modes; we ship 1 (interval isotherm). New slice **S5.6 — Alarm modes**:

- **Above / Below / Interval** — colorize only pixels above/below/between limits (the
  existing isotherm render path parameterized; out-of-band stays dimmed grayscale).
- **Humidity (dew-point) alarm** — from Relative humidity + Atmospheric temp already in
  Tuning, compute dew point (Magnus formula, `lib/thermal` pure helper) and flag pixels
  at or below `dewpoint + margin`. This is the condensation-risk tool building
  thermographers use daily.
- **Insulation alarm** — operator enters indoor temp, outdoor temp, and an insulation
  factor (default 0.6); flags pixels below the calculated insulation-deficit threshold.
- **Severity bands (ΔT classification)** — optional per-session bands mapping ΔT vs
  reference to Advisory / Warning / Critical with editable thresholds. Ship neutral
  defaults plus opt-in presets labeled by standard (e.g. NETA-style ΔT bands for
  electrical, RESNET-style for envelope) — presets ONLY apply language/thresholds when
  the operator picks them, per §1b.4. Severity chips render red/sky/neutral (amber ban).
- Alarm state is part of "settings" for copy/paste + scope-apply + Batch Recipe.

## 3. Compare & Fusion (S6.5, after AI Review)

- **Side-by-side compare:** any two images from the working set, synced zoom/pan, synced
  span (optional lock), each with its own readout. Primary use: before/after and
  similar-load electrical comparisons.
- **Thermal ↔ visual blend:** for auto-paired images (pairing exists since S2), a blend
  slider + picture-in-picture mode; alignment nudge (offset + scale) persisted to the
  capture. This was in the original locked spec — build it here.
- **Normalize scale across set:** "Lock this span across Selected/All" — one action that
  applies the current lo/hi to the scope with Keep/Undo, so a report's images share one
  scale (FLIR's "Normalize temperature scale" home action). Cheap: reuses S5 batch apply.

## 4. Report tab — click-through templates, synced + branded (S7, upgraded scope)

The existing S7 plan stands; these are added requirements:

- **Template gallery = click-through picker with real page previews** (FLIR-style):
  large visual thumbnails, hover → multi-page preview rail, one click to select. Seed
  gallery with 5 equivalents of FLIR's set (Header & Footer only; Photo Details;
  Photo + Profile/Histogram; Photo ×2 Details; ×2 Comparison) plus Slate360's richer
  default (photo + full metadata + findings, 2-up).
- **Synced org templates:** templates live in the existing `thermal_report_templates`
  table (GET/POST routes already exist) so every session/user sees the same library;
  "Save current layout as template" writes back to it. No new backend semantics — just
  the picker UI over the existing API.
- **Branding block:** logo upload, company name, footer, accent color, and the
  thermographer certification line (e.g. ITC Level III cert number) as a per-org saved
  branding profile — entered once, applied to every report. NEVER hardcode the cert.
- **Severity summary page:** when severity bands are on, the report auto-includes a
  findings-by-severity table (counts + worst ΔT + page links).
- **Funnel flow:** Library/AI Review "Add N to report ★" → Report opens with those images
  in the outline → pick template → preview updates live → Generate. The operator should
  reach a finished PDF in ≤ 4 clicks from a curated set.

## 5. Deliver tab — PDF, link, and the cinematic option (S7.5 + S8)

New slice **S7.5 — Cinematic share deliverable** (can land with S8):

- **Three delivery shapes, one picker:** `PDF download` · `Interactive link` ·
  `Cinematic slideshow link`. All three read the same report set + findings.
- **Cinematic slideshow:** full-bleed dark viewer (reuse the platform's deliverable-viewer
  patterns): branded title card → per-image slides with slow Ken Burns pan/zoom, crossfade,
  temp scale + key measurements fading in, finding text as lower-third captions, optional
  thermal↔visual reveal wipe on paired images → closing card with contact/branding.
  Auto-advance with manual override; keyboard/touch nav; respects `prefers-reduced-motion`.
  Token-gated like the existing share viewer, password/expiry supported.
- **Interactive link:** the existing planned share viewer (browse, per-image Q&A) — keep.
- **Video import + frame extraction:** Library accepts radiometric video (SEQ/CSQ/MP4);
  a Modal job extracts frames into normal capture rows (cloud-side per the architecture
  principle — no client-side decoding). Deliver's Time-lapse section renders stills → MP4
  as already planned. Together these close FLIR's video loop in both directions.

## 6. Batch Recipes — our answer to FLIR Batch Processing (B1–B2, after S8.5)

Not a clone of FLIR's 45-job drag pipeline. A **Batch Recipe** is: pick a Scope (the
global pill) → toggle on operation groups → run once as a tracked background job:

- Operation groups (v1): `Decode` · `Apply settings` (palette/span/tuning/alarm — from
  current image or a saved settings preset) · `Run AI detect` · `Add to report` ·
  `Export package` (Clean/Annotated PNG + CSV + JSON sidecars → ZIP).
- Recipes are saveable + rerunnable ("Roof survey intake": decode → apply Iron + NETA
  bands → AI detect → add flagged to report). Progress chip in the top bar; results end
  with the standard Keep/Undo toast where reversible, and a summary sheet where not.
- **B1** = recipe builder UI + client-orchestrated runs over existing APIs.
  **B2** = server-side runner (one Trigger job that fans out) only if B1's client
  orchestration proves too slow for 500+ image sets. Backend stays untouched for B1.

## 7. Layout & chrome refinements (fold into whichever slice touches each area next)

- Analyze toolbar regrouped: `[Move/Select · Point · Area▾ · Line · Polygon] [Palette ·
  Span lock · °C/°F] [↶ ↷] ——— [‹ 3/24 › · hover °] `. Tools and palette adjacent (rule 0.2).
- Working-set rows show a micro thermal thumbnail (decoded preview) instead of an empty
  square when no previewUrl exists — render a 24px canvas from the cached grid.
- Filmstrip thumbnails paint from the radiometric grid with the image's own palette (not
  the camera JPEG), so the strip reflects what the operator actually sees.
- Right-rail accordions: sticky mini-summary at top (image max/min/avg — always visible
  even with Measurements collapsed).
- Empty-state copy audit: every empty region names the ONE next action, present tense.

## 8. Standalone app (A-slices) — deltas only

The A0–A6 plan stands. Additions for parity with this addendum:

- A2 gains circle/polygon + auto min/max spotmeters (same lifecycle code, copied into
  `packages/thermal-core` per A0's no-imports rule).
- A3 gains Copy/Paste settings; A5's AI severity chips use the same neutral band system.
- New **A5.5 — Video import (app):** pick a thermal video from Files → cloud frame
  extraction → frames appear in the app library. Reuses the S8 Modal job.
- Cinematic slideshow is desktop-authored; the app gets "share existing link" only
  (consistent with the app-as-subset rule).

## 9. Updated build order (remaining work)

| # | Slice | Contents | Size |
|---|-------|----------|------|
| 1 | **S5.5** | Analyze completeness: 3 tuning fields, Notes & photo data, auto min/max, circle+polygon, Δ-between, line profile chart, loupe upgrades | 1–2 pushes |
| 2 | **S5.6** | Alarm modes: above/below/interval, dew-point, insulation, severity bands + presets | 1 push |
| 3 | **S6** | AI Review (as locked) + severity-sorted triage queue + optional context field | 1–2 pushes |
| 4 | **S6.5** | Compare + fusion blend + normalize-scale-across-set | 1 push |
| 5 | **S7** | Report with upgraded template gallery, synced org templates, branding profile, severity summary | 2 pushes |
| 6 | **S7.5** | Cinematic slideshow deliverable | 1–2 pushes |
| 7 | **S8** | Deliver: share/exports/timelapse/map/Q&A + video import & frame extraction | 2 pushes |
| 8 | **S8.5** | Export engine (as locked) | 1 push |
| 9 | **B1** | Batch Recipes (client-orchestrated) | 1–2 pushes |
| 10 | **S9** | Swap + delete old UI — **still HELD for Brian's explicit approval** | — |

Gates unchanged: scoped tsc, guard:design, guard:architecture, preview_eval no-scroll +
§1b checks, push per verified slice. Backend untouched except where a NEW Modal/Trigger
job is explicitly called out (video frame extraction, B2 if ever needed) — those follow
the standard deploy rules and do not modify existing workers.
