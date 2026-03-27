# Slate360 — Master Build Sequence

Last Updated: 2026-03-27
Status: Living document. Update the Phase Completion Tracker after every session.

**Read this at the start of any chat where you are unsure what to work on next.**

This document ties together all refactor guides, app build guides, and ecosystem plans into one ordered sequence. Every phase is listed in execution priority with prompt estimates and dependency chains.

For revenue math, pricing analysis, agent collaboration protocol, and app store submission strategy, read:
→ `slate360-context/REVENUE_ROADMAP.md`

---

## Critical Insight: Group B Does NOT Block Revenue

Group B (platform stabilization — the 300-line refactors) does NOT need to complete before Tour Builder and PunchWalk are live and generating revenue. Those are new modules that do not touch the existing monolith files.

**Revenue-first path skips Group B entirely:** Groups A → C → D → E = ~23 prompts to Tour Builder live and billable.

**When to do Group B:**
- B1 (useDashboardState split): before building Design Studio or Content Studio
- B2 (BUG-013 analytics): quick win, 1 prompt, do any time
- B3–B5 (Dashboard + PH extractions): when those files need new features
- B6–B8 (SlateDrop + LocationMap): when adding SlateDrop features or after A1

---

## Time Estimates Per Prompt Type

| Prompt Type | Examples | Prompts/Day |
|---|---|---|
| Config / admin (no code) | Stripe product creation, Apple Developer application | 10–20 |
| Quick bug fix | BUG-019, BUG-001 | 8–12 |
| Refactor (monolith file) | useDashboardState split, LocationMap DrawingManager | 3–5 |
| Build (green-field module) | Tour Builder API, PunchWalk components | 8–12 |
| Stabilization | typecheck + wiring verification | 8–12 |

**Typical day fast building (green-field): 10+ prompts. Typical day fixing/refactoring: 4–6 prompts.**

---

## Current State Snapshot

| Module | Reality | Files | Blocker |
|---|---|---|---|
| Dashboard client | ✅ 277 lines, under limit | `DashboardClient.tsx` | — |
| Dashboard state hook | 🔴 775 lines, over limit | `useDashboardState.ts` | Phase B1 |
| LocationMap | 🔴 1,892 lines, BUG-018 DrawingManager deprecated | `LocationMap.tsx` | **May 2026 deadline** |
| DashboardWidgetRenderer | 🔴 513 lines, over limit | `DashboardWidgetRenderer.tsx` | Phase B3 |
| Project Hub tool pages | 🔴 9 pages over 300 lines | management=931, photos=599… | Phase B4 |
| Project Hub components | 🔴 3 components over 300 lines | ProjectDashboardGrid=560… | Phase B5 |
| SlateDrop client | 🔴 451 lines, over limit | `SlateDropClient.tsx` | Phase B6 |
| `file_folders` migration | 🔴 BUG-001, multiple files still use old table | Multiple | Phase A3 |
| SlateDrop widget CTA | 🔴 BUG-019, extra click in widget mode | Widget shell files | Phase A2 |
| Stripe platform billing | 🟡 Connected, NOT smoke-tested | `app/api/stripe/webhook/` | Phase C1 |
| `org_feature_flags` table | 🔴 Does not exist | — | Phase C2 |
| Tour Builder | 🔴 Scaffold shell only | `ToursShell.tsx` (37 lines) | Phase E |
| Design Studio | 🔴 Scaffold shell only | `DesignStudioShell.tsx` (37 lines) | Not in this sequence |
| Content Studio | 🔴 Scaffold shell only | 37 lines | Not in this sequence |
| PunchWalk | 🔴 Does not exist | — | Phase F |
| PWA service worker | 🔴 Does not exist | — | Phase G |
| App stores (iOS/Android) | 🔴 Does not exist | — | Phase H |

### Scope Reduction Consideration (Owner Decision Required)

The following modules are scaffolded shells with no features and no near-term revenue path. The owner is considering pausing or removing them to focus development on revenue-generating modules.

| Module | Entitlement | Route | Status | Recommendation |
|---|---|---|---|---|
| Geospatial & Robotics | `canAccessGeospatial` | `/(dashboard)/geospatial` | Scaffolded, 37-line shell | **Pause — hide the tab** |
| Virtual Studio | `canAccessVirtualStudio` | `/(dashboard)/virtual-studio` | Scaffolded, 37-line shell | **Pause — hide the tab** |
| Athlete360 | `canAccessAthlete360` (internal only) | `/athlete360` | Internal route stub | **Confirmed out of scope — archive** |

**To hide a tab without deleting it:** Remove its entry from `MODULE_REGISTRY.md` and comment out its nav entry in the dashboard tab config. Do not delete the shell files — they can be restored later. Update `ops/module-manifest.json` to mark status as `paused`.

**Decision is NOT yet made.** Do not act on this until the owner confirms.

---

## Phase Groups: Ordered Execution

### GROUP A — Critical Fixes (Do First, Unblocks Everything)

These are bugs or migrations that will cause problems if new features are built on top of them. Fix these before adding any new module.

#### A1 — BUG-018: LocationMap DrawingManager Migration (CRITICAL DEADLINE — May 2026)

**What:** `LocationMap.tsx` (1,892 lines) uses the deprecated Google Maps DrawingManager API. Google has set a deprecation deadline. If not migrated, the Location Map breaks for all users.

**Detailed plan:** `slate360-context/refactor/DASHBOARD_REFACTOR_GUIDE.md` Phase 7

**Estimated prompts:** 3

**Blocking:** Everyone who uses the dashboard location map. This is a ticking bomb.

**Dependency:** Nothing. Can be done right now.

---

#### A2 — BUG-019: SlateDrop Widget Extra Click Fix

**What:** The SlateDrop widget shell shows an "Open SlateDrop" CTA button even when the embedded client is already displayed. User has to click twice.

**Detailed plan:** `slate360-context/refactor/SLATEDROP_REFACTOR_GUIDE.md` Phase 2

**Estimated prompts:** 1

**Blocking:** Dashboard and Project Hub widget UX. Not critical path to features but high-visibility bug.

**Dependency:** Nothing.

---

#### A3 — BUG-001: Complete `file_folders` → `project_folders` Migration

**What:** Multiple files (Design Studio page, export-zip route, audit trail service, cross-tab upload service) still write to the old `file_folders` table. New code must use `project_folders`.

**Detailed plan:** `slate360-context/refactor/SLATEDROP_REFACTOR_GUIDE.md` Phase 1

**Estimated prompts:** 1–2

**Blocking:** All new folder write code. If Design Studio or Content Studio is built before this is fixed, they may silently use the wrong table.

**Dependency:** Nothing.

---

### GROUP B — Platform Stabilization (Refactors — Do Before Feature Work)

These bring all files under the 300-line limit and cleanly separate concerns. While technically optional (the code works), running large AI sessions on monolith files causes blind spots and partial fixes. Fix these before building major features.

**Read the relevant refactor guide BEFORE starting any phase in this group.**

#### B1 — Split `useDashboardState.ts` (775 → Sub-Hooks)

**Detailed plan:** `slate360-context/refactor/DASHBOARD_REFACTOR_GUIDE.md` Phase 5B

**Estimated prompts:** 2

**Dependency:** Nothing.

---

#### B2 — BUG-013: Project Hub Tier 1 Analytics Snapshot

**What:** The all-projects view (Tier 1) is missing a high-level analytics snapshot. Users see a project grid but no summary metrics.

**Detailed plan:** `slate360-context/refactor/PROJECT_HUB_REFACTOR_GUIDE.md` Phase 1 (BUG-013)

**Estimated prompts:** 1

**Dependency:** Nothing.

---

#### B3 — Extract `DashboardWidgetRenderer.tsx` (513 → Under 300)

**Detailed plan:** `slate360-context/refactor/DASHBOARD_REFACTOR_GUIDE.md` Phase 6

**Estimated prompts:** 2

**Dependency:** B1 (state hook split) complete.

---

#### B4 — Extract Project Hub Tool Pages (9 pages, 339–931 lines each)

**What:** Every one of the 9 Project Hub tool pages is over the 300-line limit. Extract in priority order: management (931), photos (599), submittals (579)…

**Detailed plan:** `slate360-context/refactor/PROJECT_HUB_REFACTOR_GUIDE.md` Phases 2–7

**Estimated prompts:** 5 (roughly one per page pair, batching similar structures)

**Dependency:** B2 complete.

---

#### B5 — Extract Project Hub Component Files

**What:** `ProjectDashboardGrid.tsx` (560), `WizardLocationPicker.tsx` (412), `ObservationsClient.tsx` (334) are all over limit.

**Detailed plan:** `slate360-context/refactor/PROJECT_HUB_REFACTOR_GUIDE.md` Phases 8–9

**Estimated prompts:** 2

**Dependency:** B4 complete.

---

#### B6 — Extract `SlateDropClient.tsx` (451 → Under 300)

**Detailed plan:** `slate360-context/refactor/SLATEDROP_REFACTOR_GUIDE.md` Phase 3

**Estimated prompts:** 2

**Dependency:** A2 + A3 complete.

---

#### B7 — Extract `ProjectFileExplorer.tsx` (363 → Under 200)

**Detailed plan:** `slate360-context/refactor/SLATEDROP_REFACTOR_GUIDE.md` Phase 4

**Estimated prompts:** 1

**Dependency:** B6 complete.

---

#### B8 — LocationMap Extraction (1,892 → Multiple Files)

**What:** After the DrawingManager migration (A1), `LocationMap.tsx` still needs to be split into sub-components (map controls, drawing overlay, saved location list) to stay under the 300-line limit.

**Detailed plan:** `slate360-context/refactor/DASHBOARD_REFACTOR_GUIDE.md` Phase 8

**Estimated prompts:** 3

**Dependency:** A1 complete.

---

**Group B Total: ~18 prompts**

---

### GROUP C — Stripe + App Entitlement Foundation

This is the prerequisite for monetizing any standalone app. Do Groups A + B first, OR run C1 in parallel since it's just smoke-testing, not code.

#### C1 — Smoke-Test Stripe Platform Billing End-to-End

**What:** The Stripe business account is connected but has NOT been tested. This verifies the checkout → webhook → DB update cycle works before building any new app subscription on top of it.

**Detailed plan:** `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` Phase 1A

**Estimated prompts:** 1 (setup and test, or 2 if webhook needs fixing)

**Dependency:** Nothing — can be done any time.

**Important:** Use Stripe test mode and test card `4242 4242 4242 4242` throughout. Do NOT use live cards until the full cycle is verified.

---

#### C2 — Create Tour Builder + PunchWalk Stripe Products

**What:** Add standalone app products in the Stripe Dashboard (not code — this is done in the UI). Then add the price IDs to environment variables.

**Detailed plan:** `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` Phase 1B

**Estimated prompts:** 1 (configuration, not code)

**Dependency:** C1 confirmed working.

---

#### C3 — `org_feature_flags` Table + Migration

**What:** New Supabase table that persists per-org app entitlements. Required for any standalone app subscription to be enforced.

**Detailed plan:** `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` Phase 2A

**Estimated prompts:** 1

**Dependency:** C1 complete.

---

#### C4 — `getEntitlements()` App Flag Merge

**What:** Update `lib/entitlements.ts` to accept and merge `org_feature_flags` alongside the existing tier-based entitlements.

**Detailed plan:** `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` Phase 2B

**Estimated prompts:** 1

**Dependency:** C3 complete.

---

#### C5 — Webhook Writes App Entitlement Flags

**What:** Update `app/api/stripe/webhook/route.ts` to write `org_feature_flags` rows when a standalone app checkout completes, and disable them on cancellation.

**Detailed plan:** `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` Phase 2C

**Estimated prompts:** 1

**Dependency:** C3 + C4 complete.

---

#### C6 — Middleware + Server Pages Protect App Routes

**What:** Add `/punch-walk` and `/apps` routes to middleware protected list. Add entitlement gates in app server components.

**Detailed plan:** `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` Phase 2D

**Estimated prompts:** 1

**Dependency:** C4 complete.

---

#### C7 — App Landing Pages + New-User Subscription Funnel

**What:** Build the `/apps`, `/apps/tour-builder`, and `/apps/punch-walk` marketing/subscribe pages. This is the face of the app to new subscribers — someone who just wants the app, not the whole platform.

**Detailed plan:** `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` Phase 3

**Estimated prompts:** 2

**Dependency:** C5 + C6 complete.

---

**Group C Total: ~8 prompts** (some are config steps, not heavy code)

---

### GROUP D — 360 Tour Builder MVP (Integrated Tab)

Build Tour Builder as a dashboard tab first. The standalone/subscribe version comes in Group E.

**Read `slate360-context/dashboard-tabs/tour-builder/BUILD_GUIDE.md` before starting ANY prompt in this group.**

| Prompt | Description |
|---|---|
| D1 | Types + Schema + Migration |
| D2 | Server Queries + CRUD API |
| D3 | Upload Pipeline (panorama images) |
| D4 | Builder Shell Layout (dashboard tab) |
| D5 | Scene Ordering + 360 Viewer Wiring |
| D6 | Logo Overlay Controls |
| D7 | Publish + Clean Viewer Route |
| D8 | Stabilization + Guardrails |

**Group D Total: 8 prompts**

**Dependency:** C3 + C4 (entitlement foundation) complete.

---

### GROUP E — 360 Tour Builder Standalone + Subscription

After the Tour Builder MVP is live as a dashboard tab, wire it for standalone subscription.

| Prompt | Description |
|---|---|
| E1 | Standalone Route (`/apps/tour-builder`) + Entitlement Gating |
| E2 | Post-Checkout Onboarding Flow |
| E3 | Stabilization + Context Doc Updates |

**Group E Total: 3 prompts**

**Dependency:** D8 + C7 complete.

---

### GROUP F — PunchWalk MVP (Core Web App, Mobile-First)

Build the PunchWalk standalone app (no dashboard chrome).

**Read `slate360-context/apps/PUNCHWAIK_BUILD_GUIDE.md` before starting ANY prompt in this group.**

| Prompt | Description |
|---|---|
| F1 | Types + Schema Migration (additive — extends existing `project_punch_items`) |
| F2 | PunchWalk API Routes |
| F3 | App Shell + Project Selector (standalone, no dashboard) |
| F4 | Active Punch List View |
| F5 | Add Item Form (mobile-first, keyboard-friendly) |
| F6 | Camera Capture + Photo Upload |
| F7 | Resolve Flow + PDF Export |
| F8 | Stabilization + Project Hub Wiring |

**Group F Total: 8 prompts**

**Dependency:** C3 + C4 + C7 complete. F1 requires checking that A3 (file_folders migration) is done first.

---

### GROUP G — PWA Infrastructure (Shared — Tour Builder + PunchWalk)

This phase makes both apps installable and enables the "Download from the web" experience before the native app stores.

**Read `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` Phase 4 before starting.**

| Prompt | Description |
|---|---|
| G1 | Install `@ducanh2912/next-pwa`, configure `next.config.ts`, update manifest icons |
| G2 | PunchWalk offline punch item cache (IndexedDB queue via Dexie) |
| G3 | PWA install prompt component + iOS meta tags + app shell polish |

**Group G Total: 3 prompts**

**Dependency:** F8 complete. Tour Builder and PunchWalk both stable.

**What this unlocks:** After G3, users can add Slate360 to their home screen on iOS and Android. This is the MVP "app store" experience — available immediately without going through Apple or Google review.

---

### GROUP H — PunchWalk Subscription (Monetize PunchWalk)

| Prompt | Description |
|---|---|
| H1 | PunchWalk Landing Page + Stripe Checkout |
| H2 | Post-Checkout Onboarding + Entitlement Gating |

**Group H Total: 2 prompts**

**Dependency:** F8 + C7 complete.

---

### GROUP I — Capacitor: iOS and Android App Stores

This is the final phase — native app store listing for both Tour Builder and PunchWalk simultaneously.

**Read `slate360-context/apps/APP_ECOSYSTEM_GUIDE.md` Phase 5 before starting.**

**Prerequisites (all must be true before touching Capacitor):**
- PWA Lighthouse score 90+ (G3 complete)
- Stripe subscription works end-to-end (C5 verified)
- Both apps stable on web (`/apps/tour-builder`, `/punch-walk`)
- Apple Developer Program enrollment ($99/yr)
- Google Play Developer account enrollment ($25 one-time)

| Prompt | Description |
|---|---|
| I1 | Capacitor init + iOS platform add |
| I2 | Android platform add + build config |
| I3 | Auth + storage in native shell (cookie/WebView setup) |
| I4 | Camera + file system in native shell |
| I5 | iOS build → Simulator test → TestFlight upload |
| I6 | Android build → Emulator test → Google Play internal track |

**Group I Total: 6 prompts** (plus app store review time — Apple typically 1–5 business days for first submission)

---

## Total Estimated Prompt Count

| Group | Description | Prompts |
|---|---|---|
| A | Critical fixes | ~6 |
| B | Platform stabilization | ~18 |
| C | Stripe + app foundation | ~8 |
| D | Tour Builder MVP (dashboard tab) | 8 |
| E | Tour Builder standalone + subscription | 3 |
| F | PunchWalk MVP | 8 |
| G | PWA infrastructure | 3 |
| H | PunchWalk subscription | 2 |
| I | Capacitor iOS + Android app stores | 6 |
| **Total** | **Both apps live in app stores** | **~62 prompts** |

**Realistic range:** 55–75 prompts depending on how clean the implementation goes. Stripe issues, schema surprises, or Capacitor WebView bugs each add 2–5 prompts.

**Fastest path to first revenue:** Groups A + C + D + E = ~25 prompts to Tour Builder live and billable on the web. This alone validates the ecosystem model before investing in PunchWalk and Capacitor.

---

## Dependency Chain (What Blocks What)

```
A1 (BUG-018) ──────────────────────── B8 (LocationMap extraction)
A2 (BUG-019) ──────────────────────── B6 (SlateDropClient extraction)
A3 (BUG-001) ──────────────────────── B6 + F1

C1 (Stripe smoke test)
  └─── C2 (app products) 
         └─── C5 (webhook writes flags)

C3 (org_feature_flags table)
  └─── C4 (getEntitlements merge)
         └─── C5 (webhook)
                └─── C6 (middleware gate)
                       └─── C7 (app landing pages)
                              └─── D (Tour Builder MVP)
                                     └─── E (Tour Builder standalone)
                                            └─── G (PWA)
                                                   └─── I (Capacitor)
                              └─── F (PunchWalk MVP)
                                     └─── H (PunchWalk subscription)
                                            └─── G (PWA)
                                                   └─── I (Capacitor)

B1 through B7 can run in parallel with C1–C7 (they don't share files)
A1 and A2 can run in parallel with each other
```

---

## Which Phases Overlap or Conflict

### BUG-019 is in two guides — clarification

Both the `DASHBOARD_REFACTOR_GUIDE.md` (Phase 6 note) and `SLATEDROP_REFACTOR_GUIDE.md` (Phase 2) mention BUG-019.

**The fix lives in SlateDrop.** The widget shell files that show the redundant CTA button are SlateDrop components rendered in the dashboard — not DashboardClient code. Execute the fix using the SLATEDROP_REFACTOR_GUIDE Phase 2 plan. The Dashboard guide's Phase 6 reference is informational only (it notes the fix happens there, not that Dashboard code changes).

### Phase numbers conflict across guides

The DASHBOARD_REFACTOR_GUIDE uses "Phase 5B", "Phase 6", "Phase 7"… The SLATEDROP_REFACTOR_GUIDE uses "Phase 1", "Phase 2"… The APP_ECOSYSTEM_GUIDE uses "Phase 1A", "Phase 2B"… These are **local phase numbers within each guide**, not global sequence numbers.

Use the GROUP letters in THIS document (A, B, C…) as the global ordering system. The guide-local phase numbers are for detail within each execution session.

### Design Studio and Content Studio are NOT in this sequence

They have BUILD_GUIDEs (`slate360-context/dashboard-tabs/design-studio/BUILD_GUIDE.md` and `content-studio/BUILD_GUIDE.md`) but are NOT on the critical path to app store delivery. They can be built in parallel with Groups D–H if resources allow, or deferred entirely until Tour Builder and PunchWalk are live.

---

## Multi-Chat Memory Protocol

Every chat that touches this build sequence must:

### Start of Chat
1. Read `SLATE360_PROJECT_MEMORY.md` — latest session handoff section only.
2. Read THIS file (MASTER_BUILD_SEQUENCE.md) — check the Phase Completion Tracker below.
3. Read ONLY the guide for the specific phase being worked on — do not re-read completed phases.

### During the Chat
4. Before touching any shared file, run `mcp_gitnexus_impact`.
5. After each prompt's code is complete, run:
   - `get_errors` on all changed files
   - `npm run typecheck`
   - `mcp_gitnexus_detect_changes`
   - `bash scripts/check-file-size.sh`
6. Update the Phase Completion Tracker in this file.

### End of Chat
7. Write a structured handoff to `SLATE360_PROJECT_MEMORY.md` — Latest Session Handoff section.
8. The handoff must include: files changed, what's still broken, next steps ordered.

### When Starting a New Chat to Continue
9. The handoff in `SLATE360_PROJECT_MEMORY.md` IS your context. Do not re-discover the codebase.
10. If the handoff is unclear, ask before assuming.

---

## Phase Completion Tracker

Update this table at the end of every session. This is the single source of truth for build progress.

### Group A — Critical Fixes

| Phase | Description | Status | Notes |
|---|---|---|---|
| A1 | BUG-018: LocationMap DrawingManager migration | ⬜ Not started | **May 2026 deadline** |
| A2 | BUG-019: SlateDrop widget extra click fix | ⬜ Not started | — |
| A3 | BUG-001: `file_folders` → `project_folders` migration | ⬜ Not started | — |

### Group B — Platform Stabilization

| Phase | Description | Status | Notes |
|---|---|---|---|
| B1 | Split `useDashboardState.ts` (775 → sub-hooks) | ⬜ Not started | — |
| B2 | BUG-013: Project Hub Tier 1 analytics | ⬜ Not started | — |
| B3 | Extract `DashboardWidgetRenderer.tsx` (513 → under 300) | ⬜ Not started | Requires B1 |
| B4 | Extract Project Hub tool pages (9 pages) | ⬜ Not started | Requires B2 |
| B5 | Extract Project Hub components (3 files) | ⬜ Not started | Requires B4 |
| B6 | Extract `SlateDropClient.tsx` (451 → under 300) | ⬜ Not started | Requires A2 + A3 |
| B7 | Extract `ProjectFileExplorer.tsx` (363 → under 200) | ⬜ Not started | Requires B6 |
| B8 | LocationMap file extraction (after A1 migration) | ⬜ Not started | Requires A1 |

### Group C — Stripe + App Foundation

| Phase | Description | Status | Notes |
|---|---|---|---|
| C1 | Stripe platform billing smoke test | ⬜ Not started | Use test card, not live |
| C2 | Create Tour Builder + PunchWalk Stripe products | ⬜ Not started | Done in Stripe Dashboard UI |
| C3 | `org_feature_flags` table + migration | ⬜ Not started | — |
| C4 | `getEntitlements()` app flag merge | ⬜ Not started | Requires C3 |
| C5 | Webhook writes app entitlement flags | ⬜ Not started | Requires C3 + C4 |
| C6 | Middleware + server pages protect app routes | ⬜ Not started | Requires C4 |
| C7 | App landing pages + new-user subscription funnel | ⬜ Not started | Requires C5 + C6 |

### Group D — Tour Builder MVP

| Phase | Description | Status | Notes |
|---|---|---|---|
| D1 | Types + Schema + Migration | ⬜ Not started | Requires C3 + C4 |
| D2 | Server Queries + CRUD API | ⬜ Not started | — |
| D3 | Upload Pipeline (panorama images) | ⬜ Not started | — |
| D4 | Builder Shell Layout | ⬜ Not started | — |
| D5 | Scene Ordering + 360 Viewer Wiring | ⬜ Not started | — |
| D6 | Logo Overlay Controls | ⬜ Not started | — |
| D7 | Publish + Clean Viewer Route | ⬜ Not started | — |
| D8 | Stabilization + Guardrails | ⬜ Not started | — |

### Group E — Tour Builder Standalone + Subscription

| Phase | Description | Status | Notes |
|---|---|---|---|
| E1 | Standalone route + entitlement gating | ⬜ Not started | Requires D8 + C7 |
| E2 | Post-checkout onboarding | ⬜ Not started | — |
| E3 | Stabilization | ⬜ Not started | — |

### Group F — PunchWalk MVP

| Phase | Description | Status | Notes |
|---|---|---|---|
| F1 | Types + Schema Migration | ⬜ Not started | Requires A3 + C3 + C4 |
| F2 | PunchWalk API Routes | ⬜ Not started | — |
| F3 | App Shell + Project Selector | ⬜ Not started | — |
| F4 | Active Punch List View | ⬜ Not started | — |
| F5 | Add Item Form | ⬜ Not started | — |
| F6 | Camera Capture + Photo Upload | ⬜ Not started | — |
| F7 | Resolve Flow + PDF Export | ⬜ Not started | — |
| F8 | Stabilization + Project Hub Wiring | ⬜ Not started | — |

### Group G — PWA Infrastructure

| Phase | Description | Status | Notes |
|---|---|---|---|
| G1 | @ducanh2912/next-pwa config + manifest icons | ⬜ Not started | Requires F8 |
| G2 | PunchWalk offline queue (IndexedDB/Dexie) | ⬜ Not started | — |
| G3 | PWA install prompt + iOS meta + app shell polish | ⬜ Not started | — |

### Group H — PunchWalk Subscription

| Phase | Description | Status | Notes |
|---|---|---|---|
| H1 | PunchWalk landing page + Stripe checkout | ⬜ Not started | Requires F8 + C7 |
| H2 | Post-checkout onboarding + entitlement gating | ⬜ Not started | — |

### Group I — Capacitor / App Stores

| Phase | Description | Status | Notes |
|---|---|---|---|
| I1 | Capacitor init + iOS platform | ⬜ Not started | Requires G3 + all apps stable |
| I2 | Android platform + build config | ⬜ Not started | — |
| I3 | Auth + storage in native shell | ⬜ Not started | — |
| I4 | Camera + file system in native shell | ⬜ Not started | — |
| I5 | iOS build → TestFlight submission | ⬜ Not started | Needs Apple Dev account |
| I6 | Android build → Google Play submission | ⬜ Not started | Needs Google Play account |

---

## Quick-Start Prompt Templates

Copy-paste these at the start of a new implementation chat for any group.

### Starting Group A (Critical Fixes)

```
Read SLATE360_PROJECT_MEMORY.md (latest handoff section only), then read
slate360-context/MASTER_BUILD_SEQUENCE.md (Phase Completion Tracker section only).
We are doing: [A1 / A2 / A3 — pick one].
Read the detailed plan from: [appropriate refactor guide and phase].
Then implement it following the safe-build checklist in that guide.
Update the Phase Completion Tracker in MASTER_BUILD_SEQUENCE.md when done.
```

### Starting Group C (Stripe + App Foundation)

```
Read SLATE360_PROJECT_MEMORY.md (latest handoff section only), then read
slate360-context/MASTER_BUILD_SEQUENCE.md (Phase Completion Tracker only),
then read slate360-context/apps/APP_ECOSYSTEM_GUIDE.md (Phase [1A / 2A / 2B / 3] only).
We are doing: [C1 / C2 / C3 / C4 / C5 / C6 / C7].
Follow the plan in that section. Do not read other sections.
Update both trackers when done.
```

### Starting Tour Builder (Group D)

```
Read SLATE360_PROJECT_MEMORY.md (latest handoff only), then read
slate360-context/MASTER_BUILD_SEQUENCE.md (Tracker only), then read
slate360-context/dashboard-tabs/tour-builder/BUILD_GUIDE.md (full).
We are on Prompt [D1–D8]. Implement following the safe-build checklist.
Update both trackers when done.
```

### Starting PunchWalk (Group F)

```
Read SLATE360_PROJECT_MEMORY.md (latest handoff only), then read
slate360-context/MASTER_BUILD_SEQUENCE.md (Tracker only), then read
slate360-context/apps/PUNCHWAIK_BUILD_GUIDE.md (full).
We are on Prompt [F1–F8]. Implement following the safe-build checklist.
Update both trackers when done.
```

### Starting Capacitor (Group I)

```
Read SLATE360_PROJECT_MEMORY.md (latest handoff only), then read
slate360-context/apps/APP_ECOSYSTEM_GUIDE.md (Phase 5 only).
Confirm all prerequisites in Phase 5 are checked off before writing any code.
We are on: [I1–I6].
```
