# PR-0: land `feature/aob205-spatial-experience-v3` on `main`: merge notes

Date: 2026-09-30. Base `main` a7b1c66c, branch 302917d6 (67 ahead, 55 behind, merge-base ff0462a1).
Purpose: put the spatial walkthrough / client portal / AOB205 client-experience stack on `main`. This is the prerequisite for every Directed Tour PR (see `docs/design/DIRECTED_TOUR_BUILD_PLAN.md`).

## 1. Homepage

The light homepage auto-merged. `app/(public)/page.tsx` and every `home-*-light` component are **identical to main**. The branch's older dark marketing page does not come back.

## 2. Conflicts and how each was resolved

Rule applied: **main owns Twin 360 native capture and the production splat viewers.** Main has been shipping them directly (Twin 360 redesign, LiDAR voxel re-binning, 12 MP stills, Spark LOD). The branch owns the spatial walkthrough, the portal, and client-experience.

| File | Resolution |
|---|---|
| `ios/**` (all of it) | **Exactly main.** The branch's native capture-preservation feature is **not landed** (d75a7b81 "Preserve iPhone ARKit trajectory as a streaming master…": `CaptureDataPreservation.swift`, `CaptureTrajectoryWriter.swift`, plugin, pbxproj, `TwinARKitCaptureViewController`, `TwinUploadSession`, `TwinUploader`). It rewrites the same capture loop main rewrote since (RGB voxels, 3M cap with coarsening, stills walks). A hand merge without device testing risks TestFlight capture. It stays on the branch and needs a separate port onto main's controller, with its own TestFlight build. The TS bridge only gains optional manifest fields, so it's harmless with main's native side. |
| `app/digital-twin/(shell)/twins/page.tsx` | main (redirect to projects; the redesign removed this list). The branch side was the same "Continue upload" commit main already has (a7b1c66c = 302917d6). |
| `splat-viewer-constants.ts`, `splat-viewer-scene.tsx` | main (memory-cap plus Spark LOD policy from 02207cec). |
| `MeshSplatLayer.tsx` | main, **plus** optional `worldMatrix` / `sparkPiFlip` / `lodSplatCount` / `onReady` props so the branch's kitchen-proof preview (`KitchenAppearanceLayer`) still works. Default behaviour is unchanged for main's callers. |
| `splat-viewer-core.tsx` and `splat-viewer-loading-overlay.tsx` | main, **plus** a `quiet` prop (spinner only, no byte counts or cap notice), used by the AOB205 `TwinExperience`. |
| `hooks/useWalkthroughNavigation.ts` | main, **plus** `goToStationId` (used by `useKitchenProofShell`). |
| `lib/digital-twin/spark-appearance-load.test.ts` | Narrowed to its own module. It asserted the branch's "never downsample" policy against main's production viewer files, which this merge deliberately keeps. |

## 3. Bugs found and fixed during the merge (all pre-existing on the branch)

- `app/(dashboard)/digital-twins/page.tsx` and `app/(dashboard)/site-walks/page.tsx` called `resolveServerOrgContext()` with its import replaced by `requireClientAppPage`. That's a runtime `ReferenceError`: both dashboard pages would 500. The import was restored.
- `components/spatial-walkthrough/studio/WalkthroughStudio.tsx` was 309 lines and failed `guard:file-size-regression`. Payload types and `ruleFrom` were moved to `studio-payload.ts` (now 277 lines).
- `lib/spatial-walkthrough/{commercial-v2-lock,media-delivery}.test.ts` failed on the branch. The regex was stale after operator-policy made `restrictView` conditional on a narrow operator patch. The regex now asserts the intent: the lock still applies to every client view.
- `ShareRow` type was missing `chapter_id`. Runtime already had it via `select("*")`.

## 4. Prod database: MUST apply before merging

Read-only check against prod (`slate360-prod`) on 2026-09-30:

| Migration | Prod state | Code that reads it |
|---|---|---|
| `20260830100000_spatial_audio_narration` | **partial**: `spatial_audio_assets` exists; `spatial_narration_segments`, `spatial_voice_notes`, `spatial_transcripts`, `spatial_walkthrough_events` missing | `api/spatial-walkthrough/[id]` GET (the studio loads these), narration, transcripts, voice-notes routes, `audio-store.ts` |
| `20260830140000_spatial_compare_anchors` (UTF-16 file) | **missing** | none (scaffold) |
| `20260902120000_spatial_derivative_posters` | **missing** (`client_poster_key`, `public_poster_key`, `poster_meta`) | `clip-media.ts`, `derivatives.ts`, `job-callback.ts`, `dashboard/resolve-project-thumbs.ts` |
| everything else spatial (walkthroughs, clips, chapters, items, documents, project shares, notification events, public proxy, token hash, redaction keyframes, `org_feature_flags.standalone_spatial_walkthrough`) | present | — |

`docs/ops/PR0_MISSING_SPATIAL_MIGRATIONS.sql` bundles the three files (UTF-8). Every statement is idempotent. The only constraint change re-adds `spatial_pins_pin_type_check` widened by `'voice'`; prod pin types in use are `document, note, photo, rfi`, all still allowed.

## 5. Gates on the merge tree

- `guard:architecture` ✅
- `guard:file-size-regression` ✅
- `guard:design` ✅
- Vitest (`lib/spatial-walkthrough`, `lib/spatial-experience`, `lib/client-experience`, `lib/digital-twin`, `components`) ✅: 42 files, 270 tests.
  - Repo-wide `vitest run` also picks up 26 Playwright `e2e/*.spec.ts` files, which fail to load under Vitest. That's pre-existing and unrelated.
- Scoped `tsc` over the 387 merge-changed TS files: the remaining errors are type-only and pre-existing on the branch. The splat files also error because scoped mode doesn't include the global `sparkRenderer`/`splatMesh` JSX declarations. Details:
  - PSV typings in `WalkthroughPlayer`
  - `Buffer` as `BodyInit` in the media route
  - `s360-world` literal types
  - `useKitchenGlb`
  - `viewer-visible-range` nullability
  - `WalkthroughExperience:210`

  `ignoreBuildErrors` is on; none of these change runtime behaviour.
- `npm run build`: see the PR description.

## 6. Not in this PR

- Native capture preservation / trajectory master (above).
- Trigger.dev / Modal redeploys. The branch adds `src/trigger/twin-metric-processor.ts` and `workers/modal/twin-metric-processor/`. Deploy them only after merge, from `main`.
