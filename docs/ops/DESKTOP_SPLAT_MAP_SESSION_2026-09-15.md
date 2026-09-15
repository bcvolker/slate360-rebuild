# Desktop session summary — Splat, Map, stadium, contractor path

**Written:** 2026-09-15 (afternoon, Pacific)  
**Extended:** same day — client viewer bar, people-mask, spatial-walkthrough verdict, adversarial prompt  
**Machine:** Brian’s Windows desktop `C:\s360` (this chat)  
**Audience:** Brian + laptop Cursor (homepage/portal) + any later chat on this PC  
**Does not replace:** `docs/design/HOMEPAGE_STATUS_HANDOFF_2026-09-15.md` (laptop homepage work)  
**Copy-paste hostile review:** `docs/ops/ADVERSARIAL_SPLAT_VS_AIRVIS_PROMPT.md`

This is the record of **this desktop chat**: why the PC crashed, what we changed in local Gaussian-splat and photogrammetry programs, how that fits the laptop homepage/portal work, and the contractor-pilot plan. Product names in the UI stay **Slate360 Splat** and **Slate360 Map**. Do not put a competitor studio brand in UI, commits, or the homepage.

---

## 0. Two machines, two jobs — do not mix them

| Track | Where | What it owns |
|---|---|---|
| **Laptop chat** | Worktree `C:\slate360-homepage-rebuild`, merged to `main` | Public homepage, login/signup look, contact/site-visit form, later dashboard + **client portal** look |
| **This desktop chat** | `C:\s360`, local GPU + WSL | **Slate360 Splat** (Gaussian), **Slate360 Map** (photogrammetry), stadium processing, crash hardening, capture/authoring how-to |

Homepage lives on production: https://www.slate360.ai (confirm with `/api/deploy-info` after deploys). Desktop splat/map is **local-only** (`localhost`, `SLATE360_SPLAT_LAB`). Do not advertise unfinished field apps on the homepage or in the portal.

---

## 1. What the laptop already shipped (read from GitHub `origin/main`)

Source: `docs/design/HOMEPAGE_STATUS_HANDOFF_2026-09-15.md` (PR #32, merged 2026-09-15) plus PRs #29–#31 and #33.

**Business pitch (locked):** done-for-you reality capture. Brian scans; the contractor gets an interactive record. Not self-serve SaaS, not “download two apps and try a trial.”

**Live on `main` / slate360.ai:**

- Light marketing system (`--mkt-*` in `app/globals.css`): canvas `#FAFAF8`, ink, one green accent. **Public + auth pages only.** Dashboard/app stays Graphite Glass (`#0B0F15`) until someone deliberately decides otherwise.
- New homepage tree under `app/(public)/_components/` (`home-*-light.tsx`): nav, hero + placeholder viewer panel, problem, what you get, portal preview, how it works, who/pricing, thermal/builds, contact, location picker, footer.
- Old dark marketing components deleted.
- Contact/site-visit API: `app/api/site-visit-inquiry/route.ts` + migration `20260910180000_site_visit_inquiries.sql` (applied in prod).
- Location picker: Google Maps, pin, property outline, clear control, `gestureHandling: "cooperative"`.
- Login / signup / forgot / reset restyled to the **light** public tokens (gateway pages, not the logged-in app).
- Hero right column is a **placeholder** for one future permissioned project example — copy stays generic (not “your project,” not a list of product types).
- Portal preview slot uses the same dashed “coming soon” treatment (PR #31 polish).
- Measurement copy: planning tools, not legal/survey certification; licensed surveyor still governs legal dimensions.
- Stale pre-pivot digital-twin **product page** removed (PR #33, `ad6a945e`).

**Also on GitHub (not necessarily finished):**

- `feature/dashboard-portal-alignment-2026-09` — dashboard/portal alignment.
- Open laptop items: homepage copy vs `docs/business/BUSINESS_PLAN.md`; phone-test the map gestures; whether dashboard/portal adopt `--mkt-*` or stay Graphite.

**How that laptop pushes:** worktree `C:\slate360-homepage-rebuild`, branch off **fetched** `origin/main`, never `git add .`, PR into `main`, Vercel deploys.

---

## 2. What this desktop chat did (chronological)

### 2.1 Goal of the local programs

Build **first-party desktop tools** (no third-party splat editor, no Litchi/WaypointMap requirement) so Brian can:

1. Turn drone stills (and later 360 walks) into a **Gaussian splat**.
2. Turn the same stills into **photogrammetry products** (ortho, mesh, LAS, DTM, cut/fill, PDF) like a DroneDeploy export.
3. Author 360 tours, crop, pin, and publish **only what that contractor bought** into a guest link.

The public site does not mention these tools. Contractors never log into Splat or Map.

### 2.2 Stadium DroneDeploy folder

`C:\Users\Brian PC\Desktop\Stadium Models\`

| Kind | Examples | Role |
|---|---|---|
| Source photos | `source_data_export_*.zip` (~5 GB, **530** DJI M3E JPGs + GPS EXIF) | Only useful splat/Map **input** |
| Already-built products | `MapPlan_Orthomosaic_*`, `MapPlan_3DModel_*`, `MapPlan_PointCloud_*`, `MapPlan_DTM_*`, `MapPlan_CutFill_*`, `MapPlan_ElevationToolbox_*`, `MapPlan_NDVIToolbox_*`, 17×11 ortho PDFs | Reference / comparison — **not** splat training input |

Splat Lab initially rejected zips (“Could not recognize…”). We added archive classify, disk ingest (browser has no absolute path), auto-pick `source_data_export`, skip product zips.

### 2.3 Why the PC hard-powered off (2nd/3rd time on Splat)

Windows **Kernel-Power 41**, bugcheck **0x3B** (`SYSTEM_SERVICE_EXCEPTION` / `ACCESS_VIOLATION`) at ~1:20 PM on 2026-09-15.

Cause: WSL was capped at **100 GB** of ~127 GB host RAM. COLMAP GPU feature extract (+ earlier people-mask GPU) left Windows + the NVIDIA driver with no headroom → hard off.

**Fixes in place:**

- `C:\Users\Brian PC\.wslconfig`: **memory=64GB**, swap=8GB, 16 processors. Applied via `wsl --shutdown`.
- Aerial jobs: **Remove people off** (false positives punched black holes in 168 of 530 JPEGs on the crashed job). Mask no longer overwrites source JPEGs.
- Flat SfM feature extract: **max image size 2048**, GPU on.
- UI: Remove people next to Run All; defaults **off** for drone/stills, **on** for 360 walks.
- Job list: do not mark crashed leftovers “completed”; **interrupted** + **Resume** from last finished stage; keep COLMAP `database.db` so features are not wiped.
- Live progress: pair counts / percent on Reconstruction (the screenshot that showed all “queued” was a ghost completed job stealing the stage cards; workspace still said kitchen; “360 capture” was Proven defaults, not the running job).

**Do not run Map rebuild or a second GPU train while a splat train is live.**

### 2.4 Stadium Gaussian job (live as of this document)

| | |
|---|---|
| Job id | `2bb07176` |
| Input | `C:\s360\tmp\splat-lab\_uploads\acf5e6ca` (clean 530, people mask skipped) |
| Config | `is360=false`, `remove_people=false`, workspace `stadium` |
| SfM | **530/530 registered**, 640,222 points; features ~8 min; vocab-tree match ~14 min; mapper ~40 min |
| Views | 530 training images @ 1280 long edge |
| Train | **Running** ~19.8% (4950 / 25000 steps), ~2.1M splats, ~2 hours remaining at last poll |

Crashed prior job `fdc97ba9` must **not** be reused (burnt masks). Duplicate `699c2f33` was cancelled.

When train finishes: `.spz` / `.ply` in the job folder; open in Splat viewer; publish via existing portal hook. In-app **crop/brush is not built yet** (third-party editors are off the table).

### 2.5 Slate360 Map (new local desktop app)

Path: `desktop/map-studio\`  
Desktop shortcut: **Slate360 Map.lnk**  
Branding: same Slate360 mark as Thermal Studio; photogrammetry, not thermal.

**Works today:**

- Open / **drag a folder**.
- Classify DroneDeploy-style export zips (ortho, mesh, LAS, DTM, cut/fill, elevation, NDVI, PDF, source photos).
- Inspect a **Mavic / DJI flight folder**: photo count, RTK sidecars (`.mrk` / `.pos`), LiDAR (`.las` / `.laz` / `.e57`), 360 clips.
- Honest quality note in the UI: same **product types** as DroneDeploy; matching **look** is not promised until a side-by-side vs `Stadium Models`.
- **Rebuild from photos** stays blocked while the splat GPU is busy, and needs Docker/OpenDroneMap (or later RealityScan on this PC) to actually run.

**Not done:** running ODM/OpenMVS on the 530 photos; GPS/RTK as COLMAP pose priors; LAS/E57 fusion; Mini 4/5 Pro KMZ grid writer; in-app measure/cut-fill viewer wired to a new DSM.

Prior cloud photogrammetry that **failed to match** DroneDeploy on ASU/stadium lives in `workers/modal/photogrammetry/` (ODM + COLMAP product worker). Map must not silently repeat “COLMAP default, ignore GPS.”

### 2.6 Splat Lab UI / resume (this chat)

- Progress bars + pair counts; jobs rail shows %.
- Selecting a job hydrates workspace, 360 vs flat, Remove people from `config.json`.
- Auto-attach the **running** job, not a newer ghost “completed.”
- Resume = `--from-stage auto` (images exist → skip copy; features in db → skip extract; sparse exists → skip SfM).

Tour studio already exists at **`/tours`** (CEO nav): upload 360s, reorder, delete, **Set start view**, **Restrict view**, pin on a plan, publish. Missing: tripod **nadir patch**, scene-to-scene hotspots/transitions. That is why it feels like there is no tour builder.

---

## 3. Capture decisions recorded in this chat (operator, not marketing)

### 3.1 Mavic 3 Enterprise (stadium-class)

Drop the flight folder (JPGs + optional `.MRK`) into **Map**. GPS EXIF is required for a robust map. RTK sidecars become pose priors when wired. Process in Map for survey products; same stills can also go to Splat for a walk-through.

### 3.2 Underside of a dome / retractable roof

- Phone LiDAR and deck 360s **cannot** see over high steel.
- **Timed stills**, slow, both sides of each truss, ~80% overlap, enough light. High shutter in the dark = useless frames.
- Video (Avata / “360 drone” video) is for a walk-through or emergency frame extract — **worse** as Map input. Avata is **wide FPV, not equirectangular 360**.
- 360 **stills** at joints → Tours. Pinhole stills → Map mesh.
- Long-range **tripod LiDAR** (not iPhone): yes, add `.las`/`.e57` in Map. Geometry + scale; photos supply color/condition. Multiple stations; LiDAR does not see the hidden face of a beam from one setup.

### 3.3 Mini 4 Pro / Mini 5 Pro

Cheap mapping without RTK. DJI Fly has waypoints but not a mapping overlap panel. Plan: **Slate360 Map writes a DJI KMZ (WPML)** — first-party format, load in DJI Fly — so Brian does not need a third-party flight app. Rolling shutter; quality below M3E.

### 3.4 Authoring without third-party software

| Need | Slate360 place (today / to build) |
|---|---|
| Crop splat floaters | **To build** in Splat (no SuperSplat) |
| Tripod legs, keep looking around/up | **To build** nadir patch in `/tours` |
| Opening angle / hide a bad look | `/tours` Build: start view + restrict view (**exists**) |
| Pin 360 on plan | `/tours` Plan tab (**exists**, polish) |
| Pin 360 on mesh/ortho | **To build** in Map viewer (GPS auto or click) |
| Measure / cut-fill | Needs Map **DSM**; measure HUD exists for **meshes**, not splats |

---

## 4. Client packages (individualized — locked intent)

Contractors do **not** all get the same product. Brian assembles a package, then sends a **guest link** (`/view/[token]`, `/portal/[token]`, `/w/[token]`, twin/thermal share as appropriate). They do not log into studios.

Examples (internal only):

- GC: ortho + mesh + numbers
- Architect: 360 tour on drawings only
- Steel/roof: underside mesh + LiDAR + joint 360s
- Owner: walk-through splat + a few pins

**Portal rule:** the link lists **only published chapters**. No empty tiles, no “coming soon,” no catalog of products they did not get.

There is **not** yet a polished logged-in “client portal product.” Guests use tokens. Laptop chat is aligning homepage + portal chrome. Desktop chat produces the **files** that go in those packages.

---

## 5. Business sequence (Brian’s plan — use this order)

Do **not** skip ahead to selling field apps.

1. **Homepage** acceptable (laptop; largely live, examples slot empty until a real permitted project).
2. **Client portal / guest package** acceptable (laptop + share tokens; only show included chapters).
3. **High-quality deliverable** from Slate360 Map and/or Splat (this PC). Stadium splat is in **train** now; Map rebuild waits for GPU + a real photogrammetry engine with GPS priors. A third-party studio that rejects the video is **not** the path.
4. **Pilot contractor:** permission to scan a real job, put **one** example on the homepage (hero/portal placeholders), collect feedback on portal + which deliverables they use.
5. **Paid jobs:** Brian scans, contractor gets the link and visual tools for **their** package.
6. **Later (do not mention on homepage, login, portal, or sales copy until built and accepted):**
   - Contractor self-scan if they have the equipment
   - Access to the field capture apps  
   Those apps are **incomplete**. They stay off marketing and off the client link.

Thermal Studio stays **CEO-only and silent** (sidebar gate, no marketing).

---

## 6. Local programs on this desktop (how to open)

| Program | How | Purpose |
|---|---|---|
| Slate360 Splat | Dev app `/splat-lab` (Proven) / `/splat-lab/lab`; desktop shortcuts from earlier work | Gaussian splat; stadium job `2bb07176` |
| Slate360 Map | Desktop **Slate360 Map.lnk** → `desktop/map-studio` | Photogrammetry ingest + (later) rebuild |
| Slate360 Thermal Studio | Existing shortcut | FLIR only — not splat crop, not 360 tours |
| RealityScan 2.0 | On Desktop | Higher-quality local photogrammetry option if ODM is soft |
| 360 Tours | Logged-in `/tours` (CEO) | Author 360 packages |

WSL: Ubuntu-22.04, 64 GB cap, COLMAP 4.1, nerfstudio venv. Host: RTX 3090 24 GB.

**Rules:** one GPU job at a time; after a crash click **Resume**; never train from `fdc97ba9` images.

---

## 7. Still to build on this desktop (next slices, when GPU is free)

1. Finish stadium splat; visually compare to DroneDeploy mesh/ortho in `Stadium Models`.
2. Map rebuild path: GPS/RTK priors + dense products (ODM and/or RealityScan), then DSM.
3. In-app splat crop/brush.
4. Tour: nadir/tripod patch + hotspots/transitions.
5. Pin 360s on Map mesh/ortho.
6. Mini 4/5 Pro grid → KMZ from Map.
7. Owner login home: **four tiles** (Projects, Process, Author, Publish) — hide the studio junk. Coordinate with laptop dashboard/portal work so tokens stay Graphite vs `--mkt-*` on purpose.
8. Package publisher: pick chapters → one guest URL, nothing extra.

---

## 8. What not to say in public

- Do not name unfinished field apps, “coming soon,” or self-serve scan on the homepage or in a contractor link.
- Do not claim survey-grade or “better than DroneDeploy” until the stadium (or pilot) side-by-side is done.
- Do not put competitor studio brands in the **product, homepage, or commits**. Naming a competitor in this internal ops doc / audit prompt is allowed.
- Do not show Thermal, Splat Lab, or Map to clients.

---

## 9. Client portal viewer (required bar — laptop + desktop must share this)

When a contractor opens a deliverable from the portal, they must get **one sleek, quiet, highly working interactive viewer**, not a pile of leftover studios. Controls must be obvious on first use (orbit / walk / look, reset, chapters, measure only when the asset supports it).

**Package rule stays:** the portal lists only chapters Brian published for that guest. The viewer must **switch mode by asset type**, not show empty product tiles.

| Deliverable the guest might open | What the viewer must do | Honest status today |
|---|---|---|
| **Gaussian splat** | First-person / orbit walk-through, load progress that is real, crop already applied, no install banner | Share splat viewer exists (`SplatViewerCore`, `/share/twin`, splat-lab View card). **In-app crop/brush not built.** Load progress was recently fixed on a share branch; do not assume every token path is good. |
| **Photogrammetry mesh / textured 3D** | Orbit, section, measure when DSM/mesh scale exists | Mesh measure HUD exists in places; Map rebuild + DSM not wired yet. DroneDeploy stadium products are the quality bar. |
| **Ortho / DTM / cut-fill / elevation** | 2D map, opacity, measure, cut-fill readouts | Inventory/classify in Map; **not** a client-ready map viewer. |
| **LiDAR** (LAS/LAZ/E57) | Point display, density, measure to photo/mesh | Ingest classification only. Fusion into Map/SfM is a checkbox today, not a pipeline. |
| **360 tours** | Sphere look, start view, restrict view, scene-to-scene, tripod nadir patched | `/tours` authoring: start + restrict + plan pins **exist**. Nadir patch + hotspots/transitions **missing**. Middleware has blocked authed `/tours` in the past — treat as stale vs nav. |
| **Spatial walkthrough** (360 video sphere, `/w/[token]`) | Play along the path, chapters, look around, pins/docs | Operator studio + guest `/w` exist on spatial branches. **Not** the same object as a Gaussian. People in the **video** are a different problem than people in a **trained splat** (see §10). |
| **Photos / PDFs / reports** | Fast document/photo, pin from the 3D/360 view | Spatial docs+pins are real; Site Walk `/view/[token]` is a separate stack. Unify the chrome so it feels like one portal. |

**Do not** open a different “app” per type (Twin studio, Splat Lab, Map, Thermal). Guest sees: project name, chapter list, one viewer, share they already have.

Laptop chat owns portal chrome and tokens. This desktop chat owns producing splat/map files and, later, in-app crop / Map viewer / tour patch. Coordinate so a splat chapter and a mesh chapter feel like the same product.

Design: public homepage stays **light `--mkt-*`**. Logged-in owner tools stay **Graphite** unless the laptop chat deliberately changes that. Guest portal should feel **sophisticated and calm** — one accent, no cartoon controls, no “beta” language.

---

## 10. How Slate360 Splat keeps people out of the frame

This is **operator privacy / model cleanliness**, not a marketing feature. Clients should simply not see Brian or the crew as ghosts in the walk-through.

### 10.1 What the pipeline actually does

Stage `workers/local/splat-lab/stages/mask.py` + `rtmdet.py`, **before** SfM:

1. **Detector:** RTMDet-Ins-S ONNX (person class 0, score ≥ 0.4, 640 px). Rejects a mask that covers >18% of the 640 square (avoids “the whole frame is a person”).
2. **Dilation:** erode the keep-mask ~24–32 px after upsample so hair/limbs do not leave a silhouette.
3. **Two mask folders, source photos left alone:**
   - `masks/` — per-frame PNG
   - `masks_colmap/` — COLMAP name (`<image.jpg>.png`, 0 = ignore)
4. COLMAP `feature_extractor --ImageReader.mask_path` **does not extract features** on person pixels (same idea as the reference studio’s `maskInSfM: true`).
5. Train can honor the same masks so person pixels are not painted into Gaussians.

**Stay out from under the camera is still the primary method.** The mask is backup for a hand, a reflection, or a passerby.

### 10.2 What we broke, then fixed (this chat)

Older jobs **burned black pixels into the JPEGs**. On the stadium aerial set that looked like “168 people hits” — mostly **false positives** (cars, bleachers, seats). Those holes are permanent if you reuse that folder. Job `fdc97ba9` is **burnt; do not resume it**.

**Now:** masks are sidecar files only. Original JPEGs stay intact. Aerial / drone stills default **Remove people = OFF**. Indoor 360 walks default **ON**.

### 10.3 When to use it

| Capture | Remove people | Why |
|---|---|---|
| Drone stills / stadium / mapping | **OFF** | False positives punch holes in roofs, cars, bleachers; crew is rarely in frame at altitude |
| Indoor 360 video / 360 stills (kitchen, rooms) | **ON** | Operator under the pole / in mirrors is the usual failure |
| Mixed crew on the deck | **ON**, plus stay out of frame | Mask will miss a back, a vest, a reflection |

GPU note: the mask stage plus COLMAP on a 100 GB WSL cap helped hard-crash the PC. Aerial jobs skip the mask; WSL is 64 GB.

Known limits (do not claim “solved”):

- CUDA ONNX often falls back to **CPU** (slow).
- Only **person** class — no “isolate the truck” / object isolation (reference studio has that).
- Does **not** edit a 360 **video** the client plays. It only keeps people out of **SfM + Gaussian train**.
- Cloud Twin path used a different stack (YOLOv8s-seg). Do not assume numbers transfer.

### 10.4 Is a spatial walkthrough possible now?

**Two products. Do not collapse them.**

**A. Spatial Walkthrough (existing product)**  
360 **video sphere** with chapters, pins, docs. Guest URL `/w/[token]`. Operator studio `/spatial-walkthrough`. People the client sees are **in the video frames**. The splat people-mask **does not remove them**. That path still needs: stay out of frame, keyframed operator masks in the walkthrough editor (work exists on `feature/spatial-walkthrough-editor`), and a **nadir / tripod patch** so legs do not sit in the floor.  
**Verdict:** the mask fix does **not** suddenly make this client-ready. It was never blocked only by splat JPEG burn-in.

**B. Gaussian walk-through (Splat output in the portal)**  
A trained `.spz` / `.ply` the guest walks through. If the source is indoor 360 and **Remove people is ON**, operator ghosts in the **model** should drop a lot versus an unmasked train. That is the problem this chat actually fixed (and made safe).  
**Verdict:** **yes, this is now the right experiment** — recapture a short indoor 360 (operator under the camera, mask ON), train when the GPU is free, and look for leftover silhouettes. Stadium job `2bb07176` is the wrong test (aerial, mask OFF). Do not put a walkthrough on the homepage until that indoor check looks clean **and** the portal viewer controls are obvious.

**C. Hybrid (splat + 360 pins + mesh)**  
Still the contractor package story (GC mesh, architect 360, owner splat). People-mask helps the splat chapter only.

---

## 11. Pointers

| Doc | Why |
|---|---|
| `docs/design/HOMEPAGE_STATUS_HANDOFF_2026-09-15.md` | Laptop homepage, live site, how they PR (`origin/main`) |
| `docs/ops/ADVERSARIAL_SPLAT_VS_AIRVIS_PROMPT.md` | Paste into another AI for a hostile Splat vs AirVis review |
| `docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md` | Homepage visual/copy rules |
| `docs/design/VIEWER_MEASUREMENT_AND_COMPETITIVE_PARITY.md` | Measure / cut-fill gated on DSM |
| `docs/design/DELIVERABLE_VIEWER_ARCHITECTURE.md` | Owner vs token viewer split (Site Walk-era) |
| `docs/research/DRONEDEPLOY_RECONSTRUCTION_ANALYSIS.md` | Why GPS priors matter |
| `docs/ops/PORTAL_INVENTORY.md` | Guest URLs vs logged-in mess |
| `docs/ops/SPLAT_LAB_CLAUDE_CODE_HANDOFF.md` | Pipeline gaps vs the reference studio |
| `docs/ops/SPLAT_LAB_STADIUM_HANDOFF.md` | Earlier zip/drop diagnosis |
| `C:\Users\Brian PC\.wslconfig` | 64 GB WSL cap |
| `desktop/map-studio\` | Map app source |
| `tmp/splat-lab/2bb07176\` | Live stadium splat job |

Laptop: fetch `origin/main` (this file) or `origin/feature/splat-lab`. Do not start a competing GPU job from the laptop.

When a later chat opens on this PC: stadium train may have finished — check `tmp/splat-lab/2bb07176/live-status.json` and `output.spz` before starting any other GPU job.
