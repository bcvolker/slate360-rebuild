# 360 Tour Builder — IMPLEMENTATION SPEC (execution-level, for any implementing model)

> Companion to [TOUR_BUILDER_MASTER_BUILD_PLAN.md](./TOUR_BUILDER_MASTER_BUILD_PLAN.md) (strategy/UX) and
> [TOUR_BUILDER_PLAN.md](./TOUR_BUILDER_PLAN.md) (locked contract). This doc exists so a model executing
> slices (e.g. Sonnet 5) never has to guess: it pins file names, component trees, code contracts, SQL,
> algorithms, and the traps that produce plausible-but-broken code. **If prose elsewhere conflicts with a
> contract here, this doc wins for implementation details.**

## 0. Execution rules for the implementing model

1. Work ONE slice at a time (§4–§5 order). After each slice: scoped typecheck (see §0.3), guards, push.
2. **Never** install Pannellum, A-Frame, react-photo-sphere-viewer, Remotion (for tours), Upstash, or any
   browser stitching/WASM. Viewer = `@photo-sphere-viewer/*@5.14.1` exactly.
3. Forbidden zones remain: entitlements, billing, Stripe, middleware, existing migrations. New migrations
   are SQL files handed to Brian (Supabase Management API) — never applied by editing old ones.
4. New files < 300 lines (`guard:file-size-regression`); split components per the trees in §6–§7.
5. Design tokens only (`guard:design`): no hex, no amber, no `rounded-full`, accent = `var(--app-accent)`
   / `var(--twin360-blue)` on interactive states only.
6. External-AI code that was pasted into this project's chats is **reference only**. §2 lists the known
   poison pills — do not copy those patterns.
7. **Scoped typecheck recipe** (bare `tsc --noEmit` OOMs the repo): write `tsconfig.tours.json` extending
   `./tsconfig.json` with `"incremental": false` and `include`: `["components/tours/**/*", "lib/tours/**/*",
   "lib/types/tours.ts", "app/api/tours/**/*", "app/api/public/tours/**/*", "app/(dashboard)/tours/**/*",
   "app/(apps)/tour-builder/**/*", "app/tours/**/*", "app/embed/**/*", "app/t/**/*", "hooks/useTourRealtime.ts"]`
   then `npx tsc -p tsconfig.tours.json`.

## 1. Repo ground truth (verified 2026-07-05)

| Exists | Role | Notes |
|---|---|---|
| `components/tours/TourStudioShell.tsx` (178) | tab state owner (`useState<TourTab>`) | keep as orchestrator |
| `components/tours/TourStudioWorkspace.tsx` (282) | renders `StudioWorkspaceShell` + `StudioTabs`, `TourTab = "library"\|"build"\|"share"\|"analytics"`, `TourSceneRow`, `SceneStatus`, `StatusChip`, `SceneThumb` | the no-scroll shell primitive ALREADY EXISTS (`StudioWorkspaceShell`) — reuse, don't reinvent |
| `components/tours/TourSceneViewer.tsx` (71) + `TourPanoViewer.tsx` (59) | current single-image viewers | P0-C rewrites `TourPanoViewer`; keep exported handle/`SceneView` types compatible |
| `components/tours/PublicTourViewer.tsx` (141) | public viewer (BROKEN: raw R2 keys) | P0-C replaces internals |
| `components/tours/TourEditorClient.tsx` (284), `TourListClient.tsx`, `TourSettingsPanel.tsx` | legacy-ish editor pieces | cannibalize, don't grow past 300 |
| `lib/tours/queries.ts` (193), `lib/tours/job-callback.ts` (106), `lib/types/tours.ts` (33 — STALE) | data layer | P0-B refreshes types from DB |
| `hooks/useTourRealtime.ts` | job status realtime | reuse as-is |
| API: `app/api/tours/**` (CRUD, reorder, upload presign+complete, per-scene image sign, jobs/callback) | authenticated layer | pattern: `withAppAuth("tour_builder", ...)`, `createAdminClient`, `s3, BUCKET` from `@/lib/s3` |
| `src/trigger/tour-ingest.ts`, `workers/modal/tour-ingest/worker.py` (159, Pillow-only) | ingest pipeline | P0-A extends worker |
| Routes: `/(dashboard)/tours` (+layout gate), `/(apps)/tour-builder`, `/tours/view/[slug]`, `/preview/tour-studio` | pages | `/t/[token]`, `/embed/[token]`, `/app/tours` to be created |
| DB: `project_tours`, `tour_scenes`, `tour_scene_derivatives`, `tour_processing_jobs`, `deliverable_access_tokens(deliverable_type:'tour')` | migration `20260623130000_tour_builder_p0.sql` | legacy `tours`/`tour_analytics` = dead, do not touch |
| Test assets: `360_Sample_Photos/00_General_Test_Panos/orion360_test_{1024,2048,4096,8192}.jpg`, interiors | validation inputs | 8192 chart = P0 acceptance input |
| Logos: `public/logo.svg`, `public/slate360-icon-color.png`, `public/uploads/slate360-logo-*.svg` | branding | brand-asset seeding |
| Splat stack: `components/digital-twin/splat-viewer-core.tsx`, `TwinShareSplatViewer` | 3D deliverables | reuse; NO external splat lib |
| Next **15.5.12** | — | route handler `params` is a **Promise** — `await params` everywhere |

## 2. Do-NOT list (poison pills seen in pasted external code)

1. **Tile grid `cols = ceil(width/512)` + black-padded edge tiles** → sphere misalignment. Use §4-A math.
2. **pyvips `access="sequential"` for tiling** → random-position crops fail/slow. Use default (random) access for the tiling image handle.
3. **`X-Frame-Options: ALLOWALL`** → not a real value. Also never *replace* the global `headers()` (that deletes every security header). Use the §4-D carve-out.
4. **Base64-ing whole files for upload** (`Filesystem.readFile` → `atob` slice) → memory blowup + wrong byte offsets. Presigned PUT of the File/Blob directly; multipart above 20 MB.
5. **`react-photo-sphere-viewer` package** → not installed, not wanted. Use `@photo-sphere-viewer/core` directly.
6. **Numeric radians/degrees confusion** → all PSV positions emitted as template strings via `deg()` (§3.2).
7. **Nadir logo pasted as a flat rectangle near the bottom edge** → renders as a smeared ring. Baked nadir needs polar warping (P3); MVP tripod cover uses the viewer-overlay approach (§5.6) which needs no warping.
8. **New `Viewer` per scene change** → WebGL context churn crashes iOS. One Viewer; swap scenes via `setPanorama`/virtual-tour nodes.

## 3. Shared code contracts (write these first, in P0-B)

### 3.1 `lib/types/tours.ts` (replace stale file)
```ts
export type SceneStatus = "uploading" | "processing" | "ready" | "failed";
export type SceneKind = "generic" | "aerial_geo" | "interior_plan" | "splat"; // 'splat' = Phase B
export type DerivativeType = "original" | "normalized" | "thumbnail" | "tiles_manifest"
  | "branded_nadir" | "mls_clean" | "enhanced" | "video_poster";

export type TourTilesManifest = {
  adapter: "equirectangular-tiles";
  adapterVersion: "5.14.1";
  sourceWidth: number;   // post-resize width actually tiled
  sourceHeight: number;  // sourceWidth / 2
  baseKey: string;       // R2 key of base.jpg (2048w)
  levels: Array<{ level: number; width: number; height: number; cols: number; rows: number;
                  tileSize: number; keyPattern: string /* ".../tiles/{level}/{col}_{row}.jpg" */ }>;
};

export type SceneRuntime = {           // what public/token clients receive — URLS ONLY, never keys
  id: string; title: string;
  initialYawDeg: number; initialPitchDeg: number; initialFovDeg?: number;
  thumbnailUrl: string; baseUrl: string; normalizedUrl: string;   // normalized = fallback
  tiles?: { width: number; cols: number; rows: number; tileUrlTemplate: string /* {col},{row} */ };
};

export type PublicTourRuntime = {
  token: string; title: string; description?: string | null;
  branding: { logoUrl?: string | null; logoPosition?: "top-left"|"top-right"|"bottom-left"|"bottom-right";
              logoOpacity?: number; logoWidthPercent?: number; showPoweredBy: boolean };
  mode: "branded" | "mls" | "inspection";
  startSceneId: string;
  scenes: SceneRuntime[];
  hotspots: Array<{ id: string; sceneId: string; type: "nav"|"info"|"media"|"file"|"url";
    yawDeg: number; pitchDeg: number; title?: string; bodyMd?: string;
    targetSceneId?: string; targetYawDeg?: number; targetPitchDeg?: number;
    externalUrl?: string; icon?: string; accessibilityLabel?: string }>;
};
```

### 3.2 `lib/tours/psv.ts` — angle + config helpers (NEW, ~60 lines)
```ts
export const deg = (d: number) => `${d}deg`;   // PSV: numbers = radians, strings = explicit unit.
                                               // NEVER pass raw numbers for authored angles.
export function tilesPanorama(scene: SceneRuntime) {
  if (!scene.tiles) return scene.normalizedUrl;             // fallback mode
  const { width, cols, rows, tileUrlTemplate } = scene.tiles;
  return { width, cols, rows, baseUrl: scene.baseUrl,
           tileUrl: (col: number, row: number) =>
             tileUrlTemplate.replace("{col}", String(col)).replace("{row}", String(row)) };
}
```

### 3.3 PSV lifecycle rules (apply in every viewer component)
- `"use client"`; instantiate in `useEffect`, guard `containerRef.current`, `viewer.destroy()` in cleanup.
- Import CSS once per component file: `@photo-sphere-viewer/core/index.css` (+ each plugin's css).
- Exactly **one** `Viewer` per mounted surface. Scene switch = virtual-tour `setCurrentNode` (public) or
  `viewer.setPanorama(tilesPanorama(next), { transition: false })` (authoring). Never unmount/remount.
- Adapter mode cannot change after construction → always construct with `EquirectangularTilesAdapter`;
  string panorama (normalized fallback) still works through it? **No** — it does not. Rule: construct with
  tiles adapter when `scene.tiles` exists for the start scene, else default adapter; if a tour mixes
  ready/unready scenes, prefer tiles adapter and synthesize a 1×1 grid config for fallback scenes:
  `{ width: N, cols: 1, rows: 1, baseUrl: normalizedUrl, tileUrl: () => normalizedUrl }` — this renders
  the normalized JPG through the tiles adapter and avoids dual code paths. (Cap N at 8192.)
- Wrap viewer components in `next/dynamic(..., { ssr: false })` at the page level.

## 4. P0 slices (exact)

### P0-A — Modal tiling (`workers/modal/tour-ingest/tiling.py` NEW + `worker.py` edit)
Algorithm (pyvips; libvips already in image or add `pyvips` + apt `libvips` to the Modal image):
```
img = pyvips.Image.new_from_file(src)                # random access (tiling needs it)
if |w/h - 2| > 0.02: resize/pad to exact 2:1 (log)   # crop-to-fit, never distort >2%
cols = 8 if w<=4096 else 16 if w<=8192 else 32       # rows = cols // 2  → power-of-two grid
w2 = w - (w % cols); if w2 != w: img = img.resize(w2/w)   # make divisible; h2 = w2//2
tileSize = w2 // cols                                # ≤1024 guaranteed by cols choice for ≤32768px
for row, col: img.extract_area(col*tileSize, row*tileSize, tileSize, tileSize)
              .jpegsave(f"tiles/0/{col}_{row}.jpg", Q=85, strip=True)   # NO padding — exact grid
base = img.resize(2048/w2).jpegsave("base.jpg", Q=82, interlace=True)
manifest per TourTilesManifest (§3.1), level 0 only for MVP
```
`worker.py`: keep thumbnail+normalized stages; add `tiling` stage (progress 60→90); upload tiles under
`tours/{orgId}/{tourId}/scenes/derivatives/{sceneId}/tiles/...`; callback derivatives gains
`{type:"tiles_manifest", key:<manifest.json key>, width:w2, height:h2}`. Split files so neither exceeds
300 lines. **Redeploy Modal + Trigger** (`PYTHONIOENCODING=utf-8`).
Validate: run worker locally-ish or via Modal on `orion360_test_8192x4096.jpg`; the chart's gridlines make
seam errors obvious in the viewer.

### P0-B — Public token routes (NEW)
- `app/api/public/tours/[token]/manifest/route.ts` → `PublicTourRuntime`.
  Token validation ORDER (single helper `lib/tours/public-token.ts`, reused by both routes):
  1) token row exists & `deliverable_type='tour'` 2) `revoked_at IS NULL` 3) `expires_at` future
  4) `max_views` not exceeded 5) password: if `password_hash` set, require `x-tour-pass` header verified
  (bcrypt compare) else 401 `{needsPassword:true}` 6) resolve snapshot if `snapshot_id` else live tour
  (MVP pre-snapshot) 7) mode from `layer_config.mode`.
- `app/api/public/tours/[token]/assets/[sceneId]/route.ts?variant=thumb|base|normalized|tile&col&row`
  → same validation → derivative selection: `mls` mode forbids `branded_*` and (post-P3) serves
  `mls_clean`; MVP serves neutral derivatives for all modes → 302 redirect to
  `getSignedUrl(s3, GetObjectCommand, { expiresIn: 600 })`, `Cache-Control: private, max-age=300`.
  (Per-tile 302s are acceptable at CEO scale; CDN key-signing is a P2 optimization.)
- Both: `export const runtime = "nodejs"`, `await params` (Next 15), no `withAppAuth` (public), rate-limit
  via existing patterns if present else skip (CEO scale).

### P0-C — Viewer swap
- `TourPanoViewer.tsx` (rewrite ≤120 lines): props `{ scene: SceneRuntime; className?; onReady? }`,
  constructs Viewer with `EquirectangularTilesAdapter` + `tilesPanorama(scene)` (§3.2/3.3), navbar off,
  `touchmoveTwoFingers: true`, `defaultYaw: deg(scene.initialYawDeg)`, `defaultPitch: deg(scene.initialPitchDeg)`.
- `PublicTourViewer.tsx`: props become `{ runtime: PublicTourRuntime }`; fetches nothing itself; scene
  strip + branding overlay stay; wire virtual-tour plugin in P1 (MVP: `setPanorama` swap on thumb click).
- `app/t/[token]/page.tsx` (NEW): server component fetches manifest route (or calls the same lib directly),
  renders `PublicTourViewer` via `next/dynamic ssr:false`; password gate UI on 401.
- `/tours/view/[slug]` stays = CEO preview; refactor to reuse the same runtime builder with slug lookup.
- Install pinned: `@photo-sphere-viewer/{equirectangular-tiles-adapter,markers-plugin,virtual-tour-plugin,gallery-plugin}@5.14.1`.

### P0-D — Publish + embed unblock
- Publish PATCH: on `status→published`: mint `viewer_slug ??= crypto.randomUUID().replaceAll("-","")`,
  set `published_at`. Return full URLs.
- `next.config` headers: change the global matcher to exclude embeds —
  `source: "/:path((?!_next/static|_next/image|favicon|embed|t/).*)"` — and ADD rule
  `{ source: "/(embed|t)/:path*", headers: [{ key: "Content-Security-Policy", value: "frame-ancestors *" }, ...repeat the non-framing security headers (nosniff, referrer, HSTS)] }`. Do NOT emit X-Frame-Options on embed routes. Verify with curl that `/t/x` lacks `X-Frame-Options` and other routes keep DENY.

**P0 acceptance:** checklist doc sections A/B/D/F/G — headline: 8K chart → tiles → incognito `/t/{token}`
first-paint <3s iPhone Safari, no raw R2 keys in network tab, revoked/expired token blocked on BOTH routes.

## 5. P1 slices (exact)

### 5.1 Migration `supabase/migrations/<ts>_tour_builder_p1.sql` (prepare for Brian; additive only)
```sql
create table if not exists tour_hotspots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null, tour_id uuid not null references project_tours(id) on delete cascade,
  scene_id uuid not null references tour_scenes(id) on delete cascade,
  type text not null check (type in ('nav','info','media','file','url')),
  yaw_deg double precision not null, pitch_deg double precision not null,
  target_scene_id uuid references tour_scenes(id), target_yaw_deg double precision,
  target_pitch_deg double precision, target_fov_deg double precision,
  title text, body_md text, media_path text, media_kind text, external_url text,
  icon text, size_px int, opens_in text, sort_order int not null default 0,
  is_visible boolean not null default true, accessibility_label text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint hotspot_nav_target check (type <> 'nav' or target_scene_id is not null),
  constraint hotspot_url_target check (type <> 'url' or external_url is not null)
);
create table if not exists tour_publish_snapshots (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null, tour_id uuid not null references project_tours(id) on delete cascade,
  version int not null, scenes_json jsonb not null, derivatives_json jsonb not null,
  hotspots_json jsonb not null default '[]'::jsonb, branding_json jsonb not null default '{}'::jsonb,
  created_by uuid, created_at timestamptz not null default now(), unique(tour_id, version)
);
create table if not exists tour_brand_assets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null, name text not null, logo_key text not null,
  logo_position text not null default 'bottom-right', logo_width_percent int not null default 15,
  logo_opacity double precision not null default 0.9, is_default boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists tour_view_events (
  id bigint generated always as identity primary key,
  token_id uuid not null, tour_id uuid not null, scene_id uuid,
  event text not null check (event in ('view','scene_change','hotspot_click')),
  hotspot_id uuid, ua_hash text, created_at timestamptz not null default now()
);
alter table deliverable_access_tokens
  add column if not exists password_hash text,
  add column if not exists role text not null default 'view',
  add column if not exists layer_config jsonb not null default '{"mode":"branded"}'::jsonb,
  add column if not exists snapshot_id uuid references tour_publish_snapshots(id),
  add column if not exists max_views int,
  add column if not exists view_count int not null default 0,
  add column if not exists expires_at timestamptz,
  add column if not exists revoked_at timestamptz;
-- RLS: mirror project_tours org policies on the four new tables (org_id = auth org). Write explicit
-- create policy statements matching the existing tour tables' style from 20260623130000_tour_builder_p0.sql.
```
`layer_config` convention: `{ mode: 'branded'|'mls'|'inspection', brand_id?: uuid, watermark?: boolean }`.

### 5.2 APIs
- Hotspots: `GET/POST /api/tours/[tourId]/hotspots`, `PATCH/DELETE /api/tours/[tourId]/hotspots/[hotspotId]`
  (withAppAuth; validate scene belongs to tour; degrees stored raw).
- Share tokens: `POST /api/tours/[tourId]/share-token` `{mode, brandId?, password?, expiresAt?, maxViews?}`
  → creates snapshot (next version) + token row (hash password w/ bcryptjs) → returns `/t/{token}` +
  `/embed/{token}` URLs. `DELETE .../share-token/[tokenId]` → sets `revoked_at`.
- Brand assets: `GET/POST /api/tours/brand-assets` (+ upload presign for logo via existing S3 helper),
  `DELETE .../brand-assets/[id]`.
- Events: `POST /api/public/tours/[token]/events` `{event, sceneId?, hotspotId?}` — validates token
  (no password requirement for events), inserts `tour_view_events`, increments `view_count` on `view`.

### 5.3 Public viewer completion
Virtual-tour plugin drives navigation: build `nodes` from `PublicTourRuntime` (`panorama: tilesPanorama(s)`,
`links` from nav hotspots with `position: {yaw: deg(h.yawDeg), pitch: deg(h.pitchDeg)}`), markers-plugin for
info/media/file/url hotspots (`data: {hotspotId}`), gallery-plugin thumbnails from `thumbnailUrl`. Deep
links `?scene=&yaw=&pitch=&autoplay=` read in `/t` + `/embed` pages. `select-marker` → info drawer
(Graphite Glass sheet), `node-changed` → fire `scene_change` event.

### 5.4 `/embed/[token]` (NEW page)
Chrome-less: viewer only + brand logo overlay + optional "Powered by Slate360" (config). No nav bars.
Accepts same deep-link params. This is the URL the embed builder emits (snippet in master plan §6.3).

### 5.5 oEmbed + OG
`/t/[token]` `generateMetadata`: og:title/description + `og:image` = cover thumbnail URL (public asset
route, `variant=thumb`) sized meta 1200×630 (P2: real composed card). `app/api/oembed/route.ts`: `?url=`
→ parse token → `{type:"rich", html:"<iframe src=/embed/{token} ...>", width:1280, height:720,
thumbnail_url}`. Add `<link rel="alternate" type="application/json+oembed">` in `/t` head.

### 5.6 Tripod cover MVP (nadir, no Modal work) — Brian priority
Per-scene `nadir_mode` in `tour_scenes.metadata` (or column later): `none|logo|blur_disabled`. MVP `logo`:
render a markers-plugin **image marker pinned at `position: {yaw: '0deg', pitch: '-90deg'}`** with the
brand logo (size ~18% viewport, `anchor: 'center center'`) in both authoring and public viewers when mode
=logo. This visually covers the tripod/monopod foot with zero image processing and travels with brand
selection (MLS mode → suppress logo, show neutral disc). Baked derivative (`branded_nadir`/`mls_clean`)
remains P3 per locked plan; the marker approach is removed for scenes that have a baked derivative.

**P1 acceptance:** checklist C (hotspots/publish/embed/analytics-not-empty) + F (MLS can't fetch branded,
password gates manifest AND assets) + Slack unfurl card + iframe works on an external test page.

## 6. Desktop UI implementation (component tree; Kuula-screenshot-informed)

Grammar (from Brian's own Kuula screenshots): **left = content rail · center = full-bleed viewer ·
right = inspector with expandable sections (accordions) of sliders/toggles/dropdowns · bottom = thumbnail
strip.** All panels internal-scroll; page fixed height via existing `StudioWorkspaceShell`.

```
components/tours/
  TourStudioShell.tsx            (exists — orchestrator; holds tour + tab state)
  TourStudioWorkspace.tsx        (exists — shell + tabs; slim down to layout only)
  library/LibraryTab.tsx         left: TourListRail | main: SceneGrid (dropzone) | right: SceneInspector
  library/TourListRail.tsx       list, create, rename-inline, duplicate, delete-confirm
  library/SceneGrid.tsx          thumbs (640px), StatusChip, drag-reorder (HTML5 DnD → POST /scenes/reorder;
                                 keyboard fallback: ↑/↓ buttons on focus), set-cover
  library/SceneUploadQueue.tsx   per-file progress; presigned PUT; >20MB multipart (mirror twin uploader client)
  build/BuildTab.tsx             center viewer + bottom SceneStrip + left ModeRail + right BuildInspector
  build/ModeRail.tsx             icon rail: Navigate / Place hotspot / (P4: Place callout)
  build/SceneStrip.tsx           gallery thumbnails, active ring, click → setPanorama swap
  build/BuildInspector.tsx       ACCORDIONS (Kuula edit-panel parity, Graphite Glass):
                                   ▸ Start view        [Set as start view] [Capture keyframe(P2)] [Restrict view(P2)]
                                   ▸ Camera            initialFov slider · min/max zoom range · pitch-limit slider
                                                       · autorotate toggle
                                   ▸ Nadir (tripod)    mode select none|logo · logo preview (P3 adds blur/solid/bake)
                                   ▸ Scene info        title · scene_kind select · GPS fields · description
                                   ▸ Enhance (P3+)     filters row · intensity/HDR/sharpness sliders (DISABLED chips
                                                       until Modal enhance job exists — render "cloud processing" note)
                                   ▸ Danger            replace image (P2) · delete scene
  build/HotspotDrawer.tsx        opens on marker place/select: type select · target scene picker (nav) ·
                                 title/body · icon picker · visibility toggle · delete; auto-backlink checkbox
  share/ShareTab.tsx             3 columns: LinksColumn | EmbedBuilder | LivePreview
  share/LinksColumn.tsx          publish toggle · minted-links table (mode chip/brand/views/revoke) ·
                                 NewLinkWizard (3 steps: mode → brand → protection)
  share/BrandPicker.tsx          brand asset grid + upload; per-link selection (Kuula "Client's logo" parity)
  share/EmbedBuilder.tsx         size preset select · toggles (autoplay/hideNav/startScene) · snippet copy
  share/LivePreview.tsx          iframe of /embed/{token} in phone/desktop frame + QR (existing qr util if any)
  analytics/AnalyticsTab.tsx     stat cards (views/uniques/top scene/last viewed) + per-link table
```
Interaction inventory (Brian's ask → mechanism): expandable sections = accordions (one open at a time,
chevron); dropdowns = shadcn/style selects already in repo (`components/ui`); toggles = existing switch;
adjustable levels = range sliders (fov/pitch/zoom/opacity/logo size); drag-and-drop = scene reorder +
dropzone upload + drag-adjust markers (PSV marker drag in P2). Empty states with CTA ("Drag your first
360 photo here"). Every accordion header gets a `?` tooltip.

## 7. Mobile `/app/tours` implementation

```
app/(mobile-or-app-group)/app/tours/page.tsx     (match existing /app/* group conventions)
components/tours/mobile/
  MobileTourHome.tsx      New tour · Continue list (status badges) · "How to export" help sheet
  MobileTourCreate.tsx    name · project (optional) · type chips — one screen
  MobileSceneImport.tsx   file/Photos picker (multi) · queue list · reject copy for raw formats
  MobileUploadStatus.tsx  progress bars · Realtime processing states (reuse useTourRealtime)
  MobileTourReview.tsx    TourPanoViewer (tiles) · swipe scene nav · long-press reorder (or ↑/↓) ·
                          set cover · set start view (same frame-it button)
  MobileShareSheet.tsx    publish · link list · copy · navigator.share() · QR
```
Constraints (enforced, not aspirational): only 640px thumbs in lists; viewer only on Review screen (one
instance); no filters/keyframes/callout authoring on mobile MVP; uploads stream (no FileReader-to-base64);
50-scene soft cap warning. All flows one-decision-per-screen, 48–72px targets.

## 8. Slice order & gates

1. P0-A worker → deploy Modal+Trigger → validate chart tiles
2. P0-B routes + types (§3) → 3. P0-C viewers + `/t` → 4. P0-D publish + next.config
5. UI slice 1: LibraryTab (grid/upload/status) → 6. UI slice 2: BuildTab core (viewer+strip+start view+camera accordion)
7. P1 migration (Brian applies) → 8. hotspots API+drawer+markers → 9. share tokens+snapshots+LinksColumn
10. Embed page+builder+oEmbed/OG → 11. brand assets+BrandPicker+nadir-logo MVP → 12. events+AnalyticsTab
13. Mobile slices (home→create→import→upload→review→share)
Each slice: scoped tsc → `npm run guard:architecture && npm run guard:file-size-regression && npm run
guard:design` → push. Acceptance = `TOUR360_ACCEPTANCE_TEST_CHECKLIST` sections mapped in §4/§5. Final:
iPhone on-device (Brian).

## 9. Deferred registry (do not build now; recorded so nothing is "missed")

P2: keyframes/guided paths + capture-keyframe UX · restrict-view clamps · marker drag-adjust · replace
image · floorplan/geo minimap · analytics rollup · OG card compositor · CDN-signed tiles.
P3: baked nadir (polar-warped logo) + `mls_clean` + tiny-planet + aerial transitions + enhance filters
(Modal job backing the Enhance accordion). P4: inspection callouts + rectilinear crops + PDF + Q&A.
P5: Text Studio · 360 video · audio · gyro/VR · native background uploader (twin engine) · offline tiles.
P6: raw ingest profiles · AI auto-hotspots (Florence-2/GroundingDINO) · **AI chat assistant (Groq/OpenAI
function-calling — evaluate then; not MVP scope)** · Street View/KML · YouTube metadata · custom domains ·
before/after morph · collaborative annotation (Supabase Realtime presence) · Unity/glTF export.
Splat hybrid (Phase B of master plan §7): `scene_kind:'splat'` + `SplatViewerCore` swap in BuildTab —
schedule after P1 ships; twin share embed works day one via P0-D carve-out.
