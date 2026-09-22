# Slate360 Phase 1 — Implementation Status

**Last updated:** 2026-09-22  
**Current slice:** 9 (Owner Home / Clients / Projects) — implemented, awaiting approval  
**Next slice:** 10 (Processing / QA / Publish) — **NOT STARTED**

Canonical plan: `docs/vnext/SLATE360_UI_PHASE1_MASTER_BUILD_PLAN.md`  
Slice prompts: `docs/vnext/SLATE360_UI_PHASE1_CURSOR_SLICE_PROMPTS.md`  
Review protocol: `docs/vnext/SLATE360_UI_PHASE1_REVIEW_PROTOCOL.md`

---

## Environment

| Item | Value |
|---|---|
| Worktree | `C:\s360-ui-vnext` |
| Branch | `feature/ui-vnext-phase1` |
| Remote | `origin/feature/ui-vnext-phase1` (exists; implementation branch tracks this remote) |
| Slice 0 baseline | `a7b1c66c0871c4e41adb89d0d58dab86183a9665` (`origin/main` at branch creation) |
| Slice 0 audit commit | `0d425cb3b579fe4757a1fc4d4883804fc8fc4090` |
| Isolation | Did not use or overwrite `C:\s360`, reconstruction worktrees, or `C:\s360-dashboard-portal` |
| Older UI branch | `origin/feature/ui-phase-1` inspected only; already contained in `main`; not adopted |

The feature branch is **pushed**. It is not an unpushed `origin/main` clone.

---

## Slice status

| Slice | Name | Status |
|---|---|---|
| 0 | Repo audit + salvage map + route contract | **APPROVED** |
| 1 | vNext foundation + shells | **APPROVED** |
| 2 | Client project portfolio | **APPROVED** |
| 3 | Client project overview | **APPROVED** |
| 4 | Unified Explore viewer | **APPROVED** |
| 5 | Items + spatial linking | **APPROVED** |
| 6 | Documents + project search | **APPROVED** |
| 6A | Project plans foundation | **APPROVED** |
| 7 | History + Compare | **APPROVED** |
| 7A | Client deliverable scope + visibility | **APPROVED** |
| 8 | Presentation / saved views / evidence links | **APPROVED** |
| 9 | Owner Home + Clients + Projects | **IMPLEMENTED — awaiting approval** |
| 10 | Processing + QA & Publish | **NOT STARTED** |
| 11 | Sharing + permissions + polish | Not started |
| 12 | Cutover + cleanup | Not started |

---

## Slice 0 deliverables

| File | Role |
|---|---|
| `docs/vnext/ROUTE_AND_COMPONENT_SALVAGE_MAP.md` | Full forensic audit, salvage classes, route trees, redirect strategy |
| `docs/vnext/PHASE1_IMPLEMENTATION_STATUS.md` | This status + Slice 0 handoff + approved decisions |
| `docs/vnext/SLATE360_UI_PHASE1_MASTER_BUILD_PLAN.md` | Canonical plan copied into repo (was only in Downloads) |
| `docs/vnext/SLATE360_UI_PHASE1_CURSOR_SLICE_PROMPTS.md` | Slice prompt pack |
| `docs/vnext/SLATE360_UI_PHASE1_REVIEW_PROTOCOL.md` | Approval protocol |
| `docs/vnext/SLATE360_UI_PHASE1_HANDOFF_PROMPT.md` | Supervisor handoff prompt (reference) |

---

## Slice 0 tests / screenshots

| Gate | Result |
|---|---|
| User-facing UI changes | None |
| Route / redirect / middleware changes | None |
| Reconstruction / trainer / Modal / Trigger changes | None |
| Deletions | None |
| Typecheck / production build | Not required (docs only) |
| Screenshots | N/A — no UI slice |
| Runtime click-through of 164 routes | Not performed; implementation-traced. Residual items marked **NEEDS VERIFICATION** in the salvage map |

---

## Highest-priority findings (summary)

1. Live product is still a **SaaS app marketplace**. Phase 1 is a **service-operated project record**. Do not preserve current nav/IA.
2. `/dashboard` is a **customizable widget board**. `/app` is an **app launcher with upsells**. Both are forbidden patterns.
3. `/portal/[token]` validates tokens then shows a **confirmation card**, not a project. Real deliverable viewing is `/view/[token]`; real twin viewing is `/share/twin/[token]`.
4. The closest existing client portal IA lives on **OTHER-BRANCH** `feature/aob205-spatial-experience-v3` (`components/client-experience/*`, richer `/portal/[token]/*`). It is **not** on this baseline.
5. CEO desktop **Tours** is linked in nav but **middleware blocks `/tours*` to `/app`**, including logged-in public tour views.
6. Device middleware swaps **exact** `/dashboard` ↔ `/app` only. That **does** mislead testing of current production homes. It does **not** affect `/vnext/*` or `/preview/vnext/*`. No Slice 1 middleware exemption is required.
7. “Client” is not a tenant. Tenants are `organizations`. Customers are `org_contacts` / `projects.client_*` / collaborators / share tokens.
8. Mature engines to reuse: Spark splat, hybrid mesh, Photo Sphere, Leaflet plans, thermal probe/share, twin share annotate, cinematic keyframes, progression compare + camera sync.
9. No first-class Visit or Drone viewer table. History/Explore must **adapt** existing session/capture/model rows.
10. `digital_twin_viewpoints` is schema-only — presentation saved-views need UI later (Slice 8), not a video editor.

---

## Salvage summary (significant areas)

| Class | Approx. count |
|---|---|
| KEEP BACKEND | ~40 |
| KEEP + HARDEN | ~18 |
| REBUILD FRONT END | ~25 |
| DEFER / HIDE | ~30 |
| RETIRE AFTER CUTOVER | ~20 |

See salvage map §14 for the lists.

---

## Proposed parallel implementation (locked after Slice 0)

Production routes stay live until cutover.

- Client/owner vNext: `/vnext/...`
- Owner/internal prefix: `/vnext/ops`
- Visual harnesses: `/preview/vnext/...`
- Cutover + legacy redirects: Slice 12 only

Do not restyle `DashboardDesktopShell` in place.

---

## Approved Decisions After Slice 0

Locked unless Brian explicitly changes them.

### A. Baseline / spatial branch

Continue Phase 1 from the current `origin/main` baseline through `feature/ui-vnext-phase1`.

Do **not** merge or cherry-pick `feature/aob205-spatial-experience-v3` during Slice 1.

Its useful contracts/components may be selectively evaluated in later relevant slices.

Do not import reconstruction work with them.

### B. Client authentication

Do not invent a new client identity or tenant system in Slice 1.

For authenticated vNext surfaces, reuse existing:

* Supabase authentication
* organization/project membership
* existing project-access logic

Public token sharing remains a separate external-access mechanism.

The token portal is **not a replacement for the authenticated project portfolio** required by the Phase 1 plan.

No identity/database migration in Slice 1.

### C. Visit model

Do not create a new `visits` database table during Phase 1 foundation work.

Use an adapter/normalization layer over existing visit-like records such as:

* Site Walk sessions
* Twin captures/models
* thermal sessions
* other approved capture records

A future unified persisted Visit entity can be evaluated later.

### D. Parallel route architecture

Approved:

* `/vnext/*` for parallel Phase 1 implementation
* `/preview/vnext/*` for controlled fixtures/visual review

Production routes remain intact until cutover.

### E. Owner namespace

Approved owner/internal prefix:

`/vnext/ops`

Do not reuse the old `/operations-console` implementation as the new design baseline.

### F. Dynamic representations

Explore representations remain:

* Reality
* Geometry
* 360
* Plan
* Drone
* Thermal

A representation must appear **only when real renderable project data exists**.

Do not show placeholder or Coming Soon representation tabs.

For Drone specifically, the audit found no mature orthomosaic/map viewer. Do not invent one or expose a dead Drone tab merely to satisfy the label list. Later slices may use a legitimate published drone representation if an existing viewer can actually display it.

### G. 360 normalization

Do not select one existing 360 table/product as the universal source of truth during Slice 1.

Later Explore work should normalize supported 360 sources behind an adapter.

Do not expose Tours as a client product.

### H. Billing

Billing, subscriptions, plans, seats, upgrade prompts, and app entitlements remain completely absent from the vNext primary navigation.

This applies to both client and owner vNext navigation.

Existing backend billing/entitlement code remains untouched unless explicitly required elsewhere.

### I. Middleware

No Slice 1 middleware edit is approved.

`middleware.ts` redirects mobile only when `pathname === "/dashboard"` and desktop only when `pathname === "/app"`. `resolveMobileLegacyRedirect()` does not match `/vnext` or `/preview/vnext`.

Current production `/dashboard` and `/app` testing **is** affected by that exact-path device fork.

The new `/vnext/*` and `/preview/vnext/*` trees are **not** affected.

No middleware exemption is required for Slice 1. Do not modify `middleware.ts` merely to support `/vnext`.

Verify responsive behavior directly on vNext instead of changing middleware preemptively.

Middleware remains untouched unless a later route/auth requirement demonstrates a real need.

### J. Entitlements

Keep existing entitlement/server systems intact.

Do not add:

* app upsells
* upgrade prompts
* locked product tiles
* subscription messaging

to vNext.

### K. Public portal cutover

Do not replace production `/portal/[token]` during early foundation slices.

Build/test the future experience in the vNext/preview environment first.

Production token-host cutover belongs in the later sharing/cutover work after the replacement is validated.

Existing `/view/[token]`, `/share/twin/[token]`, `/share/[token]`, and other live token URLs must remain stable.

### L. Branch isolation

Do not merge wholesale:

* `feature/ui-phase-1`
* `feature/dashboard-portal-alignment-2026-09`
* `feature/aob205-spatial-experience-v3`

Selective salvage later requires explicit relevance and review.

---

## Safety confirmation (Slice 0)

- Slice 0 documentation only; see git history through `595d1fc5`.

---

## Slice 1 notes

Authenticated vNext lives under `/vnext/*` (session + beta). Owner `/vnext/ops/*` additionally requires `canAccessOperationsConsole` (**CEO / `isSlateCeo` today** — staff is not broadened). Visual fixtures live under `/preview/vnext/*` and are not the authorization model.

Design rules: `docs/vnext/UI_DESIGN_RULES.md`.  
Entity / settings inventory: `docs/vnext/ENTITY_ACTION_SETTINGS_MATRIX.md`.

Logo: homepage `SlateIcon` + SLATE/360 wordmark. **Superseded by the Slice 3 visual correction below:** at Slice 1 time the interaction accent was cobalt; it is now Slate360's deep green (`#0C7A52`), the same color as the "360" wordmark. There is no current cobalt primary-interaction system anywhere in vNext.

Interaction suite: `e2e/vnext/` + `lib/vnext/*.test.ts` (`npm run test:vnext`).

Access contract: `lib/vnext/access.ts` + `lib/vnext/access.test.ts` (mocked context; no test secrets).  
Route-guard: `lib/vnext/route-guard.test.ts` scans `app/vnext/**/page.tsx`. Preview `/preview/vnext/*` does not satisfy it.

Middleware was not modified.

Slice 3 (client project overview) has **not** started.

---

## Slice 2 notes

Authenticated client portfolio: `/vnext/projects`. Opening a project goes to protected `/vnext/projects/[projectId]` (scaffold only; Overview is Slice 3).

Data: `listScopedProjectsForUser` / `getScopedProjectForUser` (org ∪ creator ∪ `project_members`). No fixture data on production `/vnext/projects`.

Hero resolver: `lib/vnext/project-hero.ts`. Preview fixtures: `/preview/vnext/client` plus empty/error/loading/project review routes.

No contextual project CRUD on the client portfolio. No middleware change.

---

## Slice 3 notes

`/vnext/projects/[projectId]` now renders the real client Overview, replacing the Slice 2
scaffold. Project-level navigation (`Overview / Explore / Items / Documents / History`) is a
presentational layout (`app/vnext/(client)/projects/[projectId]/layout.tsx` +
`components/vnext/project/VnextProjectNav.tsx`) — it performs no auth or existence checks itself.
Each of the 5 pages under `[projectId]/**` independently calls `requireVnextSession` with its own
exact path and repeats the same `isVnextProjectId` / `getScopedProjectForUser`-backed
`loadClientProjectScaffold` + `decideVnextProjectRecordAccess` check before rendering, matching the
UI_DESIGN_RULES.md principle that auth lives on pages, not shared layouts. (An earlier draft put a
`loading.tsx` file and the access check in the layout; both were reverted — see Known Limitations /
Self-Audit in the Slice 3 completion report for why.)

Overview data: `lib/vnext/load-project-overview.ts` (`loadVnextProjectOverview`). Reuses
`getScopedProjectForUser` for the project row, `lib/vnext/load-portfolio-evidence.ts`
(`loadPortfolioEvidence`) unchanged for hero/representations/documented-date, and
`lib/projects/location.ts` / `lib/slatedrop/storage.ts` (`resolveNamespace`) for location and
document-folder scoping — no new database query patterns were invented; recent items/documents and
latest-visit reuse the exact table/column combinations already documented in
`ENTITY_ACTION_SETTINGS_MATRIX.md` and `load-project-overview-data.ts` (legacy). Latest-visit source
attribution is a new small pure module, `lib/vnext/overview-visit.ts` (`pickLatestVisit`,
`formatPlainDate`), covered by its own vitest file.

Deliberately omitted: a merged "recent activity" feed. Section 10 of the slice brief requires
omitting activity that "cannot be constructed cleanly" — latest visit, recent items, and recent
documents already answer "what's new" from real data; merging them into one feed would imply a kind
of change-detection this data doesn't support.

Preview fixtures: `/preview/vnext/project` (well-populated, now the Overview instead of the old
scaffold), `/preview/vnext/project/{explore,items,documents,history}` (sibling scaffold fixtures so
the project sub-nav and "View all" links are click-testable without auth),
`/preview/vnext/project-sparse` (no hero/visit/items/documents, long title),
`/preview/vnext/project-loading`, `/preview/vnext/project-error`.

`components/vnext/portfolio/VnextProjectScaffold.tsx` and its copy constant were deleted (both of
its only call sites were replaced in this same slice).

Middleware and entitlements untouched. No Slice 4 (Explore viewer) or Slice 5–8 functionality was
built; the four non-Overview project routes are scaffolds only.

---

## Slice 3 visual correction (2026-09-18)

Brian reviewed the rendered Slice 3 screens and returned **REVISE BEFORE NEXT SLICE** — visual/UX
only; the architecture above (access model, loader, routing, exact-redirect auth, project nav IA,
recent-items/documents summaries, no Slice 4 leakage) was explicitly preserved.

**Palette.** The vNext canvas/surface/ink/line/accent tokens were replaced wholesale — see
`UI_DESIGN_RULES.md`'s "Color tokens" section for the full old→new table. Summary: the beige/tan
canvas (`#f4f1ea`/`#fbfaf6`) and cobalt accent (`#2c5aa0`) are gone. The **current marketing
homepage** (`--mkt-*` tokens) is now the vNext visual/brand color reference — near-white canvas,
true-white surfaces, homepage graphite-navy ink, homepage's deep green (`--mkt-brand-green`,
`#0C7A52`) as the **one** interaction accent for both client and owner vNext. The homepage's layout
was explicitly not adopted. Because this is a shared token file (`components/vnext/vnext-tokens.css`),
the change applies uniformly to the client shell, owner shell, Slice 2 portfolio, and Slice 3
Overview with no other code changes required for the color system itself.

**Overview layout.** `components/vnext/project/VnextProjectOverview.tsx` was restructured from a
narrow-hero-plus-tall-stacked-column layout (which left a large blank field under the hero) into: a
single bounded hero+identity record (hero fills ~42% of the row via a new `VnextProjectHero`
`fill` mode, identity fills the rest), a compact two-up "Latest visit / Available" strip with a
green left-accent marker, and a two-column "Recent items / Recent documents" grid that collapses to
one full-width column when only one of the two exists (never a lone half-width orphan). The
container widened from `max-w-64rem` to the same `72rem` (`.vnext-portfolio`) measure the Slice 2
portfolio already uses, for width/rhythm consistency across vNext client surfaces.

**Sparse-project correctness fix.** The primary Explore CTA now renders only when
`overview.representations.length > 0` (a real, usable representation exists) — previously it always
rendered, including for a project with zero documented representations, which was misleading. A
fully sparse project (no representations, no latest visit, no items, no documents) now shows one
truthful compact message instead of an otherwise-empty page; this is suppressed when `loadError` is
set so the error notice and the sparse notice never double up.

**Terminology.** Latest-visit source labels changed from implementation-oriented to plain
client-facing language: "Site walk visit" → "Site visit", "Digital twin capture" → "3D scan",
"Thermal session" → "Thermal scan" (`lib/vnext/load-project-overview.ts`).

**Nav visual treatment.** No code change was needed for the project sub-nav or client/owner nav —
`VnextNavLink` already consumed `var(--vnext-accent)` for active-state styling, so the token swap
alone retints every active-nav indicator app-wide to the corrected green.

---

## Slice 4 notes (2026-09-18)

`/vnext/projects/[projectId]/explore` now renders the real unified client Explore experience,
replacing the Slice 3 scaffold. Core rule carried over from Slice 3 and applied throughout: a
representation is only ever shown when the full path — database row → access check → resolver →
real viewer engine — is proven, never merely because a source table has a matching row.

**Shared source of truth.** `lib/vnext/load-project-explore.ts` (`loadVnextExploreData`) calls the
exact same `loadPortfolioEvidence` (`lib/vnext/load-portfolio-evidence.ts`) Overview already uses
for `availableRepresentations`, so Overview and Explore can never disagree about what's "available."
Building Explore's per-source resolvers surfaced one real gap in that shared contract:
`digital_twin_capture_assets.panorama_360` was flagging "360" available even though no serving route
exists for that table anywhere in the app (`app/api/digital-twin/**` has no GET/image route for
capture assets — confirmed by repo-wide search). Fixed directly in `load-portfolio-evidence.ts`:
"360" is now flagged only from `site_walk_items` (`item_type = 'photo_360'`, which does have a
proven route, `/api/site-walk/items/[id]/image`), with tests added proving both the fix and the
specific regression it prevents.

**Representation resolvers** (`lib/vnext/explore/`, each independently unit-tested against a mocked
admin client):
- `resolve-twin-source.ts` — Reality (`splat`) and Geometry (`model`) both resolve through the same
  `digital_twin_spaces`/`digital_twin_models` filters `load-portfolio-evidence.ts` uses (so
  availability and resolution never drift), picking the most-recently-updated ready model of the
  requested kind. Splat URLs are the same-origin authenticated proxy
  (`/api/digital-twin/models/[id]/splat`, already proven, CORS-free); Geometry URLs are presigned via
  the existing `resolveDigitalTwinModelUrl`.
- `resolve-pano-source.ts` / `resolve-plan-source.ts` — 360 and Plan both list every selectable
  source (`site_walk_items` photos / `site_walk_plan_sheets` sheets) and resolve one to its proven
  image route (`/api/site-walk/items/[id]/image`, `/api/site-walk/plan-sheets/[id]/image`).
- `resolve-thermal-source.ts` — finds the most-recently-updated session with a currently published,
  non-expired share (mirroring the exact "published" check `load-portfolio-evidence.ts` already used
  for the Overview "thermal" flag, extended to also honor `expires_at`), then calls
  `loadThermalShareViewerData` directly with the bare session id — no public share token is minted or
  exposed to the client for this authenticated view.
- `resolve-active-representation.ts` — the one pure decision function (`resolveActiveRepresentation`,
  12 unit tests) that turns `(available, requested)` into `(representation, error)`: an explicit,
  recognized-but-unavailable request resolves to a real fallback representation plus a concise error
  message; an unrecognized string (including `drone`, which is not in
  `VNEXT_EXPLORE_REPRESENTATIONS` at all) is treated identically to "no request" — silent fallback,
  never an acknowledgement that a Drone representation could have existed.

**Viewer adapters** (`components/vnext/explore/`), each a thin wrapper around an already-shipping,
mature engine — no new rendering engine was built:
- `VnextRealityViewer.tsx` — `WebglGate` + `TwinModelViewer` (the same format-dispatching component
  the authenticated Twin detail page uses; splat/model/pano/lidar all already `next/dynamic`
  `ssr:false` inside it).
- `VnextPanoViewer.tsx` — `TourPanoViewer` (`@photo-sphere-viewer/core`), the same component Twin's
  pano fallback already uses, decoupled from the Tours product.
- `VnextThermalViewer.tsx` — a small purpose-built gallery (image + Prev/Next + thumbnail strip) over
  the resolver's already-authorized image URLs. `ThermalShareViewer` itself was evaluated but not
  reused as-is: it expects the full `ThermalShareViewerData` shape (branding, summary metrics, role,
  per-capture anomalies) for its download/anomaly-badge chrome, which this authenticated,
  token-free view deliberately doesn't carry. No anomaly-rendering or thermal-analysis logic was
  reimplemented — only plain image browsing.
- `VnextPlanViewer.tsx` — new. No existing plan viewer is read-only; both
  `components/site-walk/PlanViewer.tsx` and `.../capture/PlanViewer.tsx` are pin-authoring surfaces
  coupled to rasterization-job polling. This is a bare pan/zoom `<img>` viewer (drag, wheel/button
  zoom, reset) — no pin CRUD, no job polling.

**Shell** (`components/vnext/explore/VnextExploreShell.tsx` + siblings): representation selector
(`VnextRepresentationSelector`, a restrained tab row — never renders if only one representation
exists, never renders Drone), source picker (`VnextExploreSourcePicker`, only rendered when a
representation actually has more than one selectable source), a shared real-Fullscreen-API hook
(`use-vnext-fullscreen.ts` — the app previously had two independent ad hoc fullscreen
implementations, `MeshTwinViewer.tsx` and `TwinViewerCanvasShell.tsx`; this is the one shared
version, modeled on the more robust of the two), a thin presentation-mode skeleton (hides chrome,
renders as a `fixed inset-0` overlay so it also covers the route layout's persistent project nav —
not just grows within the page flow — with an always-visible Exit control and Escape-to-exit), and
concise representation-aware help text behind a native `<details>` disclosure (no JS state needed).
Loading, empty (`VnextExploreEmptyState`), and error (`VnextExploreErrorState`) states are explicit,
not implied by a blank viewer.

**URL state contract.** `lib/vnext/explore/build-explore-href.ts` (`vnextExploreHref`) is the one
place that builds every Explore link, so representation switching, source switching, and
presentation mode always agree on the same query params (`?rep=`, `?source=`, `?present=1`) and
never silently drop one of the other two. It takes the page's own base path rather than a project
id specifically so the exact same shell renders correctly under both the real authenticated route
(`/vnext/projects/[id]/explore`) and the unauthenticated `/preview/vnext/project/explore` sandbox —
this vNext e2e suite is unauthenticated-only (see `e2e/vnext/routes.spec.ts`), so representation
switching / deep-link / Back-Forward / presentation-mode coverage
(`e2e/vnext/explore.spec.ts`) all runs against that one interactive preview route, which reads its
own `?rep=`/`?source=`/`?present=` and resolves fixture data through the identical pure
`resolveActiveRepresentation` decision function the real page uses
(`lib/vnext/preview-explore-fixtures.ts`, `resolvePreviewExploreData`).

Preview fixtures: `/preview/vnext/project/explore` (interactive — the one above),
`/preview/vnext/project/explore-{geometry,360,plan,thermal,empty,error,present}` (fixed single-state
screenshot fixtures). Reality/Geometry fixtures use the real public sample assets already used
elsewhere in preview/marketing (`public/marketing/sample-twin.spz`, `public/uploads/test-box.glb`) —
confirmed rendering real Gaussian-splat and GLB content, not placeholders, in an interactive browser
session with GPU acceleration. 360/Plan/Thermal fixtures use existing `public/vnext-preview/*`
placeholder SVGs (no real photo/panorama/thermal sample assets exist in the repo); this is a fixture
limitation only — the resolvers and viewer adapters exercise the real, proven authenticated image
routes in production.

Middleware, entitlements, billing, and existing database migrations untouched. No Items workflow,
History/Compare, camera-path editor, Drone viewer, legacy UI redesign, production cutover, or
reconstruction changes were built — all out of scope for this slice.

---

## Slice 4 correction (2026-09-18)

Brian returned Slice 4 **REVISE BEFORE NEXT SLICE**. The overall architecture (shell, adapters,
representation structure, Drone exclusion, query-driven selection, source picker, presentation
skeleton, fullscreen hook, Plan viewer) was accepted and preserved unchanged; the following were
fixed.

**vNext project access now protects Explore media too (the primary blocker).** Explore itself was
always entering through `getScopedProjectForUser` (org OR creator OR project_members), but three
media URLs it generated pointed at **legacy** routes protected by a *different, narrower* contract:
`withAppAuth("punchwalk")` (a standalone-app entitlement Explore has nothing to do with) plus a
single-org `eq("org_id", orgId)` match. A `project_members` collaborator whose org membership
doesn't match the project's own org — a legitimate vNext access path — could therefore be refused
the very media Explore had already decided they could view. Three new vNext-scoped routes replace
them, all authorized via `withProjectAuth` (the same `getScopedProjectForUser` contract) and then
re-verifying the requested child row actually belongs to that already-authorized project:
- `/api/vnext/projects/[projectId]/items/[itemId]/image` (360 photos)
- `/api/vnext/projects/[projectId]/plan-sheets/[sheetId]/image` (plan sheets)
- `/api/vnext/projects/[projectId]/twin-models/[modelId]/splat` (Reality same-origin splat proxy —
  Geometry's presigned GLB URL was already resolved server-side after project-scoped access and
  needed no route change)
`lib/vnext/explore/resolve-pano-source.ts` / `resolve-plan-source.ts` / `resolve-twin-source.ts` now
build URLs against these instead. `lib/projects/access.ts`'s `getScopedProjectForUser` had **zero**
prior test coverage despite being the load-bearing contract for this and `withProjectAuth`, `withAuth`
callers app-wide — now covered directly (`lib/vnext/explore/scoped-project-access.test.ts`) plus
route-level tests proving a cross-org `project_members` collaborator succeeds, a media id belonging
to a different project is refused (the query is provably scoped by `project_id`, not just `id`), and
neither route has any `withAppAuth`/`"punchwalk"` dependency
(`lib/vnext/explore/vnext-media-image-routes.test.ts`, `vnext-twin-splat-route.test.ts`). Legacy
`/api/site-walk/items/[id]/image`, `/api/site-walk/plan-sheets/[id]/image`, and
`/api/digital-twin/models/[modelId]/splat` are untouched — nothing about the standalone Punchwalk or
Digital Twin apps' own entitlement gating was weakened; Explore simply no longer routes through it.
**Documented rule:** vNext project access and vNext media access must always use the same
scoped-project contract; a legacy standalone-app entitlement gate must never block viewing of an
already-authorized vNext project record. (Overview's hero-image URLs on `/vnext/projects/[id]` still
resolve through the same legacy routes and carry the same latent gap — out of scope for this
correction per "preserve Overview design," flagged for a future pass.)

**Thermal availability/renderability drift fixed.** `loadPortfolioEvidence` was flagging Thermal
available whenever any non-revoked share existed — ignoring `expires_at` entirely and never checking
whether any capture actually remained viewable under the share's `layer_config`. A published share
with zero viewable captures (all excluded by `capture_ids`, or none with a usable
`preview_path`/`storage_path`) was wrongly reported available. `resolveThermalSourceData` had the
expiry check but the same zero-captures gap. Both now defer to one shared predicate,
`lib/vnext/thermal-availability.ts` (`isThermalSessionAvailable`, 15 direct unit tests): a session is
available only when it has a currently published (non-revoked, non-expired) share **and** at least
one usable capture survives that share's layer_config. `load-portfolio-evidence.ts` now batch-fetches
`thermal_captures` once per call (not per-session) to stay N+1-safe at portfolio scale.
`resolveThermalSourceData` additionally guards its final output: if the resolved viewer data somehow
still ends up with zero signable previews, it returns `null` rather than an empty-gallery "available"
representation.

**`?item=` (Slice 5 context) now survives the whole Explore URL lifecycle.** `vnextExploreHref`
(`lib/vnext/explore/build-explore-href.ts`) gained an optional, purely opaque `item` param, threaded
through `VnextExploreShell`/`VnextRepresentationSelector`/`VnextExploreSourcePicker` and both the
production and preview pages. It is never read, looked up, or rendered as an overlay in this slice —
only carried through representation switches, source switches, and presentation-mode enter/exit so a
future Slice 5 can give it meaning without another URL-contract change.

**Full Explore deep link now survives login.** `/vnext/projects/[id]/explore`'s
`requireVnextSession` call previously used the bare pathname as `redirectTo`, dropping
`rep`/`source`/`item`/`present` for an unauthenticated visitor. It now builds `redirectTo` via
`vnextExploreHref` itself — always exactly the authenticated Explore path plus a
`URLSearchParams`-encoded query, structurally incapable of becoming an external or open-redirect
target (covered by a new `routes.spec.ts` test asserting the exact preserved query and that the
result starts with `/vnext/` and contains no `://`).

**Source picker touch targets** raised from `min-h-[2.25rem]` (36px) to `var(--vnext-touch)` (44px),
covered by `assertNamedTouchTargets` in the 360/source-picker e2e test.

**Real automated fullscreen coverage** added (`explore.spec.ts`): a narrow, deterministic stub of
`requestFullscreen`/`exitFullscreen`/`fullscreenElement`/`fullscreenchange` (real Fullscreen API
permission/support is unreliable in headless CI) exercises `use-vnext-fullscreen.ts`'s actual
integration contract — enter, exit, aria state, no stale presentation/body-scroll side effects.

**Browser-side media failure now has a real, shared treatment.** A new
`VnextViewerMediaError` ("This view couldn't be loaded." + Retry) is wired into: Plan and Thermal
(thin vNext viewers, explicit `onError` on the `<img>`; Plan's retry cache-busts its own re-signing
route URL, a genuine refetch), 360 (`TourPanoViewer` gained an optional, additive `onError` prop
wired to the library's own `panorama-error` event), and Geometry (`ModelViewerClient`/`<model-viewer>`
had no error handling at all — caught via a capture-phase listener in `VnextRealityViewer` since the
native `error` event doesn't bubble; retry is a full reload since the resolved URL is a presigned
link, not a re-signing route). Reality's splat path already had mature error/retry handling
(`SplatViewer`'s `ErrorCard`) and was left untouched. Covered by a new e2e test that aborts the Plan
image request, asserts the shared failure UI appears, then proves Retry actually re-fetches.

**Glassmorphism removed** from `VnextExploreViewerControls` (`backdrop-blur` dropped, opacity raised
so the dark control surface stays readable without it) — the vNext design rules explicitly prohibit
glassmorphism.

Files changed: 3 new API routes (`app/api/vnext/projects/[projectId]/{items/[itemId],plan-sheets/[sheetId]}/image`,
`twin-models/[modelId]/splat`), `lib/vnext/thermal-availability.ts` (new, shared predicate),
`lib/vnext/explore/{resolve-pano-source,resolve-plan-source,resolve-twin-source,resolve-thermal-source}.ts`,
`lib/vnext/load-portfolio-evidence.ts`, `lib/vnext/explore/build-explore-href.ts`,
`components/vnext/explore/{VnextExploreShell,VnextRepresentationSelector,VnextExploreSourcePicker,VnextExploreViewerControls,VnextRealityViewer,VnextPanoViewer,VnextPlanViewer,VnextThermalViewer}.tsx`,
`components/vnext/explore/VnextViewerMediaError.tsx` (new), `components/tours/TourPanoViewer.tsx`
(additive `onError` prop), `app/vnext/(client)/projects/[projectId]/explore/page.tsx`,
`app/preview/vnext/project/explore*/page.tsx`, plus new/updated tests throughout
`lib/vnext/explore/*.test.ts`, `lib/vnext/thermal-availability.test.ts`,
`lib/vnext/explore/scoped-project-access.test.ts`, `e2e/vnext/explore.spec.ts`,
`e2e/vnext/routes.spec.ts`.

No Slice 5 functionality, Items workflow, History/Compare, camera-path editor, Drone viewer,
billing/subscription UI, middleware change, or reconstruction/model-processing change was introduced.
Legacy standalone-app (Punchwalk, Digital Twin) entitlement gating is untouched everywhere outside
Explore's own media resolution.

---

## Slice 4 closeout (2026-09-18)

Two narrowly-scoped fixes on top of the Slice 4 correction, both accepted architecture otherwise
unchanged.

- **Thermal multi-share selection fixed.** `resolve-thermal-source.ts` previously picked the
  session via the shared `isThermalSessionAvailable` predicate but then selected its share via "the
  first non-revoked, non-expired one" — not necessarily the SAME share that made the session
  available, so a session with an earlier-but-non-qualifying share and a later-but-qualifying one
  could resolve to `null` even though it should render. New `findRenderableThermalShare`
  (`lib/vnext/thermal-availability.ts`) returns the actual qualifying share row (`id`,
  `layerConfig`, `brandingSnapshot` all from that same row); both `isThermalSessionAvailable` and
  `resolveThermalSourceData` now defer to it, so `layer_config` and `branding_snapshot` can never be
  paired across two different share rows.
- **vNext portfolio/Overview hero media now uses the same project-access contract as Explore.**
  `loadPortfolioEvidence()`'s hero URLs previously still pointed at the legacy
  punchwalk/digital_twin-gated, single-org routes even though Explore's equivalent media had already
  been moved to project-scoped routes. 360 and Plan heroes now use the same
  `/api/vnext/projects/[projectId]/{items/[itemId],plan-sheets/[sheetId]}/image` routes Explore
  already uses; Reality's preview image gets a new sibling route,
  `/api/vnext/projects/[projectId]/twin-models/[modelId]/preview-image` (`withProjectAuth`, then the
  model's `digital_twin_spaces.project_id` is re-verified). Legacy hero routes are untouched.

Files: `lib/vnext/thermal-availability.ts`, `lib/vnext/explore/resolve-thermal-source.ts`,
`lib/vnext/load-portfolio-evidence.ts`, new
`app/api/vnext/projects/[projectId]/twin-models/[modelId]/preview-image/route.ts`, plus tests in
`lib/vnext/thermal-availability.test.ts`, `lib/vnext/explore/resolve-thermal-source.test.ts`,
`lib/vnext/load-portfolio-evidence.test.ts`, and new
`lib/vnext/explore/vnext-twin-preview-image-route.test.ts`.

---

## Slice 4 QA fixes (2026-09-19/20)

Test-harness-only fixes on top of the Slice 4 closeout; application code unchanged.

- `e2e/vnext/helpers.ts`: `page.goto` now retries once on a thrown `net::ERR_ABORTED` (short
  settle, identical navigation), before the existing 500/overlay recovery. Any other thrown
  navigation error still propagates immediately.
- `e2e/vnext/explore.spec.ts`: the combined `?item=` stress test is split into three focused tests
  (source/rep switching, presentation enter/exit, refresh), each with full `attachRuntimeHealth`/
  `assertClean()` coverage restored.
- `lib/vnext/preview-explore-fixtures.ts` + new `public/vnext-preview/pano360.png`: the 360 preview
  fixture was an SVG, which `@photo-sphere-viewer/core`'s WebGL texture pipeline cannot load
  (reproduced in isolation — deterministic failure independent of any app code); swapped to a raster
  PNG placeholder, matching what a real captured 360 photo always is.

Vitest (179/179) and the full `explore.spec.ts` file (24/24, twice) are clean. Architecture, design,
and file-size guards pass. **The complete `npm run test:vnext` gate has not yet been verified green
end-to-end** — repeated attempts were blocked by this host's available memory dropping below 1GB
(sometimes below 500MB) during Chromium/dev-server warmup, unrelated to the code above. Do not treat
this as a passing full-suite gate until it is re-run successfully.

---

## QA infrastructure (2026-09-21)

`npm run test:vnext` now runs Vitest, then `next build`, then Playwright against `next start`
on `127.0.0.1:3110`. The vNext browser suite no longer uses `next dev`. Dev-only route prewarm,
`onDemandEntries` tuning, `page.goto` recovery, and HMR allowlists were removed. See
`docs/vnext/SLATE360_UI_PHASE1_REVIEW_PROTOCOL.md` for the run sequence.

Canonical `npm run test:vnext` on 2026-09-21, exit code 0:

- Vitest: 21 files, 179/179 passed
- Playwright (`next start` on `127.0.0.1:3110`): 75/75 passed (1.2m)
- Free physical memory before that invocation: 3.2 GB

Slice 5 was not started.

---

## Handoff

Slice 7 (History + Compare) is implemented and waiting for review. Do not begin Slice 8 until Brian explicitly approves this slice.

## Slice 5 notes (2026-09-21)

Client Items is a project record index, not a restyle of Site Walk and not a task board.

**Source of truth.** `site_walk_items` (non-deleted, `project_id` scoped), with `site_walk_comments` for questions, `site_walk_pins` for plan position, and `site_walk_sessions` for visit/date context. The client type is `VnextClientItem` (`lib/vnext/items/item-types.ts`). UI never reads raw table rows.

**Client-safe fields.** Title, description, plain status label, documented date, location label, trade, category, high/critical priority only, a real image when `item_type` is `photo` or `photo_360` and `s3_key` exists, question count, a related-record link when `before_item_id` resolves inside the same project, and locators. Tags are searchable and not shown as chips.

**Intentionally hidden.** Workflow type, assignment, due date, cost, markup, sync/hash/device fields, storage keys, org ids, emails, Field/Office, escalation, pin editing, and status changes. Medium/low priority is omitted because it is the ordinary default.

**Questions.** `POST/GET /api/vnext/projects/[projectId]/items/[itemId]/questions` writes `site_walk_comments` after proving the item and its session both belong to the project. Language is "Ask a question". No delete, no escalate, no RFI object. Author label uses `profiles.display_name` or first+last, otherwise "Project team". Email is never selected.

**Access.** Same contract as Slice 4 media: authenticated user plus `getScopedProjectForUser` (organization, creator, or `project_members`). Punchwalk entitlement is not consulted. An item, pin, or comment id from another project 404s. Legacy `/api/site-walk/comments` still uses `withAppAuth("punchwalk")`.

**Locators actually derived** (`deriveItemLocators`):
- Plan — YES. `site_walk_pins.plan_sheet_id` + `x_pct`/`y_pct` when the sheet is a renderable Explore source in the same project. Deep link: `vnextExploreHref` with `rep=plan`, `source=<sheet id>`, `item=<item id>`. Explore draws one read-only marker. Wrong sheet or another representation does not invent a marker.
- 360 — PARTIAL. Only when the item itself is `photo_360` with an image. Opens that panorama (`precise: false`). No yaw/pitch exists in the schema, so the UI says direction was not recorded.
- Geo — YES as data, NO as a viewer. Latitude/longitude stay on the locator. The page shows `location_label` only.
- Visit/date — YES as context from the item's session when that session's `project_id` matches. Displayed as "Documented {date}". Not called a spatial position.
- Reality / Geometry XYZ — NO. `digital_twin_pins` has space/model/`position`/`normal` and metadata for mesh anchors. It has no foreign key to `site_walk_items`. No relationship was invented and no migration was added.

**Routes.** `/vnext/projects/[projectId]/items`, `/vnext/projects/[projectId]/items/[itemId]`, and the three project-scoped item APIs above (list, detail, questions), plus the existing item image route. Explore `?item=` is now resolved to a context strip and, for a matching plan pin, a marker.

**Not started.** Documents, History/Compare, owner authoring, Drone, reconstruction, middleware, billing.

Canonical `npm run test:vnext` on 2026-09-22, exit code 0: Vitest 24 files / 202 tests passed, production build, Playwright 90 passed. `guard:architecture`, `guard:design`, and `guard:file-size-regression` passed. Scoped typecheck of the changed graph still reports the pre-existing `splat-viewer-scene.tsx` JSX intrinsic errors pulled in by the Slice 4 Reality viewer. Those files were not edited.

## Slice 6 notes (2026-09-21)

Client Documents is a project file index. Search on that page also finds items and renderable plan sheets. It is not a file manager.

**Source of truth.** `slatedrop_uploads` rows with `status='active'` whose `project_folders` row belongs to the project and is a client document folder. `unified_files` is not read. No new table.

**Client-visible folders.** Drawings, permits, specs, plans, deliverables, reports, records, safety, closeout, submittals, correspondence, and the matching `folder_type` values. Legacy rows with no type are included only when the folder name is one of those labels.

**Hidden.** Photos, notes, voice memos, site-walk data, clips, LiDAR, models, source assets, tour scenes, contracts, insurance, budget, schedule, daily logs, RFIs, team uploads, and deliverable sentinel links (`deliverable://`, `twin-deliverable://`). Those sentinels open legacy app routes, so they are not client documents.

**Open / download.** PDF and common images can open in the browser. Every client file can download. Both go through `/api/vnext/projects/[projectId]/documents/[documentId]/file`, which checks project access and folder visibility, then redirects to a signed URL. The client payload does not include storage keys.

**Related item.** Shown when `site_walk_deliverable_assets.file_id` matches the file and `source_item_id` is a non-deleted item in the same project. There is no file-to-plan foreign key. Plan sheets are search results that open Explore, not document rows.

**Search.** The Documents search field. Empty query shows documents. A query searches document names, filenames, folders, item title/description/location/trade/category/tags, and renderable plan sheet names and numbers. Result kinds are Document, Item, and Plan, written into the context line. No vector search and no answers.

**Access.** Same as Slice 5: authenticated user plus `getScopedProjectForUser`. Legacy `/api/slatedrop/download` still scopes by the viewer's org and was not widened.

**Not started.** History, Compare, owner upload, sharing controls, reconstruction, middleware, billing.

Canonical `npm run test:vnext` on 2026-09-22, exit code 0: Vitest 26 files / 214 tests passed, production build, Playwright 99 passed. `guard:architecture`, `guard:design`, and `guard:file-size-regression` passed. A direct typecheck of the Slice 6 files passed. `npm run typecheck:changed` against `main` still exits 2 only on the three pre-existing `splat-viewer-scene.tsx` `sparkRenderer` / `splatMesh` errors. Those lines were not edited.

## Slice 6A notes (2026-09-21)

Project plans are a project asset. A visit may reference a sheet. It does not own the only copy. Slice 7 was not started.

**Source of truth.** `site_walk_plan_sets` (project_id, no session) and `site_walk_plan_sheets` (project_id + plan_set_id). Legacy `site_walk_plans.session_id` is required and is not the client model. `site_walk_session_plan_sheets` attaches an existing sheet to a session. `site_walk_pins.plan_sheet_id` plus `x_pct` / `y_pct` is a position on that sheet. `visitPlanAnchors` is the adapter History can call later. No new table and no migration.

**Revisions.** Plan sets already have `revision_number`, `revision_label`, `is_current_revision`, and `supersedes_plan_set_id`. The client shows the label, or `Rev N` when the number is greater than 1. A new upload does not automatically supersede the previous set. Sheet-level Rev 0 / Rev 1 / Rev 2 is not a separate row. Drawing revision is not a visit date.

**Source document.** `site_walk_plan_sets.source_file_id` references `slatedrop_uploads`. When that file is already a client document, the plan set links to it and the document links back with View sheets. A matching filename is not a relationship.

**Explore.** A sheet is an Explore Plan source only when it belongs to the project and has a thumbnail, raster, or image key. Processing and failed sheets stay on the plan list with a status line and no Explore link. Existing Explore resolution was not changed.

**Upload.** `user_can_manage_project` is the write rule: organization or project role `owner`, `admin`, `member`, or `manager`. `collaborator` and `viewer` can read and cannot upload. Upload is PDF only, at most 50 MB, into an existing drawings or plans folder, then the existing `plan.rasterize` task. No visit is created. No Punchwalk entitlement. Readers do not see Upload plans.

**Not started.** History, Compare, automatic revision chains, drawing markup, Design mode, an assistant, Blender, reconstruction, middleware, billing.

Future captured-versus-proposed boundary: `docs/vnext/CAPTURED_AND_PROPOSED.md`. No design surface was added.

Canonical `npm run test:vnext` on 2026-09-22, exit code 0: Vitest 28 files / 228 tests passed, production build, Playwright 105 passed. `guard:architecture`, `guard:design`, and `guard:file-size-regression` passed. Scoped typecheck of the Slice 6A files passed. `npm run typecheck:changed` against `main` still exits 2 only on the three pre-existing `splat-viewer-scene.tsx` `sparkRenderer` / `splatMesh` errors. Those lines were not edited.

## Slice 7 notes (2026-09-21)

History is a project record of documented site conditions. It is not a job log, an audit feed, or a claim that the software detected change. Slice 8 was not started.

**No new table.** There is no persisted visits table. `assembleProjectHistory` builds `VnextVisit` rows from records that already exist. Two records on the same calendar date stay separate unless a foreign key joins them.

**What becomes a history row**

| Source | Date used | Included when | Identity |
|---|---|---|---|
| `site_walk_sessions` | `completed_at`, else `started_at`, else `created_offline_at`, else `created_at`. Never `updated_at` | `status` is `completed` or `signed`, and `project_id` matches. There is no separate publish flag; that status is the client record | `session-{id}` |
| `site_walk_items` `photo_360` | The parent session's date | The item belongs to an included session | A representation of that session, not a second visit |
| Orphan `photo_360` | `captured_at` only. Undated orphans are dropped | No included session covers `session_id` | `pano-{id}` |
| `digital_twin_models` | The capture's `uploaded_at`, else `created_at`, else the model's `created_at`. Never `updated_at` | Model `status='ready'`, viewer kind is splat or glb/gltf, space is not deleted or archived. Models that share a capture still on this project are one visit. A model whose `capture_id` does not resolve is dropped. `review_status` is not a second publish gate; Explore does not use it either | `capture-{id}` or `model-{id}` |
| `thermal_analysis_sessions` | Earliest `thermal_captures.created_at`, else `created_at`. The capture table has no `captured_at`. Never `updated_at` | `isThermalSessionAvailable`: published share, not revoked or expired, and `layer_config` still leaves a viewable capture. Never merged with a site walk or a scan by date | `thermal-{id}` |

Drone, pano, lidar, and ply twin formats are not history rows. `digital_twin_capture_assets.panorama_360` is not a 360 source. Deleted and archived rows are excluded. A visit has no document count: no foreign key ties a document to a visit, and a shared date or filename is not one.

**Plan context.** A visit points at the project's sheet through `site_walk_session_plan_sheets` and `visitPlanAnchors`. The same sheet can appear on two visits. The revision label is the plan set's label, or `Rev N` when the number is greater than 1. That is a drawing revision, not the visit date. This slice does not overlay two revisions.

**Compare.** Exactly two visits. The route is `/history/compare?a=&b=` and the page orders them Earlier and Later. A representation appears only when both visits have it: Reality, Geometry, 360, Plan, or Thermal. One side is not enough. There is no Drone compare and no change detection.

**Cameras.** `cameraSyncIsReliable` is true only when both models have `quality_metrics.georeferenceStatus === "VERIFIED"`, the same `space_id`, and different model ids. A shared space without verification is not enough. The compare page does not move the cameras even then. `TwinModelViewer` has no orbit handle, and synchronizing two canvases without that handle would fake a shared viewpoint. Verified pairs are labeled as sharing a frame. Everything else says the cameras are not linked. 360 has no station or yaw correspondence, so panoramas are never called the same viewpoint.

**Stills, not two live viewers.** History rows use a thumbnail from that visit only. Compare shows those stills side by side on a wide screen and stacked on a narrow one. It does not mount splat, GLB, 360, or thermal viewers. Open goes to Explore with `rep` and `source` set to that historical model, panorama, sheet, or thermal session. An unknown source does not fall back to the newest. Thermal sessions have no project image route, so a thermal compare without a still says so and still opens Explore.

**Access.** `getScopedProjectForUser`. A visit, session, model, thermal session, sheet, or compare id from another project is not in the assembled list and the page is not found. Unauthenticated history, visit, and compare routes redirect to login.

**Routes.** `/vnext/projects/[projectId]/history`, `/history/[visitId]`, `/history/compare`. Filters `kind=` and compare selection `pick=` stay on the history URL. No `loading.tsx` on these routes.

Canonical `npm run test:vnext` on 2026-09-21, exit code 0: Vitest 30 files / 240 tests passed, production build, Playwright 118 passed. `guard:architecture`, `guard:design`, and `guard:file-size-regression` passed. Scoped typecheck of the Slice 7 history files passed. `npm run typecheck:changed` against `main` still exits 2 only on the three pre-existing `splat-viewer-scene.tsx` `sparkRenderer` / `splatMesh` errors. Those lines were not edited.

## Slice 7A notes (2026-09-22)

A client sees a service only when the project includes it, the source is published where that state exists, and the app can render it. Inclusion is per project. It is not an org entitlement. The canonical rule is `docs/vnext/PROJECT_CLIENT_DELIVERY_SCOPE.md`.

`project_client_capabilities` stores the nine ids. No rows means portal sections on and services off. A new project is seeded that way. Existing projects are backfilled from sources the client could already open. A ready internal file does not turn a service on by itself.

Overview, Explore, Items, Documents, search, plans, History, Compare, and project navigation read one resolver. A disabled thermal share does not become a history row, a compare choice, a search hit, or an Explore option. The URL does not say the service exists. Media routes for a disabled Reality, Geometry, 360, or Plan model return not found.

Slice 8 was not started. There is no owner QA screen, no subscription language, and no locked-service card.

Canonical `npm run test:vnext` on 2026-09-22, exit code 0: Vitest 31 files / 250 tests passed, production build, Playwright 122 passed. `guard:architecture`, `guard:design`, and `guard:file-size-regression` passed. Scoped typecheck of the Slice 7A files passed. `npm run typecheck:changed` against `main` is reported with the commit.

Closeout applied `20260922120000_project_client_capabilities.sql` and `20260922133000_replace_project_client_scope.sql` to the linked Supabase project `hadnfcenpcfaeclczsmm` from `C:\s360`. The table, check constraint, RLS policies, and project seed trigger are present. All 8 existing projects have nine capability rows. A rolled-back insert seeded portal sections on and services off. `replace_project_client_scope` upserts the nine ids in one transaction. Thermal backfill uses the same `capture_ids` rule as runtime. This database has no thermal sessions, so Thermal is included for none of the live projects.

Closeout `npm run test:vnext` on 2026-09-22, exit code 0: Vitest 31 files / 252 tests passed, production build, Playwright 122 passed. Guards passed. `npm run typecheck:changed` against `main` exits 2 only on the existing `splat-viewer-scene.tsx` lines 197–199.

## Slice 8 notes (2026-09-22)

A saved view is an evidence link. It records the project, representation, exact source, and any visit, date, item, sheet, or view state the current viewer can actually reproduce. It is not a camera bookmark. `digital_twin_viewpoints` was not reused: it requires a space, stores a left and right camera, and only allows orbit, book spread, section, and compare. Plan, 360, and Thermal do not fit that table. The new table is `project_saved_views`.

The deep link is `/vnext/projects/[projectId]/explore?view=[savedViewId]`. The row decides what opens. A missing source, or a capability that is no longer included, shows "This saved view is not available." It does not open a newer model and it does not name the hidden service. The row is kept. See `docs/vnext/SAVED_VIEW_EVIDENCE_LINK.md`.

Writes are project-shared and limited to owner, admin, member, and manager. A client with project access can open a view whose capability is still included. There is no personal library and no public token.

Reality can save and restore a splat camera pose when the viewer returns one. Geometry saves the model only. The model viewer does not expose a pose. 360 saves yaw and pitch from Photo Sphere Viewer. It does not save zoom. Plan saves the sheet plus pan and zoom. Thermal saves the session and the selected capture. There is no thermal camera. A camera path remains one `camera_path` blob on that splat model. It is not copied to another model. Auto-orbit is not available: the vNext viewer has no orbit control to drive. Browser recording and server video export are deferred.

Playback state lives on the Explore shell, not inside the Views panel. Entering presentation hides authoring and keeps the running path on the same model, from the same elapsed time. Presentation shows Play, Pause, and Restart only when that Reality model has a path.

Slice 9 was not part of that commit. No public share, processing queue, AI, VR, or design studio.

Migration `20260922180000_project_saved_views.sql` was applied to linked project `hadnfcenpcfaeclczsmm` and recorded in migration history. The two Slice 7A versions were not rerun. Older migration-history drift was not repaired.

Canonical `npm run test:vnext` on 2026-09-22, exit code 0: Vitest 33 files / 267 tests passed, production build, Playwright 144 passed. `guard:architecture`, `guard:design`, and `guard:file-size-regression` passed. `npm run typecheck:changed` against `main` exits 2 only on the existing `splat-viewer-scene.tsx` lines 197–199.

## Slice 9 notes (2026-09-22)

Owner Home, Clients, and Projects replace the scaffolds at `/vnext/ops`, `/vnext/ops/clients`, and `/vnext/ops/projects`. The owner gate is unchanged: `canAccessOperationsConsole` (CEO today).

Home attention is only an explicit failed job: `digital_twin_captures.capture_status = failed`, `site_walk_plan_sets.processing_status = failed`, or `thermal_analysis_sessions.status = failed`. A service that was not included is not a problem. `review_status` stays unused because it defaults to pending and the product never clears it. Client questions, share management, QA, and publish stay deferred to later slices.

Clients are grouped from `projects.client_name` by trimmed, case-folded text. "ABC Construction" and "ABC Construction LLC" stay separate. There is no new client table. A client page is that filtered project list.

A project row shows included services and the subset the client can see. The owner project page edits `project_client_capabilities` through the existing scope route. Client surfaces still use the same resolver. Slice 10 was not started.

Canonical `npm run test:vnext` on 2026-09-22, exit code 0: Vitest 35 files / 275 tests passed, production build, Playwright 150 passed. `guard:architecture`, `guard:design`, and `guard:file-size-regression` passed. `npm run typecheck:changed` against `main` exits 2 only on the existing `splat-viewer-scene.tsx` lines 197–199.



