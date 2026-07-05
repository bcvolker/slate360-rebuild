# 360 Tour Builder — MASTER BUILD PLAN (desktop dashboard tab + optimized app)

> Status: build-ready. Consolidates the locked contract ([TOUR_BUILDER_PLAN.md](./TOUR_BUILDER_PLAN.md)),
> the gap/handoff doc ([TOUR_BUILDER_GAP_AND_HANDOFF.md](./TOUR_BUILDER_GAP_AND_HANDOFF.md)), the external
> MVP handoff + acceptance checklist (Temp), the Kuula tutorial PDF (154 pp, UI patterns extracted), and
> repo verification done 2026-07-05. Where anything conflicts, **this doc + the locked plan win.**
>
> Deployment stance: **CEO-only, hidden, not in any App Store submission.** Public exposure is only via
> token-gated no-login deliverable links/embeds (thermal-share pattern). Subscription/billing wiring is
> deferred (scaffolding already exists) — flip on later without rework.

---

## 0. Feasibility verdict

**Yes to both surfaces, with the existing architecture — no new infrastructure needed.**

| Ask | Verdict | How |
|---|---|---|
| Dashboard tab (desktop) | ✅ Exists as scaffold | `TourStudioShell` already renders a CEO-gated 4-tab workspace; we finish it |
| No-scroll desktop workflow | ✅ | Locked plan principle #6 (fixed-height workspace, internally scrolling panels) — same recipe as Thermal Studio |
| Optimized app version | ✅ | `/app/tours` mobile surface inside the existing shell/Capacitor wrapper — CEO-gated so invisible to App Store reviewers; **zero new native code required** |
| Max phone features without crashes | ✅ with a hard perf budget | Tiled panoramas (never full-res decode), streaming uploads, single viewer instance — budget in §5 |
| Branded links, different logo per link | ✅ | Kuula-Business-style "logo per exported link" → our token `layer_config.brand_id` (§6) |
| Embed on third-party websites | ⚠️ **Blocked today, 1-file fix** | `next.config` sends `X-Frame-Options: DENY` on ALL routes — embed routes must be carved out (§6.3) |
| Gaussian-splat deliverable embeds | ✅ Mostly exists | Reuse the in-house Twin 360 splat viewer (`splat-viewer-core.tsx` + `TwinShareSplatViewer`), NOT an external library (§7) |

---

## 1. Verified assets & inputs (on this machine, today)

- **Test panoramas staged** at `360_Sample_Photos/`:
  - `00_General_Test_Panos/orion360_test_{1024|2048|4096|8192}.jpg` — calibration chart at 4 sizes
    (the 8192×4096 is the P0 acceptance-test input) + `renderstuff_interior_360.jpg`
  - `01_Insta360_X5/dev_test_8k_equirect.jpg`, `02_Ricoh_Theta_X/dev_test_interior_equirect.jpg`
  - `03_GoPro_MAX`, `04_Trisio_Lite2`, `05_DJI_Avata_Sphere` — README pointers to Kuula sample posts
    (kuula.co/post/hc3Cw, /N9Zzb, /7qy60) — real device samples can be pulled later; not a blocker.
- **Slate360 logos** (for viewer branding + baked nadir): `public/logo.svg`,
  `public/slate360-icon-color.png`, and the full lockup set under `public/uploads/`
  (`slate360-logo-light-v3.svg`, `SLATE 360-Color Reversed Lockup.svg`, etc.). Worker-side baking wants
  PNG — generate `slate360-logo-nadir.png` from the SVG with sharp at build time of the brand asset.
- **Kuula PDF (154 pp)** reviewed; UI patterns extracted into §4. Key confirmations: branding lives in an
  "Export Editor" reached from the Share dialog; **Business tier = different logo per exported link**
  ("Your logo / Client's logo / No logo" + logo-size control + hide-INFO); editor = full-bleed viewer +
  bottom thumbnail strip + edit-pen; floor plans are just images with hotspots.
- **Google Drive UI examples:** not reachable from this session (no authorized connector). Export them to
  a local folder or PDF like the Kuula doc and they'll be incorporated the same way.

---

## 2. Verified viewer API contracts (settles the external-AI contradictions)

Verified against photo-sphere-viewer.js.org docs for **5.14.1** (do not trust other schema variants):

1. **equirectangular-tiles-adapter** `panorama` object:
   `{ width, cols, rows, baseUrl, tileUrl: (col, row) => string }` — `tileUrl` is a **function**, not a
   template. Docs example: `width: 12000, cols: 16, rows: 8` → **tile size = width/cols** (derived).
   Multi-level configs are supported (different grids applied at zoom levels), tiles ≤1024px.
   **Implication for the worker:** pick `cols` (power of two), `rows = cols/2`, resize pano so
   `width % cols === 0`, NO edge-tile padding (the black-padding approach from the external code
   misaligns the sphere — rejected).
2. **virtual-tour-plugin:** node `panorama` **accepts the adapter config object** (tiles per node ✅);
   `links[].position` = `{yaw, pitch}` spherical; `positionMode: 'manual' | 'gps'`;
   `renderMode: '3d' (default) | '2d'`; event `node-changed` (payload has node + `fromNode`).
3. **Angle units ruling:** PSV accepts numbers (radians) or CSS-style strings (`'45deg'`). **Convention:
   DB stores degrees (per locked plan); frontend always emits template strings `` `${deg}deg` `` — never
   raw numbers — so a forgotten conversion can't silently render radians.**
4. **markers-plugin:** `{ id, position: {yaw, pitch}, html|image, size, anchor, tooltip, data }`, click
   event `select-marker` with the marker config (carry our DB ids in `data`).

Packages to install (pinned): `@photo-sphere-viewer/{equirectangular-tiles-adapter, markers-plugin,
virtual-tour-plugin, gallery-plugin}@5.14.1` (gyroscope/stereo deferred to P5).

---

## 3. Architecture (unchanged, restated for the record)

```
capture app (any 360 cam/drone → its free app → 2:1 equirect JPG/MP4)
   → /app/tours or desktop Library: presigned (multipart for large) PUT to R2
   → tour_processing_jobs row → Trigger.dev `tour.ingest` → Modal (pyvips)
   → derivatives: thumbnail · normalized · base.jpg · tiles/{level}/{col}_{row}.jpg · manifest.json
   → HMAC callback → tour_scene_derivatives rows → Supabase Realtime → UI flips to ready
publish → mint viewer_slug + tour_publish_snapshots row (immutable) → deliverable_access_tokens
   → public: /t/[token] viewer · /embed/[token] chrome-less iframe · oEmbed/OG
```
Hard rules kept: no browser stitching/tiling; originals never mutated; a sent link is frozen; MLS/brand
selection happens at **derivative level**, never CSS; Graphite Glass tokens only; heavy compute cloud-only.

---

## 4. Desktop — the 360 Tour Builder dashboard tab (no-scroll spec)

Route: `/tours` (already CEO-gated). Nav: `ceoOnly: true` entry in the desktop sidebar (Thermal pattern).
Shell: fixed-height workspace (`h-[calc(100vh-topbar)]`), **page never scrolls; every panel scrolls
internally**. Four tabs = the beginning-to-end workflow, left→right:

### Tab 1 — LIBRARY (ingest & organize)
- Left rail (280px, internal scroll): tour list — name, cover thumb, scene count, status chip
  (draft/published), + "New tour". Inline rename, duplicate, delete-with-confirm.
- Main: scene grid of the selected tour — 640px thumbs, per-scene status
  (uploading → processing [progress %] → ready → error+Retry), drag-to-reorder, "Set as cover".
- Dropzone covers the whole grid ("Drag 360 photos here — 2:1 equirectangular JPG/PNG") + Browse button.
  Rejected raw files get the camera-specific export tip (copy already in the upload route).
- Right inspector (320px): selected-scene detail — capture EXIF, resolution, derivative list,
  `scene_kind` selector (aerial_geo | interior_plan | generic), GPS fields if present.

### Tab 2 — BUILD (author)
Kuula-informed layout (PDF pp. 88–99) restyled to Graphite Glass:
- Full-bleed PSV viewer (tiles adapter) as the tab's canvas; bottom thumbnail strip (gallery-plugin
  look) to switch scenes; no page chrome inside the canvas.
- Slim left toolbar (icon rail): **Navigate** (default) / **Place hotspot** / **Place callout** modes.
- "Frame it, click it" gestures (locked plan): **Set as start view** · **Capture keyframe** ·
  **Restrict this view** — buttons act on current `viewer.getPosition()` + zoom; no numeric typing
  (numeric fields live in an Advanced accordion).
- Hotspot placement: in Place mode, click the pano → marker drops at click yaw/pitch → right drawer opens:
  type (nav | info | media | file | url), target scene picker (nav), title/body, icon, visibility.
  Drag-adjust after placement; offer auto-backlink on nav hotspots.
- Right drawer (360px, internal scroll) is contextual: scene camera settings (initial yaw/pitch/fov,
  min/max zoom, autorotate) when nothing selected; hotspot editor when a marker is selected.

### Tab 3 — SHARE (brand & deliver — Kuula's Share dialog + Export Editor, fused)
Three internal columns, no scroll:
- **Links** column: publish toggle (mints slug + snapshot), list of minted links — each shows mode chip
  (Branded/MLS/Inspection), brand logo used, password? expiry? views. "New link" wizard:
  (1) mode → (2) brand (logo picker incl. per-client logos, §6) → (3) protection (password/expiry/max
  views) → Copy. "Update link" mints a new snapshot version; old links keep old content.
- **Embed builder** column: size presets (Responsive 16:9 / Fixed / Fill), toggles (autorotate,
  autoplay path, hide nav, start scene picker) → live iframe preview → copy-snippet button (§6.3 snippet).
- **Preview** column: the actual token viewer in a phone/desktop toggle frame + QR code + OG-card preview
  (what a Slack/iMessage paste will look like).

### Tab 4 — ANALYTICS (measure)
MVP: total views, unique tokens used, views-by-link table, top scene, last-viewed; per-scene dwell and
hotspot-click counts when P1 events land. Simple stat cards + one table — must not be a dead tab.

Design rules: one accent (`--twin360-blue` family or a tour accent via `--app-accent`), accent only on
interactive states, IBM Plex Mono uppercase labels, `bg-white/[0.04]` glass panels, 12px radius, no
amber/glow/`rounded-full`, tokens only (guard:design).

---

## 5. Mobile — `/app/tours` optimized app surface

Positioning: capture-adjacent companion (import → upload → check → share), NOT a mini desktop editor.
Lives in the existing mobile shell; works in Safari/PWA and inside the current Capacitor app unchanged.
CEO-gated ⇒ invisible in the shipped App Store build even though the code rides the bundle.

### Flow (one decision per screen, 48–72px targets)
1. **Home:** New tour · Continue (recent tours w/ processing badges) · "How to export from your camera"
   help sheet (per-brand steps from the compatibility matrix).
2. **Create:** name + optional project + type (Real estate / Progress / Inspection / Aerial).
3. **Add photos:** Photos/Files picker (multi-select) → local queue list; raw formats rejected with the
   friendly export tip.
4. **Upload:** per-file progress bars; files stream from disk — **never base64-load a whole file into JS
   memory** (the external Capacitor snippet did exactly this; rejected — reuse the Twin uploader pattern:
   presigned PUT for <20 MB, multipart parts above, on-disk resume state; the background-URLSession
   engine from Twin is the P5 native upgrade).
5. **Processing:** Realtime status list; "safe to close" messaging only after background upload (P5).
6. **Review:** tiled viewer preview (same token-free authenticated manifest), swipe between scenes,
   long-press drag to reorder, "Set cover", "Set start view" (same frame-it gesture).
7. **Deliver:** publish → link list → Copy / native share sheet / QR.

### Phone performance budget (the "don't crash" contract)
| Constraint | Value | Why |
|---|---|---|
| Tile size | ≤1024px (512 default) | PSV guidance; texture-memory per tile |
| Tile grid | ≤8K→16×8 · 16K→32×16 | keeps concurrently-decoded pixels bounded |
| First paint | `base.jpg` 2048px | <3s on iPhone Safari (P0 acceptance) |
| Full-res decode on device | **never** | 16K JPEG ≈ 512 MB decoded ⇒ WKWebView kill |
| Viewer instances | exactly 1, nodes swapped via virtual-tour-plugin | WebGL context churn crashes iOS |
| Upload memory | streamed/multipart, no data-URL conversion | 50 MB file ≈ 67 MB base64 string + copy |
| Scene thumbs | 640px derivative only | strip of 20 scenes stays <10 MB |
| WebGL budget | assume ~1–1.5 GB ceiling in WKWebView | silent context-loss above → white flash |
| Excluded on mobile (MVP) | stitching, tiling, nadir, AI, PDF gen, VR/gyro, keyframe authoring | cloud/desktop jobs |

---

## 6. Branding, links, and third-party embeds (your core deliverable engine)

### 6.1 Multi-logo branded links (Kuula-Business parity, done properly)
New table `tour_brand_assets` (P1 migration): `(id, org_id, name, logo_key, logo_width_percent,
logo_position, logo_opacity, is_default, created_at)` — "Slate360", "Marcisz Construction", any client.
Token `layer_config` gains `brand_id`: `{ mode: 'branded', brand_id: <uuid> }`. The token viewer resolves
the brand at render; **MLS mode forces no logo + `mls_clean` derivatives** (leak rule). One tour →
unlimited differently-branded links, each independently revocable, each frozen to its snapshot.

### 6.2 What a recipient/embedder gets
- `/t/[token]` — full viewer page (OG/oEmbed unfurl, QR target).
- `/embed/[token]` — chrome-less iframe variant (no top bar, watermark per brand config, `postMessage`
  events later for the JS API).
- Deep links: `?scene=&yaw=&pitch=&autoplay=`.

### 6.3 The X-Frame-Options fix (hard blocker, do in P0)
`next.config` currently sends `X-Frame-Options: DENY` + no `frame-ancestors` on **every** route — no
Slate360 page can be embedded anywhere today. Fix (next.config only — middleware untouched):
1. Exclude `embed|t` paths from the global DENY matcher.
2. Add a rule for `/embed/:path*` (and `/t/:path*` if we allow framing the full page):
   `Content-Security-Policy: frame-ancestors *` and omit `X-Frame-Options`.
   (If we ever want per-customer lockdown, `frame-ancestors` can list the client's domain per brand.)
Embed snippet the builder generates (works on any site, e.g. marciszconstruction.com):
```html
<div style="position:relative;padding-bottom:56.25%;height:0;overflow:hidden;">
  <iframe src="https://www.slate360.ai/embed/{token}?scene=lobby"
          style="position:absolute;inset:0;width:100%;height:100%;border:0;"
          allow="fullscreen; gyroscope; accelerometer" allowfullscreen
          loading="lazy" title="Slate360 Virtual Tour"></iframe>
</div>
```
Same route + snippet pattern serves Zillow "virtual tour URL" fields (they accept the plain link).

### 6.4 Social/oEmbed (P1)
`generateMetadata` OG tags (1200×630 card from cover thumb) + `<link rel="alternate"
type="application/json+oembed">` + `/api/oembed` returning `type:"rich"` iframe HTML.

---

## 7. Gaussian-splat deliverables — reuse Twin 360, don't import a viewer

Correction to the external research: we don't need Spark/mkkellogg/SuperSplat. **Slate360 already ships a
custom R3F/Three.js splat viewer** (`components/digital-twin/splat-viewer-core.tsx`, manifest-driven, with
share wrapper `TwinShareSplatViewer` + annotate shell). Plan:
- **Phase A:** nothing to build — a twin share link is already a deliverable. The §6.3 frame-ancestors fix
  makes twin share pages embeddable on client sites exactly like tours (add `/embed`-style chrome-less
  variant for the twin share viewer — small wrapper).
- **Phase B:** "3D scene" inside a tour — new `scene_kind: 'splat'` whose payload is a twin manifest ref;
  Build tab renders `SplatViewerCore` instead of PSV for that scene; nav hotspots jump between 360 and 3D
  scenes. Callouts in 3D store `world_{x,y,z}` (columns proposed by the external migration are fine) —
  raycast against the existing pick machinery (`TwinPickPoint` already exists!).
- **Phase C (P6):** non-LiDAR splat generation from phone video / 360 stills (COLMAP+gsplat on Modal) —
  research already in hand; entirely additive.

This is the moat: Kuula/CloudPano can't cheaply bolt on a reconstruction pipeline you already own.

---

## 8. Backend build plan (file-level slices)

### Slice P0-A — Modal tiling worker (keystone)
`workers/modal/tour-ingest/worker.py` (+ new `tiling.py`):
- pyvips (`access="random"` for tiling — NOT sequential, which breaks random-position crops; the external
  snippet got this wrong), thumbnail 640 + normalized ≤8192 progressive + `base.jpg` 2048 +
  tiles: choose `cols ∈ {8,16,32}` by width (≤4K→8, ≤8K→16, >8K→32), `rows=cols/2`, resize so
  `width % cols == 0`, `tileSize = width/cols` (≤1024 enforced), **no padding**.
- `manifest.json`: `{ adapter:"equirectangular-tiles", adapterVersion:"5.14.1", sourceWidth, sourceHeight,
  baseKey, levels:[{level,width,height,cols,rows,tileSize,keyPattern}] }` (MVP: one level).
- Emit `tiles_manifest` derivative in the callback (`lib/tours/job-callback.ts` already accepts it).
- Stage progression: validating → thumbnailing → tiling → ready. Redeploy Modal + Trigger after.
- Validate with `360_Sample_Photos/00_General_Test_Panos/orion360_test_8192x4096.jpg` — the chart's grid
  lines make tile seams/misalignment instantly visible.

### Slice P0-B — Public asset route + viewer swap
- `app/api/public/tours/[token]/manifest/route.ts` — token → snapshot/tour → `PublicTourRuntime` JSON
  (scenes, hotspots, branding, tile URL templates; **URLs only, never R2 keys**).
- `app/api/public/tours/[token]/assets/[sceneId]/route.ts?variant=thumb|base|normalized|tile&level&col&row`
  — validate token (expiry/revoked/password/mode) → derivative selection by `layer_config.mode` → 302 to
  short-lived signed R2 URL (via existing `@/lib/s3` `s3, BUCKET`), `Cache-Control: private, max-age=300`
  (immutable long-cache comes with CDN keys at P2).
- `TourPanoViewer.tsx` rewritten: tiles-adapter mode w/ normalized-JPG fallback if tiles missing;
  `PublicTourViewer.tsx` consumes `PublicTourRuntime` (never DB rows). Next 15 note: route `params` are
  Promises — `await params`.

### Slice P0-C — Publish + slug + CEO preview
- Publish handler mints non-enumerable `viewer_slug` (nanoid/UUID-hex) + `published_at`; Share tab gets
  the URL back. `/tours/view/[slug]` = CEO preview; `/t/[token]` = the real deliverable.
- Install the 4 PSV plugin packages (pinned 5.14.1). Wire Build tab basic viewer.
- **next.config frame-ancestors carve-out (§6.3).**

### Slice P1 — Share parity (revenue)
- Migration (Supabase Management API, additive — Brian applies): `tour_hotspots`,
  `tour_publish_snapshots`, `tour_brand_assets`, token extensions (`password_hash, role, layer_config,
  snapshot_id, max_views, view_count, expires_at, revoked_at`). SQL drafts already exist in the MVP
  handoff doc — adjust to include `brand_id` in layer_config convention.
- Hotspot CRUD (`/api/tours/[tourId]/hotspots...`), markers + virtual-tour wiring in Build tab.
- Token mint API (`POST /api/tours/[tourId]/share-token`) — mode/brand/protection wizard backend.
- `/embed/[token]` chrome-less page; embed builder UI; oEmbed + OG; analytics events
  (`POST /api/public/tours/[token]/events`: view, scene_change, hotspot_click) with token-scoped writes.
- MLS `mls_clean` derivative job (Modal, lazy on first MLS share) — neutral nadir, no logo.

### Slice P2+ — per locked plan (keyframes/paths, floorplan+geo minimaps, analytics rollup, then P3 nadir
/aerial, P4 callouts+PDF, P5 Text Studio/video/VR/native uploader, P6 power features). Nadir logo-mode
composite must be **polar-warped** (the pasted rectangle version is wrong — logo becomes a smeared ring).

### Gates per slice
Scoped-tsconfig typecheck (tours subsystem) → `guard:architecture` → `guard:file-size-regression`
(new files <300 lines — split worker into `worker.py` + `tiling.py`, shell into per-tab components) →
`guard:design` → build for non-trivial slices → push (Vercel) → redeploy Modal/Trigger when
`workers/modal/**` / `src/trigger/**` changed.

---

## 9. Acceptance (definition of done)

The external checklist (`TOUR360_ACCEPTANCE_TEST_CHECKLIST.md`) is adopted as the test contract, with the
P0 headline: **upload `orion360_test_8192x4096.jpg` → tiles render seamlessly → incognito token link
first-paints <3s on iPhone Safari → no raw R2 keys in the network tab → revoked/expired token blocks
manifest AND assets → MLS token cannot fetch a branded derivative.** Final acceptance stays
iPhone-on-device (Brian).

---

## 10. Open items / what Brian can supply anytime (none block P0)

1. Real camera exports (X5/Theta/GoPro/Trisio/Avata-Sphere) into `360_Sample_Photos/<device>/` — for the
   compatibility matrix tooltips; test charts cover engineering validation.
2. UI example screenshots — export from Google Drive to a local folder/PDF (Drive isn't reachable here).
3. Client logo files (PNG/SVG) for the multi-brand link demo — e.g., a Marcisz logo to demo §6.1.
4. Decision later (not now): whether `/t/` full pages allow framing or only `/embed/`.
