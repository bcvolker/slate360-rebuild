# Phase 1 release checklist — Slice 12A

Evidence is the approved slice tests, the code audit on 2026-09-22, and the commands recorded at the bottom. This file does not approve cutover. Slice 12B has not started.

| Status | Meaning |
|---|---|
| PASS | Checked against current code and a green automated result |
| FAIL | Broken |
| BLOCKED | Cannot ship that claim |
| DEFERRED / NON-BLOCKING | Intentional, or waiting on 12B |

## Product

| Area | Status | Evidence |
|---|---|---|
| Auth | PASS | `lib/vnext/access.ts` sends anonymous users to `/login?redirectTo=`, unapproved users to `/pending-verification`, and non-owners away from `/vnext/ops` with not-found. `e2e/vnext/routes.spec.ts` checks the unauthenticated redirect. Preview routes are outside `app/vnext` and do not satisfy the production page guard |
| Permissions | PASS | Owner writes go through `requireVnextOwner`. Client pages use `requireVnextSession` and project scope. Public shares do not create memberships |
| Client portfolio | PASS | `/vnext/projects`. Scope filters representations. Slice 2 and 7A tests |
| Project Overview | PASS | Authenticated overview and the public adapter. Slice 11 closeout |
| Explore | PASS | Reality, Geometry, 360, Plan, Thermal only when included and renderable. Thermal on the client uses its live share token. Slice 4 and 10 |
| Items | PASS | Authenticated client when Items is included. Absent from anonymous project links |
| Documents / Search | PASS | Authenticated client when Documents is included. Absent from anonymous project links |
| Plans | PASS | Sheet publication. Owner upload remains. Slice 6A |
| History | PASS | Published sources only. Older published source stays after a newer publish. Slice 7 and 10 |
| Compare | PASS | When Compare is included. Thermal side stripped on the public link |
| Saved Views | PASS | Exact source. Public evidence link does not jump to a newer model |
| Presentation | PASS | Owner and client explore. Public share hides save, rename, and delete |
| Owner Home | PASS | `/vnext/ops` needs-attention. Failed jobs respect scope. Slice 9 |
| Clients | PASS | Grouped from `client_name`. Known limitation, not a new defect |
| Projects | PASS | Owner project list and detail. Create is not on this screen |
| Delivery scope | PASS | `project_client_capabilities`. Off means the service is absent |
| Processing | PASS | Read-only board. Retry is not offered |
| QA | PASS | Approve and reject. Notes are service-role only |
| Publish | PASS | Included and approved, per source, nonexclusive. Slice 10 closeout |
| Preview as client | PASS | Authenticated owner simulation. It does not mint a share token |
| Sharing | PASS | Owner create, copy, revoke, expiry. Opens is one browser session |
| Public share security | PASS | Token, project, capability, publication, renderability. Cross-project media denied. Items, Documents, Thermal omitted. Password deferred |
| Mobile | PASS | 390px checks in the vNext Playwright suite. Capture routes were not redirected |
| Accessibility | PASS | Touch targets, labeled share form, Escape on revoke. No redesign in 12A |
| Error states | PASS | Portfolio, overview, explore, items, documents, history, processing, QA, and the public unavailable page have explicit copy |
| Legacy-route cutover | PASS | Approved redirects are in `lib/vnext/cutover.ts` and covered by `lib/vnext/cutover.test.ts` and `e2e/vnext/cutover.spec.ts`. DELETE stays 0. The product is not released until the GitHub full typecheck on the PR is green |
| Known limitations | DEFERRED / NON-BLOCKING | Listed below. Not treated as bugs to close in 12A |

## Engineering

| Area | Status | Evidence |
|---|---|---|
| TypeScript (`npm run typecheck:changed`) | PASS | Exit 0 after the Spark JSX augmentation is imported. No `@ts-ignore` |
| Full `npm run typecheck` | BLOCKED | Not run locally (full `tsc` OOMs). `.github/workflows/typecheck.yml` runs only on a PR or push to `main`. The 12B pull request is that gate. Do not merge while it is red. `next.config.ts` keeps `typescript.ignoreBuildErrors` |
| Production build | PASS | Inside `npm run test:vnext`. Result recorded below after this slice |
| Tests | PASS | `npm run test:vnext`. Result recorded below |
| `guard:architecture` | PASS | Run with this slice |
| `guard:design` | PASS | Run with this slice |
| `guard:file-size-regression` | PASS | Run with this slice |
| Vercel | BLOCKED | Confirmed on the 12B SHA after push. A green Vercel build is not the typecheck gate |
| Supabase migrations | PASS | Six vNext versions applied and recorded. See the inventory |
| RLS | PASS | Reviews and share tokens are not readable by `authenticated` or `anon`. Publish RPCs are service-role |
| Environment | PASS | Names below are already required by current code. None were added |
| Service worker | PASS | `app/sw.ts` deletes caches, claims clients, posts `SLATE360_SW_KILL_RELOAD`, and unregisters. No fetch handler, so it does not intercept vNext navigations |
| Reconstruction | DEFERRED / NON-BLOCKING | Separate workstream. This branch did not change it |

## Environment names

Required by current code. Values were not printed.

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (share links fall back to `https://slate360.ai`)
- `CEO_EMAIL` (owner and approval bypass)
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ENDPOINT` or `CLOUDFLARE_ACCOUNT_ID`, `R2_BUCKET`, `R2_REGION`
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `SLATEDROP_S3_BUCKET` (fallback storage)

No missing name was found for the vNext routes. No new variable was added.

## Pilot

| Step | Status | How Brian does it today |
|---|---|---|
| 1. Create or select a project | LEGACY TOOL REQUIRED | Select in `/vnext/ops/projects`. Create at `/projects/new` or the legacy desktop projects screen |
| 2. Configure included services | PASS | `/vnext/ops/projects/[projectId]` scope editor |
| 3. Upload or use plans | PASS | vNext Documents plan upload when Plans is included |
| 4. Ingest or capture | LEGACY TOOL REQUIRED | Site Walk capture or twin studio |
| 5. See processing | PASS | `/vnext/ops/processing` |
| 6. Review output | PASS | `/vnext/ops/qa` |
| 7. Approve | PASS | QA approve. Reject of a published source is refused until unpublish |
| 8. Preview as client | PASS | Owner client-preview route |
| 9. Publish | PASS | Per source. Publishing another source does not revoke the first |
| 10. Client sees only purchased, published deliverables | PASS on `/vnext/projects` | Login without a deep link resolves to `/vnext/projects` for a client and `/vnext/ops` for the owner |
| 11. Public project or evidence link | PASS | `/vnext/ops/shares` |
| 12. Revoke or unpublish | PASS | Revoke stops the token. Unpublish stops that source only |
| 13. Historical evidence | PASS | History and exact saved views |

## Visibility contract

A client or public recipient sees a source only when access, inclusion, that exact publication, and renderability all hold.

| Surface | Reality | Geometry | 360 | Plans | Thermal |
|---|---|---|---|---|---|
| Authenticated client | Publication row | Separate publication row | Item publication | Sheet publication | Live thermal share, and the capability |
| Public project link | Same, token-scoped media | Same | Same | Same | Absent |
| Evidence link | Exact saved source | Exact saved source, no camera pose | Exact pano, no zoom | Exact sheet | Refused |
| History / Compare | Published only | Published only | Published only | Published only | Client only when included. Public compare drops Thermal |
| Typed URL for a hidden service | Unavailable | Unavailable | Unavailable | Unavailable | Unavailable. No package copy |

Scope profiles A, B, and C are covered by `e2e/vnext/scope.spec.ts`.

## Issues

| Id | Class | Item | 12A action |
|---|---|---|---|
| — | P0 | None in the cutover diff | The release stays blocked until the GitHub typecheck workflow on the PR is green |
| — | P1 | None that should be patched inside this cutover | Do not merge before that workflow and a review of the diff |
| TS-1 | P2 | `typescript.ignoreBuildErrors` is still true | Leave it. Remove it only in a later commit if the full typecheck is clean and production does not rely on ignored errors |
| SW-1 | P3 | Browser confirmation of the kill switch on the 12B deployment | Code already clears caches and unregisters. No service-worker redesign |

## Known limitations

Password on generic project links, public Items and Documents, Thermal on the generic link, Geometry camera pose, 360 zoom, auto-orbit, video export, Drone without a viewer, `client_name` grouping, project creation, Ask for another look, AI, VR, Design mode, viewer Walk/Dollhouse integration, and reconstruction quality. None of these were added in 12B. Viewer salvage is `docs/vnext/VIEWER_SALVAGE.md`.

## Suites not run

| Script | Why |
|---|---|
| `npm run typecheck` | Local full `tsc` OOMs. CI owns it |
| `npm run test:e2e` | Broader than the Phase 1 gate. Includes thermal and other legacy packs |
| `npm run test:e2e:mobile` | Device smoke. Not this audit |
| `smoke:auth-guards`, `verify:release`, `diag:*`, `audit:sitewalk-release` | Live operational probes. Not required to classify routes |
| `market:burst:test`, Stripe triggers | Outside this product surface |

## Gate result

- `npm run typecheck:changed`: exit 0
- `npm run test:vnext`: exit 0. Vitest 45 files / 330 tests. Production build compiled. Playwright 162 passed
- `guard:architecture`, `guard:design`, `guard:file-size-regression`: pass
- Full GitHub `npm run typecheck`: not green yet. Open the PR and wait. Do not call the product released.

Build warnings that do not change this release: Sentry still asks to move `sentry.client.config.ts` to `instrumentation-client.ts` before Turbopack. Serwist still emits `/sw.js`, and that worker unregisters itself. No auth, routing, or share warning was introduced.

Project creation and capture/ingest remain legacy tools. Client delivery and operations are vNext.
