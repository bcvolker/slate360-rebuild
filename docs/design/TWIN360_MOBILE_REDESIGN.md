# Twin 360 mobile — ground-up redesign (recommendation v1)

Date: 2026-09-08 · Status: **recommendation, awaiting Brian's nod** (per the rule in
`TWIN360_END_TO_END_UX_PLAN.md` §8: bring a recommendation before each slice; reimagine,
never patch). Supersedes the mobile rows of that plan's screen inventory (M1, M3, M4, M5, M9).

## 0. What the device test showed (build #82, 2026-09-08)

| Seen | Root problem |
|---|---|
| Home is one 18-row list titled "Quick Scan — <date>" | Nothing is organised by job. The list is the whole product. |
| Scan just made could not be found again | No "continue where I left off"; new captures land in a pool project and look like every other row. |
| Twin page said "still building in the cloud, 20–40 min" for an unprocessed scan | State copy invented a cloud job that never existed. |
| Old viewer: kitchen visible only from outside, fuzzy | Orbit viewer of a splat from outside a room is the wrong instrument; the walkthrough viewer exists but was never wired into the app. |
| Upload failed with a database error, photos never registered | A sidecar kind the DB rejects took the batch down (fixed, build #83). |
| Screen dimmed during a timed walk; no idea whether LiDAR was collected | Idle timer left on; photos mode collected no LiDAR (both fixed, build #83); nothing on screen or afterwards says what was captured. |
| Projects / Twins / Files screens each look different | Three visual grammars on one path; green and blue accents mixed on Twin screens. |

The capture screen itself was judged acceptable. Everything around it is replaced below.

## 1. Rules this design obeys

1. **Phone = capture + light interaction.** Editing, publishing versions, exports live on the desktop
   (Studio) or the desktop Capture Studio. The phone never shows a control it cannot finish.
2. **One decision per screen.** Every screen answers three questions in this order: where am I,
   what do I have, what is the one thing to do next.
3. **No unbounded lists.** Anything that can grow is grouped (by project, then by day) and
   capped with "see all", or scrolls inside its own bounded region.
4. **Honest states, five words max.** Saved · Uploading · Processing · Ready · Failed. No
   "building", no "draft".
5. **Twin blue only, on interactive states only.** Site Walk green never appears on a Twin
   screen. Glass panels, hairline borders, IBM Plex Mono labels, 12 px radius. Targets ≥ 48 px.
6. **Every capture ends with a receipt.** What was collected (photos, LiDAR points, poses, depth
   frames, duration, settings) is shown once on the phone and stored on the capture row, so it
   can be read anywhere later.
7. **Local first is a real path.** "Build on desktop" is a first-class outcome, not a footnote:
   the phone's job is to get a complete, named, project-assigned bundle into the cloud.

## 2. Information architecture (the whole surface)

```
Twin 360 Home ──► Project twins ──► Twin ──► Viewer (walkthrough)
     │                  │             └──► Share sheet
     └──► New scan sheet ──► Capture (native) ──► Collected (receipt) ──► Twin
```

Seven screens, two sheets. Removed from the phone: the standalone "My Twins" list, the
Upload page (desktop only, form-factor rule), "Review & Sources" (folded into Collected), the
separate submit funnel, and the versions panel (desktop).

Routes stay under `/digital-twin` for links already in the wild; the visible name is Twin 360.

## 3. Screens

### S1 Home  (`/digital-twin`)

Top → bottom, fits one phone screen without scrolling on a 6.1" device:

1. Header: "TWIN 360" mono label, title "Twins", account/apps buttons (shell).
2. **Scan** — one full-width primary button (Twin blue). Nothing competes with it.
3. **Continue** card (only when something is unfinished): the last capture that is uploading,
   or collected-but-unprocessed, or processing. Thumbnail, name, state chip, one verb
   ("Finish upload", "Review", "Open").
4. **Projects** — cards, not rows. Each: project name, twin count, last activity ("Today 7:24 PM"),
   thumbnail of the newest ready twin. Sorted by latest activity. "Quick Scans" is one card like
   any other, labelled "Quick Scans · unfiled". Max 6 cards, then "All projects".
5. Search field (projects and twins by name) pinned above the cards on scroll.

Gone: the 18-row feed, status chips on home, "Your twins · 18".

### S2 Project twins  (`/digital-twin/projects/[projectId]`)

1. Header: back, project name, count. Filter segments: **All · Saved · Ready** (Processing and
   Failed roll into All with their chips).
2. Rows grouped by day (Today, Yesterday, "Sep 6"). Row = 56 px thumbnail (poster or the
   twin-blue placeholder), name, time, state chip, chevron. Long-press → multi-select.
3. Row actions (swipe or ⋯): Rename, Move to project, Delete. Move and Delete work on
   multi-select.
4. Footer button: "Scan into this project".

Names default to "<Project> · <Sep 8, 7:24 PM>" and are editable inline; the rename writes back
to the space title so every surface agrees.

### S3 New scan sheet (from Scan on S1 or S2)

Bottom sheet, one screen:

1. **Project** — picker defaulting to the last project used (or the project you came from);
   "Quick Scans · unfiled" is the fallback, never the default once a real project exists.
2. **Name** — prefilled "<Project> · <time>", editable.
3. **Capture mode** — two cards, the recommended one preselected:
   - **Detailed twin** (recommended): Photos, 1 s interval, Fast shutter, AE/WB lock, LiDAR on.
     Sub-line: "Sharpest result for Gaussian splats. Walk slowly, ~1 photo per step."
   - **Quick room scan**: Video, LiDAR + depth frames. Sub-line: "Fast, lower detail. Best for a
     geometry-only mesh."
4. **Start** (primary). The choices are passed to the native capture as presets.

### S4 Capture (native HUD — keep, polish)

Keep the current layout. Changes only:
- Top chip row shows **LiDAR · 128K pts · Photos 84 · 2:13** live, so the operator sees data
  accumulating (the "did it collect LiDAR" question is answered on screen).
- Settings row (AE·WB lock, Fast shutter, 1× wide) as shipped; hidden while capturing.
- Screen never dims (shipped in #83).
- Done → S5 immediately; upload runs in the background with the receipt visible.

### S5 Collected  (`/digital-twin/captures/[captureId]`) — replaces Review & Sources + Submit

The receipt. One screen, no tabs:

1. Header: back to project; editable name; project row with "Change".
2. **Collected** grid (2 × 3 tiles, mono numbers): Photos · Video · LiDAR points · Camera poses ·
   Depth frames · Duration. Below: "Settings: Photos 1 s · Fast shutter · AE/WB locked · 1× wide".
   Any zero that matters is stated plainly ("No LiDAR — capture used video only").
3. **Upload** bar: "Uploading 61 of 84 files · 212 MB" with per-group progress and a Retry row
   for anything that failed. When complete: "Saved to the cloud · <time>".
4. **Next** — three equal cards, one tap each:
   - **Done for now** — the default. Capture is saved; the twin shows as Saved.
   - **Process in the cloud** — shows the credit estimate inline; confirms once.
   - **Build on desktop** — "Open Capture Studio on your desktop and pick this capture." Links
     copy the capture ID; the studio pulls the bundle (§6).
5. Tertiary: "Add files" (camera roll / SlateDrop) and "Delete capture", both small.

### S6 Twin  (`/digital-twin/twins/[id]`)

1. Header: back to project, name (editable), ⋯ (Rename, Move, Delete).
2. **Hero** (height-bounded, 45% of the screen): the walkthrough viewer when a ready model
   exists; otherwise the poster thumbnail with the state chip centred.
3. **State line**, one sentence:
   - Saved: "Saved · not processed. 84 photos, 128K LiDAR points."
   - Uploading: "Uploading 61 of 84 files."
   - Processing: "Processing in the cloud · 43% · started 7:31 PM."
   - Ready: "Ready · published Sep 8 · 237K splats."
   - Failed: the actual error, one line, and what to do.
4. **Action bar** by state (max three buttons):
   - Saved → Process · Build on desktop · Add files
   - Processing → Notify me (default on) · Cancel
   - Ready → Open · Share · Open on desktop
   - Failed → Retry · Build on desktop · Delete
5. **Details** accordion, collapsed: captures in this twin (each a mini receipt), versions
   ("Current · 2 more" → desktop), location, measurements.

### S7 Viewer (mobile)  (`/digital-twin/twins/[id]/view`)

The walkthrough viewer shipped today on share links, full screen: Inside · Dollhouse · Plan,
tap-to-walk, drag-to-look, ceiling Open/Closed. Bottom bar adds Share and Done. Measure and
Pins appear only when a metric mesh exists. Opens at the first capture station.

### Sheets

- **Share**: link with role (View / Annotate / Download), expiry, copy, QR. Same component as
  the desktop share panel, phone layout.
- **Move to project**: project list with search; used by S2 and S5.

## 4. State model and copy

| State | Data rule | Chip | Where |
|---|---|---|---|
| Uploading | capture_status = uploading | Uploading | S5, S6, S2 |
| Saved | capture uploaded, no job | Saved | S2, S6 |
| Processing | job queued or processing | Processing · 43% | S2, S6 |
| Ready | a ready model is published | Ready | S1 thumb, S2, S6 |
| Failed | job failed or upload failed after retries | Failed | S2, S6 with reason |

Rows without a capture and without a model (abandoned shells) are deleted by the server after
24 h, never shown. The three empty captures from tonight's test are exactly this case.

## 5. Capture guidance the app states in S3 (and the SOP should adopt)

For the most detailed Gaussian splat **and** LiDAR in one walk: **Photos mode, 1 s interval,
Fast shutter on, AE/WB lock on in rooms with windows, 1× wide.** Walk at half normal pace, hold
the phone level at chest height, pause a second at corners and doorways, do a second pass at
knee height for counters and floors. Half-second interval only for large open spaces or when
walking faster; it doubles upload and solve time for near-duplicate frames. Video mode remains
for quick geometry-first room scans and is the only mode that records depth-evidence frames.

## 6. Backend and data (all additive)

1. `digital_twin_captures`: `summary jsonb` written at upload-complete from `capture_bundle.json`
   (photo/video/point/pose/depth counts, duration, settings). Feeds S5, S6, S2.
2. `digital_twin_spaces.poster_key`: first sharp photo of the newest capture, resized server-side
   at upload-complete. Feeds every thumbnail.
3. Rename and move: `PATCH /api/digital-twin/spaces/[spaceId]` (title) and the existing
   `/project` move route; captures follow the space.
4. Cleanup job: delete draft spaces with no capture and no job older than 24 h; delete captures
   stuck in `uploading` with zero registered assets after 24 h.
5. Desktop Capture Studio: "Pull capture" by ID downloads the bundle (photos, PLY, poses), builds
   locally, and **publishes** the `.spz` + walk sidecars back to the same twin
   (`published_model_id`), so the phone's Twin screen turns Ready without cloud credits.
6. Authenticated viewer (S7) uses the same walk-sidecar rule as share links.

## 7. Build sequence

| Slice | Scope | Verify |
|---|---|---|
| 1 | Data: capture summary, poster, cleanup job, rename route | SQL + API tests |
| 2 | S1 Home + S2 Project twins + Move/Rename sheets | preview harness with real data; on device |
| 3 | S3 New scan sheet + native presets (mode/interval/lock passed through the bridge) | TestFlight |
| 4 | S5 Collected (receipt + upload + three outcomes) | TestFlight, one real walk |
| 5 | S6 Twin + S7 Viewer (walkthrough in-app) + Share sheet | TestFlight |
| 6 | Capture Studio: pull capture by ID, publish back | desktop end-to-end |

Each slice ships behind the existing routes, passes typecheck/guards, and is TestFlight-built
before the next starts. Nothing is "done" until Brian has used it on the phone.

## 8. Decisions (made by Brian, 2026-09-09)

1. **Default project for Scan: last used**, one tap to change; Quick Scans only when no project exists.
2. **No cloud-processing button on the phone for now.** Every scan is saved; processing happens on
   the desktop Capture Studio, which publishes back to the twin. Revisit when the desktop path is
   producing sellable models.
3. **Words: "Twin" is the object, "Scan" is the act of capturing.**
4. **The walkthrough viewer is the viewer for every model.** The cloud worker must emit the walk
   sidecars (stations, floors, ceiling cut, upright manifest) as the desktop studio does; scheduled
   after the desktop path is proven. Until then cloud-processed models stay on the orbit viewer.

Status (2026-09-09): slice 1 shipped (capture receipt in capture_metadata.summary, poster in
space settings, rename/delete route, 24 h draft-shell cleanup in the 15-min cron, backfill endpoint).
Slice 2 shipped (S1 Home, S2 Project twins, S3 New scan sheet without the capture-mode cards;
capture into an explicit twin; after upload the phone lands on the twin — Decision 2). Next: slice 3
(capture-mode cards passed to the native HUD as presets), then S5 Collected receipt, then S6/S7.
