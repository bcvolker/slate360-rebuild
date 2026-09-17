# Slate360 Phase 1 — Implementation Status

**Last updated:** 2026-09-17  
**Current slice:** 0 — **APPROVED WITH SMALL FIXES** (documentation corrections; awaiting final Slice 0 approval)  
**Next slice:** 1 (vNext foundation + shells) — **NOT STARTED**

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
| 0 | Repo audit + salvage map + route contract | **APPROVED WITH SMALL FIXES** — awaiting final Slice 0 approval after this doc correction |
| 1 | vNext foundation + shells | Not started |
| 2 | Client project portfolio | Not started |
| 3 | Client project overview | Not started |
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

## Safety confirmation (Slice 0, including this doc correction)

- No user-facing UI was designed or changed
- No routes were renamed, added (except docs), or deleted
- No legacy code was deleted
- No reconstruction, Gaussian-splatting, trainer, COLMAP, photogrammetry, LiDAR processing, Modal, or Trigger worker code was modified
- No future product (Site Walk, Twin 360, Thermal Studio, SlateDrop, Tours, studios) was newly exposed
- No subscription/billing behavior changed
- `middleware.ts` was not altered
- Slice 1 was not started

---

## Handoff — wait for final Slice 0 approval

Slice 0 received **APPROVED WITH SMALL FIXES**. This commit is the documentation correction only.

Do not begin Slice 1 until Brian sends explicit **final Slice 0 approval**.
