# Adversarial prompt — AirVis vs Slate360 Splat

**For:** Brian to paste into another AI platform (no repo access required).  
**Written:** 2026-09-15, desktop chat (`C:\s360`).  
**Companion:** `docs/ops/DESKTOP_SPLAT_MAP_SESSION_2026-09-15.md`

Copy everything **below the line**. Do not paste this header. Do not put the AirVis name in Slate360 UI, homepage, or git commit subjects — this prompt is internal analysis only.

---

ROLE: You are a hostile product + reconstruction auditor. Your job is to attack two local Gaussian-splat programs and find what is missing, incorrect, broken, or oversold. You have NO code access. Use only what is stated here plus public facts you can verify about AirVis (the Windows/local 3DGS studio, not a phone cloud app, not CloudXR, not generative worlds). Do not write marketing. Do not recommend “just use RealityCapture for everything.” Judge each system as designed, then say where it fails a professional operator who must deliver a contractor-facing walk-through.

Be adversarial. Prefer “this is broken / this claim is false / this control lies” over polite feature lists. If evidence is thin, say so and still list the cheapest way to falsify it. One known failure is already admitted: AirVis shows a live preview while the model is building; Slate360’s equivalent is not working. That is an example, not the only issue — hunt for the rest.

## Business constraint (do not violate in recommendations)

Slate360 is a done-for-you reality-capture service. The CEO (Brian) scans on a Windows desktop with an RTX 3090 24 GB and WSL2 Ubuntu 22.04. Contractors get a guest portal link and an interactive viewer. They never install Splat or Map. Unfinished field-capture phone apps must not appear in any public or client recommendation. Thermal Studio is CEO-only and silent. Do not put AirVis branding into Slate360.

Success for Brian: high-quality Gaussian walk-throughs and photogrammetry products he can put in a per-contractor package, plus a sleek portal viewer. He will then run a pilot scan with permission to put one real project on the homepage.

## What AirVis is (attack this too)

AirVis is a local Windows studio for turning 360 video / photos (and related inputs) into a Gaussian splat. Public/operator-visible traits we are treating as the bar:

- Desktop program feel: Input → Process → Deploy (or equivalent three-stage studio).
- Live / progressive preview of the model while training (viser-style or their own viewer) so the operator can see structure early and abort a bad job.
- People masking and `maskInSfM`-style exclusion so the operator does not become a ghost.
- Object isolation (keep a subject, drop the rest), not only “remove people.”
- Accept a ready COLMAP / sparse model and skip re-SfM.
- 360 video → many perspective views per frame (they advertise on the order of **16** views per 360 still in cloud tables).
- Collision or nav mesh so first-person walk does not fall through floors.
- LOD / streaming pack for instant load, not only a single huge PLY.
- Hardware story (RAM / VRAM / disk) stated in-product.

**Brian’s live complaint:** AirVis did not accept or process his video (reject / fail / unclear). Treat that as a first-class defect of AirVis, not as proof Slate360 is better. Find likely causes (codec, Insta360 `.insv` dual-stream vs equirect MP4, resolution, audio, path length, GPU driver, file size) and what a competent studio would show instead of a silent reject.

Search their current public site/docs if you can. If you cannot verify a claim, mark it **unverified**.

## What Slate360 Splat actually is (attack this harder)

Internal name: Slate360 Splat / Splat Lab. Local-only (`localhost`, CEO). Not shown to clients.

### Pipeline (WSL)

1. **Frames:** ffmpeg from a folder of videos/images. Multi-video high+low. Skips `.insv` / `.lrv`. Default extract ~2–4 fps. 360 vs flat is a toggle / auto-suggest.
2. **People mask (optional):** RTMDet-Ins-S ONNX, person class 0, score 0.4, reject masks >18% of 640, dilate ~24–32 px. Writes `masks/` + `masks_colmap/`. COLMAP `--ImageReader.mask_path` skips those pixels. **As of 2026-09-15, source JPEGs are no longer overwritten.** Older jobs burned black holes into photos; one stadium job (`fdc97ba9`) is permanently burnt. Aerial / drone defaults mask **OFF** because cars/bleachers false-positive. Indoor 360 defaults **ON**. CUDA ONNX often fails; CPU fallback is slow. No object-isolation mode.
3. **SfM:** COLMAP 4.1 via nerfstudio-style process. 360 HQ = official **12**-view rig (yaws 0/90/180/270 × pitches −35/0/35, 90° FOV) via `py360convert`; faster = 6 cube faces. Flat aerial: `max_image_size` 2048, GPU extract, **vocab-tree** matching when n is large (exhaustive hung). Does **not** consume GPS/RTK as pose priors today (checkbox exists, does nothing). Does **not** consume LiDAR (checkbox exists, does nothing). Reuses `database.db` / sparse on Resume. Writes `sfm/preview.json` (cameras + downsampled points) for an SfM debug view.
4. **Train:** `ns-train splatfacto`, 25k steps typical, telemetry JSON (iteration, splat count, it/s, ETA). Viewer port **7007** (nerfstudio / viser). Export `.ply` and optional `.spz`.
5. **UI:** Proven (simple) vs Lab (experimental). Job board with stages, progress %, Resume after crash (`--from-stage auto`). View card: `SplatViewerCore` when a model exists; button “Open viewer :7007” iframes `http://127.0.0.1:7007`. **Brian reports the live-during-train preview does not work.** Likely suspects you must evaluate: WSL vs Windows localhost, viser bind address, iframe mixed-content / browser blocking, viewer never started, HUD telemetry shown while iframe is black, port not published from WSL.
6. **Publish:** hook to upload into SlateDrop / portal. Clients never see this UI.
7. **Crash history:** WSL was set to 100 GB of ~127 GB host RAM; COLMAP GPU + mask GPU → Windows Kernel-Power 41 / 0x3B hard power-off. Now WSL **64 GB**. One GPU job at a time. Stadium aerial job `2bb07176`: 530 M3E stills, mask skipped, SfM 530/530, train running (~20% at last note).

### Stated gaps vs AirVis (from our own handoff — verify and add more)

- Not a real `.exe` / icon story was broken (Open With, generic icon). Partial launch-script work; may still feel like a website.
- Folder picker / drag-drop were late; zip of DroneDeploy `source_data_export` was rejected until classify/ingest landed.
- No COLMAP-import skip-to-train.
- No object isolation.
- 12 views, not 16 (12 is the open-source proven rig; 16 is Lab-future).
- No collision / nav mesh on export.
- SPZ ≠ LOD streaming pack.
- LiDAR + RTK toggles lie.
- In-app splat **crop/brush not built** (third-party splat editors are banned).
- Live preview during train: **not working** (admitted).
- Quality of indoor kitchen captures has been soft in the web Spark viewer (kernel / FOV / model), not only “needs more steps.”
- Photogrammetry (ortho, mesh, LAS, DTM, cut/fill) is a **second** local app (Slate360 Map), ingest-only until GPU is free; matching DroneDeploy quality is **not** promised.

### Spatial walkthrough vs splat (do not confuse them)

- **Spatial Walkthrough:** 360 **video sphere**, chapters, `/w/[token]`. People in the video are not removed by the splat mask.
- **Gaussian walk-through:** trained splat. People mask helps only this path, and only when ON.
- Tour builder (`/tours`): start view + restrict view exist; tripod nadir patch + scene hotspots missing.

## What you must produce

### 1. Scorecard (table)

For each row: AirVis | Slate360 Splat | Winner | Confidence (high/med/low) | Evidence.

Rows (add more if you find them):

- Accepts real operator video (Insta360 equirect MP4, `.insv`, phone video, DJI)
- Honest errors when a file is rejected
- Live preview **during** SfM
- Live preview **during** train
- People out of the model (accuracy, false positives, aerial vs indoor)
- Object isolation
- GPS / RTK / EXIF used in SfM
- LiDAR used
- 360 → perspective view count and FOV correctness
- Resume after crash / power loss
- One-click desktop launch
- Time-to-first-useful-image for the operator
- Export formats clients can open in a web viewer
- Crop / clean floaters
- Collision / walk mode
- LOD / load time
- GPU/RAM safety (does it hard-crash the PC)
- Operator UX honesty (dead toggles, fake progress, ghost “completed” jobs)

### 2. AirVis: hostile findings

List defects, including “won’t take Brian’s video.” Infer failure modes. What would you demand they fix before a professional trusts a paid job to it?

### 3. Slate360 Splat: hostile findings

Assume our handoff is optimistic. Find:

- Things we said work that probably do not (especially :7007 preview, mask quality, 360 video ingest, publish-to-portal).
- Missing pieces that will make a contractor say the walk-through is amateur.
- Incorrect pipeline choices (matcher, view count, train profile, mask-on-aerial, no GPS priors).
- UI lies and progress lies.
- Viewer/control gaps once the file is in a **client portal** (orbit/walk, reset, mobile, measure, chapters).

### 4. Portal viewer (both programs fail if this fails)

The contractor opens one guest link and may have: Gaussian splat, photogrammetry mesh, LiDAR, ortho, 360 tour, spatial (video) walkthrough. Attack whether Slate360 can deliver “one sleek sophisticated viewer with intuitive controls” today. List the minimum control set. Call out fragmented URLs (`/view`, `/w`, `/share/twin`, `/portal`) as a product defect if you agree.

### 5. Punch list for Slate360 only (priority order)

P0 = Brian cannot trust a job this week.  
P1 = contractor would notice on a pilot.  
P2 = polish.

Each item: what’s wrong, how you’d prove it in <30 minutes, the smallest fix. Do **not** propose rewriting the stack. Do **not** tell us to ship unfinished phone apps.

### 6. What we should stop claiming

Any sentence in our story that is false, premature, or dangerous (quality vs DroneDeploy, “people removed,” “preview while building,” “spatial walkthrough is unblocked,” survey-grade, etc.).

## Rules

- Short sentences. No vendor fluff.
- Mark unverified claims.
- If you recommend looking at AirVis public docs, quote what you used.
- End with a 10-line “if I were the competing studio’s engineer, I would laugh at Slate360 because…” paragraph, then a matching paragraph that laughs at AirVis.
