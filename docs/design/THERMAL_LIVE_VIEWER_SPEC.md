# Thermal Live Viewer — LOCKED spec (2026-07-16)

The public share-link viewer for the ASU survey and every thermal survey after it.
Synthesized from two converging external design proposals + Brian's requirements.
This is the S3 "SpaceX-bar" viewer made concrete. Product name: TBD (Q3 in
V2_2_BUILD_SPECS — do not print a placeholder name on deliverables).

## 0. Non-negotiables (Brian, verbatim intent)

- **Hover radiometrics:** on the thermal panorama, temperature values follow the
  cursor (desktop hover / mobile tap & tap-hold). Reads from the real aligned
  temperature raster — never a color lookup.
- **Pan + zoom** on every raster chapter, pinch on mobile.
- **Fit + centered, always:** every chapter opens FIT-TO-VIEW and CENTERED —
  nothing lost off-page, oversized, undersized, or misaligned. Aspect-aware
  letterboxing; a "reset view" control on every canvas; deep-links restore exact
  view state.
- **No page scroll** at any viewport. The ONLY scrollable region is inside the
  bottom sheet (mobile) / right rail (desktop).
- **Analysis is a later layer:** v1 ships the pipeline deliverables (minimal
  thermal presentation); the analysis pass (palette recipes, callouts, water-flow
  presentation) arrives after Brian's drawings/context and slots in as LAYERS —
  the shell must not need a redesign for it.

## 1. Layout (both proposals agree; adopted)

- **Shell = 100dvh canvas app**: top bar (44px: project name · capture chip ·
  PDF) / full-bleed CANVAS / status rail (desktop) or bottom tab bar (mobile).
- **Desktop:** left icon rail (56px, tabs) + right rail (280–320px, solid panel:
  layers, opacity sliders, findings, metadata) + canvas fills the rest.
- **Mobile:** bottom tab bar (56px, thumb zone) + **bottom sheet** peeking at
  ~80px, drag to ~60dvh (layers/findings/metadata live inside; internal scroll
  only). `overscroll-behavior: contain`, `touch-action: none` on canvas.
- HUD corners (pointer-events none): north arrow, scale bar, live coord+temp
  readout, and the mono metadata block (`GSD 3.0CM · FLT 06:15 MST · FLIR`).

## 2. Tabs (spatial modes; findings/overlays are toggles, not tabs)

| Tab | Content | Load |
|---|---|---|
| **MAP** (landing) | 2D aligned world: RGB ortho + thermal (wipe/opacity) + slope/ponding + drain/EJ drawing overlay + findings pins + 360 hotspots | eager (raster tiles only, <300KB JS, first tiles <1s LTE) |
| **3D** | Gaussian splat, auto-orbit on entry (0.5°/s until touched) | lazy |
| **360** | 8 spheres via mini-map nodes → full-screen immersive | lazy |
| **FIND** | findings list (sheet/rail) with jump-to-canvas fly-to | eager (tiny) |
| **RPT** | PDF preview + download + sign-off | lazy |

Extensibility (locked): tab rail is data-driven (`{id,label,component,lazy}`);
the future interior-walkthrough twin = one new entry with `mode:'walk'` on the
same splat component; layers are a registered list — the multi-sensor future
slots in with zero shell redesign.

## 3. Interactions — v1 ship list (demo-critical five + three)

1. **Wipe compare** thermal↔RGB (draggable split; clip-path; 1:1 alignment proof).
2. **Hover/tap-for-temperature** (crosshair + `31.4°C` readout; tap-hold = region
   min/max/mean). The flagship.
3. **Measure** — two taps = distance (m/ft); polygon = area (m²/**sq ft**) —
   valid because the world is metric-aligned; this is the repair-scoping number.
4. **Findings pins + jump-to** (fly-to + card open; "magnet" edge pins point at
   off-screen findings).
5. **Per-layer opacity sliders** (thermal-over-RGB is the hero; drawing overlay
   opacity for the drain/EJ layer).
6. **Tour mode** — auto-visit each finding, 3s dwell + caption; pause on touch.
7. **Epoch honesty** — early/late capture toggle with the "not simultaneous"
   banner (the pre-dawn→sunrise drift, Addendum AA).
8. **Deep-links** — URL carries tab/layers/opacity/finding; back-button works;
   shareable mid-demo.

Later layers (post-analysis phase): per-finding presentation recipes (span
animates to the finding's tuned view on select), contour plume callouts + trend
chevrons, hypothesis panel chapter, Q&A. All register as layers/cards — no shell
change.

## 3b. The two thermal panoramas (locked requirement, Brian 2026-07-16)

Every survey ships **two perfectly-aligned radiometric panoramas from the SAME
stitched grid** (this is N4 made explicit, not a new concept):

- **Chapter A — RAW.** Untuned, unscaled. Default palette = **Ironbow**, full
  auto-span, no overlays. This is the untouched evidence record — what the
  sensor actually saw, nothing adjusted. Always available, always first in
  the wipe/toggle order.
- **Chapter B — ANALYZED.** Palette/span/isotherm TUNED per-region (the
  presentation-recipe mechanism, I2) specifically so pixel-color changes and
  moisture-consistent blotching are VISIBLE — this is the whole point of
  tuning: making a real 0.5–2°C signature actually readable instead of
  drowned in full-scene span. Anomaly regions carry **callout markers**;
  clicking/tapping a callout opens a short **plain-language finding** (2–3
  sentences, evidentiary tone — "thermal pattern consistent with…") alongside
  the numeric ΔT. Callouts DEEP-LINK to the FIND tab's full entry.
- Both render from **one** underlying temperature grid — A and B are display
  states of identical data, never two different stitches. The wipe-compare
  interaction (§3) IS the A↔B comparison. Nothing in Chapter B exists in the
  data that isn't in Chapter A; only the presentation differs.
- Sequencing note (unchanged from the project plan): Chapter A ships as soon
  as the aligned panorama exists. Chapter B's tuning/callouts populate once
  Brian's drawings/context arrive and the analysis pass runs — the viewer
  shell does not wait on this; Chapter B simply appears empty-then-populated.

## 3c. Source-frame inspector + pattern layer (Brian's ideas, 2026-07-16 — adopted as first-class)

Two additions that REDUCE dependence on stitch perfection rather than fighting it:

- **Source-frame inspector (click-through to originals).** Every one of the 251
  thermal frames has a known position; the map doubles as an INDEX. Click/tap
  anywhere → the viewer opens the original sensor frame covering that point
  (nearest-center), centered as close to the clicked spot as possible, in a
  focused overlay: pristine unstitched radiometric data, its own hover temps,
  frame metadata (range, capture time), prev/next through neighboring frames.
  This is the ZERO-ARTIFACT detail layer — no stitch seam can ever appear in it,
  and it is the evidentiary strongest view (each frame is an unmodified sensor
  record). Standard DroneDeploy-class pattern (ortho + source-image inspector).
  Demoed in VIEWER_MOCKUP.html v3 (3 sample frames as numbered map markers).
- **Pattern layer as the wipe target (alternative to raw pano).** The analyzed
  layer (Chapter B) can render as SMOOTH TINTED REGIONS on the RGB map — moisture-
  consistent zones, drain halos, EJ-line signatures as soft color fields with
  callouts — revealed by the wipe INSTEAD of (or alongside) the raw thermal
  pixels. Key property: derived regions are far more TOLERANT of residual stitch
  misalignment than raw pixel mosaics (a soft 2m-wide tinted plume reads
  identically with a 0.3m registration error; a crisp pipe edge does not). The
  wipe therefore offers selectable targets: RAW THERMAL | PATTERNS | (both).
- Resulting layer architecture: RGB ortho (base) → raw thermal pano (evidence,
  honest about imperfection) → pattern/analysis layer (presentation-robust) →
  source-frame inspector (zero-artifact detail) → overlays (drawing/slope/pins).
  The stitched panorama remains a deliverable, but it is no longer the single
  point of presentation failure.

## 3d. 3D anomaly overlay — settled implementation (external consensus, 2026-07-16)

Two independent reviews converged; locked before build:
- **The splat asset is NEVER mutated.** Analysis regions render as a separate
  **coarse DEM-draped mesh** (~1–2 m faces, ≤50k tris for mobile, clipped to the
  deck mask so patches never paint empty air) carrying the SAME region GeoJSON
  that drives the 2D pattern layer — one source of truth, two renderers.
- **Depth recipe:** overlay mesh `depthTest:true, depthWrite:false,
  renderOrder after splat, polygonOffset(-1,-1)` + a 5–15 cm lift along up-axis;
  if transparent-vs-splat sorting misbehaves, use the opaque depth-proxy trick
  (invisible colorWrite:false depthWrite:true DEM copy first). Enable the splat
  renderer's depth-writing mode where available.
- **Callouts = CSS2D/DOM billboards** anchored at region centroid + ~1.5 m —
  never WebGL geometry (no depth fights, always crisp/clickable). Matches the
  Polycam/Luma/Teleport annotation pattern.
- **Frame caveat (will bite if ignored):** overlay + labels must be built in (or
  transformed into) the SPLAT'S local frame — if the splat ships with a
  recentering/correction transform in its manifest, the overlay group applies
  the same transform. Never mix raw-ENU overlay with a recentered splat.
- Tinting gaussians directly is rejected for analysis layers (slow, untoggleable,
  bakes analysis into the asset — violates the display-layer law).

## 4. Visual language ("mission control", not glassmorphism)

- Tokens (viewer-scoped CSS vars; fresh set, NOT the app's Graphite Glass):
  `--canvas #0A0B0D · --panel #121317 (solid, zero blur) · --hairline #23262D ·
  --text-1 #F2F4F8 · --text-2 #8A8F98 · --accent var(--graphite-primary) #00E699`.
  **Accent decision: the brand teal — NOT the proposed warm amber. Amber is
  banned in Brian's locked design canon**, and the teal reads sharply against
  inferno-palette imagery (complementary, never confusable with data colors —
  a warm accent WOULD be confusable with warm thermal pixels).
- Type: mono for ALL data (temps/coords/measurements, tabular-nums, uppercase
  microlabels); clean grotesk for headers/notes. 0–4px radius, 1px hairlines, no
  shadows, no pills, no emoji glyphs. Text over imagery gets a 1px dark stroke.
- Motion: 180–280ms ease; 1:1 slider drag; one boot sweep on load; no ambient
  loops; `prefers-reduced-motion` respected.
- **5-second story (landing):** boot line (0.5s) **with Brian's Level III
  insignia centered above it** (muted gold `#C9A227`, `public/branding/
  level3-thermographer-insignia.svg`, fading in with the boot line) → as the RGB
  ortho fades in, the insignia **shrinks and glides to the bottom-right corner,
  settling as a persistent ~15–20% opacity watermark** → thermal fades up to 60%
  → drain/EJ lines draw on → findings pins stagger in → mono caption settles
  (`SUN DEVIL STADIUM · THERMAL SURVEY · 2026-07-15 · 100FT AGL`). Static by
  ~2.5s. The insignia watermark remains on every canvas throughout the session
  (pointer-events none), and **returns at full strength in the RPT/sign-off
  chapter** beside the signature block. Signature image: PENDING Brian's photo
  (I3/N2) — the block renders name + cert line until it lands.
  `prefers-reduced-motion`: insignia appears in-corner directly, no glide.
- **INSIGNIA CLEAR ZONE (hard rule, Brian 2026-07-16):** the insignia is NEVER
  overlapped by anything — no HUD text, captions, scale bar, north arrow,
  findings pins, tooltips, legends, toasts, or panels may enter its bounding box
  plus a margin of 0.5× its width on all sides. In every state (boot, watermark,
  sign-off) the layout RESERVES that region: HUD elements claim other corners;
  if a transient element (tooltip/toast) would collide, it repositions, never
  the insignia. If a viewport is too small to honor the clear zone (tiny
  landscape phones), the watermark HIDES rather than being overlapped —
  obstructed is worse than absent. Acceptance: DOM overlap check at 390/768/1440
  in both orientations across all tabs.
  **THE ONE EXCEPTION (Brian 2026-07-16): his digitized signature signs ACROSS
  the insignia** — lower half, slight angle (~10°), the traditional P.E.-stamp
  treatment — in SIGN-OFF contexts only (PDF closure page + RPT chapter, where
  the seal renders large). The corner WATERMARK state stays signature-free
  (illegible at that size; hurts both marks). Signature pending Brian's photo.

## 6b. Mockup round-1 critique adoptions (2026-07-16) — HARD RULES for the real build

Two external critiques of VIEWER_MOCKUP.html v1 converged on the same root bug and
a fix list. Locked as build rules:

- **ONE SHARED MAP FRAME (the root-cause rule):** every raster layer (RGB ortho,
  thermal, overlays) must be pre-registered to ONE ENU extent + ONE pixel size
  BEFORE reaching the browser — never rely on CSS to align differing aspects.
  All layers render into a single `.mapFrame` element (identical rect); the wipe
  clip, wipe handle, and hover/tap sampling all measure against that frame. The
  ASU proof: ortho cropped to the thermal footprint numerically via the shared
  georef (offset col 2942 / row 5327 at 3 cm — pixel-for-pixel, zero CSS tricks).
- Wipe: full-height ~32px invisible hit strip (2px visible line), RGB/IR side
  labels, double-click-to-jump, keyboard nudge (arrow keys) in the real build.
- Temp readout: ONE readout (follow-cursor chip with edge-aware flipping), never
  duplicated in the HUD; short copy (`72.3°F · 22.4°C`); tap-to-pin on touch.
- Chrome discipline: sans-serif for prose, mono ONLY for data; gold reserved for
  the insignia alone (findings/badges use neutral + teal ΔT); no dead/unwired
  controls visible in any demo build; scale bar must be computed from GSD ×
  displayed width (zoom-aware) or omitted — never decorative.
- **Rejected from the critiques (Brian's locked calls stand):** the insignia boot
  sequence and corner watermark STAY (critique called them theatrical/vanity —
  overruled; they are Brian's explicit credibility requirements, clear-zone rule
  applies). Boot shortened to ~0.9s.
- Deferred to the real build (out of mockup scope): pan/zoom engine, fly-to on
  finding click, mini-map, measure tool, custom sliders/eye-icon toggles.

## 7. Adopted from external review (Grok round, 2026-07-16)

- **Authoring vs viewing:** the link is READ-ONLY by design. All authoring —
  findings, measurements, palette recipes, plume markups, control points — happens
  in Thermal Studio (desktop) + the point-picker mini-UI (J3) and is persisted to
  the DB; the viewer renders that state. Client-side marks are limited to Q&A
  pins (existing share flow). No second authoring surface gets built into the link.
- **Viewer versioning:** the shell carries a semver'd render contract; a link's
  token pins the major version it was published against, so future viewer
  upgrades never break an old link (old majors stay deployed). Config-as-JSON is
  the interface: `{project, chapters[], layers[], branding, dataUrls}`.
- **Offline/archival bundle:** an "archive export" produces a self-contained
  folder (static HTML + tiles + JSON) for long-term records — queued post-ASU;
  the PDF is the v1 archival artifact.
- **White-labeling:** already covered by branding profiles (E5) — logo, footer,
  accent-within-rules per deliverable; the viewer reads branding from the token's
  `branding_snapshot`. No fork per client.
- **Accessibility:** palette toggle includes a colorblind-safe sequential option
  (viridis/cividis class) alongside inferno; UI meets contrast AA on all chrome;
  temp readouts never rely on color alone (numbers always shown).
- **Performance NFRs:** landing <300KB JS, first tiles <1s LTE, 60fps pan/zoom on
  a mid-range phone, ≤500 findings before clustering kicks in, tiles ≤256KB each,
  splat streamed progressively with a fixed budget on mobile.
- **Analytics (purposeful, not generic):** per-token events — open, chapter
  enter/exit + dwell, finding opened, wipe used, measure used, PDF downloaded,
  question asked. Surfaced in the owner's deliverable row (S7.5). No third-party
  trackers on client links.
- **Export granularity:** current-view high-res PNG snapshot; findings as
  CSV/GeoJSON (aligned meters) alongside the full PDF (S8.5 engine).
- **Phased build:** P1 = shell + MAP tab + wipe + hover/tap temps + layers
  (demo-able); P2 = 3D + 360 + findings + tour; P3 = deep links, bottom-sheet
  polish, accessibility pass, analytics. Token/expiry/revocation reuses the
  EXISTING thermal share-token infrastructure (roles, password, expiry,
  per-stakeholder copies) — no new auth system.
- **Template-ization:** the viewer is a parameterized package — every future
  survey deploys the same shell with a new config; becomes the product's link
  renderer (S7.5) rather than an ASU one-off.

## 5. Data contract — what feeds each chapter (formats + shareability)

| Item | Master (private, R2) | Served to viewer | Static/shareable export |
|---|---|---|---|
| Thermal radiometric pano | float32 NPZ + GeoTIFF (ENU origin + GSD baked in) | raster tiles + float16 temp chunks (hover) | PNG render / PDF pages |
| RGB orthomosaic | GeoTIFF | raster tiles | JPG |
| DEM / slope / ponding | GeoTIFF | tinted raster tiles | PNG |
| Drain/EJ drawing overlay | RGBA PNG + alignment transform | image layer w/ opacity | burned into PDF figures |
| Gaussian splat | .ply/.spz | streamed to 3D tab | turntable MP4 |
| 360 spheres | equirect JPG | sphere viewer | as-is JPG |
| Findings/measurements/markup | JSON (DB rows) | API | PDF findings section |
| Report | PDF in R2 | RPT tab | **the PDF file** |
| **The deliverable itself** | — | — | **the LINK** (token, password, expiry, per-stakeholder copies, analytics) |

Sharing model: the link IS the shareable artifact (forwardable URL, no account
needed, revocable); the PDF is the downloadable companion; raw
GeoTIFF/NPZ masters are Brian's working data, shared only deliberately.

## 6. Acceptance gates

- Every chapter: fit-to-view + centered on open at 390px, 768px, 1440px; zero
  page scroll; reset-view restores exactly.
- Hover/tap temp matches the NPZ value at that pixel (±0.1 °C) — spot-checked
  against the master grid.
- Measure: a known real-world distance (drawing-verified) reads within 1%.
- Wipe: features hand off cleanly across the split at 3 zoom levels.
- Landing p95 < 3s on LTE (raster tiles only; 3D/360 lazy).
- prefers-reduced-motion disables the boot sweep + auto-orbit.
