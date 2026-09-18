# Slate360 Phase 1 — Implementation Status

**Last updated:** 2026-09-17  
**Current slice:** 3 (client project overview) on `feature/ui-vnext-phase1`  
**Next slice:** 4 (unified Explore viewer) — **NOT STARTED**

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
| 3 | Client project overview | **IMPLEMENTED (visually corrected) — awaiting approval** |
| 4 | Unified Explore viewer | Not started |
| 5 | Items + spatial linking | Not started |
| 6 | Documents + project search | Not started |
| 7 | History + Compare | Not started |
| 8 | Presentation / social clip foundation | Not started |
| 9 | Owner Home + Clients + Projects | Not started |
| 10 | Processing + QA & Publish | Not started |
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

Logo: homepage `SlateIcon` + SLATE/360 wordmark. Cobalt remains the interaction accent only.

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

## Handoff

Slice 3 (as visually corrected) completion report is returned in the assistant response. Do not
begin Slice 4 until Brian explicitly approves this corrected Slice 3.
