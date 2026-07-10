# Thermal Studio V2.2 — Expert Review, Workflow Redesign & Persona Test Suite

> **Author stance:** ITC Level III thermographer + thermal-software product lead, reviewing
> our own V2 build (S1–S5.5p1 shipped behind `/preview/thermal-v2`) against FLIR Thermal
> Studio, FLIR Tools/Ignite, Fluke SmartView/Connect, Testo IRSoft, and HIKMICRO Analyzer.
> Approved direction from Brian 2026-07-07. Inherits every §0/§1b rule from the LOCKED V2
> doc and the V2.1 addendum; **§4 build order here supersedes V2.1 §9**. S9 swap still HELD.

---

## 1. Competitive read — where the industry actually is

| Product | Strengths | Weaknesses we exploit |
|---|---|---|
| FLIR Thermal Studio | Deepest batch engine (45 job types), routing, templates | 2005 ribbon UI, license nags, zero AI, zero cloud, static-PDF-only output |
| FLIR Ignite | Camera→cloud auto-sync (best transfer UX in the industry) | Just a library; analysis still punts to desktop |
| Fluke SmartView/Connect | Asset/route organization for electrical PM programs | Clunky, Windows-bound, dated capture pairing |
| Testo IRSoft | Free; TwinPix visual overlay is good | No batch intelligence, no collaboration, dated |
| HIKMICRO Analyzer | Modern-ish skin | Shallow analysis, no ecosystem |

**Nobody in the market has:** (1) AI findings with plain-language explanations, (2) live
interactive links instead of emailed PDFs, (3) org-synced report templates, (4) phone-first
triage that hands off to desktop. Those four are our wedges. Everything else is parity work.

## 2. Critique of OUR current build — 10 findings, each with the fix

1. **Entry is a dead-end.** Old route lands on a session list; even V2 opens to a Library
   that assumes a session exists. FLIR's Home tab is equally guilty — don't copy it.
   *Fix (W1):* Library **is** home; drop images anywhere on the window → inspection is
   auto-created and decode starts; "Resume last inspection" chip; empty state has exactly
   one verb.
2. **Library→Analyze handoff doesn't exist.** Clicking a thumbnail only selects it — there
   is no way to "open" an image from Library. Confirmed gap in the shipped build.
   *Fix (W1):* single-click selects, **double-click/Enter opens in Analyze**; the grid's
   focused image and Analyze's active image are the same state.
3. **Sub-degree defect hunting is underpowered.** A 0.6–1.2 °C moisture signature is
   invisible at full span; today the operator must drag legend handles blind.
   *Fix (S5.6):* **"Enhance here"** — one click sets span to ±2 °C around the cursor temp;
   **Local contrast** display mode (histogram-equalized rendering, clearly labeled
   display-only); **isotherm sweep** (drag the band across the range and watch pixels
   light up); **A/B flicker** toggling two span/palette states. This quartet is what makes
   a Level III reach for our tool over FLIR's.
4. **Palette doesn't persist.** Analyze hardcodes Iron on mount; `metadata.palette` exists
   in the backend and is never read or written by V2. *Fix (W1):* seed from capture, autosave
   on change, include in Copy/Paste settings + batch apply.
5. **°C/°F is per-mount local state.** A US inspector sets °F forty times a day.
   *Fix (W1):* persisted preference (localStorage now, profile later), honored everywhere
   including reports and exports.
6. **AI doesn't exist yet (S6).** It's the differentiator every incumbent lacks. The card
   must carry: finding type in words, severity chip, peak/ΔT, **a 2–3 sentence explanation
   of *why* the model flagged it**, confidence, and an editable draft note. Batch runs sort
   a severity-first triage queue.
7. **Reports aren't documents yet.** Site Walk deliverables are re-openable; thermal
   reports must be too. *Fix (S7):* a report row persists outline + template + branding;
   "Continue editing" reopens it — finished or not.
8. **No SlateDrop persistence — violates the platform rule.** *Fix (TS-SD):* auto-provision
   a **Thermal Studio** folder (project-scoped when the inspection is linked to a project,
   org root otherwise); every generated PDF/export/link registers there via the existing
   `register-deliverable` pattern; opening the file from SlateDrop deep-links back into the
   report editor with full state.
9. **Batch is one verb.** Only tuning has scope-apply. *Fix (B1):* Batch Recipes (decode →
   apply settings → AI → add-to-report → export ZIP) with progress chip + summary sheet.
10. **Interactive links are under-imagined.** A link that's just "PDF in a browser" wastes
    the medium. *Fix (S7.5):* link viewer gets per-photo hotspot pins, client Q&A threads,
    an **acceptance/sign-off button** (timestamped), password/expiry, and **view analytics**
    (opened, by whom, when — from share-token logs). A PDF can't tell you it was read.

## 3. The redesigned layouts

### 3.1 Desktop (the locked 5 tabs stand; contents sharpen)

- **Library = home.** Left: SlateDrop tree + filters + Recent inspections. Center: grid
  with permanent drop affordance; Start strip when empty ("Drop thermal photos to begin —
  radiometric data is preserved"). Right: Next steps (scope-labeled verbs). Global
  drop-anywhere on every tab.
- **Analyze.** Toolbar (as shipped) + Enhance-here + Local-contrast toggle + A/B flicker.
  Right rail gains a **sticky mini-summary** (image max/min/avg always visible above the
  accordions). Palette/unit persistence per §2.4/2.5.
- **AI Review.** Severity-first triage queue; finding cards with explanation paragraphs;
  optional "what am I inspecting?" context; Accept/Edit/Dismiss (+ restore) as locked.
- **Report.** Click-through template gallery (org-synced via `thermal_report_templates`),
  save-custom-template, ★-funnel, WYSIWYG sheets, branding profile with cert line,
  "Save to SlateDrop" on by default.
- **Deliver.** One picker → **PDF · Interactive link · Cinematic slideshow**; link features
  per §2.10; exports + timelapse + video import + map as planned.

### 3.2 App (revised A-plan — transfer-first, assistant-led)

Five tabs, renamed around jobs to be done: **Import · Analyze · Assistant · Deliver ·
Settings.** Lightweight subset rule stands (no Motion, no template designer).

- **Import (the crux).** Ranked transfer paths, all byte-preserving (never through the
  Photos re-encoder): ① SD card / USB-C reader via the Files app — copy raw R-JPEG bytes,
  show a **"Radiometric ✓"** badge per file after signature sniff; ② Share-sheet extension
  ("Send to Thermal Studio") from vendor apps; ③ camera Wi-Fi pull (v2); ④ everything
  syncs to the same cloud inspection the desktop sees (Ignite's trick, but two-way).
- **Analyze.** Tap-for-temp, pinch zoom, long-press loupe, palette/span/emissivity
  essentials, point/area/line with the full edit-undo lifecycle (shared thermal-core).
- **Assistant.** The on-site brain: select photo(s) → AI findings with explanations →
  dictate a voice note per finding (transcribed into the draft, raw audio kept per the
  evidentiary rule) → "flag for desktop" on anything needing deep work.
- **Deliver.** Quick 2-up PDF or instant share link from the truck; anything complex says
  "finish in the desktop studio" and syncs the inspection.

## 4. Build order v2.2 (supersedes V2.1 §9)

| # | Slice | Contents | Status |
|---|---|---|---|
| 1 | **S5.5 p2** | Polygon tool, Δ-between-any-two, line profile chart | in flight |
| 2 | **W1** | Workflow foundations: dbl-click→Analyze, drop-anywhere→auto-inspection, Start strip, palette persist+seed, °C/°F preference, Copy/Paste settings, sticky mini-summary | new |
| 3 | **S5.6** | Alarm modes (above/below/interval/dew-point/insulation, severity bands) **+ sensitivity suite** (Enhance-here, local contrast, isotherm sweep, A/B flicker) | expanded |
| 4 | **S6** | AI Review + explanations + triage queue + context field | as locked |
| 5 | **S7** | Reports: gallery, org templates, branding/cert, severity summary, re-openable report documents | expanded |
| 6 | **TS-SD** | SlateDrop "Thermal Studio" folder, deliverable registration, open-from-SlateDrop → continue editing | new |
| 7 | **S7.5** | Deliver picker; interactive link w/ pins, Q&A, sign-off, analytics; cinematic slideshow | expanded |
| 8 | **S8 / S8.5** | Video import + frame extraction, timelapse, map, export engine | as V2.1 |
| 9 | **B1** | Batch Recipes | as V2.1 |
| 10 | **A0–A6** | App per §3.2 (Import-first, Assistant tab) | revised |
| 11 | **S9** | Swap + delete old UI — **HELD for Brian's explicit approval** | held |

Gates unchanged (scoped tsc, guards, preview_eval + §1b checks, push per slice). Each
slice also lands its persona specs from §5 as Playwright tests under `e2e/thermal-v2-*.spec.ts`
against the unauthenticated preview harness with a mocked grid API.

## 5. Persona simulation test suite (the acceptance bar)

Concrete, assertable simulations — each becomes an e2e spec landing with its slice.

- **P1 — Solo electrician, one photo, fast verdict.** Upload 1 R-JPEG → decode → open →
  Mark hottest → set reference on the lug → Δ reads correctly → 1-page PDF with branding.
  *Asserts:* time-to-report ≤ 3 min of interactions; Δ math matches fixture; PDF registers
  in SlateDrop. *(Lands with S7/TS-SD.)*
- **P2 — Envelope consultant hunting a 0.8 °C moisture signature.** Fixture grid embeds a
  subtle blob 0.8 °C below surroundings, invisible at full span. Workflow: hover the
  suspect area → **Enhance here** → blob visually separable (assert: rendered pixel color
  distance between blob and surroundings crosses a threshold after enhance, and doesn't
  before) → polygon around it → avg/min/max + Δ vs reference → isotherm band pins it →
  finding note saved. *(Lands with S5.5p2 + S5.6.)*
- **P3 — Drone roof survey, 300+ frames, automated.** Import batch → Decode all (progress,
  no UI freeze) → AI detect all → triage queue sorted by severity → "Accept all severe" →
  ★ top findings → report. *Asserts:* every accepted finding carries an explanation string;
  batch ends in Keep/Undo or summary sheet; report outline count matches ★ count. *(S6+S7+B1.)*
- **P4 — Facility manager, recurring monthly route.** Open last month's inspection → Copy
  settings from a reference image → Paste to Selected (12) → Keep/Undo toast → saved custom
  template renders → compare view against last month's image of the same asset. *(W1+S6.5+S7.)*
- **P5 — The client on a phone.** Opens the interactive link: pins load, asks a question on
  photo 7, taps Accept & sign; owner sees Q&A + signature + view analytics. Link expires on
  schedule; expired link explains itself. *(S7.5.)*
- **P6 — App field tech.** Files-app import of 5 R-JPEGs from SD → all show "Radiometric ✓"
  → cloud decode round-trips temps identical to desktop for the same file (byte-preservation
  proof) → Assistant drafts findings from voice note (raw audio retained) → share link sent
  from site → same inspection opens on desktop with everything intact. *(A1–A5.)*
- **Cross-cutting invariants asserted in every spec:** zero page scroll at 1280×800 and
  1440×900; every mutation undoable or Keep/Undo'd; readouts (cursor/loupe/list/legend)
  agree with each other; no raw backend error strings reach the viewport.

## 6. What we deliberately do NOT copy from the incumbents

- FLIR's ribbon + modal license management — the shell stays flat, quiet, and unlicensed-feeling.
- Fluke's asset-database ceremony — projects/SlateDrop already organize; don't add a second taxonomy.
- 45 discrete batch job types — recipes over pipelines; five verbs cover 95% of real work.
- Desktop-only thinking — every artifact (inspection, finding, report, link) is one cloud
  object visible from both surfaces.
