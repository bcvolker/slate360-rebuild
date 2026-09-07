# AOB205 Client Experience — UX sprint V3 handoff

Branch: `feature/aob205-ux-polish-v3` (worktree `C:\s360-ux`), based on Cursor's
`feature/aob205-spatial-experience-v3` @ `fd7b41b9`.
Harness: `/preview/aob205/*` with `?state=A|B|C|D|E` and `?brand=slate|client|whitelabel`.
Screenshots: `docs/ops/aob205-client-ux-v3/{desktop,mobile,tablet}`.
Capture: `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3100 node scripts/ops/capture-aob205-client-ux.mjs`
(headed Chromium; `PROFILES=` and `ONLY=` filters).

## Contracts used (Cursor's, not duplicated)

| Contract | Where it drives UX |
|---|---|
| `resolveProjectCapabilities` / `visiblePortalNav` / `visibleRealityTiles` | `lib/client-experience/layout.ts` → nav, hero actions, Reality tiles, overview sections. Twin appears only when `qaStatus === accepted && humanReviewAccepted`. |
| `resolveProjectBrand` / `brandInitials` / `brandMarkAlt` | `BrandSlot.tsx`; accent via `safeAccent()` → `--ce-brand-accent` on the experience root. |
| `tapAdvance` | `WalkViewer.tsx` click handler: lower-scene click → next anchor in a 55° cone along the recorded path. |
| `AOB205_KNOWN_SEGMENTS` | `aob205-variants.ts` maps the 129.2–130 s break onto the proxy; `PlanCanvas` draws one polyline per segment; the HUD only cues anchors in the current segment. |
| `QUESTION_COPY` / `questionTitle` | `AskQuestion.tsx`, `useProjectItems.ts`. |
| `SpatialLocator` shapes | `SpatialRef` in `types.ts` mirrors plan/walkthrough/station/twin locators (geospatial not surfaced). |
| Media variants | `Station.thumbUrl` (small) vs `Station.imageUrl` (sharp). The filmstrip never loads the ERP source. |

Layout state fixtures follow `layoutStateGates` semantics: A walk-only, B 360-only,
C walk + 360, D walk + **simulated** accepted twin, E rich AOB205 (real twin gate =
candidate → hidden).

## What changed in V3

- **Brand slot** replaces the "AW" chip. Paid default = small Slate360 mark + client logo/name; no client → Slate360; white-label → client only, "Powered by Slate360" in the More menu / share sheet. Initials only for a named client, with `aria-label`.
- **Typography**: sans for all UI; `.ce-code` (mono) reserved for sheet numbers, timestamps, station counts.
- **Adaptive overview**: sections render only with content; hero actions only for live assets (1–3, reflowed).
- **Explore / Play**: Explore default (paused sphere, move ring + tap-to-move); Play follows the route at 1×/1.5×/2× with free look. Crossfade on discontinuous seeks.
- **Path HUD**: 3–4 chevrons beyond the move ring, rising toward the horizon, yaw following plan heading. Desktop/tablet on @ 0.28, phones off. Persisted in `sw-path-visible` / `sw-path-opacity` (same keys as `useWalkthroughNav`).
- **High-res 360 in walkthrough**: chip appears within ±4 s of a mapped station; opens the station with `from=walk&t&yaw&pitch`; the station header offers "Back to walkthrough" restoring t/yaw/pitch.
- **Panels**: desktop side panel / mobile bottom sheet with tabs Plan · Spaces · Items [n] · More (walk) and Plan · Stations [n] · Items [n] · More (360). Share in the header (desktop) or More (mobile).
- **References index** inside Items: Items / Questions / Documents, scope All project / Nearby (honest ±6 s or same-station).
- **Ask a Question**: location attached automatically, one field, "Send question", thread appears as a `question` item.
- **Item panel**: type/status → title → clamped summary → Locations with a single "View" action → Attachments → Conversation → collapsible Activity.
- **Plan**: thinner accent path with segment breaks, refined station/item/you markers, compact layer control (Path · Stations · Items · You) instead of a legend bar.
- **Twin chrome (simulated only)**: Walk · Orbit · Fly · Overview · Top with text + icon; mobile Mode sheet + Tools; Reset under More. `quiet` prop keeps byte counts / point caps off client surfaces.

## Backend dependencies (Cursor)

- Registered station↔walk times (`Station.t`) and plan positions — currently authored.
- Question persistence (`spatial_project_items` etc.), replies, resolve, notifications deep links (`questionDeepLink`).
- Media variant URLs per station (`thumb/preview/standard/full`) and walk proxies (`low/standard/high`).
- Plan raster + `rasterReady` from the plan set; PDF-only plans stay documents.
- Real trajectory → `deriveClientPath` anchors with `segmentId`; the HUD/plan already honour segments.
- Share token minting and branding snapshot for real portal tokens.
- Twin `xyz` camera targeting when a public camera-to-point API exists on the splat core.

## Not merged / not for merge yet

- `public/preview/aob205/client-logo.svg` is a fictional contractor mark for the branded fixture only.
- `walk-proxy.mp4` remains local-only (gitignored).
- Twin "Fly" is a labelled mode over orbit controls; true free-flight needs a core camera mode.
