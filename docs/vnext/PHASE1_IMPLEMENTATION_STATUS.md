# Slate360 Phase 1 — Implementation Status

**Last updated:** 2026-09-17  
**Current slice:** 0 complete — waiting for explicit approval  
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
| Created this slice? | Yes — did not previously exist |
| Baseline | `origin/main` |
| Starting SHA | `a7b1c66c0871c4e41adb89d0d58dab86183a9665` |
| Tracking | `origin/main` (no remote feature branch pushed in Slice 0 unless requested) |
| Isolation | Did not use or overwrite `C:\s360`, reconstruction worktrees, or `C:\s360-dashboard-portal` |
| Older UI branch | `origin/feature/ui-phase-1` inspected only; already contained in `main`; not adopted |

---

## Slice status

| Slice | Name | Status |
|---|---|---|
| 0 | Repo audit + salvage map + route contract | **COMPLETE — awaiting APPROVED** |
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
| `docs/vnext/PHASE1_IMPLEMENTATION_STATUS.md` | This status + Slice 0 handoff |
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
6. Device middleware swaps `/dashboard` ↔ `/app` — responsive testing of current product is misleading.
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

## Proposed parallel implementation (Slice 1+, pending approval)

Production routes stay live.

Recommended:

- Client/owner vNext: `/vnext/...` (CEO/preview gated)
- Visual harnesses: `/preview/vnext/...`
- Cutover + legacy redirects: Slice 12 only

Do not restyle `DashboardDesktopShell` in place.

---

## Blockers for Slice 1 (need Brian)

These are listed in salvage map §20. Short list:

1. Confirm stay on `origin/main` (do not merge spatial/reconstruction branches).
2. Confirm `/vnext` parallel prefix vs preview-only.
3. Confirm client identity = token portal first (no identity migration).
4. Confirm whether Slice 1 may **exempt `/vnext` from middleware device swap** (middleware is otherwise a forbidden zone).
5. Confirm billing/studios remain hidden in vNext nav.

---

## Safety confirmation (Slice 0)

- No user-facing UI was designed or changed
- No routes were renamed, added (except docs), or deleted
- No legacy code was deleted
- No reconstruction, Gaussian-splatting, trainer, COLMAP, photogrammetry, LiDAR processing, Modal, or Trigger worker code was modified
- No future product (Site Walk, Twin 360, Thermal Studio, SlateDrop, Tours, studios) was newly exposed
- No subscription/billing behavior changed
- Slice 1 was not started

---

## Handoff — wait for approval

Reviewer result required before any Slice 1 work:

- APPROVED
- APPROVED WITH SMALL FIXES
- REVISE BEFORE NEXT SLICE

Do not begin Slice 1 until Brian sends explicit approval.
