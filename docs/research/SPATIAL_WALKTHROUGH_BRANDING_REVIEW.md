# Spatial Walkthrough — branding design review

Branch: `feature/spatial-branding-polish`  
Base: `feature/spatial-walkthrough`  
Scope: visual design + branding only. Media processing, share-token crypto, database architecture, and Digital Twin were not changed.

## Screenshots

Captured to gitignored `.brand-audit/spatial-walkthrough/` (not committed):

| # | Scene | File |
|---|---|---|
| 01 | Project walkthrough library | `01-library.png` |
| 02 | Viewer clean state | `02-viewer.png` |
| 03 | Waypoint selected | `03-waypoint.png` |
| 04 | Document pin selected | `04-document-pin.png` |
| 05 | PDF drawer | `05-pdf-drawer.png` |
| 06 | Brand editor | `06-brand-editor.png` |
| 07 | Share modal | `07-share-modal.png` |
| 08 | Mobile library | `08-library-mobile.png` |
| 09 | Mobile viewer | `09-viewer-mobile.png` |
| 10 | Mobile pin drawer | `10-pin-drawer-mobile.png` |
| 11 | Mobile timeline | `11-timeline-mobile.png` |
| 12 | Access-code page | `12-access-code.png` |
| — | 1440px contact sheet | `00-montage-1440.png` |

Harness: `/preview/spatial-walkthrough?scene=…` with seeded Harbor Yard data. Recapture: `node scripts/ops/capture-spatial-branding.mjs http://127.0.0.1:3000`.

## Before / after

**Before:** Generic 360 player chrome (PSV navbar + oversized play), diamond-only pins, empty nadir disc, large library cards, theme form without logo/upload/contrast/preview.

**After:**
- Compact branded header (title · project · date) and thumb-reachable bottom chrome; PSV navbar hidden; idle chrome fade.
- Sphere-anchored waypoint chevron vs document diamond vs issue triangle; pitch-based scale; labels on hover/focus/select; glass pin drawer (desktop rail / mobile bottom sheet).
- Nadir patch as a spherical plate: neutral or contractor fill, logo, capture date, optional compass.
- Dense library rows with date/building/floor/zone/type filters and share status.
- Theme editor: hex + picker + recent colors + contrast warnings + SVG/PNG/WebP upload (sanitized display derivative) + suggested palette that never auto-applies.
- Concise empty / loading / processing / unavailable / access-code / buffering states.

## Remaining visual weaknesses

- Preview harness uses a grid sphere, not live equirect video — marker placement is indicative.
- Depth scale is pitch-based, not metric; no true occlusion (by design).
- Nadir logo/date is a spherical marker, so extreme pitch still foreshortens it.
- Contractor logos on dark canvas still need the light/dark/auto treatment verified on-device.
- Share modal in the review pack is a compact overlay, not the live studio share API.
- Library share status is live/unshared/expired/revoked — no per-token policy on the row.

## Files changed

Theme editor: `BrandThemeForm`, `BrandColorField`, `BrandLogoPanel`, `BrandThemePreview`; logo APIs under `app/api/spatial-walkthrough/theme/logo` and `public/[token]/logo`; `sanitize-svg`, `contrast`, `palette`, `logo-url`.

Viewer: `markers`, `marker-scale`, `walkthrough-markers.css`, `walkthrough-chrome.css`, `BrandFrame`, `WalkthroughChrome`, `WalkthroughPlayer`, `WalkthroughExperience`, `PreviewSphere`, `PinDrawer`, `OperatorPatchPanel`.

Library / states: `WalkthroughLibrary`, `library-filter`, `share-status`, `StatusPanel`, `SharePasswordGate`; list GET adds `shareStatus`.

Preview + report: `app/preview/spatial-walkthrough`, `SpatialWalkthroughPreview`, `preview-fixtures`, `scripts/ops/capture-spatial-branding.mjs`.

## Tests

`npx vitest run lib/spatial-walkthrough/branding-ui.test.ts lib/spatial-walkthrough/spatial-walkthrough.test.ts`
