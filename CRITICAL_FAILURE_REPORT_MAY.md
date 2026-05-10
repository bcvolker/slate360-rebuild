# Critical Failure Report — May 2026

## Date: May 10, 2026
## Scope: Site Walk Capture, Plan Viewer, Mobile PWA
## Commits Analyzed: `6e293bf` through `255f6ba` (7 commits in ~2 days)
## Status: STOP — awaiting architectural review before further code changes

---

## Executive Summary

Seven rapid commits attempted to fix Site Walk capture and the Plan Viewer through iterative CSS/JS patches. All seven failed to resolve the core issues when tested on a physical mobile device. The fundamental problems are architectural, not cosmetic:

1. **React-PDF is incompatible with mobile touch-gesture wrappers** in its current integration pattern.
2. **The fixed-dimension surface model (1200×858px)** does not adapt to mobile viewports.
3. **Multiple state management layers** (React state, refs, DOM manipulation, context, custom events) create race conditions that are untestable without a physical device.
4. **The capture task-shell layout** (`fixed inset-0 z-50`) overlays parent chrome but creates stacking-context conflicts with child modals, toolbars, and FABs.

---

## Failure 1: Plan Viewer — Fundamentally Broken

### What the user sees
Blueprint renders as a tiny white square in the top-left corner of a black void. Pan and zoom gestures do nothing. After capturing a plan-pin photo, the user is dumped into generic camera mode instead of returning to the plan.

### Root cause analysis

**The surface model is wrong.** The plan surface is a `div` with hardcoded dimensions:
```
width: PLAN_PDF_BASE_WIDTH (1200px)
height: PLAN_PDF_BASE_HEIGHT (858px)
```

On a 390px-wide phone screen, this 1200px div is positioned at `top:0 left:0` with `transformOrigin: "top left"`. The centering math in `calculateCenteredPlanTransform()` computes a scale and translate that SHOULD center it — but this depends on:

1. The viewport ref having a measurable size at the time the effect runs
2. The PDF `onRenderSuccess` callback firing before the centering effect
3. The `pdfReadyToken` matching the current page

**Why it fails on mobile:**
- The `capture/layout.tsx` creates a `fixed inset-0 z-50 h-[100dvh]` shell.
- Inside, CaptureClientIsland renders PlanViewer in a `relative flex-1 min-h-0 min-w-0` div.
- PlanViewer itself uses `absolute inset-0` — but `inset-0` on an `absolute` div requires the parent to have `position: relative` AND a measurable height.
- The `flex-1 min-h-0` parent may have 0 height at the time the ResizeObserver fires if the sibling CaptureDataBottomSheet FAB button eats layout space.
- The centering effect runs inside `requestAnimationFrame` after the ResizeObserver, but by then the viewport dimensions may still be 0.

**Why pan/zoom don't work:**
- The `usePlanGestures` hook checks `if (toolMode === "draw") return;` at the start of `startPress` — this is correct.
- BUT `touch-action: none` is set on every layer (root, viewport, surface). On iOS Safari, `touch-action: none` inside a `fixed` container with `overflow: hidden` can be overridden by the browser's own gesture handling, especially when there are nested scroll containers or backdrop-blur layers.
- The `pointerDown` → `setPointerCapture` pattern silently fails on iOS Safari during multi-touch transitions (acknowledged in a comment), meaning the first finger may lose capture.

**Why plan-pin capture doesn't return to plan:**
- `saveNextStop({ fromPlanPin: true })` sets `returnToPlanAfterSave` → `setWalkMode("plan")`.
- But `captureNow()` is called BEFORE `setWalkMode` takes effect (both are synchronous state writes, but React batches them).
- The `openPickerDirect` call inside `captureNow` programmatically clicks the file input, which on iOS may trigger a navigation-like event that clears the pending `walkMode` state update.

### Why CSS GPU transform refactor didn't help
The `applyTransformToDOM` / `commitTransform` pattern correctly bypasses React during gesture frames — but:
1. The initial centering still uses `setTransform()` (React state) AND `applyTransformToDOM()` together. If React re-renders between these calls, the inline `style.transform` from state overwrites the ref-based DOM mutation.
2. `commitTransform()` sets state, triggering a re-render that applies the state-based transform — which may be stale if another gesture started between the commit and the render.

---

## Failure 2: Markup Tools Missing

### What the user sees
The space below the captured photo is blank. No Navigate/Drawing toggle, no Ghost, no Undo/Redo.

### Root cause
The tools strip renders conditionally on `captureReady`:
```tsx
const captureReady = Boolean(activeItem || previewActive || activeItemId);
```

`activeItem` is derived from `items.filter(i => i.item_type === "photo")` then `.find(i => i.id === activeItemId)`. If the item list hasn't been hydrated from the server yet (async fetch in `useCaptureItems`), `captureReady` is false and the entire tools strip doesn't render.

This is a **timing/hydration race**: the tools only appear after the first server round-trip completes and items are populated.

---

## Failure 3: Scroll Bleed on Site Walk Hub

### Root cause
`SiteWalkHub` uses `flex h-full min-h-0 w-full flex-col`. The parent is `SiteWalkShell`:
```tsx
<div className="w-full min-w-0 bg-[#0B0F15]">
  <SiteWalkModuleNav orgName={orgName} />
  {children}
</div>
```

This parent does NOT constrain height. There's no `h-screen`, `h-[100dvh]`, or `overflow-hidden` on the shell. So `h-full` on the Hub resolves to the content height (unbounded), and the walk list extends past the viewport without the parent clipping it. The `pb-[max(env(safe-area-inset-bottom),2rem)]` on the scroll area doesn't help because the parent itself overflows.

---

## Failure 4: No Delete Option for Walks

### Root cause
No delete API or UI exists. `SiteWalkHub` renders walks as `<Link>` elements with no interactive affordance beyond navigation. There is no swipe-to-delete gesture handler, no three-dot menu, and no `DELETE /api/site-walk/sessions/[id]` endpoint.

---

## Failure 5: Rogue 'Plans' Nav Tab

### What's in the code
`SiteWalkModuleNav` NAV_ITEMS does NOT include a Plans tab — it was removed in commit `5a2b4ff` and the array currently has 4 items: Workspace, Walks, Capture, Deliverables.

### Why the user still sees it
The PWA service worker cached the old HTML/JS bundle. The kill-switch SW (`app/sw.ts`) deletes Cache Storage entries and unregisters itself, but:
1. iOS Safari aggressively caches standalone PWA resources independently of Cache Storage.
2. The user must force-close the PWA and reopen it (or delete and re-add to home screen) for the new SW to take effect.
3. This is NOT a code bug — it's a deployment cache invalidation issue specific to iOS PWA standalone mode.

---

## Failure 6: Taxonomy — 'Field Project' Confusion

### Current state
The Hub shows "Start from Project" and the code uses `HubProject` type with `name`, `description`, `status`. The walk creation flow passes `project_id` to the session API.

### Problem
"Project" in construction means a multi-month CM engagement. For a quick field inspection user, "Start from Project" implies they need to set up a formal project first, which is a barrier. The naming conflates the CM data model with the capture workflow.

### Required separation
- **Site Walk sessions** should be the primary workflow object ("Walkthroughs", "Inspections", "Observations")
- **Projects** remain as the CM container for scope/budget/schedule
- A walk CAN be linked to a project, but doesn't require one
- The UI should lead with "Start Walk" / "Continue Walk", not "Start from Project"

---

## Proposed Plan Viewer Architecture — Complete Replacement

### Why React-PDF must go (for mobile)

React-PDF renders each page as an HTML `<canvas>` element. On mobile:
- Canvas memory budget is ~256MB (iOS Safari). A single construction blueprint PDF page at 1200px can consume 30-80MB of canvas memory.
- Multi-page navigation remounts the Document/Page, causing garbage collection pauses.
- The library controls the canvas dimensions via inline styles that fight with CSS transforms.
- `touch-action: none` + `setPointerCapture` inside a fixed-position container is unreliable on iOS Safari.

### Proposed replacement: Server-side rasterization + Leaflet.js tile viewer

**Phase 1: Server-side rasterization (API route)**
```
POST /api/site-walk/plan-sets/[id]/rasterize
```
On plan upload, a serverless function:
1. Downloads the PDF from R2
2. Uses `pdf-lib` + `sharp` (or a Cloudflare Worker with `pdf.js` + `OffscreenCanvas`) to render each page as a 2048px-wide WebP image
3. Stores rasterized images at `plan-sets/{id}/pages/{n}.webp` in R2
4. Updates `site_walk_plan_sheets.rasterized_url` column

**Phase 2: Leaflet.js plan viewer (client)**
Replace `PlanViewer` + `PlanPdfPage` with a Leaflet.js `ImageOverlay`:
- Leaflet handles pan, pinch-zoom, inertia, and bounds natively on all mobile browsers
- No canvas memory issues (uses `<img>` tags with CSS transforms)
- Pin markers use Leaflet's native `L.marker` with custom icons
- Long-press pin creation uses Leaflet's `contextmenu` event
- The library is 42KB gzipped, battle-tested on every mobile browser

**Phase 3: Desktop React-PDF preserved (optional)**
Desktop users with RAM headroom can still use React-PDF for high-fidelity viewing. Mobile gets the Leaflet rasterized viewer. Feature-flag `useDeviceContext().isMobile` to switch.

### Alternative: OpenSeadragon (Deep Zoom)
If blueprints are very large (A0/A1 sheets), OpenSeadragon with DZI tiles provides progressive loading. More complex server-side tile generation but handles arbitrarily large images. Leaflet is simpler for V1.

---

## Recommended Next Steps (Ordered)

1. **DO NOT patch the current Plan Viewer further.** It is architecturally unsound for mobile.
2. **Fix the scroll bleed** on SiteWalkHub (1-line CSS fix on SiteWalkShell).
3. **Fix the stale PWA cache** with a version-stamped query param on the SW registration URL.
4. **Add walk delete** (API + swipe-to-delete or long-press menu).
5. **Rename taxonomy** ("Field Project" → "Walkthrough" or user-chosen term).
6. **Implement server-side PDF rasterization** as an API route.
7. **Replace PlanViewer internals** with Leaflet.js + rasterized images.
8. **Test on physical device** before committing each step.

---

## Files Referenced

| File | Lines | Issue |
|---|---|---|
| `components/site-walk/capture/PlanViewer.tsx` | 254 | Fixed 1200×858 surface, centering race, dual transform state |
| `components/site-walk/capture/PlanPdfPage.tsx` | 116 | React-PDF canvas rendering, mobile memory crash risk |
| `components/site-walk/capture/planViewerModel.ts` | 50 | Hardcoded PLAN_PDF_BASE_WIDTH/HEIGHT |
| `components/site-walk/capture/usePlanGestures.ts` | 80 | Touch gesture handling, iOS Safari pointer capture failure |
| `components/site-walk/capture/VisualCaptureView.tsx` | 168 | Tools conditional on captureReady timing |
| `components/site-walk/capture/CaptureDataBottomSheet.tsx` | 275 | FAB/modal layout |
| `app/site-walk/_components/SiteWalkHub.tsx` | 164 | Scroll bleed from unconstrained parent |
| `components/site-walk/SiteWalkShell.tsx` | 16 | Missing height constraint |
| `components/site-walk/SiteWalkModuleNav.tsx` | 67 | Plans tab removed in code, stale on device |
| `app/site-walk/(act-2-inputs)/capture/layout.tsx` | 17 | Fixed z-50 task shell, stacking context issues |
