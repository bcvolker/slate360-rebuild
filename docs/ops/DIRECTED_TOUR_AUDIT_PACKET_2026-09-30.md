# Directed Tour: audit packet (checkpoint before visit 2)

Date: 2026-09-30. Scope: build-order steps 1–4 of the approved plan (`docs/design/DIRECTED_TOUR_BUILD_PLAN.md` v2).
**Stopped at step 5 ("Stop for Brian")**, as instructed. PR-C2 and later need two real published visits.

## PRs (all open; merge in this order)

| PR | Branch → base | What | State |
|---|---|---|---|
| [#40](https://github.com/bcvolker/slate360-rebuild/pull/40) PR-A | `fix/homepage-additional-services` → `main` | Thermal and systems lines become one quiet "Additional services" block | Ready |
| [#41](https://github.com/bcvolker/slate360-rebuild/pull/41) PR-0 | `merge/aob205-into-main` → `main` | AOB205 spatial stack lands on main | Draft: Brian to confirm the native-capture decision |
| [#42](https://github.com/bcvolker/slate360-rebuild/pull/42) PR-B | `feat/tour-b-packaging` → PR-0 | Per-project deliverable packages; fail-closed portal | Draft |
| [#43](https://github.com/bcvolker/slate360-rebuild/pull/43) PR-C1 | `feat/tour-c1-routes` → PR-B | Routes, checkpoints, per-visit marks, stills, publish checklist, capture card | Draft |

**CI note:** `typecheck` and `release-gates` also fail on `main`'s latest runs (a7b1c66c, 9da67840).
- `typecheck` is the known whole-repo `tsc` pathology (CLAUDE.md).
- `release-gates` blocks on the open critical registry bug BUG-079 (Plan Viewer + capture on mobile).

Neither failure is caused by these PRs. The local gates (scoped `tsc`, three guards, Vitest, `next build`) are what each PR reports.

## Production changes made (all additive or isolated)

| Change | Where | Notes |
|---|---|---|
| Missing spatial migrations applied | Supabase prod | audio narration (4 tables), compare anchors, derivative poster columns. Nothing on main read them; the PR-0 code needs them. |
| `20260930120000_spatial_portal_packages` | Supabase prod | Package table, share `deliverables`/`audience`/`purpose`, document `visibility`, `org_feature_flags.spatial_directed_tour` (default **off**). Backfilled 2 packages (AOB205, HouseWalk). |
| `20260930140000_spatial_tour_routes` | Supabase prod | Route, chapter, checkpoint and mark tables, plus visit columns |
| Modal app `slate360-spatial-stills` | Modal | New, isolated; the endpoint requires `x-worker-secret` |
| Trigger version `20260930.1` | Trigger.dev prod | 14 tasks = main's tasks **unchanged** + spatial ingest + metric processor (from the AOB205 branch) + `spatial-tour.checkpoint-still` |
| `MODAL_SPATIAL_STILLS_ENDPOINT` | local `.env.local` (synced to Trigger at deploy) | Not a secret |

**Test data cleaned up.** Every verification token was revoked (0 live preview tokens), the self-test route was deleted (0 routes and 0 marks in prod), the AOB205 package was restored to its backfill value, and the org flag was set back to **off**.

## Verified vs. not yet verifiable

| Plan case | Status | Evidence |
|---|---|---|
| V1: Tour not packaged → no chrome | Mechanism green (PR-B) | Live AOB205 runs: disabled deliverables are absent from nav, tiles, deep links (307) and API (404). The render test is `portal-gating.test.tsx`. |
| V2: one published visit, no dead Before/After | Not yet (client viewer is C2) | — |
| V3–V6, V14: two-visit compare, speeds, gaps, phone seek | **Blocked on visit 2** | Prod has exactly one processed clip (HouseWalk fixture). **The AOB205 DB walkthrough has 0 clips**; its video lives only in the `/preview/aob205` harness. |
| V7: unauthorized evidence | Partial | Packaging denies Documents and Items when not packaged. Audience filtering is PR-F. |
| V10: unpublish removes the visit | Operator side green | The publish lock and unpublish are exercised in the C1 harness. The client side is C2. |
| V13: regression | Green so far | Homepage and iOS byte-identical to main in PR-0; legacy portal behaviour holds with the flag off; Room 213 branches untouched |
| Stills pipeline | Green (real) | Trigger run `COMPLETED`; the mark went to `ready`; 3840×1920 equirect from the operator-free proxy |

## Craft evidence folders (labelled by audience)
- **PUBLIC:** `docs/qa/pr-a-additional-services/` (375, 768, desktop)
- **OPERATOR PREVIEW of the client portal, current Graphite theme, placeholder AOB205 data:** `docs/qa/operator-preview-pr-b/`
  - Proves packaging behaviour, not the final client look. The portal goes light before C2.
- **OPERATOR TOOLING, harness with a mocked API; not a client deliverable and not pilot acceptance:** `docs/qa/operator-harness-pr-c1/`
- **No client Tour screenshots exist yet.** The client Tour viewer (C2) is not built.

## Update: Scout craft audit response (C1.1, same day)
- **Theme: Brian chose B, a light client portal.** Scope: `docs/design/LIGHT_CLIENT_PORTAL_SCOPE.md` (slices L1–L5). C2 is built light, after L1–L3. The operator dashboard stays Graphite.
- **Pilot:** AOB205, as a **placeholder only** (Brian: the existing video isn't a directed walk; replace it when a real candidate exists).
  - Visit 1's video was ingested through the real pipeline (upload → Trigger → Modal ingest → privacy bake). AOB205 now has one ready clip (45 s proxy) with an operator-free public derivative.
  - **Two-visit acceptance is still blocked:** there is no second real capture.
  - AOB205's saved operator mask blacks out **everything below the horizon** (pitch −88°…+4°). Brian decides whether to narrow it; the publish checklist's privacy review is where it gets confirmed.
- **Demo data:** the AOB205 pin "west wall coordination" (demo body text) is set to `internal`. That's reversible, and nothing was deleted. The client portal no longer shows it or its three attached documents.
- **Copy for Brian:** `docs/ops/DIRECTED_TOUR_COPY_REVIEW.md`

## Pre-existing problems found and fixed along the way
- `/digital-twins` and `/site-walks` dashboard pages threw a ReferenceError (a lost import) on the AOB205 branch.
- The portal History rail leaked unpublished walks, pointed every visit at one walk, and 404'd posters.
- The portal Plan tab was a placeholder page. The item page showed "not on this visit" boxes. Document cards reused the walkthrough poster as a fake thumbnail.
- AOB205's portal "Open Walkthrough" button opened an empty player (no clip).
- Vitest collected 26 Playwright specs and failed on them. It now excludes `e2e/` and can render TSX.

## Known gaps / next phase
- **C2 client viewer**: current visit default, timeline, checkpoint A/B, moment and latest links.
- PR-D and PR-E (evidence, progress, issues).
- PR-F (scoped share, audience preview).
- The Trigger CLI must be pinned to the SDK version (`npx trigger.dev@4.4.6 deploy`); `@latest` aborts on the version mismatch.
- The AOB205 pin "west wall coordination" has demo body text in the DB.
- Native capture-preservation work from the AOB205 branch is not on main and needs its own port and TestFlight build.

## What Brian does next
1. Review and merge in order: #40, then #41, #42 and #43 (or say which to hold).
2. Turn on `spatial_directed_tour` for the Slate360 org.
3. Choose the Tour project:
   - **AOB205:** upload visit 1's 360 video through the walkthrough upload, and run the privacy bake.
   - Otherwise use the first Punch Twin pilot.
4. Project → Spatial Walkthroughs → **Directed Tour**: create the route, add checkpoints, mark visit 1.
5. Print the capture card, shoot visit 2 on the same route, upload it, then mark and publish both visits.
6. Tell Claude. PR-C2 starts on two real published visits.
