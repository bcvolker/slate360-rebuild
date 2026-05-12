# SECOND OPINION DOSSIER — Site Walk Mobile UI, PWA Cache, and Plan Viewer Forensics

Date: 2026-05-11  
Repository: `bcvolker/slate360-rebuild`  
Current branch: `main`  
Latest commit inspected: `4e44b28` — `docs: Project memory handoff`

---

## 1. Infrastructure & Vercel Build Status

### Exact Vercel status of the latest commit

The latest commit on `main` did **not** successfully deploy to Vercel.

GitHub commit status for `main`:

```json
{
  "state": "failure",
  "statuses": [
    {
      "context": "Vercel",
      "description": "Deployment has failed — run this Vercel CLI command: npx vercel inspect dpl_Ak4quHyhsRg7RTghRt3DcKxCdFgB --logs",
      "state": "failure",
      "target_url": "https://vercel.com/slate360/slate360-rebuild/Ak4quHyhsRg7RTghRt3DcKxCdFgB"
    }
  ]
}
```

The failed Vercel deployment was inspected with:

```bash
npx vercel inspect dpl_Ak4quHyhsRg7RTghRt3DcKxCdFgB --logs
```

Critical build output:

```text
2026-05-11T23:05:19.658Z  Cloning github.com/bcvolker/slate360-rebuild (Branch: main, Commit: 4e44b28)
2026-05-11T23:05:26.028Z  Running "vercel build"
2026-05-11T23:05:38.305Z  Running "next build"
2026-05-11T23:05:40.381Z  ✓ (serwist) Bundling the service worker script with the URL '/sw.js' and the scope '/'...
2026-05-11T23:06:23.442Z  Failed to compile.

./node_modules/@napi-rs/canvas-linux-x64-gnu/skia.linux-x64-gnu.node
Module parse failed: Unexpected character '' (1:0)
You may need an appropriate loader to handle this file type, currently no loaders are configured to process this file.

Import trace for requested module:
./node_modules/@napi-rs/canvas-linux-x64-gnu/skia.linux-x64-gnu.node
./node_modules/@napi-rs/canvas/js-binding.js
./node_modules/@napi-rs/canvas/index.js
./app/api/site-walk/plan-sets/[id]/rasterize/route.ts

./node_modules/@napi-rs/canvas-linux-x64-musl/skia.linux-x64-musl.node
Module parse failed: Unexpected character '' (1:0)

Import trace for requested module:
./node_modules/@napi-rs/canvas-linux-x64-musl/skia.linux-x64-musl.node
./node_modules/@napi-rs/canvas/js-binding.js
./node_modules/@napi-rs/canvas/index.js
./app/api/site-walk/plan-sets/[id]/rasterize/route.ts

> Build failed because of webpack errors
Error: Command "next build" exited with 1
status  ● Error
```

### Why the physical device did not show the developer badge

The developer badge was added in `components/site-walk/capture/PlanViewer.tsx`, but the Vercel deployment containing that code failed. Therefore the installed iOS PWA could only load the previously successful deployment. This explains all reported symptoms:

- The `[ USING: LEAFLET ]` / `[ USING: REACT-PDF ]` badge is missing.
- The `[ RETRY RASTERIZATION ]` button is missing.
- The visual UI still appears jammed.
- The app still falls back to the old mobile plan path.

This is not only a PWA cache problem. The latest deployment never became the production deployment.

### Infrastructure summary

Current stack:

- **Framework:** Next.js 15.5.12, App Router, TypeScript, React.
- **Hosting/deploy:** Vercel, connected to `main`.
- **Database/auth:** Supabase Postgres and Supabase auth/admin clients.
- **Object storage:** Cloudflare R2 preferred via S3-compatible endpoint; AWS S3 fallback exists.
- **S3/R2 SDK:** `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `@aws-sdk/lib-storage`.
- **PWA/service worker:** Serwist (`@serwist/next`) compiles `app/sw.ts` into `public/sw.js`.
- **Plan rendering attempts:**
  - Previous mobile path: `react-pdf` + browser canvas.
  - New intended path: server rasterize PDF pages into WebP, store in R2, render via Leaflet image overlay.

### Immediate build blocker

`app/api/site-walk/plan-sets/[id]/rasterize/route.ts` statically imports `@napi-rs/canvas`:

```ts
import { createCanvas } from "@napi-rs/canvas";
```

Next/Vercel attempted to bundle native `.node` binaries into the route and failed with webpack parse errors. The deployment never shipped.

---

## 2. The PWA Caching Trap

### Current service worker implementation

The app uses Serwist, configured in `next.config.ts`:

```ts
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});
```

`next.config.ts` also generates a per-build ID and injects it into `NEXT_PUBLIC_BUILD_ID`:

```ts
const buildId = Date.now().toString(36);

const nextConfig: NextConfig = {
  generateBuildId: () => buildId,
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
  },
  // ...
};
```

`/sw.js` is configured with no-cache headers:

```ts
{
  source: "/sw.js",
  headers: [
    { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
    { key: "Pragma", value: "no-cache" },
    { key: "Expires", value: "0" },
  ],
}
```

The current `app/sw.ts` is not a normal offline-first worker. It is an emergency kill-switch worker:

```ts
const KILL_SWITCH_VERSION = "2026-05-11-canary-alpha-01";

async function clearAllCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.map((key) => caches.delete(key)));
  return keys.length;
}

self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const deleted = await clearAllCaches();
      await self.clients.claim();
      await notifyClients("SLATE360_SW_KILL_RELOAD");
      await self.registration.unregister();
      console.info(`[SW] ${KILL_SWITCH_VERSION} unregistered; cleared ${deleted} cache(s).`);
    })()
  );
});
```

There is intentionally no `fetch` handler in `app/sw.ts`.

`components/providers/SWRegistrar.tsx` registers the SW in production and adds a cache-busting query param:

```ts
const swUrl = `/sw.js?v=${encodeURIComponent(process.env.NEXT_PUBLIC_BUILD_ID || Date.now().toString(36))}`;
navigator.serviceWorker.register(swUrl, { updateViaCache: "none" }).then((registration) => {
  void registration.update();
});
```

It also unregisters all service workers and clears Cache Storage once the kill-switch has run:

```ts
const disabledKey = "slate360-sw-disabled-2026-05-11-canary";

const unregisterAll = async () => {
  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(registrations.map((registration) => registration.unregister()));
  await clearBrowserCaches();
  localStorage.setItem(disabledKey, "done");
};
```

### Why iOS standalone PWAs keep showing old deployments

There are two separate problems:

1. **The current deployment failed.** The latest changes were never available to iOS or desktop production users.
2. **Even after a successful deployment, iOS standalone PWAs are aggressive about reusing cached app shells and controlled pages.** Installed PWAs can preserve:
   - an already-loaded JS runtime,
   - HTML/app shell snapshots,
   - old service worker registrations,
   - old `_next/static` chunks,
   - WebKit process memory state,
   - manifest/icon cache.

A service worker kill-switch can only help after the browser fetches and activates the new SW. If the new deployment never goes live, or if the installed standalone instance remains in the old WebKit process, the user sees the old app.

### How to force a cache-bust in this app

Current mitigations already present:

- `sw.js` no-cache headers.
- `NEXT_PUBLIC_BUILD_ID` query param on SW URL.
- `updateViaCache: "none"`.
- SW kill-switch that clears all Cache Storage and unregisters itself.
- HTML routes use `Cache-Control: public, max-age=0, must-revalidate`.

Additional operational steps for iOS standalone PWA verification:

1. Confirm Vercel status is green for the exact target commit before testing.
2. Open Safari directly to the production URL once, not the installed PWA, to allow the SW unregister path to run.
3. Fully close the installed PWA from the iOS app switcher.
4. If still stale: iOS Settings → Safari → Advanced → Website Data → remove site data for the production domain.
5. Reinstall the PWA only after a successful deployment is confirmed.
6. Add a temporary visible build marker in the root layout only after deploy status is green, not while build is failing.

---

## 3. UI Layout Collisions (VisualCaptureView)

### Current CSS/layout structure

`VisualCaptureView.tsx` uses this top-level structure:

```tsx
<div className="flex h-full w-full flex-col overflow-hidden bg-[#0B0F15] text-white">
  <header className="z-30 flex shrink-0 ..." />

  <div className="relative flex-1 min-h-0">
    <div className="absolute inset-0">
      <CameraViewfinder ... />
    </div>
    {ghostOverlay}
  </div>

  <div className={`z-20 shrink-0 flex flex-col ... ${photoItems.length === 0 ? "pb-32" : ""}`}>
    <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
      drawing / undo / redo / ghost controls
    </div>
    <UnifiedVectorToolbar />
  </div>

  {photoItems.length > 0 && (
    <div className="z-20 shrink-0 flex ... pb-32">
      thumbnail timeline
    </div>
  )}
</div>
```

The bottom-sheet mobile FAB is in `CaptureDataBottomSheet.tsx`:

```tsx
<button
  className="md:hidden fixed right-4 z-40 inline-flex min-h-12 ..."
  style={{ bottom: `calc(max(env(safe-area-inset-bottom, 0.75rem), 0.75rem) + 5rem)` }}
>
  Details & Save / Start Capture
</button>
```

### Collision diagnosis

The collision is caused by mixing two layout systems:

- `VisualCaptureView` uses normal flex-column layout for the camera, tools, and timeline.
- `CaptureDataBottomSheet` uses a `position: fixed` mobile FAB at `z-40` independent of that flex layout.

Because the FAB is fixed, the `UnifiedVectorToolbar` does not know it exists. The toolbar is in normal document flow at `z-20`; the FAB overlays above it at `z-40`.

The camera/image area itself is:

```tsx
<div className="relative flex-1 min-h-0">
  <div className="absolute inset-0">
    <CameraViewfinder />
  </div>
</div>
```

That camera region expands to all remaining height. The tools then render below the image, but the fixed FAB floats over the lower-right viewport regardless of the tools' position.

A previous rescue patch added `pb-32` to either the tools strip or the timeline. This is a partial mitigation, not a durable layout architecture:

- If there are no photo items, `pb-32` is applied to the tools strip.
- If photo items exist, `pb-32` is applied to the timeline strip.
- The FAB remains fixed and above both.
- The toolbar still has less stacking priority than the FAB.
- The padding consumes vertical height, shrinking the camera, rather than creating a unified bottom action rail.

### Why the outside reviewer should care

This is not a one-off CSS bug. It is a product layout architecture problem. The camera surface, markup toolbars, timeline strip, bottom save sheet, and FAB all compete for the same bottom safe-area without a shared layout contract.

The likely best-practice fix is not more `pb-*` patches. The mobile capture screen needs one explicit bottom control rail with known reserved height. The image area should be `calc(100dvh - topChrome - bottomRail - safeArea)` or an equivalent CSS grid layout, while all bottom actions live in the same rail/z-index system.

---

## 4. The UI Complexity & Routing Debt

### Current sprawling workflow

Current Site Walk plan/capture workflow spans multiple screens and concepts:

- `/site-walk/setup` — Field Project setup workbook.
- `/site-walk/(act-1-setup)/plans` — standalone Plan Room / Plans upload flow.
- `/site-walk/(act-2-inputs)/capture` — capture island with three modes: `choice`, `plan`, `camera`.
- `/site-walk/slatedrop` — folder/file view for Site Walk Files.
- Dashboard plan routes also exist under `app/(dashboard)/plans` and `components/dashboard/plans`.
- API surface includes both older/generic plan endpoints and newer plan-set/sheet endpoints:
  - `app/api/site-walk/plans`
  - `app/api/site-walk/plan-sets`
  - `app/api/site-walk/plan-sheets`

The capture client itself contains substantial mode orchestration:

```ts
type WalkMode = "choice" | "plan" | "camera";
```

The current loop includes:

- initial choice screen,
- plan mode,
- direct picker refs,
- camera mode,
- bottom sheet save controls,
- return-to-plan state,
- plan pin context,
- file upload events,
- separate markups and attachment pins,
- plan uploader-triggered rasterization.

The Plans flow is currently standalone:

- A user creates/selects a Field Project.
- Then navigates to a separate Plans tab/room.
- Uploads PDFs.
- Auto-generates sheets.
- Starts a plan-linked walk.
- Then moves into capture.

### Explicit product goal for review

We need a **Ruthless UI Consolidation**.

The outside reviewers should treat this as a product and workflow simplification problem, not only a bug hunt.

Explicit desired direction:

1. **Delete the standalone `[ Plans ]` tab/screen as a separate primary workflow.**
   - Plan upload should happen inside Project/Walk creation.
   - The user should not have to understand a separate Plan Room before starting a field workflow.

2. **Move plan upload into Project/Walk creation.**
   - The happy path should be:
     1. Create/select the work context.
     2. Upload or skip plans.
     3. Start walk.
     4. Capture.
   - Plan processing should become background status inside that one workflow.

3. **Rename `Field Project` to avoid conflict with CM `Projects`.**
   - The code currently displays labels like `New Field Project`, `Field Project`, and `Field Project Setup`.
   - This collides mentally with broader construction-management `Projects` / Project Hub.
   - Candidate replacement concepts: `Walk Area`, `Site Area`, `Field Walk`, `Inspection Set`, `Capture Set`, or `Walk Package`.

4. **Use the fewest screens and buttons possible.**
   - Reduce the current tab/workbook/room/capture split.
   - Avoid separate “setup”, “plans”, “capture”, and “files” mental models for a first-time mobile user.
   - Collapse secondary actions behind one bottom sheet only when needed.

### For reviewers

Please recommend a simplified IA/navigation model for mobile-first Site Walk:

- What screens should remain?
- What should be deleted?
- What should be moved into creation/start flow?
- What should be deferred into background processing/status?
- What labels avoid confusion with CM Projects?

---

## 5. Plan Viewer: The Serverless Trap

### Mobile `react-pdf` failure

The original mobile plan viewer used `react-pdf`, which renders PDF pages through browser canvas. On physical iOS devices this path produced the observed failure mode:

- slow plan page loads,
- gestures freezing,
- tiny/unusable plan view,
- silent failure / blanking on dense construction PDFs,
- WebKit canvas memory pressure and likely out-of-memory crashes.

The practical conclusion: `react-pdf` is not a safe mobile plan viewer for large construction plan PDFs. Dense vector drawings can exceed iOS WebKit canvas limits even if they load on desktop.

### Intended replacement architecture

The intended replacement was:

1. Upload PDF.
2. Create `site_walk_plan_sets` and `site_walk_plan_sheets` rows.
3. Rasterize each page server-side to WebP.
4. Store WebP in R2.
5. Update each sheet with:
   - `rasterized_key`
   - `rasterized_width`
   - `rasterized_height`
6. On mobile, render the WebP using Leaflet `CRS.Simple` and image overlay.
7. Fall back to `react-pdf` only if rasterized images are missing.

Frontend router now checks:

```ts
const hasRasterized = planSheets.length > 0 && planSheets.some((s) => s.rasterized_key != null);
const usingLeaflet = isMobile && hasRasterized;
```

### Serverless rasterization failure

The current `/api/site-walk/plan-sets/[id]/rasterize` route uses:

- `pdfjs-dist/legacy/build/pdf.mjs`
- `@napi-rs/canvas`
- `sharp`
- R2/S3 `GetObjectCommand` / `PutObjectCommand`

The route statically imports native canvas:

```ts
import { createCanvas } from "@napi-rs/canvas";
```

The Vercel build fails before runtime:

```text
./node_modules/@napi-rs/canvas-linux-x64-gnu/skia.linux-x64-gnu.node
Module parse failed: Unexpected character '' (1:0)

Import trace:
@napi-rs/canvas -> app/api/site-walk/plan-sets/[id]/rasterize/route.ts
```

Therefore, the new rasterization route never deployed. The phone never received the Leaflet path, the status badge, or the retry button.

Even if the route bundled successfully, this remains architecturally risky on Vercel for production plan sets because PDF rasterization can exceed serverless constraints:

- large upload/download payloads,
- 50MB PDFs,
- large native binaries,
- high memory during page render,
- long processing time for multi-page PDFs,
- serverless cold starts,
- timeout limits,
- inability to monitor page-level progress if done inside request/response.

### Reviewer question: required architecture answer

Given we have Supabase and Cloudflare R2, what is the industry best practice to asynchronously rasterize 50MB PDFs into Leaflet WebP tiles without breaking Vercel serverless limits?

Specific reviewer prompts:

1. Should rasterization be moved completely out of Vercel into a background worker?
2. Should Cloudflare Queues + Workers + R2 be used, or should we use a containerized job runner such as Fly.io, Render worker, Railway, AWS ECS/Fargate, AWS Lambda container image, or a Supabase Edge Function plus external worker?
3. Should output be full-page WebP images or tiled pyramids compatible with Leaflet/DeepZoom-style viewing?
4. For construction PDFs, should we use `poppler`, `pdfium`, Ghostscript, or another renderer instead of `pdfjs-dist`?
5. What queue/status schema should exist in Supabase?
6. How should the app poll or subscribe to status so mobile users see `Queued`, `Processing page 3/24`, `Ready`, or `Failed with reason`?
7. How should failures be made visible without falling back silently to `react-pdf`?

### Strong initial recommendation for outside review

The likely correct direction is:

- Do **not** rasterize PDFs inside Vercel request handlers.
- Keep Vercel for UI/API orchestration only.
- Store original PDFs in R2.
- Insert a `plan_raster_jobs` row in Supabase and enqueue a background job.
- Run rasterization in a dedicated worker/container with proper native PDF tooling.
- Generate either:
  - full-page WebP for near-term MVP, or
  - tiled WebP/AVIF pyramid for large sheets and smooth mobile zoom.
- Store outputs in R2.
- Update `site_walk_plan_sheets` with keys/dimensions/status.
- Expose plan processing status in UI.
- Never silently fall back to `react-pdf` on mobile without displaying the exact reason.

---

## Closing forensic summary

The most important fact: the last Vercel deployment failed. The physical device is not seeing the latest UI fixes because production never received them.

The failed build is caused by the native `@napi-rs/canvas` import inside the Next.js API route. This confirms the broader architecture concern: PDF rasterization does not belong in the interactive Vercel app runtime.

The mobile UI problems are likewise not isolated CSS bugs. The capture surface, toolbar, timeline, and details FAB need one unified mobile layout contract. The workflow also needs ruthless consolidation so users do not bounce across Setup, Plans, Capture, and Files to perform one field walk.
