# Slate360 — Widget System Blueprint

**Last Updated:** 2026-03-02
**Context Maintenance:** Update this file whenever widget components, preferences, meta definitions, or rendering behavior changes.

---

## 1. Architecture

All widgets are shared between Dashboard and Project Hub via a single source of truth in `components/widgets/`.

### Core Files
| File | Purpose | Lines |
|---|---|---|
| `components/widgets/widget-meta.ts` | Widget registry: IDs, labels, icons, colors, tier gates, `getWidgetSpan()`, `buildDefaultPrefs()` | 122 |
| `components/widgets/WidgetCard.tsx` | Single card wrapper: uniform chrome, expand/collapse, drag support | 160 |
| `components/widgets/WidgetBodies.tsx` | Shared body renderers for all widgets | 475 (⚠️ extract) |
| `components/widgets/WidgetCustomizeDrawer.tsx` | Widget visibility/order customization | 213 |
| `components/widgets/widget-prefs-storage.ts` | Schema-versioned localStorage persistence | 64 |

---

## 2. Widget Registry (12 Widgets)

| ID | Widget | Tier Gate | Description |
|---|---|---|---|
| `project-cards` | Projects | hub tiers | Project carousel/grid |
| `location` | Location Map | all | Google Maps with satellite, search, routing, drawing |
| `slatedrop` | SlateDrop | all | File explorer preview → link to full UI |
| `usage-credits` | Credit Usage | all | Monthly/purchased credit tracker |
| `activity` | Activity Feed | all | Recent actions log |
| `my-work` | My Work | all | Tasks due, RFIs open, submittals open |
| `analytics-snapshot` | Analytics | business+ | Quick analytics summary |
| `weather` | Weather | all | Weather at project location (Open-Meteo API) |
| `financial` | Financial | business+ | Financial summary |
| `calendar` | Calendar | all | Upcoming dates/milestones |
| `processing-jobs` | Processing Jobs | model+ | GPU job queue status |
| `contacts` | Contacts | all | Team directory |

Additional utility cards:
- `suggest-feature` — Feature suggestion prompt
- `upgrade-card` — Tier upgrade prompt (shown when relevant)
- `continue-working` — Resume recent work

---

## 3. Rendering Rules

### Card Dimensions
- **Unexpanded:** Fixed `h-[320px] min-h-[320px]` — prevents content-driven height variation
- **Expanded:** Full-width with `getWidgetSpan(id, true)` column span
- Grid controlled by `getWidgetSpan(id, expanded)` from `widget-meta.ts`

### Location Widget Special Rules
- `draggable={!expanded && id !== "location"}` — prevents drag from hijacking Google Maps pan
- Compact mode: map-only, no toolbar, fills 320px card
- Expanded mode: slim toolbar at top, map gets `min-h-[70vh]`, controls collapsed by default
- Default: satellite view with 45° tilt (`isThreeD = true`)
- No default pin marker

### SlateDrop Widget
- Default view: `folders` (not file list)
- Compact (Small/default): entitlement-driven **folder icon grid** (canonical root folders)
- Expanded (Medium/Large): embeds `SlateDropClient` in `embedded` mode (full sidebar + main explorer)
- No redundant shell CTA in embedded widget mode; widget opens directly into embedded explorer

---

## 4. Preference Persistence

```typescript
// widget-prefs-storage.ts
const WIDGET_PREFS_SCHEMA_VERSION = 2;

// localStorage keys:
// slate360-dashboard-widgets     — Dashboard preferences
// slate360-hub-widgets           — Project Hub Tier 1 preferences
// slate360-project-widgets-{id}  — Per-project preferences

// Functions:
loadWidgetPrefs(key)     // → WidgetPrefs | null (validates schema version)
saveWidgetPrefs(key, p)  // → void
mergeWidgetPrefs(saved, defaults)  // → merged prefs (adds new widgets, preserves user order)
```

**Schema migration:** When `WIDGET_PREFS_SCHEMA_VERSION` changes, stale preferences are discarded and defaults applied. This prevents old localStorage from overriding new widget layouts after deploys.

---

## 5. Drag & Drop

- HTML5 native drag-and-drop (not `react-grid-layout`)
- Both Dashboard and Project Hub use the same system
- Legacy `react-grid-layout` was removed from Project Hub
- `WidgetCard` includes `draggable` prop and drag handle
- Widget order saved to localStorage after reorder

---

## 6. Widget Data API

```
GET /api/dashboard/widgets
→ {
    projects: Project[],
    usage: { storageUsedGb, creditBalance, creditsUsedThisMonth },
    activity: ActivityEvent[],
    myWork: { tasksDue, rfisOpen, submittalsOpen }
  }
```

Weather data fetched from `https://api.open-meteo.com` (requires CSP `connect-src` allowance).

---

## 7. Location Map Details

Full implementation in `components/dashboard/LocationMap.tsx` (1,568 lines — needs decomposition).

### Features
- Google Maps with satellite (3D) and roadmap (2D) toggle
- Address search with Places Autocomplete (`AutocompleteSuggestion.fetchAutocompleteSuggestions()`)
- Enter-key geocode fallback via Geocoding API
- OSRM routing (not Google Routes — API key restriction)
- Custom drawing tools (Polyline + Polygon, not DrawingManager)
- Zoom controls, current location button
- PDF static map export via `/api/static-map`

### Import Pattern
```typescript
import LocationMap from "@/components/dashboard/LocationMap";
// Pass: expanded, lat, lng, onLocationChange
```

---

## 8. Credit Widgets

### Usage Tracker
- Shows monthly allocation vs used
- Shows purchased balance
- Monthly credits consumed first, then purchased (server-side via `consume_credits` RPC)

### Subtle Credit Purchase
- Only appears when credits ≤ 20% remaining
- Never a prominent modal — always subtle inline prompt
- `SubtleCreditPurchase` component pattern

---

## 9. Context Maintenance Checklist

When making widget changes, update this file if:
- [ ] Widgets are added, removed, or renamed
- [ ] Widget registry (`widget-meta.ts`) changes
- [ ] Card rendering dimensions change
- [ ] Preference persistence schema or keys change
- [ ] Location map features change
- [ ] Widget data API shape changes
- [ ] Drag/drop behavior changes
