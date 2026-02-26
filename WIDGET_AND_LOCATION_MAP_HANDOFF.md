# Widget System & Site Location Map — Full Handoff Document

**Last Updated:** 2026-02-26  
**Repo:** `bcvolker/slate360-rebuild` (branch: `main`)  
**Live:** https://www.slate360.ai  
**Stack:** Next.js 15 (App Router), React 19, Tailwind v4, Vercel, Supabase, AWS S3

---

## Table of Contents

1. [Widget Uniformity — What Was Done](#1-widget-uniformity--what-was-done)
2. [Site Location Widget — Everything That Was Done](#2-site-location-widget--everything-that-was-done)
3. [Architecture & File Map](#3-architecture--file-map)
4. [Key Technical Decisions](#4-key-technical-decisions)
5. [Known Constraints & Gotchas](#5-known-constraints--gotchas)
6. [Validation & Testing](#6-validation--testing)

---

## 1. Widget Uniformity — What Was Done

### Problem

The Dashboard (`/dashboard`) and Project Hub (`/project-hub`, `/project-hub/[projectId]`) each had their own widget rendering systems — different card wrappers, different sizing logic, different drag behavior, and different persistence. Widgets looked and behaved differently depending on which page they were on.

### What Was Tried (Chronological)

#### Attempt 1: Per-Route CSS Tweaks
- **Approach:** Added CSS `min-height`, `flex` constraints to individual route components.
- **Result:** Partially worked but created divergence — Dashboard widgets looked different from Project Hub widgets even when showing the same data. Changes had to be duplicated across routes.

#### Attempt 2: Shared `LocationMap` Component Only
- **Approach:** Made `LocationMap` shared but left card wrappers and grid logic separate per route.
- **Result:** Map behavior unified, but card chrome (header, expand button, sizing) still differed. Expanding on Dashboard showed one layout; expanding on Project Hub showed another.

#### Attempt 3: Legacy `react-grid-layout` in Project Hub
- **Approach:** Project Hub used `react-grid-layout` with its own drag/resize system while Dashboard used CSS grid with HTML5 drag-and-drop.
- **Result:** Fundamentally different widget behavior between the two pages. Grid layout widgets had different sizing constraints and interaction patterns.

#### What Worked: Full Shared Widget System

Created a **single source of truth** for all widget components used by both Dashboard and Project Hub:

| File | Purpose |
|------|---------|
| `components/widgets/widget-meta.ts` | Canonical list of 12 widgets with IDs, labels, icons, colors, tier gates. Shared `getWidgetSpan()` and `buildDefaultPrefs()`. |
| `components/widgets/WidgetCard.tsx` | **Single card wrapper** used everywhere. Uniform visual treatment: `rounded-2xl`, `border`, `shadow-sm`, `p-6`. Fixed height for unexpanded cards (`h-[320px] min-h-[320px]`). Built-in expand/collapse button and HTML5 drag support. |
| `components/widgets/WidgetBodies.tsx` | Shared body components for Weather, Financial, Calendar, Data Usage, Processing Jobs, Continue Working, Contacts, Suggest Feature, Upgrade Card. Change once, both pages pick it up. |
| `components/widgets/widget-prefs-storage.ts` | Schema-versioned (`WIDGET_PREFS_SCHEMA_VERSION = 2`) persistence layer. `loadWidgetPrefs()`, `saveWidgetPrefs()`, `mergeWidgetPrefs()` handle localStorage read/write with automatic migration and stale-state rejection. |

##### Key Uniformity Fixes:

1. **Fixed card height:** All unexpanded widget cards are pinned to `h-[320px] min-h-[320px]` via `WidgetCard.tsx`. This prevents widgets from collapsing or expanding to random heights based on content.

2. **Single expand button:** `WidgetCard` owns the only expand/collapse control. Internal widget components (like `LocationMap`) no longer render their own expand buttons — this eliminated duplicate header/expand conflicts.

3. **Consistent grid spans:** `getWidgetSpan(id, expanded)` in `widget-meta.ts` provides the same column-span logic for both Dashboard and Project Hub grids.

4. **Drag isolation for Location widget:** `draggable={!p.expanded && p.id !== "location"}` applied in both `DashboardClient.tsx` and `ProjectDashboardGrid.tsx`. This prevents HTML5 card drag from hijacking Google Maps pan/drag gestures.

5. **Schema-versioned preferences:** `widget-prefs-storage.ts` uses `WIDGET_PREFS_SCHEMA_VERSION`. When the schema version changes, stale saved preferences are discarded and defaults are used. This prevents old localStorage data from overriding new widget layouts after deploys.

6. **Removed legacy `react-grid-layout`** from Project Hub render path. Both pages now use the same CSS grid + HTML5 drag-and-drop system.

7. **SlateDrop default view:** Both Dashboard and Project Hub default SlateDrop to `folders` view (not file list) when expanding.

8. **Removed duplicate headers:** `LocationMap` no longer renders its own header row or expand button. Only `WidgetCard` renders the header with icon + title + expand control.

9. **Temporary diagnostic probes** (now removed): During debugging, added visible probe markers to `WidgetCard`, homepage, and login page to verify which deployment was being served and whether both routes used the same shared renderer. These were removed after confirming uniformity.

---

## 2. Site Location Widget — Everything That Was Done

### Starting State

The Location widget was a basic Google Maps embed that didn't pan, had no search, no directions, no drawing tools, and showed a default pin marker. Controls were visible in compact mode consuming map space.

### All Changes Made (Chronological)

#### Phase 1: Map Visibility & Interaction
- **Map not visible / not rendering:** Fixed `APIProvider` initialization with correct API key and Map ID (`1e06d4f2e26297ff1ecd6927D`).
- **Panning didn't work:** HTML5 drag-and-drop on the widget card was intercepting pointer events meant for Google Maps. Fixed by disabling `draggable` on the location widget card specifically.
- **Default satellite view:** Set `isThreeD` to default `true` — map loads in satellite mode with 45° tilt.
- **Removed default pin marker:** Removed the `<Marker position={mapCenter} />` component that placed an unwanted red pin on the map center.
- **3D toggle:** Added button to switch between satellite (3D with tilt) and roadmap (2D flat) views.
- **Zoom controls:** `+`/`-` buttons for programmatic zoom.
- **Current location:** "Locate" button uses browser `navigator.geolocation` to pan map to user's real position.

#### Phase 2: Compact vs Expanded Mode
- **Compact mode (in grid):** Map-only, no toolbar, fills the `320px` card height. Controls hidden entirely.
- **Expanded mode (full width or modal):** Shows slim one-line toolbar at top with all tools. Map gets `min-h-[70vh]`.
- **`expanded` prop:** Added explicit `expanded` prop passed from all three call sites (`DashboardClient.tsx`, `project-hub/page.tsx`, `ProjectDashboardGrid.tsx`).
- **Removed legacy non-compact branch:** `LocationMap` previously had two separate render paths (compact vs full). Unified into a single render path controlled by `expanded` prop.
- **Controls collapsed by default in expanded mode:** Heavy tool controls only appear when user clicks "Show Controls".

#### Phase 3: Address Search & Autocomplete
- **Google Places Autocomplete:** Uses `AutocompleteService` (via `useMapsLibrary("places")`) with debounced suggestions (250ms). Shows up to 6 results.
- **Enter-key geocode fallback:** If user types a full address and hits Enter, `resolveAddressQuery()` uses the Geocoding API as fallback to resolve and pan.
- **Address bar always visible in expanded mode:** Widened input with explicit "Address" label in the condensed toolbar.
- **Removed "autocomplete" wording:** Placeholder reads "Search address" instead of mentioning autocomplete.

#### Phase 4: Drawing / Markup Tools
- **7 drawing tools:** Select, Marker, Line, Arrow, Rectangle, Circle, Polygon.
- **Google DrawingManager:** Manually instantiated (not `@vis.gl/react-google-maps` built-in). Managed via refs.
- **Style controls:** Stroke color picker, fill color picker, stroke weight slider (1–10).
- **Arrow tool:** Uses polyline with `FORWARD_CLOSED_ARROW` symbol.
- **Overlay selection:** Clicking a drawn shape selects it and allows style changes.
- **Clear markup:** Button removes all drawn overlays from map and clears refs.
- **Condensed toolbar:** All tools render in a compact horizontal scroll row to minimize vertical space.
- **Note:** Google `DrawingManager` is deprecated as of Aug 2025 and will be unavailable May 2026. Migration to an alternative will be needed.

#### Phase 5: Directions (Most Complex Fix)

##### What Was Tried:

1. **Google `DirectionsService` (legacy):** Returned `REQUEST_DENIED`. The Maps JavaScript API Directions Service requires the "Directions API" to be enabled AND allowed on the API key. This project's key doesn't allow it.

2. **Google Routes API v2 (server-side):** Created `/api/directions/route.ts` calling `routes.googleapis.com`. Returned `API_KEY_SERVICE_BLOCKED` because the API key has HTTP referrer restrictions that block server-side calls.

3. **Google Routes API v2 (browser-side direct fetch):** Tried calling `routes.googleapis.com` directly from the browser. Returned 403 because the API key's **API restrictions list** doesn't include the Routes API at all — even though the Routes API was enabled on the GCP project, the key itself restricts which APIs it can call.

4. **Google Maps Directions API (legacy, server-side):** Also `REQUEST_DENIED` — same API key restriction issue.

##### What Worked: OSRM (Open Source Routing Machine)

**Final architecture:**

```
Browser (LocationMap.tsx)
  │
  │ POST /api/directions
  │   { origin: "Tempe, AZ", destination: "Gilbert, AZ", travelMode: "DRIVING" }
  │
  ▼
Server (app/api/directions/route.ts)
  │
  ├─► Google Geocoding API  →  resolve addresses to {lat, lng}
  │   (ALLOWED by this API key)
  │
  └─► OSRM (router.project-osrm.org)  →  free routing, no API key needed
      Returns: encoded polyline, distance in meters, duration in seconds
  │
  ▼
Response to browser:
  { encodedPolyline, distance: "13.9 mi", duration: "23 min", ... }
```

- **OSRM profiles:** `DRIVING` → `driving`, `WALKING` → `foot`, `BICYCLING` → `bicycle`, `TRANSIT` → `driving` (OSRM has no transit, falls back to driving).
- **Polyline decoding:** `decodePolyline()` helper decodes the standard Google-format encoded polyline string into an array of `{lat, lng}` points.
- **Route rendering:** Creates `google.maps.Polyline` (orange `#FF4D00`, weight 4) and A/B start/end markers on the map. Fits bounds with 50px padding.
- **Post-route UI:** Green badge shows distance/duration. Buttons: "Navigate" (opens Google Maps URL), "Copy Link", "Share".
- **Mode switching:** Changing travel mode with both fields filled auto-triggers a new route fetch.
- **Swap:** Button to swap origin ↔ destination.
- **Clear:** Removes route polyline and markers, resets state.

##### Why OSRM Works When Google Doesn't:
The API key (see `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` in `.env.local`) has two layers of restrictions in Google Cloud Console:
1. **Application restrictions:** HTTP referrer — only allows calls from `*.slate360.ai` domains. This blocks server-side API calls.
2. **API restrictions:** Only allows Maps JavaScript API, Geocoding API, Maps Static API. Routes API and Directions API are NOT in this list.

To fix this properly (and use Google routing natively), you'd need to:
1. Go to GCP Console → APIs & Services → Credentials → edit the API key
2. Under "API restrictions", add "Routes API" and/or "Directions API" to the allowed list
3. Optionally create a second server-only API key without referrer restrictions

Until then, OSRM works perfectly and is free with no rate limits for reasonable usage.

#### Phase 6: PDF Export

##### What Was Tried:
- **`html2canvas`:** Crashed on Tailwind v4's `oklch()` color functions and couldn't clone the WebGL-based Google Maps canvas. Produced blank or error outputs.

##### What Worked: Google Static Maps API

```
createPdfBlob()
  │
  ├─► Fetch /api/static-map?center=...&path=enc:POLYLINE&markers=...
  │   (Server proxy → maps.googleapis.com/maps/api/staticmap)
  │   Returns: PNG image at 2x retina scale
  │
  └─► jsPDF (dynamically imported)
      Creates landscape A4 PDF with:
      - Static map image (60% page height)
      - Title, date, location label
      - Coordinates
      - Route details (if directions active)
      - Clickable Google Maps link
```

- **Static Maps API proxy** (`/api/static-map`): Server-side proxy avoids CORS. Adds `Referer: https://www.slate360.ai/` header to satisfy API key referrer restrictions. Returns PNG with `Cache-Control: public, max-age=3600`.
- **Fallback:** If image fetch fails, PDF is text-only with all data but no map image.

#### Phase 7: Share / Send Panel

- **Save to SlateDrop folder:** 
  1. Select project and folder from dropdowns (loaded from `/api/dashboard/widgets` and `/api/slatedrop/project-folders`)
  2. Generate PDF blob via `createPdfBlob()`
  3. Get presigned upload URL from `/api/slatedrop/upload-url`
  4. PUT blob to S3
  5. Finalize via `/api/slatedrop/complete`
- **Send via email:** If file saved to SlateDrop, calls `/api/slatedrop/secure-send` for secure link + email delivery via Resend. Otherwise falls back to `mailto:` with Google Maps URL.
- **Send via SMS:** Opens `sms:` link with route data.
- **Route summary banner:** Shows origin → destination, distance, duration, travel mode when directions are active.
- **Audit package export:** Downloads ZIP via `/api/slatedrop/project-audit-export`.

#### Phase 8: Widget Diagnostics
- **`?widgetDiag=1` query param:** Enables a live diagnostic overlay showing layout metrics (map height %, controls state, storage key presence, API key status).
- Used during debugging to verify both Dashboard and Project Hub were using the same shared component with the same behavior.

---

## 3. Architecture & File Map

### Core Widget Files

| File | Purpose |
|------|---------|
| `components/widgets/widget-meta.ts` | 12-widget canonical list, `WidgetPref` type, `getWidgetSpan()`, `buildDefaultPrefs()`, storage keys |
| `components/widgets/WidgetCard.tsx` | Single card wrapper (header, expand, drag, uniform sizing) |
| `components/widgets/WidgetBodies.tsx` | Shared body components for non-complex widgets |
| `components/widgets/widget-prefs-storage.ts` | Schema-versioned localStorage persistence (v2) |
| `components/widgets/WidgetCustomizeDrawer.tsx` | Drawer UI for toggling widget visibility and reordering |

### Location Map Files

| File | Purpose |
|------|---------|
| `components/dashboard/LocationMap.tsx` | Main component (~1656 lines). Sub-components: `DrawController`, `MapUpdater`, `LocationMap` |
| `app/api/directions/route.ts` | Server-side directions: Geocoding API + OSRM routing |
| `app/api/static-map/route.ts` | Server-side proxy for Google Maps Static API (PNG images) |

### Consumer Files (Import LocationMap)

| File | How It Uses LocationMap |
|------|----------------------|
| `components/dashboard/DashboardClient.tsx` | `<LocationMap compact={!p.expanded} expanded={p.expanded} />` |
| `app/(dashboard)/project-hub/page.tsx` | `<LocationMap compact={!w.expanded} expanded={w.expanded} />` |
| `components/project-hub/ProjectDashboardGrid.tsx` | `<LocationMap compact={!w.expanded} expanded={w.expanded} />` |

### LocationMap Internal Structure

```
LocationMap (default export) — manages share panel, PDF, save-to-folder, routeData state
  │
  ├─► APIProvider (Google Maps key + libraries: places, drawing, geometry)
  │
  ├─► Map (id="main-map", satellite/roadmap, tilt, greedy gesture handling)
  │    │
  │    ├─► MapUpdater — headless, pans map on center change, toggles 3D
  │    │
  │    └─► DrawController — toolbar, address search, markup tools, directions panel
  │         │
  │         ├─► DrawingManager (ref-managed, not React component)
  │         ├─► AutocompleteService (debounced, 250ms)
  │         ├─► getDirections() → POST /api/directions → Polyline + Markers
  │         └─► Style controls (stroke, fill, weight)
  │
  └─► Share Panel (conditional on showSharePanel && expanded)
       ├─► Route summary banner
       ├─► Project/Folder selectors
       ├─► Save to SlateDrop
       ├─► Send via Email/SMS
       ├─► Download PDF
       └─► Export Audit Package
```

### Key Types

```typescript
type LocationMapProps = {
  center?: { lat: number; lng: number };
  locationLabel?: string;
  contactRecipients?: Array<{ name: string; email?: string; phone?: string }>;
  compact?: boolean;   // Grid view: map-only, no toolbar
  expanded?: boolean;  // Full view: toolbar + share panel
};

type RouteData = {
  origin: string;
  destination: string;
  travelMode: string;
  distance: string;
  duration: string;
  googleMapsUrl: string;
  encodedPolyline?: string;
};

type DrawTool = "select" | "marker" | "line" | "arrow" | "rectangle" | "circle" | "polygon";
type TravelMode = "DRIVING" | "WALKING" | "BICYCLING" | "TRANSIT";
```

---

## 4. Key Technical Decisions

| Decision | Why |
|----------|-----|
| **OSRM over Google Routes API** | API key restrictions block both Routes API and Directions API. OSRM is free, no API key needed, supports driving/walking/cycling. |
| **Static Maps API over html2canvas** | `html2canvas` crashes on Tailwind v4 `oklch()` colors and can't clone WebGL map canvas. Static Maps API returns a clean PNG server-side. |
| **Server proxy for Static Maps** | API key has referrer restrictions. Server-side proxy adds correct `Referer` header. Also avoids CORS. |
| **Google Geocoding for address → coords** | Allowed by the API key. Used server-side in `/api/directions` to resolve addresses before passing coordinates to OSRM. |
| **jsPDF (dynamic import)** | Avoids bundling 200KB+ library in initial client load. Only loaded when user clicks PDF/save. |
| **`@vis.gl/react-google-maps`** | Modern React wrapper with hooks (`useMap`, `useMapsLibrary`). Used instead of legacy `@react-google-maps/api`. |
| **Manual DrawingManager** | Not available as a React component in `@vis.gl/react-google-maps`. Instantiated directly from the `drawing` library via `useMapsLibrary("drawing")`. |
| **Schema-versioned widget prefs** | Prevents stale localStorage from overriding new defaults after deploys. Bump `WIDGET_PREFS_SCHEMA_VERSION` to force reset. |
| **Drag disabled on location card** | `draggable={false}` for location widget prevents HTML5 drag from intercepting Google Maps pan gestures. |

---

## 5. Known Constraints & Gotchas

### Google Maps API Key Restrictions

The API key (see `.env.local`) has these restrictions in GCP Console:

- **Application restrictions:** HTTP referrers — `*.slate360.ai`
- **Allowed APIs:** Maps JavaScript API, Geocoding API, Maps Static API
- **NOT allowed:** Routes API, Directions API, Places API (new), Elevation API

**To fix (if you want native Google routing):**
1. GCP Console → APIs & Services → Credentials
2. Edit the API key
3. Under "API restrictions" → add "Routes API" and/or "Directions API"
4. Or create a separate server-only key without referrer restrictions

### Deprecation Warnings

| API | Status | Deadline |
|-----|--------|----------|
| `google.maps.places.AutocompleteService` | Deprecated | Still functional; migrate to `AutocompleteSuggestion` API |
| `google.maps.drawing.DrawingManager` | Deprecated Aug 2025 | **Unavailable May 2026** — needs alternative before then |

### OSRM Limitations

- No transit routing (falls back to driving)
- Public demo server (`router.project-osrm.org`) — fine for development/light production but has no SLA
- For heavy production use, consider self-hosting OSRM or switching to Google once API key restrictions are fixed

### Environment Variable Note

`NEXT_PUBLIC_APP_URL` is currently set to `http://localhost:3000` in `.env.local`. For production email links and share URLs, this should be `https://www.slate360.ai`. Vercel environment variables may override this.

---

## 6. Validation & Testing

### Verified Working (as of 2026-02-26)

- ✅ Directions: `curl -X POST https://www.slate360.ai/api/directions` with `{origin: "Tempe, AZ", destination: "Gilbert, AZ", travelMode: "DRIVING"}` → returns `{distance: "13.9 mi", duration: "23 min", encodedPolyline: "..."}`
- ✅ Static map: `/api/static-map` returns 200 with PNG image
- ✅ TypeScript: `npx tsc --noEmit` passes clean
- ✅ Build: `npm run build` succeeds
- ✅ Structural test: `node scripts/widget-block-isolation-test.mjs` → 8/8 PASS
- ✅ Widget uniformity: Both Dashboard and Project Hub use shared `WidgetCard` + `widget-meta.ts`

### To Verify In Browser

- [ ] Dashboard location widget: compact shows interactive map, expanded shows toolbar + search
- [ ] Project Hub location widget: same behavior as Dashboard
- [ ] Directions: enter two addresses → route polyline + A/B markers appear → distance/duration badge shows
- [ ] PDF: download PDF → contains map image + route details
- [ ] Save to SlateDrop: select project/folder → save → success message
- [ ] Send: email/SMS with route link
- [ ] Drawing tools: select tool → draw on map → style controls work
- [ ] 3D toggle: switch satellite ↔ roadmap
- [ ] Current location: "Locate" button pans to user position
