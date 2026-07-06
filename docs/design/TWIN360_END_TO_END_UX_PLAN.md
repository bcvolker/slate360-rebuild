# Twin 360 — End-to-End UX & Build Plan (capture → edit → deliver)

Status: **proposed** (written 2026-07-05, from the user's perspective, grounded in a
full code audit of what exists vs. what's missing). Companion to
`OPTIMIZED_BUILD_PLAN_LOCKED.md` and `DESKTOP_COCKPIT_LOCKED.md`; this doc is the
Twin-360-specific journey those docs assume but never spell out screen-by-screen.

---

## 1. Who this is for (the user, not the operator)

Three jobs-to-be-done drive every screen below:

1. **The field capturer** — phone in hand, on a job site, often gloved, often
   offline-ish. Wants: press record, walk, submit, leave. Never wants to "manage"
   anything on the phone.
2. **The deliverable maker** — same person or a colleague, later, at a desk.
   Wants: open the scan, crop the junk, straighten it, check it looks right,
   then produce THE THING — a link, an embed, a file for the architect, or
   dimensions for a proposal.
3. **The recipient** — architect, owner, stakeholder. Never logs in. Gets a link
   (or an embed on a website, or a `.ply` file into design software) and needs it
   to look professional and be understandable in the first five seconds.

**Form-factor rule (from CLAUDE.md, reaffirmed here):** phone = capture + review +
*light* cleanup + share. Desktop = deep editing, exports, measurements-as-deliverable,
embeds, branding. We do not port precision tools to the phone.

---

## 2. Ground truth — what exists today (audited, not assumed)

| Capability | State | Evidence |
|---|---|---|
| Native ARKit/LiDAR capture, resumable upload | ✅ works | `ios/App/.../LiDARCapture/`, background URLSession uploader |
| Cloud reconstruction (COLMAP-first, metric scale, measured orientation, auto-crop, capture-pose opening view) | ✅ works (R7/R8 fixes) | `worker.py` |
| Share link + no-login viewer (orbit/walk/measure/pin/comment) | ✅ works | `app/share/twin/[token]`, `TwinShareAnnotateShell` |
| Desktop splat editor — crop / erase / slice / transform, **non-destructive overlays** saved per model | ✅ works, desktop only | `/digital-twin/twins/{id}/editor`, `edit_list` column |
| Measure tool with real-world units | ✅ works (post-Q1) | `metric_scale_applied`, tape-measure check pending |
| Floor-plan PNG per model | ⚠️ generated but **invisible** — API route exists, zero UI consumers | `floorplan_storage_key`, `/api/.../floor-plan` |
| Download via share token | ⚠️ `.spz` only — useless to architects (no CAD/design tool reads it) | `lib/digital-twin/share-download.ts` |
| Progression compare (two captures of same space) | ✅ works, desktop | `ProgressionCompareViewer` |
| Cinematic camera path | ⚠️ editor works; **MP4 export is a TODO** | `CinematicCameraPath.tsx` |
| Reprocess a bad model | ❌ CLI-only (ops scripts) — no user path at all | `scripts/ops/dispatch-twin-experiment.mjs` |
| Mobile editing (any kind) | ❌ none | — |
| Destructive edit bake (edits applied to the shipped file) | ❌ none — overlays are viewer-only; downloaded file still has the mess | `splat-edit-runtime.ts` |
| Embed on external websites | ❌ none (was falsely marketed; copy fixed 2026-07-05) | — |
| Square-footage / area calculation | ❌ none (only point-to-point measure) | — |
| 360 photo input | ⚠️ unwrap exists but gated on a filename heuristic ("360"/"pano" in name) — most real 360 photos silently mis-ingested | `twin-review-media.ts:37`, `extract_equirect_views` |
| 360 video input | ❌ frames extracted as distorted panoramas; no unwrap path | `worker.py` |
| Georeferencing / real-world context | ❌ `georef` column always `{}` | — |
| White-label branding on shares | ⚠️ enterprise-gated, wiring incomplete | `branding_snapshot` column |

**The core structural flaw:** processing-complete flows *directly* to share with no
review step, no fix path, and no export path beyond a raw `.spz`. Everything below
is organized around inserting and equipping that missing middle.

---

## 3. The optimized end-to-end journey

```
 PHONE                          CLOUD                    PHONE or DESKTOP              DESKTOP                      ANY
┌────────────┐   ┌──────────────────────────┐   ┌─────────────────────────┐   ┌────────────────────┐   ┌──────────────────────┐
│ A. CAPTURE │ → │ B. PROCESS (existing)    │ → │ C. REVIEW GATE (new)    │ → │ D. STUDIO (edit)   │ → │ E. DELIVER           │
│ record,    │   │ upload → job → model +   │   │ preview · publish ·     │   │ crop/erase/level   │   │ link · embed · file  │
│ submit     │   │ floorplan + manifest     │   │ reprocess · edit        │   │ bake · measure     │   │ export · floor plan  │
└────────────┘   └──────────────────────────┘   └─────────────────────────┘   └────────────────────┘   │ dimensions · video   │
                                                                                                        └──────────────────────┘
```

### Stage A — Capture (phone; exists, quality-input improvements only)
- Native ARKit capture as today. Multi-clip remains on its existing track.
- **A1 (input quality):** fix 360-photo detection — decide by image aspect ratio
  (~2:1 equirect) instead of filename. Today a real 360 photo without "360" in its
  name poisons the reconstruction as one distorted perspective frame.
- **A2 (input quality):** 360-video ingestion — extract frames, then run the
  *existing* equirect unwrap on each frame (~12 perspective views per frame, shared
  optical center). New worker path; charges more credits honestly (more frames).
- Add sources screen already handles photos/video/`.ply` (post-C4 honest-inputs).

### Stage B — Process (cloud; exists)
No changes beyond A1/A2. Every job already produces: `.spz` + `manifest.json`
(orientation, initial camera, metric scale) + `floorplan.png` + quality metrics.

### Stage C — Review Gate (NEW — the single most important new screen)
Where "processing complete" lands, on **both** phone and desktop:
- Live viewer opening at the captured pose (R8) — the user sees exactly what a
  recipient would see.
- Four actions, one decision: **Publish** (make this the live model) ·
  **Reprocess** (re-run: quality tier picker + credit estimate; new model row,
  old kept — user picks the winner) · **Edit in Studio** (desktop; phone shows
  "open on desktop" handoff + light-cleanup entry) · **Delete**.
- Publish is what flips `published_model_id` — shares stop silently pointing at
  whatever the pipeline last produced. (Protects every existing link from the
  "jumbled mess" first-impression problem.)

### Stage D — Studio (desktop-first editing; exists in part)
The current editor route grows from "overlay toolbox" into the deliverable-maker's
workbench, organized as tabs within one screen (no scrolling lists — workspace rule):

- **Clean** (exists): crop / erase / slice / transform overlays, layers panel.
  - **D1 (new): Bake.** "Apply edits to file" → server job reads `edit_list`,
    filters the PLY by the saved regions, re-exports `.spz` (+ export formats),
    regenerates manifest + floor plan. Non-destructive editing stays the default;
    bake is explicit, creates a new model version, and is what download/embed serve.
  - **D2 (new): Level & center** — manual upright/rotate control (the "twin
    upside-down cure" chip from the UI backlog) for when measured orientation
    isn't enough.
- **Measure** (grows): point-to-point exists. Add **area tool** (click a polygon on
  the floor plane → square footage, using metric scale) and a **saved-dimensions
  panel** (named measurements: "kitchen W door", "garage opening") exportable as
  CSV/PDF — this is the proposal-writing feature.
- **Floor plan** (new tab, cheap): surface the already-generated PNG. Download it,
  attach it to the share page as a second deliverable. (Was already a "quick win"
  in the backlog; it belongs here.)
- **Compare** (exists): progression timeline, unchanged.
- **Cinematic** (exists, partial): finish MP4 export server-side or remove the tab
  until it's real — no dead buttons (store rule 4.2).

**Phone light-cleanup (D3, after D1):** erase-only brush in a phone-sized UI, same
overlay mechanism, for "delete that floater blob before I share from the truck."
Crop/slice/transform stay desktop-only. Deliberately.

### Stage E — Deliver (the reason the product exists)
One **Share & Export** panel, reachable from the review gate and the studio:

- **Link** (exists): roles view/annotate/download, expiry, max views, password.
  Branding snapshot honored per tier (finish white-label wiring at Enterprise).
- **E1 (new): File export for professionals.** Server-side conversion job from the
  (baked) model: **`.ply`** (point cloud — imports into Revit/Recon/CloudCompare
  workflows) and **`.glb`** (mesh-ish splat transport for web/3D tools) to start;
  `.e57` later if demand shows. Delivered as a signed download + saved into the
  project's SlateDrop Deliverables folder (persistence rule). This is what "send it
  to the architect" actually means — the current `.spz`-only download does not do
  this job. Note: C5 removed ply/glb as *reconstruction* output formats; export is
  a separate, honest conversion step from the finished model, so no conflict.
- **E2 (new): Embed.** `/embed/twin/{token}` minimal-chrome viewer + a copy-paste
  `<iframe>` snippet in the share panel. Reuses share-token infra (new `embed`
  role or reuse `view`), CSP/frame-ancestors opened for that route only.
- **Floor plan download** (from D-tab work) and **dimensions CSV/PDF** (from
  Measure) round out the deliverable set.

---

## 4. Screen & tab inventory

### Mobile app (Twin 360 surface)
| # | Screen | Status | Notes |
|---|---|---|---|
| M1 | Hub (spaces/twins list) | exists | keep; already filtered post-D4/D5 |
| M2 | Capture (native HUD) | exists | untouched by this plan |
| M3 | Submit: clips → sources → quality → confirm | exists | post-C4/C5 honest inputs/pricing |
| M4 | Processing status | exists | progress heartbeat already live |
| M5 | **Review gate** | **NEW** | publish / reprocess / edit-handoff / delete |
| M6 | **Reprocess sheet** | **NEW** | quality picker + credit estimate + confirm |
| M7 | **Light cleanup (erase brush)** | **NEW (after bake)** | erase-only, overlay mechanism |
| M8 | Share sheet | exists, grows | add floor-plan + "more on desktop" pointers |
| M9 | Viewer (orbit/walk/measure) | exists | R8 opening view; pinch-zoom shipped |

### Desktop — Twin 360 dashboard tab
| # | Screen / tab | Status | Notes |
|---|---|---|---|
| D1 | Twin hub (spaces, models per space, versions) | exists, needs version picker | show model versions per space; publish switch |
| D2 | **Review gate** (same component as M5, desktop layout) | **NEW** | the post-processing landing |
| D3 | Studio → Clean | exists | + **Bake** + **Level & center** |
| D4 | Studio → Measure | grows | + area/sq-ft tool + saved dimensions + CSV/PDF export |
| D5 | Studio → Floor plan | **NEW (cheap)** | surface existing PNG; download; attach to share |
| D6 | Studio → Compare (progression) | exists | unchanged |
| D7 | Studio → Cinematic | exists, partial | finish MP4 export or hide tab |
| D8 | **Share & Export panel** | **NEW (absorbs existing share actions)** | link · embed snippet · file export · floor plan · dimensions |
| D9 | Upload (desktop capture-less intake) | exists | desktop = upload not capture |

### Recipient surfaces (no login)
| # | Surface | Status |
|---|---|---|
| R1 | Share viewer | exists (keep improving nav) |
| R2 | **Embed viewer** (minimal chrome) | **NEW** |
| R3 | Download landing (role=download) | exists; serves baked model + chosen export format after E1 |

---

## 5. Build sequence

Ordered by user pain × leverage; each slice ships and is verified (R7.5 visual gate
stays mandatory for anything touching what a recipient sees).

| Slice | What | Size | Depends on |
|---|---|---|---|
| **0** | **Reprocess** — API route (reuse the proven CLI dispatch path) + M6 sheet + entry on status screen | S | nothing — already agreed as first |
| **1** | **Review gate** (M5/D2) + publish switch + version picker on hub | M | 0 (reprocess lives on it) |
| **2** | **Floor-plan surfacing** (D5 + share attachment + mobile share sheet) | S | nothing |
| **3** | **Bake** (D1 server job: edit_list → rewritten export) + model versioning | M/L | 1 |
| **4** | **File export** for architects (`.ply`/`.glb` conversion job + SlateDrop persistence + download UI) | M | 3 (export the baked model) |
| **5** | **Area / sq-ft tool + saved dimensions + CSV/PDF** | M | metric scale verified (tape-measure check) |
| **6** | **Embed** route + iframe snippet + CSP | S/M | 1 (publish gate protects embeds) |
| **7** | **Mobile erase brush** (M7) | M | 3 (erase that can bake) |
| **8** | **Input quality**: 360-photo aspect-ratio detection fix (S) then 360-video unwrap path (M) | S+M | independent — can interleave |
| **9** | Level & center control · white-label wiring · cinematic MP4-or-hide | M | opportunistic |

Rough shape: slices 0–2 are one focused push (the "stop sending broken links" package);
3–4 are the "professional deliverable" package; 5–6 the "proposal & website" package;
7–9 polish.

---

## 6. Backend work implied (per slice)

- **0:** `POST /api/digital-twin/models/{id}/reprocess` — same auth/credits pattern as
  job creation; reuses existing dispatch. No worker changes.
- **1:** publish endpoint already exists in spirit (`published_model_id` + `is_primary`
  flips done manually all session) — formalize as `POST .../publish`, plus hub query
  returning versions per space.
- **3:** new worker entry `bake_edits(model_id)` — download model source PLY (keep the
  raw `model_cropped.ply` in R2 at job time to avoid spz→ply roundtrip), apply
  edit_list geometry filters, re-run export + manifest + floorplan. New model row,
  `parent_model_id` column (additive migration).
- **4:** worker `export_model(model_id, format)` — ply passthrough of baked PLY; glb via
  splat-transform; upload to R2 + SlateDrop registration.
- **5:** viewer-side only (area math from picked polygon × metric scale) + a
  `twin_measurements` extension for named/saved dimensions (table exists for measure).
- **6:** embed route + `frame-ancestors` CSP exception for `/embed/**` only.
- **8:** worker ingest changes (aspect-ratio 360 detection; per-frame equirect unwrap
  for 360 video) + honest credit accounting for the frame multiplication.

---

## 7. Open decisions (Brian)

1. **Reprocess pricing** — full price re-charge, discounted, or one free retry per
   capture? (Recommend: one free retry when the ready-gate metrics were marginal;
   full price otherwise. Needs a business call.)
2. **Bake destructiveness** — keep every pre-bake version forever (storage cost) or
   keep last N? (Recommend: keep original + latest bake; archive middles.)
3. **Export formats v1** — `.ply` + `.glb` proposed; is `.e57`/`.obj` demanded by the
   architects you're targeting? (Affects slice-4 scope.)
4. **Embed policy** — free on Pro or Enterprise-only (it's a white-label-adjacent
   feature)?
5. **Sq-ft disclaimer** — area figures inherit the "approximate, derived from device
   motion tracking" caveat; confirm acceptable for proposal use (it's an estimate
   aid, not a survey).

---

*Cross-references: `TWIN360_CAPTURE_GAPS.md` (task ledger), `DESKTOP_COCKPIT_LOCKED.md`
(shell), `ROOMPLAN_TWIN_LOCKED.md` (measurement layer), `docs/specs/ASC_IAP_CHECKLIST.md`
(monetization), memory `slate360-twin-resumable-uploader-shipped` (capture track).*

---

## 8. Reprioritization 2026-07-06 (on-device feedback)

Brian tested Slices 0–2 on-device. Findings + resulting plan changes:

**Confirmed / fixed (mine):**
- New home (Slice 2) shipped, then follow-up fixes: feed is now a contained
  internally-scrolling area in a full-height column (was: uncontained list ran
  off-screen + ~40% page-length void); New Scan control enlarged; home title →
  "Twin 360".

**Newly surfaced, now reprioritized:**
1. **Twin DETAIL screen is the next slice (was later).** It's the actively-broken
   surface: on mobile the old page stacks header + DesktopWorkspaceLinks +
   viewer (absolute canvas, unconstrained → overlaps) + share + measurements +
   the Slice-0 versions panel (which shows a LONG raw list on spaces with many
   R7/R8 experiment models) + disclaimer — reading as "multiple overlapping
   screens, pills, a list running off the page, a red model-load error box."
   Slice 0 bolted the versions panel onto this old page instead of rebuilding it
   — a patch, not a reimagining. **Rebuild ground-up:** viewer as height-bounded
   hero; ONE clear action bar (Share / Reprocess / Publish / Edit-on-desktop);
   compact version control (current + "N versions" expander, not a raw list);
   clean model-load-failed state (replace the raw red box); secondary sections
   (measurements/GPS) collapsed, not stacked raw.
2. **"Twin 360" naming sweep.** In-app header/labels still say "Digital Twin"
   (~22 files, mixed visible strings + comments). apps-config already uses
   "Twin 360". Do a focused visible-label sweep (header title, module nav, page
   titles) → "Twin 360". Routes stay `/digital-twin`.
3. **Desktop dashboard "Digital Twin" section is entirely old slop** — untouched
   ground-up rebuild needed (separate desktop surface; same reimagine-not-patch
   rule). Add as its own track after the mobile detail screen.
4. **Home empty-space enhancement (proposed, needs Brian's nod):** a
   device-optimized SlateDrop folder browser rooted at the user's Twin 360
   folders, to fill home space and give in-app file access. Recommend AFTER the
   detail rebuild.

**Process (Brian):** bring a recommendation before each slice; reimagine, never
patch/keep old components, buttons, or pills.
