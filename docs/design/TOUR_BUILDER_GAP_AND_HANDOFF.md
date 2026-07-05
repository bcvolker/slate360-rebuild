# 360 Tour Builder — Gap Analysis, Strategy-Sequenced Build Plan & External-AI Handoff

> Companion to the locked contract [`TOUR_BUILDER_PLAN.md`](./TOUR_BUILDER_PLAN.md). That doc is
> the source of truth for data model, derivative matrix, and acceptance tests. This doc adds:
> (1) verified gap analysis vs. today's code, (2) a build plan sequenced for Brian's
> "keep it behind the scenes now, ship as its own App Store app later" strategy, and
> (3) copy-paste prompts for other AI platforms that have **no repo access** — each is
> self-contained so the code/research they return drops straight in.

Verified against the live codebase 2026-07-05. Viewer stack is **Photo Sphere Viewer 5.14.1**,
compute is **cloud-only (Trigger → Modal)** — do **not** build from the Grok Pannellum/Hugin-WASM/
Remotion stack; it conflicts with the locked architecture (browser stitching is banned per CLAUDE.md).

---

## 0. Strategy framing (drives the sequencing)

- **Now → "behind the scenes":** CEO-only, web-only, hidden from nav (`notFound()` unless `isSlateCeo`),
  exactly like Thermal Studio. It is **not** in the iOS bundle, so it **cannot affect the Site Walk +
  Twin 360 App Store submission**. This is a feature: the Tour Builder de-risks that review by staying
  out of it entirely.
- **Deliverables still ship to the outside world** via **token-gated, no-login** links/embeds (the
  thermal-share pattern). That is how you get Zillow/MLS embeds, client tours, and social unfurls
  **without an app and without an App Store review**. Everything you want commercially in the near term
  lives here.
- **Later → "its own App Store app":** only when you decide to sell it standalone do you add the
  Capacitor viewer/upload shell (P5), per-tier entitlements/billing, and run App Store readiness. That
  is a separate submission from the main app and can happen on its own timeline.

**Consequence for the plan:** everything that makes money now (branded client tours, Zillow/MLS,
YouTube/social 360, embeds) is reachable in the **web + token** phase. Native app is deferred and
gated behind its own go-decision.

---

## 1. Gap analysis (verified against code, not the audit's word)

### ✅ Already built (~35% of P0 backend)
| Area | Evidence |
|---|---|
| Tour/scene data model + org RLS | `project_tours`, `tour_scenes`, `tour_scene_derivatives`, `tour_processing_jobs` (migration `20260623130000_tour_builder_p0.sql`) |
| Authenticated CRUD | `app/api/tours/**` — list/create, tour CRUD + S3 cleanup, scene CRUD/reorder, upload presign + complete, signed-image route |
| Upload validation | rejects `.insv/.360/.dng`, enforces 2:1 equirect, JPEG/PNG only |
| Cloud ingest pipeline | `src/trigger/tour-ingest.ts` → `workers/modal/tour-ingest/worker.py` → HMAC callback `lib/tours/job-callback.ts` |
| Realtime job status | `tour_processing_jobs` + `hooks/useTourRealtime.ts` |
| Authoring shell | `components/tours/TourStudioShell.tsx` + Library/Build/Share/Analytics tabs, CEO-gated |
| Entitlements/billing scaffolding | `canAccessStandaloneTourBuilder`, seat limits, Stripe SKU, `ceoOnly` nav |
| Viewer core | `@photo-sphere-viewer/core@5.14.1` installed; `sharp`, `jspdf`, `leaflet` present |

### 🔴 Broken — must fix before **any** external demo
1. **Public viewer feeds raw private-R2 keys.** [`PublicTourViewer.tsx:53`](../../components/tours/PublicTourViewer.tsx)
   passes `scene.panorama_path` to the viewer. Logged-out clients get nothing. → Needs a **token/CDN
   signed-image route** and the viewer must consume signed URLs (or a tiles manifest).
2. **Modal worker produces no tiles.** [`worker.py`](../../workers/modal/tour-ingest/worker.py) stops at
   Pillow thumbnail + a downscaled `normalized.jpg` (cap 8192px). P0 acceptance requires a **libvips
   tile pyramid** for 8K–16K panos that matches the PSV `equirectangular-tiles-adapter` schema. **This
   is the keystone gap.**
3. **`viewer_slug` never minted on publish.** Publish only PATCHes `status` → public links are dead.

### 🟡 Partial
- PSV plugins not installed (`markers-plugin`, `virtual-tour-plugin`, `gallery-plugin`,
  `equirectangular-tiles-adapter`, `plan-plugin`, `map-plugin`, `gyroscope-plugin`, `stereo-plugin`).
- `lib/types/tours.ts` stale vs DB. Legacy `tours`/`tour_analytics` tables are dead weight (drift risk).
- Share tab + Analytics tab are stubs. Portal token viewer shows a metadata card, not an interactive tour.

### ❌ Not started (P1+ = every "Kuula parity" + "wow" item)
Hotspots CRUD/graph, publish snapshots, token password/expiry/role, MLS-clean derivative, embed builder,
oEmbed/OG social cards, analytics ingest/rollup, keyframes/guided paths, floorplan/geo minimaps, nadir
baking, inspection callouts + rectilinear crop + PDF, Text Studio, 360 video, audio, gyro/VR, Capacitor
app, raw auto-ingest, AI hotspots, Street View/KML export, custom domains.

### Your explicit asks, mapped
| Ask | Where it lands | Notes |
|---|---|---|
| **Max compatibility, all 360 cameras** | **P0, already the design** | Tier-1 "export-first": ingest any finished **2:1 equirect JPG/MP4** from the camera's own free app. This *is* maximum compatibility — it's brand-agnostic. Raw `.insp/.insv/.360/.dng` auto-ingest is P6 (additive). |
| **360 drones (Avata, Mavic, Insta360 Sphere)** | **P0 ingest + P3 aerial mode** | Same export-first ingest; P3 adds baked nadir + tiny-planet + GPS map minimap. |
| **Zillow / MLS** | **P1** | `mls_clean` derivative (no logo) + token embed + oEmbed. MLS "leak rule" in locked plan §3. |
| **Google Maps / Street View** | **P6** | Street View Publish API + KML package (research prompt below). |
| **YouTube / social 360** | **P1 (social cards) + P6 (YouTube injection)** | oEmbed/OG unfurl at P1; equirect-MP4 spherical-metadata injection for YouTube/Facebook 360 at P6 (research prompt below). |
| **Desktop + app** | Desktop = now (web authoring). App = P5 (Capacitor view/upload). | Heavy work stays cloud; app is capture/view only. |

---

## 2. Build plan, sequenced for the strategy

Same P0–P6 spine as the locked plan, grouped into three go-decisions.

### PHASE A — "Behind the scenes, revenue-capable web tool" (P0 + P1, ~4–6 wks backend)
Goal: Brian authors branded tours and sends **token links + embeds** to realtors/owners; drops them
into **Zillow/MLS**; links unfurl on Slack/iMessage/social. No app, no App Store.

**A0 — Finish P0 foundation (the unblock):**
1. **Modal libvips tile pyramid** → `tiles_manifest` derivative matching PSV 5.14.1 tiles-adapter schema.
   *(External-AI prompt #1 + #2.)*
2. **Public/token signed-image route** (or CDN signing) + make `PublicTourViewer`/`TourPanoViewer`
   consume the tiles manifest via `equirectangular-tiles-adapter`.
3. **Mint `viewer_slug` on publish** (server, non-enumerable) + fix publish flow.
4. Deploy Modal + Trigger after worker change (per CLAUDE.md deploy rules).
- *Done when:* upload an 8K equirect → tiles generated → token embed first-paints <3s on iPhone Safari.

**A1 — Navigation + share parity (P1):**
- Install PSV plugins; wire `virtual-tour-plugin` (scene→scene arrows) + `gallery-plugin`.
- `tour_hotspots` table + CRUD API; `markers-plugin` for nav/info/media/file/url hotspots.
- `tour_publish_snapshots` (immutable "a sent link is frozen") + token mint referencing a snapshot.
- Token extensions migration: `password_hash`, `role`, `layer_config`, `snapshot_id`, `max_views`,
  `view_count`, `expires_at`, `revoked_at`.
- **MLS/unbranded mode** via `mls_clean` derivative selection (not CSS) — the Zillow path.
- **Embed builder** (iframe presets full/hero/inline) + deep links `?scene=&yaw=&pitch=&autoplay=`.
- **oEmbed + OG cards** (1200×630 from cover/thumbnail) — social/Slack/iMessage unfurl.
- Basic analytics events (view, scene change, hotspot click).
- *Done when:* branded token link and MLS-clean link both open with correct derivatives, no cross-leak;
  password gate works; a Slack paste unfurls a card; a Zillow "virtual tour URL" field accepts the link.

### PHASE B — "Differentiators that beat Kuula for construction" (P2–P4)
- **P2:** click-to-place authoring polish, per-scene camera settings, **keyframes + guided autoplay**,
  floorplan (`plan-plugin`) / geo (`map-plugin`) minimaps, analytics rollup, a11y list-view.
- **P3 (drone aerial mode):** baked **nadir** treatment (logo/blur/solid/none; MLS forces non-logo),
  tiny-planet intro, GPS/altitude from EXIF/XMP → map minimap + cinematic transitions.
- **P4 (inspection):** `tour_callouts` (numbered, severity, status, photo), **rectilinear crop** per
  callout (Modal), inspection PDF reusing the thermal ReportLab shell, threaded Q&A, before/after slider.

### PHASE C — "Ship as its own App Store app" (P5–P6 + productization)
- **P5:** Text Studio, 360 video + timed hotspots, audio/narration, gyro/VR (`stereo-plugin`),
  **Capacitor view + chunked-upload app** (offline cached tiles). Then: per-tier entitlements/billing,
  quota enforcement, App Store readiness pass (separate submission from the main app).
- **P6 (power):** per-brand **raw auto-ingest** (max-compat "just drop the camera file"), **Street View
  publish + KML**, **YouTube/Facebook 360 metadata injection**, AI auto-hotspots (Florence-2/GroundingDINO,
  MIT/Apache), MP4 fly-through, custom domains, DJI `.360` stitch (after sample validation).

**Fastest path to money:** finish **A0**, ship **A1**. That is a branded, embeddable, Zillow/MLS-ready
tour product delivered entirely through web + token links — no app required.

---

## 3. What I need from other AI platforms

The other platforms have **no repo access**, so I've scoped each task to be **fully self-contained**:
a precise input/output contract, pinned versions, license constraints, and the exact deliverable format.
When they return code/research, I adapt it into our routes/workers — you don't need them to know our repo.

**Priority order (unblocks the most):**
1. **Modal libvips tile-pyramid worker** (Python) — the P0 keystone. *(Prompt #1)*
2. **PSV 5.14.1 tiles-adapter manifest schema** (research) — defines #1's output contract. *(Prompt #2)*
3. **360 camera/drone export matrix** (research) — proves "max compatibility" claim + upload validation. *(Prompt #3)*
4. **Rectilinear crop from equirectangular** (Python) — P4 inspection crops, self-contained math. *(Prompt #4)*
5. **oEmbed/OG 360 unfurl spec** (research + snippet) — social/Slack/Zillow. *(Prompt #5)*
6. **Nadir-patch baking** (pyvips/OpenCV) — P3 drone mode. *(Prompt #6)*
7. **YouTube/Facebook 360 spatial-metadata injection** (research + CLI) — P6 social. *(Prompt #7)*
8. **Google Street View Publish + KML** (research + snippet) — P6 Maps. *(Prompt #8)*

Return format for each: a single self-contained file or a short doc + code block. I integrate. Keep
everything **MIT/Apache/BSD/LGPL or public-API**; no GPL library *linked into* runtime (GPL CLIs invoked
as isolated server-side processes are fine).

---

## 4. Copy-paste prompts for other AI platforms

> Paste each prompt verbatim into Grok/GPT/Gemini. They are written to stand alone. Where a prompt
> depends on another's output (e.g. #1 needs #2's schema), do #2 first and paste its result into #1.

### Prompt #1 — Modal libvips 360 tile-pyramid worker (KEYSTONE)
```
You are writing a single self-contained Python function for a cloud image-processing worker
(runs on Modal, Python 3.11, Linux). No web framework context — just the function and helpers.

TASK: Given a finished 2:1 equirectangular panorama JPEG (typically 5760×2880 up to 16384×8192),
generate a MULTI-RESOLUTION TILE PYRAMID compatible with Photo Sphere Viewer v5.14.1's
`@photo-sphere-viewer/equirectangular-tiles-adapter` (EXACT version 5.14.1 — match its expected
tile grid and config precisely; I will paste the adapter's manifest schema separately, but if not,
target the documented 5.14.1 behavior: a single low-res base panorama + a grid of `cols × rows`
equirectangular tiles at one or more zoom levels, square tiles of `tileSize` px).

REQUIREMENTS:
- Use pyvips (libvips) for speed and memory safety on large images (DO NOT load the full image into
  PIL). Use `pyvips.Image.new_from_file(..., access='sequential')` where possible.
- Output, written to a local temp dir (I upload to S3/R2 myself afterward):
  - `tiles/{level}/{col}_{row}.jpg` tiles (JPEG quality ~85, no chroma subsampling artifacts on lines)
  - `base.jpg` low-resolution full equirect (e.g. 2048px wide) for instant first paint
  - `manifest.json` describing: source width/height, tileSize, list of levels each with
    `{ level, tileSize, cols, rows, width, height }`, and the naming pattern for tiles and base.
- Pick tileSize (512 or 1024) and level count based on source width; document the choice in a comment.
- Handle non-power-of-two and non-exact-2:1 inputs gracefully (pad/resize to exact 2:1 first, log it).
- Pure function signature: `def build_tile_pyramid(src_path: str, out_dir: str) -> dict` returning the
  manifest dict. Include a `if __name__ == '__main__':` smoke test that runs on a sample file path.
- MIT-compatible libraries only. Add a short comment block explaining how the manifest maps to the
  PSV 5.14.1 tiles-adapter `panorama` config object (width, cols, rows, baseUrl, tileUrl(col,row)).

DELIVERABLE: one Python file. Include a requirements list (pyvips + libvips system dep note).
Explain any assumption you made about the 5.14.1 schema so I can verify it.
```

### Prompt #2 — PSV 5.14.1 tiles-adapter manifest schema (research, do this first)
```
Research task. Target library: Photo Sphere Viewer, EXACT version 5.14.1, plugin
`@photo-sphere-viewer/equirectangular-tiles-adapter` (equirectangular, NOT cubemap).

I need the precise runtime contract to serve a pre-generated tile pyramid to this adapter:
1. The exact shape of the `panorama` config object the adapter accepts in 5.14.1
   (e.g. `{ width, cols, rows, baseUrl, tileUrl }` — confirm exact field names and whether
   `tileUrl` is a function `(col, row) => string` or a template string; whether multiple zoom
   levels are supported or it's a single tiled level + a base image).
2. Tile coordinate convention: origin (top-left?), how cols/rows map to yaw/pitch, expected tile
   aspect (square?), and any constraint that `width` be divisible by `cols`/`tileSize`.
3. The role of the low-res `baseUrl` image and its recommended size.
4. A minimal, correct working example: instantiate `Viewer` with `adapter: [EquirectangularTilesAdapter]`
   and a `panorama` object pointing at `https://cdn.example.com/tour/{tile paths}`.
5. Any breaking differences between 5.x minor versions that affect this schema.

Cite the 5.14.1 source/docs. Output: a concise spec doc + the exact config object shape + one code
example. This defines the manifest that a separate tiling worker must emit.
```

### Prompt #3 — 360 camera & drone export compatibility matrix (research)
```
Research task for a construction/real-estate 360 virtual-tour product. Our ingest is "export-first":
we accept a FINISHED 2:1 equirectangular JPEG (photos) or MP4 (video) that the user exports from the
camera/drone's own free app. I need a compatibility matrix so I can (a) document supported devices and
(b) tune upload validation and user instructions.

For each device below, tell me: the native capture file format(s) and extension(s) (e.g. Insta360 .insp/.insv,
Ricoh .JPG, GoPro .360, DJI .dng/.insv), whether the FREE first-party app can export a stitched 2:1
equirectangular JPG (photo) and MP4 (video), the typical exported resolution, whether the export embeds
spherical/spatial metadata, and any gotcha (e.g. requires desktop Studio app, HDR/RAW needs stitching,
partial-pano output). Devices:
- Insta360: X3, X4, X5, ONE RS 1-inch 360, Sphere (drone-mounted), Ace Pro (non-360, note it)
- Ricoh Theta: X, Z1, SC2
- GoPro: MAX, Fusion
- QooCam: 8K, 3
- Kandao: QooCam/Obsidian, Kandao QooCam 3 Ultra
- Trisio Lite 2 (real-estate favorite)
- DJI drones with 360: Avata 2 + Insta360 Sphere combo; Mavic 3 / Air 3 sphere via pano stitching;
  DJI Mini panorama mode
- Matterport-adjacent: any phone-based 360 (Google Street View app export, Momento360)

Also: which of these produce true single-shot equirect vs. requiring multi-photo stitching. Output as a
table + a short "recommended export steps" note per major brand that I can surface as in-app tooltips.
Prioritize accuracy over completeness; flag anything you're unsure about.
```

### Prompt #4 — Rectilinear (perspective) crop from equirectangular (Python)
```
Self-contained Python function, no framework. For an inspection feature: given an equirectangular
panorama and a look direction, render an undistorted perspective ("rectilinear") crop — as if a normal
camera were pointed that way. Used to show a defect close-up that isn't warped like a raw equirect slice.

Signature:
  def equirect_to_rectilinear(src_path: str, out_path: str, yaw_deg: float, pitch_deg: float,
                              fov_deg: float = 100.0, out_w: int = 1600, out_h: int = 1200) -> None

- yaw_deg: 0 = center of the equirect, positive = right; pitch_deg: 0 = horizon, positive = up.
- Standard equirectangular mapping (longitude/latitude). Build a perspective camera with the given
  horizontal FOV and output aspect, compute the ray for each output pixel, convert to lon/lat, sample
  the equirect with bilinear interpolation.
- Use numpy + OpenCV (`cv2.remap`) for speed; MIT/BSD/Apache libs only. Handle longitude wraparound.
- Include a `__main__` smoke test and comments on the coordinate conventions so results are reproducible.
DELIVERABLE: one Python file + requirements. Correctness of the projection is the priority.
```

### Prompt #5 — oEmbed + Open Graph unfurl for 360 tours (research + Next.js snippet)
```
Research + code. I host interactive 360 virtual tours at public URLs like
`https://app.example.com/t/{token}`. I want these links to unfurl richly when pasted into Slack,
iMessage, Facebook, LinkedIn, X/Twitter, and to be embeddable via oEmbed where supported.

1. The exact Open Graph / Twitter Card meta tags needed for a rich card (image 1200×630, title,
   description, `og:type`, video/player tags if I want an inline player where allowed). Note which
   platforms honor `og:video`/`twitter:player` for an interactive iframe vs. only a static image.
2. A minimal oEmbed provider spec: the JSON response shape (`type: "rich"`, html iframe, width/height,
   thumbnail_url) and how a consumer discovers it (`<link rel="alternate" type="application/json+oembed">`).
3. Real-estate specific: what Zillow and typical MLS "virtual tour URL" fields accept — a branded
   iframe/link vs. an unbranded one, any size or HTTPS requirements, and whether they render an iframe
   or just a link-out. Cite current (2025-2026) Zillow 3D Home / virtual tour guidance if available.
4. A minimal Next.js (App Router, v14) route example: a page `generateMetadata` emitting the OG tags,
   plus an `/api/oembed` route returning the oEmbed JSON.

Output: a short spec + copy-paste Next.js App Router code. Flag anything platform-specific or likely to
change.
```

### Prompt #6 — Baked nadir patch on equirectangular (Python, pyvips/OpenCV)
```
Self-contained Python function for drone/tripod 360 photos: bake a "nadir patch" over the bottom pole
of an equirectangular image (the tripod/drone-belly hole). Modes: logo | blur | solid | none.

Signature:
  def bake_nadir(src_path, out_path, mode='blur', logo_path=None, patch_deg=35.0,
                 feather_deg=8.0, solid_rgb=(20,20,20)) -> None

- Operate on the bottom `patch_deg` degrees of pitch (the nadir cap), with a `feather_deg` soft edge so
  the patch is invisible when the viewer tilts down (no hard seam).
- mode='blur': heavy gaussian/median of the existing nadir region. mode='solid': fill with solid_rgb.
  mode='logo': composite a centered logo (from logo_path) onto a solid/blurred base, correctly warped so
  it looks flat/centered when viewed straight down (account for equirect distortion at the pole — the
  logo should map to a small circle at the pole, i.e. polar/stereographic-style placement).
- mode='none': copy through unchanged.
- Use pyvips or OpenCV+numpy, MIT/BSD/Apache only. Preserve full resolution; don't recompress the whole
  image more than necessary. Include `__main__` smoke test + comments on the pole-distortion handling.
DELIVERABLE: one Python file + requirements. The "invisible on pitch-down" feather and correct pole
warping are the hard parts — get those right.
```

### Prompt #7 — YouTube/Facebook 360 spatial-metadata injection (research + CLI)
```
Research + code. I produce 2:1 equirectangular MP4 videos (H.264, no spatial metadata) and want them to
be recognized as 360° by YouTube and Facebook (and ideally VR players).

1. The current (2025-2026) spec for injecting spherical/spatial metadata into an MP4 so YouTube and
   Facebook auto-detect equirectangular 360: the Spherical Video V2 metadata (SV3D/st3d boxes) vs. the
   older V1 (ProjectionType=equirectangular). Which does YouTube require now? Which does Facebook require?
2. The free tooling paths: Google's `spatialmedia` python injector (github.com/google/spatial-media) and
   the ffmpeg approach if any. Give exact CLI commands to inject equirectangular (mono) metadata into an
   existing MP4 without re-encoding.
3. Ambisonic audio note (optional): what's needed for spatial audio, and whether it's worth it.
4. Any resolution/bitrate/codec constraints YouTube/Facebook impose for 360 (e.g. recommended 4K+).
5. Direct-upload note: is there a supported API to programmatically upload 360 video to YouTube, or is it
   manual-upload-only after metadata injection?

Output: a short spec + exact copy-paste CLI commands (prefer no re-encode). License note on the injector.
Flag anything that changed recently — 360 video support on these platforms has been shifting.
```

### Prompt #8 — Google Street View Publish API + KML export (research + snippet)
```
Research + code. I want to (a) publish 360 equirectangular photos to Google Street View and (b) export a
tour as a KML package for Google Earth.

1. The current Street View Publish API (2025-2026): auth (OAuth scopes), the photo upload flow
   (uploadRef → publish `photo` with equirectangular pose + GPS lat/lng + heading), required EXIF/XMP
   (GPano) metadata on the JPEG, resolution requirements, and whether connected photos/blue-line traces
   are still supported. Is the API still open for new projects? Any quota/approval gotchas.
2. Required GPano/XMP tags to embed in the equirect JPEG before upload (ProjectionType, FullPano
   width/height, cropped-area fields) and a free way to write them (exiftool commands).
3. A minimal server-side snippet (Node.js or Python) that uploads one photo via the Publish API given a
   file + lat/lng/heading + an OAuth access token.
4. KML: a minimal KML `<PhotoOverlay>` / `<Placemark>` structure to represent geo-located 360 scenes for
   Google Earth, with the equirect as the overlay. Give a template I can fill per scene.

Output: a concise spec + exiftool commands + one upload snippet + a KML template. Cite current API docs;
flag if Street View Publish access is restricted/deprecated for new apps.
```

---

## 5. Integration checkpoints (my side, after their code returns)
- After **#1/#2**: extend the Modal worker, add `tiles_manifest` derivative emission, redeploy Modal +
  Trigger, add the public signed-tiles route, switch `TourPanoViewer` to the tiles adapter. **P0 done.**
- After **#3**: update `upload/route.ts` validation copy + build an in-app "how to export from your camera"
  tooltip set; document the supported-device matrix.
- After **#4/#6**: add Modal job types `rectilinear_crop` (P4) and `branded_nadir`/`mls_clean` (P3).
- After **#5**: build the P1 oEmbed route + `generateMetadata` OG cards + embed builder.
- After **#7/#8**: P6 export jobs (YouTube metadata inject, Street View publish, KML).

Nothing here requires the other platforms to see our code — they return standalone artifacts, I wire them
to our routes/workers and run the locked plan's acceptance tests.
```
