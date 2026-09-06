# Grok Build Handoff — 2026-09-06

**Status:** LOCKED briefing. Written so a new Grok Build session (laptop or otherwise) can continue without the iPad chat.
**Owner:** Brian (Treppenwitz / bcvolker). **Repo:** `bcvolker/slate360-rebuild` @ `main`.
**Conversation origin:** Grok Build on iPad, 2026-09-06. New chats do **not** inherit that thread. This file is the handoff.

If you are a new Grok session: read `docs/GROK.md` first (laptop vs desktop), then this whole file before writing code. On the **desktop**, also read `docs/GROK_DESKTOP_BOOTSTRAP.md`. Then confirm to Brian that you have it.

---

## 0. Where this agent actually runs

- Grok Build runs in an **isolated cloud sandbox**. Opening it on the laptop does **not** put the agent on Brian's 3090.
- Brian's workstation (`C:\\s360`, RTX 3090 24 GB, 128 GB RAM, WSL2 Ubuntu) is where **he** runs Postshot / local training.
- Claude Code on that Windows machine *does* have Modal/Vercel/Supabase CLIs. Grok Build in the xAI sandbox typically has **GitHub** (this repo) and sometimes Vercel; it does **not** have the 3090, R2 media, or iPhone.
- **Your job:** put a working local splat pipeline *into this repo* (scripts, SOPs, ingest into Twin Studio) that Brian can run on the desktop, then later wire the same path to cloud (Trigger → Modal) for app users.
- Do **not** claim you trained a splat on his GPU. Do **not** burn Modal credits iterating quality while he has a 3090 sitting idle.

---

## 1. Business lock (overrides older SaaS-app framing)

Brian pivoted. Software is the **delivery system**. He is the capture operator until quality is sellable. He needs paid scan jobs as soon as possible — not App Store, not unfinished capture-app polish.

| Was | Is |
|---|---|
| Sell Site Walk + Twin 360 on the App Store | Brian scans; client gets a link |
| Apps are the product | Apps are capture tools for Brian; later maybe for customers |
| Cloud Modal is the factory | Desktop 3090 is the factory **now**; cloud later for other users |
| 360 video tour with operator cropped out | Gaussian splat walkthrough (static scene; operator not reconstructed) |
| Fuse 360 + LiDAR first | Single-sensor splat first; LiDAR is a separate measure layer |

Authoritative product docs that still apply:
- `docs/design/TWIN_SERVICE_BUSINESS_CONTEXT.md` — service-first (locked direction)
- `docs/design/TWIN_SERVICE_STUDIO_PLAN.md` — operator studio + portal phases (Phase G client portal is 0/5; **do not block first invoice on it**)
- `docs/design/TWIN360_CAPTURE_SOP.md` — field capture rules
- `workers/modal/twin-gaussian-splat/` — existing cloud COLMAP + splatfacto worker (quality not client-ready)

Older `docs/SESSION_HANDOFF.md` (June 2026) still talks app-centric SaaS. **Do not resume that plan.**

---

## 2. Hard truths Brian confirmed in the field

1. **Nothing he has produced is a contractor-worthy deliverable.** Trust field reality over repo STATUS.md optimism.
2. **360 video playback as a walkthrough cannot meet his bar.** He walks behind the camera; he is in every frame. Crop / mask / blur / distortion are all rejected. Do not spend more months on 360 *video tours*.
3. **Gaussian splats are the product he actually wants** (Insta360 Spatial Capture class). Moving operator can be excluded at *training* time; the finished splat has no visible mask. That is doable. Spatial Capture itself is cloud + US-blocked — he will not depend on it.
4. **Phone + 360 on one selfie-stick mount has produced nothing of value.** Fusion is last, not first.
5. **Twin360 after Quick Scan is a file dump** — unusable as a product, barely usable for him. Keep it only as *his* LiDAR capture tool. Do not App Store it.
6. **SiteWalk picture + deliverable screens are incomplete.** Native Camera + web upload is faster for his own jobs. Freeze App Store work.
7. **iPhone LiDAR ~5 m.** Interior measure SKU only. Not a Matterport Pro3 competitor. DIY long-range LiDAR is later hardware, not the blocker.

---

## 3. Hardware (do not upgrade yet)

**Desktop (keep, do not buy a new GPU)**
- CPU: Intel Core Ultra 9 285K
- GPU: ASUS ROG Strix RTX **3090 24 GB** — enough. Same VRAM as a 4090. Room splat ~20-60 min, floor ~1-3 h.
- RAM: 128 GB; storage: 4 TB NVMe; Windows + WSL2 Ubuntu 22.04

**Cameras he already has**
- iPhone (LiDAR) — **hero for first photoreal splat (2D video/photos)** and for metric interiors
- Insta360 **X4** — 360 coverage splat path, stick above head
- DJI Mini-class drone (stills, not video) + Antigravity A1 360 drone (exteriors later)
- Selfie stick / dual mount — does **not** make fusion work; stop treating it as the first experiment

**Costco — do not buy this week**
- Insta360 **X6** bundle (~$700): better than X4, but Spatial Capture is US-blocked/cloud. Skip until paid jobs exist.
- Insta360 **Luna Ultra** ($770 Costco): pocket **gimbal**, 1 inch 8K, 20 mm + 60 mm. **Not 360.** This is the better *future* buy (sharper 2D splats, operator not in frame). Buy after 1-2 paid jobs if iPhone looks soft. Not today.

**Buy before cameras:** laser measure (~$80-200), compact LED panels, extra batteries, **GL + professional liability insurance / COI** (jobsite access), Part 107 if flying for pay.

---

## 4. What to build (sequence). Do not reorder.

### Phase L0 — Brian can sell a link (days, not months)
Goal: one photoreal Gaussian splat from **regular 2D** iPhone video/photos, trained **locally** on the 3090, dropped into the existing Twin Studio share viewer.

1. Write a local SOP + script pack under `scripts/local-splat/` (or `docs/design/LOCAL_SPLAT_PIPELINE.md` + scripts):
   - Input: folder of photos **or** a 4K video (iPhone, Luna later, drone stills).
   - Windows-first: **Jawset Postshot** is the primary trainer (NVIDIA, local, no cloud bill).
   - Also document LichtFeld Studio / Brush as optional.
   - Export `.ply` / `.spz`.
   - How Brian uploads that file into Twin Studio / existing splat viewer / share token (reuse `digital_twin_models` + Deliver tab F4 — do not invent a new share system).
2. Capture SOP for 2D (already partly in `TWIN360_CAPTURE_SOP.md`):
   - AE/WB **locked**, HDR off, landscape, slow walk, two heights, loop closed, 2-4 min.
3. Gate: Brian looks at the share link. If he would not send it to a GC, recapture. Do not write more pipeline.

### Phase L1 — 360 camera → splat (not 360 video playback)
Goal: X4 (and later X6) walking video becomes a splat with **no visible operator and no visible masks** in the deliverable.

- Masks are **training-only** (person seg on unwrapped views). Output must not show black blobs, blurs, or crops.
- Prefer spherical SfM / 360-aware prep (360 Gaussian, 360 Splat Pro, SphereSfM class) over the current worker habit of naively slicing equirect → pinhole for COLMAP when that path is producing junk.
- Capture: stick **above head**, lenses L/R, slow loops, lock exposure, export stitched equirect with **horizon leveling / tilt recovery / vibration reduction OFF**.
- Compare same-room 360 splat vs iPhone 2D splat. Hero SKU = whichever looks like money.
- Existing worker: `workers/modal/twin-gaussian-splat/` (`equirect_frames.py`, `operator_mask.py`). Local path should not require Modal.
- License: do **not** ship AGPL YOLO (MASK-2 in studio plan). Permissive segmenter only if we put masking in-repo.

### Phase L2 — drone / other 2D cameras
- Drone: **stills**, nadir grid + 30-45 degree facade orbits, >=80% overlap. Same Postshot path as iPhone 2D.
- Any regular camera (iPhone, Luna, DSLR) uses the L0 path. Do not special-case per brand beyond EXIF/FOV if the trainer needs it.

### Phase L3 — LiDAR as a separate measure layer
- iPhone LiDAR twin = estimating-grade interiors. Client copy = laser governs. Hide numeric tolerances on client chrome until VALID-1 prints a per-job number.
- Do **not** fuse 360 x LiDAR until L0 and L1 each look good alone (studio plan FUSE is last).
- MEAS-1 (collision mesh under splat for picks) is the right measure UX, after a visual splat exists.
- Twin360 app: **one** operator fix if it blocks Brian — named session (thumbnail + date + Process), not a raw file list. No App Store work.

### Phase L4 — cloud for *other users* (only after Brian's local path is producing paid jobs)
- Same reconstruct contract as today: upload → Trigger → Modal `slate360-twin-gaussian-splat` → callback → share.
- Local 3090 remains Brian's factory so he does not run up Modal cost.
- Apps (Site Walk / Twin 360) stay capture + upload. Heavy compute never on-device (`CLAUDE.md`).
- App Store / TestFlight / Codemagic: **frozen** until there is a sellable splat and a reason for third parties to capture.

### Explicitly do not do now
- 360 video tour product (playing the recording)
- Fusion of 360 + LiDAR as the first SKU
- SiteWalk UI overhaul / picture-screen polish / App Store submission
- Twin360 consumer UX / IAP
- Phase G client portal as a blocker (share link is enough)
- Homepage feature theater (VR, white-label, DXF) for unbuilt things
- Buying X6 or Luna for the first sample
- DIY LiDAR scanner design
- Dashboard 100% overhaul (scheduled after trust/quality in studio plan)

---

## 5. Platform pieces that already exist (reuse)

| Piece | Where | Use |
|---|---|---|
| Splat viewer | `components/digital-twin/splat-viewer-*.tsx` | Client walkthrough |
| Share tokens | `lib/digital-twin/share-token.ts`, `/share/twin/[token]` | First client delivery |
| Twin Studio Deliver tab (F4) | studio plan — branded links | Mint links for GCs |
| Cloud worker | `workers/modal/twin-gaussian-splat/worker.py` | Later, other users |
| Capture SOP | `docs/design/TWIN360_CAPTURE_SOP.md` | Field rules |
| Codemagic → TestFlight | `codemagic.yaml` | Exists; freeze store submit |

Minimum to take money: public sample link + Request a scan + Deliver-tab token. Not Phase G.

---

## 6. Verticals (do not market ahead of samples)

**Now:** East Valley remodelers, small GCs, property managers. $750-1,500 small interior; $2.5-5k a floor; recurring monthly visits are the real business.

**Later:** data centers (Phoenix/Mesa/Chandler/Goodyear is a real market). First DC job = hallway / electrical room / tenant fit-out via a GC/MEP who knows Brian — not a hyperscale campus. Stakeholders: owner/lender (timeline), GC (dated walks + punch pins), MEP (installed-condition photos), CxA (photo evidence of tests, not the tests), FM (visual as-built). Interior and exterior stay federated. Thermal is a later DC differentiator (CEO-only studio today).

**Later:** stadiums/venues — marketing splat, suite sales links, night empty-bowl ops. iPhone LiDAR will not range a bowl; drone stills + concourse 360 + suite 2D splats, federated. No native Vision Pro app; web splat is enough.

---

## 7. First message a new Grok session should treat as the assignment

Read `docs/GROK.md` and `docs/GROK_BUILD_HANDOFF_2026-09-06.md`. Confirm you have them. Then execute **Phase L0**: a local-on-desktop Gaussian splat pipeline for regular 2D photos/video (iPhone, drone stills, later Luna), documented and scripted in-repo so Brian can run it on the RTX 3090 with Postshot, then ingest the `.spz`/`.ply` into Twin Studio and mint a share link. After L0 is written and Brian can follow it, do **Phase L1** (360 X4 → splat, training-time operator suppression, no visible masks in the deliverable). Do not polish the mobile apps. Do not use Modal for quality iteration. Do not fuse LiDAR yet.

---

## 8. Success gate

Brian opens a share link of a real room, on his phone, and is willing to send it to a contractor without apologizing. Until that is true, capture and local training beat more software.
