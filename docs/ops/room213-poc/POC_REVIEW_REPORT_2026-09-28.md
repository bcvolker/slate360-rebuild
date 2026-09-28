# Room 213 POC review — pipeline, viewer and navigation

Sep 28, 2026 · @Brian Volker

The Room 213 viewer now shows the untouched golden model at full fidelity when standing still, but motion on iPhone still shows dark marks, cold load is about 31 s, and it is not yet ready for contractor testing. This report is written for review by another assistant: each section states what exists, what was measured and what remains.

## At a glance

Standing-still fidelity is solved; motion quality on iPhone, cold load time and real-device verification are the three gates before contractor testing.

| Area | State | Evidence | Gate for contractor test |
| --- | --- | --- | --- |
| Capture | Insta360 X4 walk of Room 213 (21 Sep 2026); iPhone LiDAR registration failed (walls 10–20 cm off) | COORDINATES.md, prior reports | Repeatable capture protocol per room |
| Trained model | Spirula 3DGUT (rev fd1afca1 + resume patch), 996,092 Gaussians, SH degree 3, 247 MB PLY, sha 7e7b5d18… | Held-out 19.19 dB; export bit-exact | Automated worker + manifest provenance |
| Viewer fidelity (still) | Full viewer = minimal golden control at matched camera/DPR (p99 pixel diff 0) | FIDELITY.md §1 | Done |
| Viewer fidelity (moving, iPhone) | Brian still sees large dark marks and distortion while moving | Not reproducible on desktop; on-device A/B links shipped | **Open — blocker** |
| Navigation | Dollhouse / Walk / Plan, pins, Room information, landscape twin joysticks, walls + table-row collision | Emulation-verified | iPhone re-test |
| Delivery | Public R2 bucket via media.slate360.ai, content-hashed immutable file, Range, CORS locked to preview origin | curl checks | Cold load \~31 s on iPhone — **too slow** |
| Link sharing | OG title/description + Dollhouse share image | Bot-UA fetch OK | iMessage showed no image once; re-test with fresh URL |
| Hosting | Vercel preview branch preview/room213-poc only; 404 on production | deploy-info | Portal integration pending |

## Moving dark-marks deep dive

The dark marks Brian sees while moving on iPhone could not be reproduced on a desktop GPU, even with iPhone-like sort delays, so the cause is now being isolated on the phone itself.

**How Spark draws a moving view.** Every frame Spark re-packs all 996,092 splats for the new viewpoint and shows them at once, but their back-to-front order comes from an asynchronous sort (GPU depth readback + worker sort). Until that sort lands, the frame is blended in the previous viewpoint's order. This room's walls are semi-transparent layers, so a stale order can show as smears.

| Hypothesis | Test | Result |
| --- | --- | --- |
| Stale sort order while moving | Desktop, forward motion at joystick speed with 400 ms and 1,500 ms simulated sort latency, plus fast turns | Mild softness only, no black marks |
| Camera passing through chairs/tables (walls-only collision build) | Camera placed inside a table row | Fixed: table-row footprint collision + near plane 0.05 → 0.2 (7f5dec96) |
| Joystick too fast (larger per-sort displacement) | Measured 2.1 units/s | Fixed: 0.65 units/s, look 45°/s, eased (2e39d15d) |
| Resolution drop (AdaptiveDpr) | iPhone reported native 3 → renderer 2 | Ruled out |
| Spark iPhone-specific code path | Source audit of Spark 2.1.0 | None for rendering (only LoD/paging defaults) |
| Foveation (behindFoveate / cone) | Source audit | Only applies with LoD, which is off |
| Empty background showing through thin walls | On-device A/B (below) | Pending Brian's test |
| Giant near-camera splats (maxPixelRadius 512) | On-device A/B | Pending |
| Faint splat layers (minAlpha 0.002) | On-device A/B | Pending |

**On-device A/B links** (same room, same path, one variable each; normal URL unaffected):

1. Baseline: `/preview/room213?probe=1`
2. Light background behind the capture in Walk: `/preview/room213?probe=1&diag=bg`
3. Cap splat screen radius at 96 px: `/preview/room213?probe=1&diag=px`
4. Drop faint splats (minAlpha 0.02): `/preview/room213?probe=1&diag=alpha`

If one link removes the marks, that variable becomes the product fix. If none does, the next step is a screen recording with `?internal=1` (live sort ms and frame time) to correlate marks with sort latency spikes (1–2 s maxima observed on iPhone).

## Pipeline

The model path is capture → Spirula training on Modal → lossless PLY export → content-hashed public file; the weak links are file size (247 MB) and the manual steps between stages.

| Stage | Tool / location | Output | Key numbers and notes |
| --- | --- | --- | --- |
| 1. Capture | Insta360 X4 (.insv), native fisheye | Frames (.insv → PNG, BT.709 full range, bit-exact into the loss) | iPhone LiDAR pass failed registration (10–20 cm wall error) → no measured geometry in the viewer |
| 2. Poses | COLMAP-style rig solve (prior Room 213 audits) | Camera poses | Poses \~1 px; down-looking views weakest (appearance, not geometry) |
| 3. Training | Spirula 3DGUT, rev fd1afca1 + one-line resume patch; Modal app slate360-spirula-hardened | Gaussian model, 996,092 splats, SH degree 3 | Held-out 19.19 dB; worker reproduction matched golden (996,260 vs 996,092; 19.21 vs 19.19 dB). Capacity scaling (3M), PPISP, bilateral grid and edge-aware densify all failed the Spark gate → recipe closed |
| 4. Export | splat.ply (62 properties) | 247,032,347 bytes, sha256 7e7b5d18… | Export verified lossless vs training state; the model's provenance (trainer, revision, primitive) drives the viewer profile |
| 5. Publish | scripts/ops/room213-publish-public-model.mjs → R2 bucket slate360-public-previews | golden-7e7b5d18af92d5f4.ply at media.slate360.ai | Immutable cache, byte ranges, CORS limited to the preview origin; fallback streaming route on Vercel |
| 6. Scene data | scripts/ops/room213\_presentation\_data.py | lib/room213/presentation-data.json | Room box, walls, correction quaternion (≈2.6° level), table-row footprints; pins hand-anchored in the model's own frame |

Not yet automated for a new room: pose solve → training → manifest with training\_rasterizer → publish → scene data (bounds, entry pose, table rows) → pins. Each was run by hand for Room 213.

## Viewer

The viewer is a Next.js page (/preview/room213) on React Three Fiber v9 and Spark 2.1.0, drawing one untouched golden PLY with the render settings the model was trained for.

| Setting | Value | Why |
| --- | --- | --- |
| Model | One golden PLY in every view, streamed into Spark (no main-thread copy) | Presentation-cleaned PLY and its complement caused dark wall smears in Walk (retired) |
| Accumulator | accumExtSplats = true (fp16 unclamped colour) | Default packed accumulator clamped colours > 1; \~62 % of carpet splats exceed 1 |
| Screen filter | blurAmount 0, preBlurAmount 0 | 3DGUT evaluates Gaussians along the ray with no 2D blur |
| Level of detail | Off | Spark LoD / paged RAD collapsed the ortho Plan and looked softer |
| Pixel ratio | min(devicePixelRatio, 2), fixed | DPR 2 vs 1.5 ≈ 2× edge detail; adaptive downgrade removed |
| Fidelity check | Live check against the Spirula constants + lineage; visible notice if degraded | Previous check could validate a fallback against itself |
| Cameras | Scene-owned perspective (Dollhouse/Walk) and orthographic (Plan) cameras, switched explicitly | drei makeDefault race caused a sideways room |
| Transitions | 180 ms fade; cover lifts only when Spark's sort matches the new camera (SETTLED vs FAILSAFE logged) | No streaky reveal frames; \~160–310 ms on desktop |
| Crop | None in Walk (ceiling cut optional); walls + 0.2 and open top in Dollhouse/Plan | Wall splats outside the room carry the interior wall appearance |
| Walk camera | FOV 62, eye 1.55 above floor, near 0.2, roll always 0 | Near 0.2 culls splats at the eye (dark smears) |
| Fallbacks | WebGL2 check + error boundary → "3D view couldn't start" + Try again; media host → Vercel route | No blank screens |

A local-only golden control page (/preview/room213/control) renders the PLY with the minimum Spark stack for A/B checks; it returns 404 on Vercel.

## Navigation and UX

A recipient gets one control strip (Dollhouse | Walk | •••), tappable plaques for four items, and a Room information list; landscape phones add twin joysticks.

| Surface | Desktop | Phone portrait | Phone landscape |
| --- | --- | --- | --- |
| Modes | Dollhouse (orbit), Walk (first person), Plan in ••• (ortho pan/zoom) | Same | Same; strip slides away after \~4 s idle, tap brings it back |
| Walk movement | Drag to look, click floor to step, WASD / arrows / wheel | Drag to look, tap floor to step | Left stick moves (0.65 units/s max, eased), right stick looks (45°/s max) |
| Collision | Room walls + table-row footprints (+0.08); aisles open | Same | Same |
| Pins | 4 plaques (layout drawing, 3 photos), 40–64 px in Walk, 32–44 px in Dollhouse/Plan, 10 cm off surfaces | Same | Same |
| Pin content | Right side sheet: media first, View in room, description | Bottom sheet | Right side sheet (≤42 %), strip re-centred |
| Media | Full-screen inspector: pinch / double-tap / wheel zoom to 8×, pan, tap outside or Esc to close | Same, safe areas respected | Same; opens filled for small or odd-aspect media |
| Room information | ••• → list of 4 items with thumbnails, Open and View in room | Same | Same |
| Reset | Returns to the current mode's start, cancels any step in flight | Same | Same |
| Full screen | ••• → Full screen | iPhone Safari: not possible for web pages | Android: auto on first touch + toggle; iPhone: none (Add to Home Screen launches full screen via route manifest) |
| First-use hints | One-time: Dollhouse and Walk hints | Plus a closable "Turn sideways to walk with a joystick" tip | "Left stick moves · right stick looks · tap to show controls" |

One transient surface at a time: opening a pin, the menu or a mode closes the others; a tap outside a sheet or menu closes it without moving the camera.

## Measured performance

On Brian's iPhone the room takes \~31 s to become interactive and moves at roughly 20–40 fps; the 247 MB download dominates load, and the depth sort dominates motion quality.

| Metric | iPhone (Brian, DPR 2) | Desktop in-app browser | Notes |
| --- | --- | --- | --- |
| Poster visible | prompt | \~0.5–2.8 s | Poster + byte progress cover the wait |
| Model request → first byte | \~7.1 s → \~8.5 s | \~2.9 s → \~3.8 s | Includes page JS start-up |
| Transfer complete | \~30.6 s | \~10.6–11.6 s | 247 MB; \~68 s on a 30 Mbps LTE-like link (earlier test) |
| First frame / interactive | \~31 s | \~11 s | Decode is fast once bytes arrive |
| Frame rate | \~20–40 fps portrait, \~21 fps landscape | \~57 fps | 996k splats at 880×1584 / 1912×610 buffers |
| Depth sort latency | tens–hundreds of ms, maxima 1–2 s | 140–310 ms | Worker sort itself \~54 ms; GPU readback wait dominates |
| View switch (cover) | not measured on device | 160–310 ms, all SETTLED | Failsafe 8 s never hit in the real browser |
| GPU accumulator | 68.5 MB | 68.5 MB | accumExtSplats at \~1M slots |

Headless-browser timings (0.2–38 s sorts) are unreliable and were not used for conclusions.

## Open issues and known limits

Two items block contractor testing (motion marks, cold load); the rest are known limits to disclose or later work.

| Issue | Severity | Type | Next step |
| --- | --- | --- | --- |
| Dark marks / distortion while moving on iPhone | Blocker | Unresolved (viewer or device) | On-device A/B links; then recording with ?internal=1 |
| Cold load \~31 s on iPhone (247 MB) | Blocker for field use | Delivery | Smaller delivery format (see recommendations) |
| iPhone Safari cannot go full screen; tab/address bars take landscape height | High UX | Platform limit | Add to Home Screen, or open inside the Slate360 iOS app (native full screen) |
| iMessage preview once showed title only | Medium | Unconfirmed | Re-test with the new share-dollhouse-v2.jpg URL (or ?v=2) |
| Furniture layout drawing is a 471×1024 phone screenshot crop | Medium | Source asset | Obtain the original PDF/image from the move email |
| Semi-transparent walls, whiteboard streak | Low–medium | Model/capture limit | Visible in the minimal control too; capture/training work, not viewer |
| Motion softness from asynchronous sort | Low–medium | Viewer trade-off (Spark design) | Fewer splats or faster readback |
| Collision uses table-row boxes, not measured geometry | Low | Approximation | Per-room walkable data from the pipeline |
| No real-device check yet for: twin joysticks, tucked strip, media viewer zoom, layout of safe areas | Medium | Verification gap | Brian's iPhone pass |
| JS heap grows \~160 MB per in-page model switch (earlier finding) | Low for single-room links | Viewer | Fix before multi-room portal |

## Recommendations

The highest-leverage move is a smaller, verified delivery format: it cuts load time and also shortens the per-frame sort that drives motion artefacts. Every candidate must pass the existing golden-control A/B (matched cameras, ROI detail metrics) before replacing the golden file.

**Load speed (candidates, each validated against the golden control)**

| Option | Expected size | Quality risk | Notes |
| --- | --- | --- | --- |
| Current PLY, fp32, SH degree 3 | 247 MB (248 B/splat) | None | Baseline |
| SPZ (quantized, gzip) | \~20–30 MB (approx.) | Colour/SH quantization; must confirm colours > 1 survive | Spark reads SPZ natively; biggest single win |
| SH degree 3 → 1 | \~100 MB (approx.) | Loses some view-dependent shading | Combine with SPZ for \~10 MB class |
| Prune low-contribution splats (e.g. −30–40 %) | proportional | Fine texture loss if over-pruned | Also speeds sort proportionally |
| Two-stage load: small preview model first, full model after | preview in seconds | None to final view | Needs a coarse companion file per room |
| CDN compression of PLY (Brotli) | −10–20 % | None | Cheap, small gain |

**Motion quality**

- Finish the on-device A/B (bg / px / alpha) and ship the variable that removes the marks.
- Fewer splats (pruning or SPZ-era budget) is the only lever that shortens the sort on the phone.
- Keep joystick speeds low; consider slightly lower top speed if marks persist.

**Before contractor testing**

- [ ] Dark marks resolved and confirmed on iPhone
- [ ] Cold load under \~10 s on a typical phone connection
- [ ] Brian iPhone pass on the current build (joysticks, tucked strip, media viewer, safe areas, link preview)
- [ ] Original furniture-layout drawing in place of the screenshot crop
- [ ] One-page tester brief: what to try, what is a known limit, how to send feedback
- [ ] Feedback capture (form or comments) and basic analytics on load time and errors
- [ ] Decide link host: preview URL vs portal (below)
- [ ] A second room through the same pipeline, to prove it is repeatable

## Client-portal integration plan

The viewer should become one reusable component fed by a per-room manifest, so the portal (built in a separate chat) can embed any room without Room 213 code; integrate only after the motion and load gates pass.

**What is Room 213-specific today** (all under the preview branch): lib/room213/scene-config.ts (frame, bounds, eye height), presentation-data.json (walls, table rows), pins.ts (4 pins + content), walk-entry.ts and hero.ts (start poses), provenance.server.ts (golden storage keys), app/preview/room213/page.tsx (metadata, share image), public/preview/room213/\* (posters, content, manifest).

**Proposed room manifest (one JSON per published room)**

| Field | Contents | Produced by |
| --- | --- | --- |
| model | url, fallbackUrl, bytes, sha256, format | Publish step |
| provenance | training\_rasterizer {trainer, revision, primitive} → render profile | Training worker |
| frame | correction quaternion, file→room transform | Scene-data step |
| room | box, walls, floor/ceiling heights | Scene-data step |
| navigation | walk entry pose, walkable footprints (table rows), dollhouse/plan hero poses | Scene-data step (+ review) |
| pins | id, anchor + normal in model frame, title, description, media \[{type, url, thumbnail}\] | Portal editor (Brian) |
| share | title, description, share image | Portal |
| branding | org name, logo, accent token | Portal (white-label) |

**Integration steps**

1. Extract a SpatialViewer component + manifest type from Room213Experience/Room213Scene (no behaviour change; Room 213 becomes the first manifest).
2. Store manifests and pins in Supabase (additive migration), media in R2; the public preview bucket pattern (content-hashed, immutable, CORS per origin) carries over.
3. Portal route renders SpatialViewer inside its own layout behind token or login; the portal's CSP must allow the media host.
4. Keep client-surface rules: recipients see the room, pins and Room information only; no internal diagnostics, no Twin/Site Walk surfaces.
5. Styling already uses the light marketing tokens (--mkt-\*), matching the new website; pass the portal's accent through the manifest.
6. Fix the \~160 MB per-model memory growth before a portal page can switch rooms in place.

Open questions for the portal chat: token vs account access for contractors; who places pins (Brian only, or client editors); one room per link or a project page listing rooms.

## Change log and where everything lives

All work is on GitHub branch preview/room213-poc (Vercel preview only, never merged to main); the live link is [slate360-rebuild-git-preview-room213-poc-slate360.vercel.app/preview/room213](https://slate360-rebuild-git-preview-room213-poc-slate360.vercel.app/preview/room213).

| Commit | Change |
| --- | --- |
| f193f542 | Probe-only on-device A/B switches for the motion dark marks (diag=bg,px,alpha) |
| 7f5dec96 | Table-row collision (aisles open, no entering furniture), near plane 0.2, no dead iPhone full-screen button, cutout-safe media viewer, fresh share image |
| d2363898 | Re-triggered a missed Vercel build |
| 2e39d15d | Removed iPhone swipe-up full screen; calmer eased joysticks (0.65 units/s, 45°/s) |
| 4fb8829a | Media viewer opens filled, pinch anywhere to 8×; landscape strip tucks away |
| 10829ac7 | Right-hand look joystick; landscape full-screen toggle (Android) |
| 3de76de1 | Fixed iPhone landscape white band; route manifest for home-screen full screen |
| d9e628a9 | Portrait "turn sideways" tip; first rotation enters Walk |
| 1a90450a | Zoomable photo viewer, Slate360 logo badge, branded Dollhouse share image |
| 98f92ff9 | Pin sheet shows media first; Room information thumbnails |
| 1f01cec1 | Tap outside closes sheets and menu |
| e16c94db | Clean client URL (no diagnostics), exclusive sheets, landscape side sheet |
| 899fa6b3 | Temporary DPR A/B selector (iPhone: native 3 → renderer 2; removed after) |
| 2cd3af94 | Golden-control fidelity pass: fixed DPR, truthful settle, authoritative Reset, readable pins |

**Key files**: components/room213/\* (viewer), lib/room213/\* (room data, collision, fidelity check), lib/digital-twin/spark-render-profile.ts (render profile), app/preview/room213/\* (page, model route, local control), docs/ops/room213-poc/ (FIDELITY.md, COORDINATES.md, PINS.md, RAD.md).

**Test URLs**: `?probe=1` (test hooks, clean screen), `?internal=1` (live renderer panel: fidelity, sort ms, transitions), `?probe=1&dpr=1.5` (fixed pixel ratio), `?probe=1&diag=bg|px|alpha` (motion A/B).
