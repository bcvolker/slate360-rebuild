# Twin 360 — Master Build Plan (consolidated, authoritative)

> **Status: authoritative consolidation (2026-07-06).** Unifies the 18 scattered
> Twin design docs into one executable spine, locks in the improvements/fixes
> shipped this session, and adds the frontier vision (AI assistant, progression
> morph, VR, wall/floor square footage, multi-format export). Written so **any AI
> platform can pick up a single phase and execute it** without re-deriving context.
>
> **Companion docs (still valid, this doc is the index over them):**
> `TWIN360_END_TO_END_UX_PLAN.md` (journey + screen-by-screen), `TWIN_QUALITY_ROADMAP.md`
> + `TWIN360_QUALITY_OPTIMIZATION.md` (pipeline quality), `ROOMPLAN_TWIN_LOCKED.md`
> (LiDAR measurement layer), `DESKTOP_COCKPIT_LOCKED.md` (desktop shell). Where they
> conflict with this doc, this doc wins.
>
> **North star:** be the construction-industry leader at turning a phone camera
> (+ LiDAR when present, + any auxiliary 360/drone/GPS source) into a clean,
> editable, measurable, AI-assisted 3D digital twin that ships as a beautiful
> shareable link, an embed, a downloadable file for design software, a 2D plan
> with real square footage, a fly-through video, or a VR/Vision Pro walkthrough.

---

## 1. Positioning & the wedge

Nobody today combines **construction-native workflow + premium presentation +
phone-first capture + real editing/measurement + AI assistance + multi-format
delivery** at SMB price:
- Matterport/reality-capture: expensive, hardware-centric, weak editing.
- OpenSpace/HoloBuilder: utilitarian documentation, not presentation-grade, enterprise-priced.
- Consumer splat apps (Polycam, Luma): pretty, zero construction context, no measurement/plan/proposal output.

Twin 360 wins by owning the whole chain: **capture → clean → measure → animate →
deliver in every format the recipient needs**, inside the same project ecosystem
as Site Walk and SlateDrop.

---

## 2. SHIPPED this session (the improvements/fixes to build on — do NOT redo)

| Area | What shipped | Where |
|---|---|---|
| **Reconstruction quality (R7)** | Fixed the two bugs behind "garbage/blob" models: (a) COLMAP `frame_00NNN` ↔ original-filename **join-key mismatch** that silently zeroed metric-scale recovery; (b) **log-encoded gaussian scale bake** (was linear-multiplying log values → exponential blow-up = giant blobs). Both unit-tested. | `worker.py` |
| **Metric scale + measured orientation (Q1/Q2, verified live)** | Real ARKit↔COLMAP correspondence recovers metric scale (framePairsUsed 214, residual 5%) and measured-gravity orientation (`Y_UP_MEASURED`). | `worker.py`, `recover_metric_scale` |
| **Open-at-captured-view (R8)** | Manifest carries a real capture pose; viewer opens on a recognizable framing, not a synthetic orbit. Metric-aware spike clamp added. | `worker.py`, `compute_splat_manifest`, `splat-overview-home.ts` |
| **User-facing reprocess loop (Slice 0)** | `POST /api/digital-twin/models/[id]/reprocess` + `captures/[id]/reprocess`; versions panel; publish protocol. Non-destructive (new model row, old kept, user promotes the winner). | `create-reconstruction-job.ts` + routes |
| **Review gate + failed-state retry (Slice 1)** | "Couldn't finish" is no longer a dead end — offers "Try again"; completed state reframed to "review before you share." | `TwinSubmitStepStatus.tsx` |
| **New mobile home (Slice 2)** | Rebuilt ground-up: one prominent "New Scan" control + capture sheet (Quick / into-a-project / upload) over a **contained, scrolling live twins feed** with status chips. Deleted the valueless quick-action grid + dock. | `DigitalTwinHomeClient.tsx`, `home/*` |
| **New twin detail screen (Slice 3)** | Rebuilt ground-up: viewer as height-bounded hero + one action bar (Share / Versions / Details) opening focused sheets. Calmed the red model-load box. Deleted the old stacked/overlapping page + `TwinViewerWorkspace`. | `TwinDetailClient.tsx` |
| **Naming** | App title → "Twin 360" (from "Digital Twin"); desktop nav rename landed separately. | in progress (sweep) |
| **Monetization/compliance (Package C)** | Credit-pack single source of truth, honest inputs, native platform gating, IAP scaffolding (flag-gated), account/login compliance. | `lib/billing/*`, `lib/iap/*` |

**Design law reaffirmed:** Graphite Glass tokens kept; the fix was execution
discipline — radical hierarchy (one primary action per screen), content-first,
accent (`--twin360-blue`) only on interactive states, 48–64px targets, calm
motion, **reimagine never patch**.

---

## 3. Current state vs. the vision (honest gap)

| Capability | State | Note |
|---|---|---|
| Phone/LiDAR capture → cloud splat | ✅ works | native ARKit path |
| Metric scale · measured orientation · open-at-pose | ✅ works | tape-measure human check still pending |
| Reprocess / versions / publish | ✅ works | mobile; desktop parity pending |
| Mobile home + detail screens | ✅ rebuilt | Slices 2–3 |
| Desktop editor (crop/erase/slice/transform) | ⚠️ works but **non-destructive overlays only** | downloaded file still has the mess; no bake |
| 360-photo input | ⚠️ gated on filename heuristic | **A1 bug** — detect by 2:1 aspect ratio |
| 360-video input | ❌ none | **A2** — unwrap each frame |
| Floor plan (2D) | ⚠️ PNG generated, **invisible** | surface it (cheap win) |
| Square footage (floor) | ❌ none | needs floor-polygon area tool |
| Square footage (walls w/ door/window subtraction) | ❌ none | needs wall+opening detection |
| Multi-format export (.ply/.glb/video) | ❌ `.spz` only | useless to architects today |
| Keyframe animation / fly-through video | ⚠️ camera-path editor exists, **MP4 export TODO** | wire the render |
| Progression compare (2 captures) | ✅ works, desktop | compare only, no morph |
| Progression **morph** to one output | ❌ none | **feasibility: video cross-fade = doable; single morphed 3D model = research-grade** |
| AI assistant (prompt model, run ops) | ❌ none | greenfield; tool-calling agent, very buildable |
| VR / Apple Vision Pro walkthrough | ❌ none | WebXR from the splat viewer = feasible |
| White-label branding on shares | ⚠️ enterprise-gated, wiring incomplete | finish it |
| Georeferencing | ❌ `georef` always `{}` | later |

**The core structural gap remains:** we can capture and (now) reprocess, but the
**"clean → measure → animate → deliver in the right format"** middle is thin. Every
phase below equips that middle.

---

## 4. The eight capability pillars (the full architecture)

### Pillar 1 — Capture & multi-source ingest
One capture identity, many inputs, all fusing into one twin:
- **Primary:** phone ARKit video (+ LiDAR depth when present — optional, graceful RGB-only fallback).
- **Auxiliary sources**, added at submit or later from desktop, all landing in the project's SlateDrop folders:
  - **360 photos/video** (Insta360 X4, etc.) — detect by **aspect ratio ~2:1** (validated fixture `pletchers.jpg`; GPano XMP confirming-only, never filename). Unwrap to perspective views feeding COLMAP.
  - **Drone** photo/video (DJI Avata 360, Mavic) — exterior coverage; GPS for context.
  - **External LiDAR / point clouds** (`.ply` today; `.e57/.las` later) — fused as geometry prior.
  - **GPS** — from capture metadata; used for context + (future) georef.
- **UX:** the "Scan into a project" path (cross-app continuity) is first-class; a source-manager screen shows what's attached and its effect on the estimate.
- **Quality lever:** more coverage (360 + multiple passes) = fewer holes = less "jumbled mess." Charged honestly (more frames → more credits).

### Pillar 2 — Process & quality (backend)
- Existing COLMAP-first pipeline with R7/R8 fixes.
- **Noise/floater removal:** auto-crop (AF9) + spike clamp exist; add a **statistical outlier removal** pass (SOR — drop points with few neighbors) and an opacity/saliency floor, tuned per quality tier.
- **A1/A2** (360 ingest) as above.
- **Scale regularization** (`use-scale-regularization` already on) + densification ceiling (AF3) keep splat counts sane.
- Every job emits: `.spz` + manifest (orientation, capture pose, metric scale) + `floorplan.png` + quality metrics + (new) export derivatives.

### Pillar 3 — Edit & clean
- **Desktop studio** (exists): crop / erase / slice / transform overlays + layers.
- **NEW — Destructive bake:** "Apply edits to file" → server job reads `edit_list`, filters the PLY by saved regions, re-exports `.spz` + all export formats + regenerates manifest + floor plan. Non-destructive stays default; bake is explicit, versioned, and is what download/embed/VR serve. **This is what fixes "the downloaded file still looks like a blob."**
- **NEW — Level & center:** manual upright/rotate chip for when measured orientation isn't enough.
- **Mobile light-clean:** an erase-only brush (same non-destructive overlay engine) for "delete this floater" on the phone; full precision stays desktop.

### Pillar 4 — Measure & derive
- **Point-to-point** measure (exists, metric-scale-backed).
- **NEW — Floor area:** click a polygon on the detected floor plane → square footage.
- **NEW — Wall area with openings:** select a wall plane → area; subtract door/window rectangles (manual draw now; auto-detect from LiDAR/RoomPlan planes later per `ROOMPLAN_TWIN_LOCKED.md`).
- **NEW — Saved dimensions panel:** named measurements ("garage opening", "kitchen W wall") exportable as CSV/PDF — the **proposal-writing** feature.
- **2D floor plan:** surface the generated PNG as a deliverable; upgrade to a vector plan via the RoomPlan/plane-fit path.

### Pillar 5 — Animate & present
- **Keyframes:** the camera-path editor exists — capture a keyframe by framing the view (no numeric typing), like the tour builder's gesture.
- **Fly-through video export:** wire the MP4 render (server-side camera-path render → mp4). **Multi-format delivery item.**
- **Progression:** compare two captures of the same space (exists). **NEW — progression sequence:** a timeline of N captures.
  - **Feasibility, stated honestly:** a **progression *video*** (aligned models, cross-faded/wiped over time along a shared camera path) is buildable and impressive. A **single morphed 3D model** blending splats across captures is **research-grade** — Gaussian splats have no cross-capture point correspondence, so a true morph needs registration + interpolation research; do NOT promise it as near-term. Ship the video first; flag the 3D morph as R&D.

### Pillar 6 — AI assistant (the "wow")
A tool-calling agent (Anthropic API; **no existing AI infra — greenfield, build clean**) scoped to ONE twin:
- **Prompt about the model:** "how big is this room?", "what's the wall area minus the window?" → the agent calls the measurement/area tools and answers with real numbers.
- **Control operations by prompt:** "crop out the ceiling", "slice the far wall", "make a 2D plan", "reprocess at high quality", "open a share link" → the agent invokes the existing operations (crop/slice/floor-plan/reprocess/share) as **function-call tools**. Every action is a confirm-before-apply, reversible operation.
- **Architecture:** a server route with a fixed tool schema mapping to the existing APIs (reprocess, edit-list mutate + bake, floor-plan, area calc, share create). Model = latest Claude. Semantic 3D understanding is scoped to metadata + measurements + operations (not free-form scene understanding, which is harder). This is genuinely buildable and a strong differentiator.

### Pillar 7 — Deliver (multi-format)
- **Share link** (exists) — feature-max the viewer (Pillar 8).
- **Embed** — an `<iframe>`/embed snippet for external sites (was falsely marketed; now build it).
- **File export for design software:** `.ply` and `.glb` (from the baked model) so architects can import into CAD/design tools. **Highest-value export.**
- **2D plan + dimensions** — PDF/CSV.
- **Fly-through / progression video** — mp4.
- **VR / Apple Vision Pro** — see Pillar 8.
- **White-label** — finish the branding wiring (logo swap on the share viewer, per-tier).

### Pillar 8 — Viewer feature-max (recipient experience)
The no-login share viewer is the product's face — make it best-in-class:
- Orbit + first-person **walk** mode (exists) + measure + pins/comments.
- Smooth guided intro (open at captured pose, gentle settle).
- **VR / Vision Pro:** WebXR from the Three.js/Spark splat viewer — an "Enter VR" affordance; on Vision Pro via Safari WebXR the user walks the twin in immersive space. **Feasible; scope as a viewer add-on.**
- Branding (white-label), download (role-gated), dimensions overlay, floor-plan minimap.
- Full accessibility + reduced-motion.

---

## 5. Screen inventory

### Mobile app (Twin 360)
| Screen | State |
|---|---|
| Home (New Scan + live feed) | ✅ rebuilt (Slice 2) |
| Capture flow (native ARKit) | ✅ works |
| Submit / review (sources, quality, estimate, status) | ✅ works; source-manager to enrich |
| Twin detail (viewer hero + action bar + sheets) | ✅ rebuilt (Slice 3) |
| Versions / reprocess / publish sheet | ✅ works |
| Share sheet | ✅ works |
| Mobile light-clean (erase brush) | ❌ build |
| AI assistant panel | ❌ build |

### Desktop (Twin 360 cockpit — still old slop, rebuild next)
| Screen | State |
|---|---|
| Twin hub / list | ⚠️ old — rebuild |
| Studio editor (crop/slice/erase/transform) | ✅ works, needs cockpit shell + bake |
| Measure workbench (point / floor area / wall area / saved dims) | ⚠️ partial — build |
| Animate (keyframes + video export) | ⚠️ editor exists, MP4 TODO |
| Progression timeline (compare + video) | ✅ compare works; sequence video build |
| Deliver (export .ply/.glb/video/plan/embed/VR/branding) | ❌ build |
| AI assistant | ❌ build |

**Note:** a dashboard/desktop rebuild is being worked by a parallel chat
(`feat(dashboard): expandable-workspace redesign`). Coordinate — the Twin desktop
cockpit should mount inside whatever unified desktop shell that produces, not fork.

---

## 6. Phased execution plan (executable slices)

Each slice is independently shippable, gate-clean, pushable. Ordered by
"unblock high-quality twins first, then equip the deliverable middle, then the
frontier."

**Phase A — Quality & core screens (mostly done)**
- ✅ A0 R7/R8 pipeline fixes · reprocess loop · review gate · home · detail.
- A1 **360-photo detection by aspect ratio** (worker + ingest). *(small, high-value)*
- A2 **360-video ingest** (frame-extract → equirect unwrap per frame).
- A3 **Statistical outlier removal** noise pass (worker).
- A4 **Tape-measure verification** of metric scale (human, Brian) — gates all measurement features.

**Phase B — Deliverable middle**
- B1 **Destructive bake** (edit_list → re-exported file). *(unblocks clean downloads)*
- B2 **Multi-format export** `.ply`/`.glb` (from baked model) + share-token download.
- B3 **Floor-plan surfacing** (existing PNG as a deliverable + share attachment).
- B4 **Floor area** tool (polygon on floor plane → sq ft).
- B5 **Wall area with openings** (wall plane − door/window rectangles).
- B6 **Saved-dimensions panel** + CSV/PDF export.

**Phase C — Present & animate**
- C1 **Fly-through video export** (camera-path render → mp4).
- C2 **Progression sequence video** (N captures aligned + cross-faded along a path).
- C3 **Embed** snippet for external sites.
- C4 **White-label** finish (logo swap on share viewer, per-tier).

**Phase D — Frontier / wow**
- D1 **AI assistant** (tool-calling agent: measure/area/crop/slice/floor-plan/reprocess/share by prompt).
- D2 **VR / Vision Pro** WebXR walk in the share viewer.
- D3 **Mobile light-clean** erase brush.
- D4 **Desktop Twin cockpit** rebuild (mount in the unified desktop shell; studio + measure + animate + progression + deliver + assistant tabs).

**Phase E — R&D (flagged, not promised)**
- E1 True **3D progression morph** (cross-capture splat registration + interpolation) — research-grade.
- E2 **Georeferencing** (ARKit→ECEF, 3D-tiles context).
- E3 Auto wall/opening detection from LiDAR/RoomPlan planes.

---

## 7. Bug / blocker ledger (root-out list)

| ID | Bug/blocker | Status |
|---|---|---|
| BUG-1 | Metric scale never applied on real captures (join-key) | ✅ fixed (R7) |
| BUG-2 | Log-scale bake blow-up (giant blobs) | ✅ fixed (R7) |
| BUG-3 | Model looks like a blob after processing | ⚠️ mitigated (R7/R8 + auto-crop); **needs A3 SOR + B1 bake + tape-measure A4 to fully close** |
| BUG-4 | 360 photos silently mis-ingested (filename gate) | ⬜ A1 |
| BUG-5 | Downloaded file still has noise (overlays non-destructive) | ⬜ B1 bake |
| BUG-6 | `.spz`-only export useless to architects | ⬜ B2 |
| BUG-7 | Floor plan generated but invisible | ⬜ B3 |
| BUG-8 | Model-load-failed showed alarming red box | ✅ calmed (Slice 3) |
| BUG-9 | Desktop "Digital Twin" section is old slop | ⬜ D4 |
| BUG-10 | Naming "Digital Twin" vs "Twin 360" in-app | 🔶 partial (nav renamed; sweep remaining) |
| BUG-11 | Multi-chat `.next` build contention (two `next build`s, one tree) | ⚠️ operational — don't build simultaneously / use worktrees |

---

## 8. Feasibility honesty (so nobody over-promises)

| Feature | Verdict |
|---|---|
| Multi-source ingest (360/drone/LiDAR/GPS) | **Doable** — mostly worker paths + a source-manager UI |
| Destructive bake, `.ply`/`.glb` export | **Doable** — PLY filter + format convert |
| Floor/wall square footage (manual polygons) | **Doable** — metric scale exists |
| Auto wall/opening detection | **Hard** — needs plane/opening detection (RoomPlan helps) → Phase E |
| Fly-through + progression *video* | **Doable** — camera-path render |
| Progression morph to a single 3D model | **Research-grade** — no cross-capture splat correspondence → Phase E, do not promise |
| AI assistant (prompt → run existing ops) | **Doable + impressive** — tool-calling agent over existing APIs |
| Free-form semantic 3D scene understanding | **Hard** — scope the assistant to metadata + measurements + operations |
| VR / Apple Vision Pro (WebXR) | **Doable** — WebXR from the existing Three.js viewer |

---

## 9. Multi-chat coordination note (2026-07-06)

Multiple Claude sessions are active on `C:\s360` (thermal-v2, 360 tour builder,
dashboard redesign, this Twin track). Rules to avoid collisions:
- **Don't run `npm run build` in two chats at once** — it corrupts the shared `.next`
  (seen: `ENOENT rename`, `/_document` errors). Prefer a git worktree per chat, or
  serialize builds.
- **Stage explicit paths, never `git add .`** — the working tree holds other chats' work.
- The Twin desktop cockpit (D4) must **mount inside** the unified desktop shell the
  dashboard chat is building, not fork it.
- This doc is the Twin track's source of truth; other chats own their own docs.
