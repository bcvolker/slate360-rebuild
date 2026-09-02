# Monday spatial release — integration map

Date: 2026-09-01  
Working copy: `C:/s360`  
Decision: **one branch** `feature/monday-spatial-release-v1` based on Twin appearance fidelity, then **targeted Walkthrough player wiring** from RC2. No wholesale merge. No `main` merge.

## Base

| | |
|---|---|
| **BASE_BRANCH** | `feature/twin-appearance-fidelity-v1` |
| **BASE_SHA** | `0392bee1c7627f841f98c3dc99a184e4c11a6c39` |
| Why | Kitchen Reality + Geometry/nav already work here. Spatial Walkthrough through RC1 + live-smoke + branding + audio/items **code** is already in this history (`45ff4343` merge-base with RC2). Production `main` (`ff0462a1`) would discard that stack. |

## Inventory

| Feature | Branch | Commit | Files (summary) | Deps | Cherry-pick? | Conflict | Decision |
|---|---|---|---|---|---|---|---|
| Walkthrough schema + player | `feature/spatial-walkthrough` | `b4690e02` | `lib/spatial-walkthrough/*`, `app/w`, ingest | none | already in base | n/a | **INCLUDE** (ancestor) |
| Branding chrome | `feature/spatial-branding-polish` | `ba9ae8dd` | `BrandFrame`, theme, markers | walkthrough | already in base | n/a | **INCLUDE** (ancestor) |
| Live HouseWalk ingest | `feature/spatial-live-smoke` | `dbc57910` | upload session, 4K proxy | walkthrough | already in base | n/a | **INCLUDE** (ancestor) |
| Chapters / edges | RC1 `45ff4343` | same | `chapters.ts`, `ChapterWalkthroughExperience` | walkthrough | already in base | n/a | **INCLUDE** |
| Poster-until-playing | RC1 `b31fa6a3` | ancestor of RC1 | `PosterStage`, `WalkthroughExperience` | player | already in base | n/a | **INCLUDE** — still fix 0-height PSV |
| Nav HUD / next chapter | `feature/spatial-navigation-hud` | `b4cec64b` | `ClipEdgeActions`, `NextChapterControl`, path HUD | RC1 | files already on fidelity; **share client not wired** | low | **INCLUDE** by wiring `WalkthroughShareClient` → `ChapterWalkthroughExperience` |
| RC2 player + PUBLIC bake | `feature/spatial-walkthrough-rc2` | `44934788` | share client, privacy bake workers | nav+editor | **do not merge** (drops audio/items) | **high** | **INCLUDE player wiring + signed media**; **DEFER** Modal bake worker RAM/mask raster commits |
| Editor timeline | `feature/spatial-walkthrough-editor` | `5645dbdf` | studio timeline, keyframes | RC1 | skip merge | high | **DEFER** (authoring not Monday client demo) |
| Audio / transcripts | `feature/spatial-walkthrough-audio` | `e6855f3c` | audio layer | tables **not in prod** | already in base as code | n/a | **DEFER live** (keep code; no prod audio tables) |
| Project items | `feature/spatial-project-items` | `d75a7b81` | items APIs | migration **not in prod** | already in fidelity history | n/a | **DEFER live**; keep pin drawer on `spatial_pins` |
| Temporal compare | `feature/spatial-temporal-compare` | `820333c1` | locators | items | skip | med | **DEFER** |
| Portal UX | `feature/spatial-portal-ux` | `9dc23436` | dashboard/portal | other agent | skip | high | **DEFER** (parallel agent) |
| Twin metric processor | `feature/twin-metric-processor-v1` | `2260d07a` | worker, job type | iPhone capture | ancestor of fidelity | n/a | **INCLUDE** (already) |
| Twin kitchen shell | `feature/twin-viewer-unblock-v2` | `deddebf5` | quiet chrome | metric GLBs | ancestor of fidelity | n/a | **INCLUDE** (already) — **do not ship this URL** |
| Twin appearance | `feature/twin-appearance-fidelity-v1` | `0392bee1` | native Brush + SIM3 transform | unblock | **this is the base** | n/a | **INCLUDE** |
| Twin web-delivery-qa | `feature/twin-web-delivery-qa` | `75e0d3de` | geometry-first staging | kitchen | **not** ancestor of fidelity | med | **DEFER as branch**; re-implement signed R2 here |
| Twin forensics | `feature/twin-appearance-quality-forensics` | `ab3ec3d1` | diagnostics | n/a | skip | n/a | **DEFER** |
| Capture traj | `feature/twin-capture-preservation` | `d75a7b81` | lidar_traj | iOS | skip | n/a | **DEFER** (not Monday viewer) |

## Required Twin commits (already on base)

Geometry display / nav / measurement GLBs, native Brush `appearance-web.spz`, SIM3 as Spark transform, geometry-first kitchen shell: `2260d07a` → `2bfd4121` → `deddebf5` → `0392bee1`.

## This release will add (not cherry-pick dumps)

1. Walkthrough: fill-stage PSV, first-click play, signed R2 media URLs, chapter share client.
2. Twin: signed R2 binaries (no Vercel 22–30 MB proxy), hero spatial fallback (not floor_slice), progressive load machine, Reality|Geometry switch, hybrid 12% overlay.

## Do not merge

- `main`
- Whole RC2 (deletes audio/items from fidelity)
- Portal UX
- Temporal compare
- Google / Journey
