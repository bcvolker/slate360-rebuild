# Twin 360 — Master Build Plan
# "Better Than Polycam in Every Dimension That Matters for Construction"

Last updated: 2026-06-24
Branch: claude/twin360-pipeline-details-atkjrb

---

## 0. Strategic Position

Polycam wins on consumer scanning polish. Twin 360 wins by being the only 3D documentation system natively inside a construction platform — capture leads to twins, twins attach to Site Walk punch items and progression reports, all under org governance and branded client deliverables.

**Do not try to out-Polycam Polycam on raw capture UX on day one. Win on workflow depth, deliverable richness, and org integration that Polycam structurally cannot replicate.**

---

## 1. What Already Exists — Do Not Rebuild

From codebase audit (main + branch `claude/twin360-pipeline-details-atkjrb`):

### Capture surface
- Mode selector, live camera, video recorder, clip system, frame-cap governor
- `coverageProgress` already tracked and shown as a ring around the shutter button
- Adaptive hint text at bottom of BottomRail
- TwinCaptureGuide with tilt hints and guide state/color
- GPS display, quality lock, torch toggle
- TwinCaptureLidarChip component (built, not yet mounted on main)

### Processing
- Modal GPU worker (A10G, splatfacto, SPZ output)
- LiDAR COLMAP bypass (branch — video mode)
- PLY seeding via `_transform_and_write_lidar_ply` + `ply_file_path` in transforms.json (branch)
- 30% iteration reduction when PLY seed active (branch)
- Floor plan PNG generation `generate_floor_plan()` (branch)
- Splat orientation manifest `compute_splat_manifest()` (branch)
- quality_speed_iterations: draft/standard/high enum partially supported in worker

### Viewer
- Interior + exterior navigation modes
- Measure tool + measurements list
- Layers panel, comments overlay, collaboration panel
- Cinematic camera-path editor (desktop)
- TwinViewerControlsOverlay: 3 buttons (Home, Orbit/Interior, Fullscreen)
- TwinShareToolStrip: view/pin/comment/measure tools

### Sharing
- Role-gated tokens: view / annotate / download
- Expiry, max-views, pin, comment/measure on share
- Auto share viewer at /share/twin/[token]

### Editing (desktop)
- Non-destructive SDF ops: crop / slice / erase / transform
- Source SPZ never mutated — edit list stored separately
- Already ahead of Polycam's destructive crop

### Org/billing model
- Spaces → captures → projects
- Subscription tiers: none / basic / pro (digital_twin on org_app_subscriptions)
- Credits model with usage events (digital_twin_usage_events)
- Entitlement gate in assertDigitalTwinProcessingEntitlement

### Deliverables today
- SPZ splat + orientation manifest
- Floor plan PNG (branch worker, not yet wired to share viewer)
- SlateDrop bridge (twin model → project folder)

---

## 2. Tier Model — Progressive Disclosure

**Essential (basic subscription):**
Goal — "three taps to a twin." Field user never sees a workbench.

- Capture: photo or video, default settings, no quality knobs
- Review: collapsed to 2 steps (clips → create preview)
- Processing: draft quality auto (10–15k iters, ~3 min)
- Viewer: view + simple measure (view-only on share)
- Share: auto-generated link + Slate360 branding
- Deliverable: SPZ + floor plan PNG in share viewer
- No LiDAR controls surfaced, no edit suite, no CAD, no coverage overlay

**Pro (pro subscription):**
Goal — full workbench, everything unlocked.

- Capture: LiDAR chip + point count, coverage overlay, templates, quality lock
- Review: full 5-step wizard (clips → sources → quality → confirm → status)
- Processing: draft/standard/high choice + LiDAR bypass + PLY seed
- Upload: desktop batch ingest (drone, 360, LiDAR PLY, append to captures)
- Viewer: full feature set (layers, annotations, cinematic, progression)
- Editor (desktop): SDF tools + auto-cleanup presets
- Deliverables: measured floor plan DXF/PDF, site-report PDF, USDZ/OBJ/LAS, embed iframe
- Share: org-branded pages, QR code, role governance, expiry control
- Site Walk: attach twin to punch items/progression reports, embed in deliverables
- Teams: org twin library, usage dashboard, seat governance

**Implementation pattern:** `resolveTwinTier(orgId)` at render time. One codebase, tier-gated component visibility. Basic users never see Pro controls; Pro users get clean access to everything.

---

## 3. Complete Feature List

Format: **Feature** — Description — [Essential / Pro / Both] — [App / Desktop / Both]

### Capture (App)
| Feature | Tier | Platform |
|---|---|---|
| Photo mode capture | Both | App |
| Video mode capture | Both | App |
| Clip system (multi-segment) | Both | App |
| Frame-cap governor | Both | App |
| Coverage ring (shutter progress indicator) | Both | App |
| Simple coverage % bar in guide | Both | App |
| Torch/flashlight toggle | Both | App |
| GPS location tagging | Both | App |
| Tilt correction guidance | Both | App |
| Contextual hint text | Both | App |
| LiDAR active chip + point count | Pro | App |
| Live coverage heatmap overlay (scanned/not-scanned) | Pro | App |
| Capture templates (Room/Exterior/Object/Site Walk) | Pro | App |
| Auto-stop "you have enough" signal | Both (basic = simple, pro = advanced) | App |
| Pre-flight checklist (camera, LiDAR, storage, network) | Both | App |
| Capture health manifest (device, mode, points, keyframes, GPS) | Both (auto) | App |

### Upload / Ingest (App + Desktop)
| Feature | Tier | Platform |
|---|---|---|
| Multipart video/photo upload | Both | App |
| Upload resume/retry (survive app kill) | Both | App |
| Desktop batch ingest (drone, 360, LiDAR PLY) | Pro | Desktop |
| Append to saved/existing capture | Pro | Desktop |
| SlateDrop picker for existing assets | Pro | Desktop |
| Media type auto-detection | Both | Both |
| Pre-submit "good scan" gate (pose/density check) | Both | App |

### Processing (Cloud — transparent to user)
| Feature | Tier | Platform |
|---|---|---|
| Draft quality preview (~10-15k iters, ~3 min) | Both (Essential default) | — |
| Standard quality (30k iters) | Pro | — |
| High quality (45k iters) | Pro | — |
| LiDAR COLMAP bypass (video mode) | Pro (silent if available) | — |
| LiDAR COLMAP bypass (photo/burst mode) | Pro (silent if available) | — |
| PLY-seeded splat initialization (dense LiDAR) | Pro | — |
| Frame dedup / blur cull before GPU | Both (auto) | — |
| SSIM plateau auto-stopping (stop when quality plateaus) | Both (auto) | — |
| Tier-aware iteration matrix (bypass+PLY = fewer iters) | Both (auto) | — |
| Draft→Finalize two-stage flow (draft free, full credits on finalize) | Both | App/Desktop |
| PLY validation gate (100-pt minimum, format check) | Both (auto) | — |
| Cheaper GPU class for draft tier | Both (auto) | — |
| Real iteration % progress streaming to UI | Both | Both |
| Stage labels in progress (Aligning → Training 42% → Exporting) | Both | Both |
| Per-job cost tracking (GPU minutes + credits) | Both (logged) | Desktop |

### Viewer (App + Desktop)
| Feature | Tier | Platform |
|---|---|---|
| Gaussian splat viewer (interior nav) | Both | Both |
| Gaussian splat viewer (orbit mode) | Both | Both |
| Auto-frame on load (using manifest) | Both | Both |
| First-use gesture hints ("pinch to zoom · drag to orbit") | Both | Both |
| Home/recenter button | Both | Both |
| Fullscreen toggle | Both | Both |
| Measure tool (distance, area, height) | Both (view on Essential, full on Pro) | Both |
| Measurements list / history | Pro | Both |
| Annotations / 3D pins | Pro (share annotate role) | Both |
| Comments overlay | Pro | Both |
| Layers panel | Pro | Desktop |
| Floor plan tab (2D view alongside 3D) | Both | Both |
| Loading state + quality indicator | Both | Both |

### Editing (Desktop — Pro)
| Feature | Tier | Platform |
|---|---|---|
| Non-destructive SDF crop | Pro | Desktop |
| Non-destructive SDF slice | Pro | Desktop |
| Non-destructive SDF erase | Pro | Desktop |
| Non-destructive transform | Pro | Desktop |
| Auto-cleanup preset: "Remove floaters" | Pro | Desktop |
| Auto-cleanup preset: "Level floor" | Pro | Desktop |
| Cinematic camera path editor | Pro | Desktop |
| Mobile edit subset (crop/erase presets) | Pro | App |

### Deliverables
| Feature | Tier | Platform |
|---|---|---|
| SPZ download | Both | Both |
| Floor plan PNG (auto-generated) | Both | Both |
| Measured floor plan PDF (with room dimensions) | Pro | Desktop |
| Measured floor plan DXF (CAD import) | Pro | Desktop |
| Auto site-report PDF (thumbnail + floor plan + GPS + date + org logo) | Pro | Desktop |
| USDZ export (iOS AR Quick Look) | Pro | Desktop |
| OBJ export (general 3D) | Pro | Desktop |
| LAS/PTS point cloud export | Pro | Desktop |
| Offline handoff bundle (ZIP: SPZ + floor plan + manifest + self-contained viewer) | Pro | Desktop |
| Embed iframe code generator | Pro | Desktop |

### Sharing
| Feature | Tier | Platform |
|---|---|---|
| Auto-generate share link on job complete | Both | — |
| Role-gated share tokens (view / annotate / download) | Both | Both |
| Expiry and max-views control | Both | Both |
| View analytics (who opened, when) | Pro | Desktop |
| QR code for field handoff | Both | Both |
| Org-branded share pages (logo, colors) | Pro | Desktop |
| Custom share expiry (permanent for Pro) | Pro | Desktop |
| Embed iframe for GC portals | Pro | Desktop |
| Share revoke | Both | Both |
| Comment / Q&A on share | Both | Both |
| Measure on share | Pro (annotate role) | Both |
| Download from share | Pro (download role) | Both |

### Site Walk Integration (Pro)
| Feature | Tier | Platform |
|---|---|---|
| Attach twin to Site Walk item (FK link) | Pro | Both |
| Open twin from punch item ("View 3D context") | Pro | Both |
| Spatial 3D pins → create Site Walk punch items | Pro | Desktop |
| Embed twin in Site Walk deliverable/report | Pro | Desktop |
| Twin progression report (before/after slider) | Pro | Desktop |
| Seed twin upload from walk photos | Pro | App |
| Ghost Mode progression: re-walk same path | Pro | App |

### Teams / Org (Pro)
| Feature | Tier | Platform |
|---|---|---|
| Project twin library (filterable by project/date/GPS/tags) | Pro | Desktop |
| Usage dashboard (credits per member, twin count) | Pro | Desktop |
| Role-based permissions (who can finalize/export/share) | Pro | Desktop |
| Org twin search (name, location, date, creator) | Pro | Desktop |
| Seat governance | Pro | Desktop |
| Share activity log (who viewed, who commented) | Pro | Desktop |
| Approval / review status workflow | Pro | Desktop |

### Progression (Pro)
| Feature | Tier | Platform |
|---|---|---|
| Before/after slider compare | Pro | Both |
| Timeline of twin captures for a space | Pro | Desktop |
| Aligned coordinate compare (same space, different dates) | Pro | Desktop |
| Progression report export (PDF with date-sequence thumbnails) | Pro | Desktop |

---

## 4. Capture Screen Plan — What to Add, What to Leave Alone

### What stays exactly as-is
The dark glass theme (globals.css variables) is correct and must not change.
The mode selector, shutter button, clip display, torch, GPS chip, and bottom hint text all stay.
The tilt correction guidance and guide state coloring stay.

### What changes for Essential tier only (no visual complexity added)
- Mount TwinCaptureLidarChip when `lidar.isActive` (1 line in TwinCaptureScreen, already built)
- Extend `coverageProgress` hint: when coverage ≥ 85% + clipCount ≥ 2, show "You have enough — tap Done to finish" in the adaptive hint text (no new UI element)

### What changes for Pro tier (progressive disclosure)
These show only when `tier === "pro"` and render on top of existing chrome without changing layout:

1. **Coverage heatmap overlay** (new component: `TwinCoverageHeatmap`):
   - Translucent canvas overlay on the live camera view
   - Green cells = ARKit keyframe density ≥ threshold; yellow/red = gaps
   - Positioned between camera feed and the existing top bar chrome
   - Uses ARKit keyframe XZ positions projected to a 2D grid
   - Does NOT replace existing `coverageProgress` ring — complementary
   - Z-index below top bar / mode selector, above camera feed

2. **Capture template selector** (extends `TwinCaptureTopBar`):
   - Small pill "Room ▾" in the top bar, right of the mode selector area
   - Tapping opens a bottom sheet with 5 options: Room / Exterior / Object / Site Walk / Corridor
   - Each template sets: default mode (video/photos), duration target, keyframe target, quality default
   - Minimal chrome — fits within existing top bar without layout change

3. **Pre-flight check toast** (new: `TwinCapturePreflightCheck`):
   - Fires once on first load if LiDAR device detected
   - 3-second dismissible "LiDAR ready · 3.5m range · storage 12GB free" confirm toast
   - Same glass styling as existing HUD toasts

**Theme verdict: No theme changes needed.** The existing Graphite Glass tokens cover all additions. The dark canvas / blue accent / mono typography pattern applies cleanly to heatmap cells, template pills, and preflight toasts.

---

## 5. Viewer Controls Plan — What Needs to Improve

**Current state:** `TwinViewerControlsOverlay` has 3 icon-only buttons with no labels. Controls are functional but not discoverable. First-time users don't know what the icons do. No gesture hints. No prominent share/export CTA. No floor plan toggle.

**Improvements (not a rebuild — targeted additions):**

### A. Gesture hint overlay (new: `TwinViewerGestureHint`)
- Shows on first load for 3 seconds, then fades
- Two lines: "Drag to orbit · Pinch to zoom" | "Double-tap to enter walk mode"
- Stored in localStorage `twin_gesture_hint_seen` — never shows twice
- Bottom-center, glass pill, same tokens as existing overlays
- 50 lines max, self-contained component

### B. Bottom action bar on share viewer (extends `TwinShareAnnotateShell`)
Replace the flat tool strip with a bottom-docked toolbar that groups:
- **Left cluster:** View / Measure / Annotate tabs (existing tools, better visual weight)
- **Right cluster:** Share button (prominent, blue accent) + Download (if role allows) + Floor Plan toggle
- The "Share" button on share viewer is currently buried — surface it as a primary action
- On mobile: collapses to icon-only with labels; on desktop: full text

### C. Floor plan tab in share viewer
- New "Floor Plan" tab in share viewer alongside the 3D view
- Shows the `floorplan_storage_key` PNG (already generated by worker, already stored in DB)
- Signed URL from existing R2 signed URL pattern
- Toggle: a "Map" icon button added to the right cluster
- Essential tier: view floor plan PNG only
- Pro tier: also shows "Export PDF" + "Export DXF" buttons

### D. Label tooltips on viewer control buttons
- Add `title` and visible label below each icon on desktop (already have `title` on aria-label but it's tooltip-only)
- On mobile: keep icons only (space constrained) but with gesture hints serving discoverability

### E. First-time walk mode hint
- On first switch to interior/walk mode: brief toast "WASD to walk · Click to look · Scroll to move"
- Same localStorage gate as gesture hints

---

## 6. Build Phases

### Phase 0 — TestFlight Runway (this week — gates everything)

**Codemagic YAML (line ~34, after `script: npx cap sync ios`):**
```yaml
- name: Register LiDAR Xcode targets
  script: |
    gem install xcodeproj --no-document
    ruby scripts/ios/add-lidar-plugin.rb
```

Tasks:
- [ ] Add Codemagic YAML step above
- [ ] Cherry-pick to main (in order): ghost fix 610ff25, LiDAR plugin, capture wiring, worker bypass, 90141ae tuple fix
- [ ] Deploy from local machine: `python -m modal deploy worker.py` + `npx trigger.dev@latest deploy`
- [ ] Vercel deploy + Supabase migration (`lidar_poses` asset kind)
- [ ] Device test: iPhone 12 Pro–15 Pro, video mode, 3–5 min session
- [ ] Camera conflict test: ARSession + WebView; add sequential fallback if needed
- [ ] Mount TwinCaptureLidarChip when `lidar.isActive`
- [ ] Verify Modal logs: `[lidar-bypass] success` + `Loaded 3D points` (not `random point cloud`)
- [ ] PLY validation gate: reject < 100 points, fallback to bypass-only
- [ ] IndexedDB persist for `lidarFiles` in capture review state (prevent silent loss on reload)
- [ ] `has_lidar` flag on capture row at upload

**Gate:** At least one job on a Pro iPhone shows `lidarBypass: true` in qualityMetrics before claiming LiDAR in release notes.

---

### Phase 1 — Cost, Speed, Reliability (2–3 weeks)

**Highest ROI — mostly worker + thin UI. No LiDAR dependency.**

1. **Draft-quality tier end-to-end**
   - Worker: `quality: "draft"` → 10–15k iters, L4/T4 cheaper GPU class
   - Essential default = draft; "Create Preview" CTA in review
   - Pro: choice of Draft / Standard / High in review step 3
   - Two-stage job: Job A = draft (auto-create, cheap); Job B = finalize (user-triggered, charges delta credits)
   - Credits: draft = 0 or minimal; finalize charges full rate
   - Files: `quality_speed_iterations()`, `TwinSubmitStepQuality.tsx`, `processing-estimate-types.ts`, worker.py

2. **SSIM plateau auto-stopping**
   - In Modal worker, evaluate rendering quality every 1,000 iterations
   - If improvement < 1% over 3 consecutive checks, terminate early
   - Saves 30–60% GPU cost on simple rooms automatically
   - Log `auto_stopped_at_iter` in qualityMetrics for transparency

3. **Frame dedup before GPU**
   - Blur-hash + overlap cull in `materialize_images()` (CPU, before COLMAP/splatfacto)
   - Reduces redundant frames → faster COLMAP → lower total time

4. **Photo-mode LiDAR bypass**
   - Match burst JPEG EXIF timestamps to ARKit keyframe poses (no ffmpeg video dependency)
   - Falls back silently — no crash, just standard COLMAP
   - Files: `try_lidar_bypass()` in worker.py; add `photo_burst_timestamps` to poses JSON in Swift

5. **Real progress streaming**
   - Modal posts stage callbacks: ingest → (bypass|colmap) → train XX% → export → done
   - `TwinJobStatus.tsx` shows "Aligning frames… Training 42%… Exporting…"
   - No new polling — use existing Supabase realtime on job row

6. **Upload durability**
   - Persist multipart upload state to IndexedDB (survive app kill / elevator / cellular drop)
   - Pattern exists elsewhere in codebase; adapt for twin upload

7. **Per-capture manifest**
   - `capture_manifest.json` uploaded with assets: device, iOS, LiDAR on/off, point count, keyframe count, mode, session_start_unix, GPS accuracy, clip count
   - Makes bypass failures diagnosable; stored on job row

8. **Cheaper GPU routing**
   - Draft tier: Modal L4/T4 → ~$0.06/min vs A10G $0.20/min
   - Final/high tier: A10G stays

---

### Phase 2 — Deliverables (Polycam-Beater Layer, 3–4 weeks)

1. **Floor plan in share viewer**
   - Wire existing `floorplan_storage_key` (already in DB) to TwinShareViewer as a "Floor Plan" tab
   - New `TwinShareFloorPlanTab` component: signed URL → img tag
   - API: extend `GET /api/share/twin/[token]/splat` to return `floorplanUrl`

2. **Auto share link on job complete**
   - `job-callback.ts`: on success, create view-only share token + notify user with link
   - No user action required to get a shareable link

3. **QR code**
   - On job complete notification + share viewer header
   - Use `qrcode` npm package (already in many Next.js apps, no new dep if already present, else tiny)
   - Essential: Slate360 branded; Pro: org-branded

4. **Measured floor plan PDF (Pro)**
   - New Modal worker function: trace splat floor contour + scale from manifest bounds
   - Output: PDF with room dimensions, north arrow, scale bar, org logo, date, GPS
   - Triggered as a post-processing job from Twin hub (not auto)

5. **Measured floor plan DXF (Pro)**
   - Same source data; DXF output for CAD import
   - Single lines per wall, layer names match room labels if available

6. **Auto site-report PDF (Pro)**
   - Modal post-job: splat thumbnail + floor plan + top measurements + GPS map + org branding
   - One-click from twin viewer; reuse Site Walk PDF infrastructure where possible

7. **USDZ export (Pro)**
   - Convert SPZ → mesh → USDZ for iOS AR Quick Look
   - One-click "Open in AR" from share viewer on iOS

8. **OBJ / LAS export (Pro)**
   - OBJ: reconstructed mesh from splat (general 3D import)
   - LAS/PTS: raw LiDAR point cloud from `lidar_ply_key` asset (survey interop)

9. **Embeddable iframe (Pro)**
   - Extend existing `?embed=1` viewer route
   - Pro-gated "Copy embed code" button in share actions returns `<iframe>` snippet

10. **Offline handoff bundle (Pro)**
    - ZIP: SPZ + floor plan PNG + manifest JSON + lightweight self-contained HTML/JS viewer
    - GC records archive for handover, accessible offline in 10 years

11. **Site Walk twin attachment (Pro)**
    - New FK: `digital_twin_space_id` on site walk items (migration)
    - "Attach 3D Twin" picker in item detail
    - "View 3D Context" deep link from item → twin viewer
    - Spatial 3D pins in twin viewer → create Site Walk punch item with XYZ + screenshot

12. **Twin in Site Walk deliverables (Pro)**
    - New deliverable template block type: `twin_embed`
    - Deliverable shows: splat thumbnail + floor plan + share link in PDF/report

---

### Phase 3 — Capture Intelligence (3–4 weeks)

1. **Coverage heatmap overlay (Pro)**
   - `TwinCoverageHeatmap` component: canvas overlay, ARKit keyframe XZ grid
   - Green = sufficient density, yellow/red = gaps
   - Renders between camera feed and existing top bar chrome
   - No theme changes required

2. **Capture templates (Pro)**
   - 5 templates: Room, Exterior, Corridor, Object, Site Walk
   - Presets per template: mode, duration target, keyframe target, quality default, LiDAR range
   - Template pill in TwinCaptureTopBar; bottom sheet picker

3. **"You have enough" auto-stop signal (Both)**
   - Essential: hint text extends to "✓ Good coverage — tap Done"
   - Pro: animated badge overlay when coverage threshold + keyframe density met

4. **Pre-flight checklist**
   - On capture launch: check camera permission, LiDAR availability, storage ≥ 500MB, network
   - Dismissible modal; remembered per-session

5. **"Good scan" gate before GPU**
   - Before job dispatch: `pose_count / lidar_density` ratio check
   - If user stood still and spun in place (low spatial diversity in XZ), show warning:
     "⚠ Scan may be blurry — try walking around the space. Upload anyway?"

6. **Bypass failure UX**
   - If LiDAR bypass fails silently: show "Processed with standard alignment — LiDAR saved for re-run"
   - Lets user know what happened without alarm

7. **Gesture hint overlay in viewer**
   - `TwinViewerGestureHint`: 3-second fade on first load, localStorage gate
   - "Drag to orbit · Pinch to zoom" + "Double-tap for walk mode"

8. **Viewer bottom action bar**
   - Restructure TwinShareToolStrip into a proper bottom-docked toolbar
   - Left: View | Measure | Annotate
   - Right: Share (prominent blue CTA) | Download | Floor Plan toggle

---

### Phase 4 — Org, Teams, Editing Polish (4–6 weeks)

1. **Org-branded share pages (Pro)**
   - Populate `branding_snapshot` on share create (already exists in schema)
   - Share viewer reads: org name, logo URL, brand color
   - Pattern mirrors thermal share branding

2. **Usage dashboard (Pro)**
   - Surface `digital_twin_usage_events` per member
   - Desktop: credits used / twins created / processing time by team member
   - Route: `/digital-twin/settings/usage`

3. **Org twin library search (Pro)**
   - Filter hub by: project, date range, GPS bbox, creator, has_lidar, tags
   - Desktop: searchable list + map view of capture GPS pins

4. **Role-based org permissions (Pro)**
   - Org admin: who can create twins, finalize, export CAD, manage shares
   - Extends `organization_members.role`

5. **Mobile edit lite (Pro)**
   - On-device crop preset + erase preset → triggers server-side edit-list job
   - Desktop SDF editor stays canonical; mobile is "quick cleanup" only

6. **Auto-cleanup presets (Pro)**
   - "Remove floaters": discard Gaussians > N sigma from point cloud centroid
   - "Level floor": apply rotation from `correction_quaternion` in manifest to align floor
   - Both use existing manifest data — no reprocessing needed

7. **Basic Essential review simplification**
   - For `tier === "basic"`: collapse 5-step wizard to 2 steps (Clips → Create Preview)
   - Hide: Supporting data, Quality selector (locked to draft), Pro source types

8. **Progression → Site Walk report**
   - Progression compare viewer → embed in Site Walk walk-level report
   - ProgressionCompareViewer already exists; add "Include in walk report" export

---

### Phase 5 — Quality Ceiling (6–12 weeks)

1. **Depth-supervised splatting**
   - LiDAR depth maps as a training signal, not just initialization
   - Requires verified PLY seed path working reliably first
   - Significant quality improvement on Pro captures

2. **Native unified ARKit capture (v2)**
   - ARKit owns camera entirely (RGB + depth + pose timestamps)
   - WebView becomes pure UI layer (transparent overlay)
   - Eliminates getUserMedia vs ARSession conflict permanently
   - Much higher quality frame sync between RGB and depth

3. **High-quality JPEG burst from ARKit**
   - Bypass WebM compression artifacts from getUserMedia capture
   - ARKit captures JPEG at full sensor quality
   - Feeds photo-mode bypass directly at sensor resolution

4. **Pro priority queue**
   - Separate Modal processing queue for Pro tier
   - Draft jobs queue behind Pro finalize jobs
   - Only implement after draft/final split proves cost model

---

## 7. "Beat Polycam" Opportunity Matrix

| Dimension | Polycam today | Twin 360 target | Phase | Win condition |
|---|---|---|---|---|
| Capture UX | Best-in-class coverage heatmap | Match via Phase 3 heatmap | 3 | Coverage overlay + templates |
| Instant preview | Fast draft scan | Draft tier ~3 min | 1 | Draft-first free preview |
| LiDAR capture | Mature, camera-native | WebView + ARKit plugin | 0 | Ship baseline; v2 native in Phase 5 |
| Measurements | Strong | Built (viewer + share) | Exists | Ship + calibrate with LiDAR scale |
| Floor plans | AI-enhanced, paid | Auto PNG (basic) + measured PDF (pro) | 0/2 | Auto-generate beats their paid tier |
| Sharing | Link + export | Auto link + QR + branded + embed | 2 | 6 share modes vs Polycam's 2 |
| Editing | Destructive crop | Non-destructive SDF ops | Exists | Already ahead — market it |
| Teams | Expensive add-on | Org library + governance + credits | 4 | Construction-native vs generic |
| Construction workflow | None | Site Walk attachment, punch items, progression | 2/4 | **Permanent moat — uncopyable** |
| Cost transparency | Opaque subscription | Draft free + credits per finalize | 1 | Users pay for what they get |
| Offline handoff | None | ZIP bundle with self-contained viewer | 2 | Record-keeping for turnover |
| USDZ / LAS | Standard | Full suite | 2 | Survey interop + iOS AR |
| BIM integration | Partial | Phase 6+ (IFC overlay) | Future | — |

---

## 8. TestFlight / Codemagic Readiness Checklist

```
□ Branch cherry-picks merged to main (not blind merge)
□ scripts/ios/add-lidar-plugin.rb path verified
□ codemagic.yaml: gem install xcodeproj + ruby script after cap sync ios
□ ios/App/App.xcodeproj/project.pbxproj committed with LiDAR file refs
□ Info.plist: NSMotionUsageDescription + NSCameraUsageDescription
□ Vercel production deploy (same SHA as Codemagic build)
□ Supabase: lidar_poses migration applied
□ Modal: twin-gaussian-splat deployed (from local ~/.modal.toml)
□ Trigger: twin.gaussian_splat deployed
□ Physical device: iPhone 12 Pro–15 Pro, video capture end-to-end
□ Physical device: LiDAR chip appears when available
□ Physical device: camera conflict test (ARSession + WebView)
□ Modal log: "[lidar-bypass] success" on first Pro device capture
□ Modal log: "Loaded 3D points" (not "random point cloud initialization")
□ SPZ opens in viewer (mobile + desktop)
□ Share link works on a different device/browser
□ Marketing copy matches only shipped features (no "white-label", no "priority queue" until Phase 4)
□ Codemagic → TestFlight build uploaded
□ Internal tester with Essential account + Internal tester with Pro account
```

---

## 9. Immediate Next Actions (priority order)

1. **Codemagic YAML** — 5-minute edit, unblocks CI for every future build
2. **Local Modal + Trigger deploy** — must come from your machine with `~/.modal.toml`
3. **Cherry-pick to main** — ghost fix → LiDAR plugin → capture wiring → worker changes
4. **Device test** — gate on this before any "LiDAR" claims
5. **Phase 1 draft tier** — biggest Polycam-beating UX win that doesn't require LiDAR hardware
6. **Auto share link + QR on job complete** — immediate stakeholder value, zero risk
7. **Floor plan tab in share viewer** — deliverable already generated, just needs UI wire-up
8. **Phase 2 Site Walk attachment** — the strategic moat, start early

---

## 10. Files to Touch per Phase (key map)

### Phase 0
- `codemagic.yaml` — add Ruby step
- `workers/modal/twin-gaussian-splat/worker.py` — already updated on branch
- `src/trigger/twin-gaussian-splat.ts` — already updated on branch
- `components/digital-twin/TwinCaptureScreen.tsx` — mount LiDARChip
- `lib/twin/upload-helpers.ts` — `has_lidar` flag

### Phase 1
- `workers/modal/twin-gaussian-splat/worker.py` — draft GPU, SSIM stopping, frame dedup, photo bypass
- `lib/twin/processing-estimate-types.ts` — add `"draft"` to `TwinProcessingQuality`
- `lib/twin/processing-credits.ts` — draft pricing model
- `components/digital-twin/submit/TwinSubmitStepQuality.tsx` — Essential collapse, Pro choice
- `components/digital-twin/TwinJobStatus.tsx` — real progress %
- `hooks/useTwinCaptureSession.ts` or equivalent — IndexedDB upload state

### Phase 2
- `lib/twin/job-callback.ts` — auto-create share token on success
- `app/api/share/twin/[token]/splat/route.ts` — return floorplanUrl
- `components/digital-twin/TwinShareViewer.tsx` — floor plan tab
- `app/api/digital-twin/jobs/callback/route.ts` — trigger auto-share
- New: Modal export tasks for measured PDF, DXF, USDZ, LAS
- New DB migration: `twin_space_id` on site walk items

### Phase 3
- `components/digital-twin/TwinCaptureScreen.tsx` — mount coverage heatmap (Pro)
- New: `components/digital-twin/TwinCoverageHeatmap.tsx`
- `components/digital-twin/TwinCaptureTopBar.tsx` — template selector (Pro)
- New: `components/digital-twin/TwinViewerGestureHint.tsx`
- `components/digital-twin/TwinShareAnnotateShell.tsx` — bottom action bar

### Phase 4
- `components/digital-twin/TwinShareAnnotateShell.tsx` — branding
- New: `app/(dashboard)/digital-twins/settings/usage/page.tsx`
- `components/digital-twin/desktop/DesktopSplatToolRail.tsx` — cleanup presets
- DB migration: org permission columns for twin roles
