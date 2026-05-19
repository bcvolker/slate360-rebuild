# Site Walk Two-Week Foundational Launch Plan

Last Updated: 2026-05-14
Status: Planning document. No code changes.

## Assumptions

- "Foundational launch" = first real users can sign up, be approved, create worksites, do walks, create basic deliverables, and the app can be submitted to at least Google Play (Android) via TWA or Capacitor.
- iOS App Store submission may follow 1–2 days later due to longer review times.
- Backend is largely production-ready. The work is primarily frontend shell swaps, native wrapping, and testing.
- Agent (Copilot/Claude) handles code. Human handles App Store account setup, store listing copy, screenshots, and physical device testing.

---

## Week 1: V1 Shell + Production Swap + Core Features

### Day 1 (Wed) — V1 Shell Finalization

**Goal:** Finalize V1 preview components, wire useProjectLabel to real entitlements.

- Wire `useProjectLabel` prop to `canCreateFullProject()` from lib/project-access.ts
- Ensure V1 shell header shows real org name from server context
- Add in-app support/help route (minimal — link to support@slate360.ai + feedback form)
- Remove "Coming Soon" from DashboardMyAccount.tsx and PunchListForm.tsx

**Files:** components/site-walk/v1/*, app/site-walk-v1-preview/page.tsx, components/dashboard/DashboardMyAccount.tsx, project-hub PunchListForm.tsx
**Validation:** typecheck, build, mobile viewport check
**Risk:** Low — additive changes only

### Day 2 (Thu) — Production Route Swap (Home + Worksites)

**Goal:** Swap production /site-walk Home and Worksites pages to V1 components.

- Replace SiteWalkHub.tsx imports with V1 shell/action-grid/list-panel
- Wire real session/project data into V1 components via existing server loaders
- Ensure SiteWalkShell module nav is replaced by V1 shell nav
- Keep capture/plan routes untouched

**Files:** app/site-walk/page.tsx, app/site-walk/_components/SiteWalkHub.tsx, app/site-walk/(act-2-inputs)/walks/page.tsx, components/site-walk/SiteWalkShell.tsx, SiteWalkModuleNav.tsx
**Validation:** typecheck, build, verify /site-walk renders V1 layout
**Phone test:** Open /site-walk on mobile — confirm action grid, list panel, no pills, no giant cards
**Risk:** Medium — modifying production route rendering. Must preserve data loading.

### Day 3 (Fri) — SlateDrop + Coordination Shells

**Goal:** Wire SlateDrop and Coordination tabs in the production Site Walk shell.

- SlateDrop tab: render SlateDrop file browser inline or link to /slatedrop
- Coordination tab: build minimal assignments/comments/inbox list from existing APIs
- Wire /api/site-walk/assignments, /api/site-walk/comments, /api/site-walk/inbox into Coordination view

**Files:** app/site-walk/ layout or routing, new coordination components, new slatedrop bridge component
**Validation:** typecheck, build, verify tabs navigate correctly
**Phone test:** All 5 bottom nav tabs work
**Risk:** Medium — new frontend surfaces but using existing APIs

### Day 4 (Sat) — Deliverables Shell + Creation Flow

**Goal:** Build functional deliverable creation from a walk.

- Replace deliverables list page with V1 Deliverables view
- Build "Create Deliverable" form that selects a walk, picks a type, and calls POST /api/site-walk/deliverables
- Wire deliverable share/export buttons to existing API
- Show draft/published/shared sections with real data

**Files:** app/site-walk/(act-3-outputs)/deliverables/*, new DeliverableCreationForm component
**Validation:** typecheck, build, test create → list → share flow
**Phone test:** Create a deliverable from a walk, verify it appears in list
**Risk:** Medium — new UI but straightforward API calls

### Day 5 (Sun) — Plan Tools + Pin Polish

**Goal:** Implement saved pin move/delete and plan sheet navigation.

- Add sheet picker UI (dropdown or horizontal strip) to PlanViewerLeaflet area
- Implement "Move Pin" mode for saved pins — explicit toggle, drag, confirm
- Implement "Delete Pin" with confirmation dialog
- Wire to existing PATCH/DELETE /api/site-walk/pins/[id]

**Files:** components/site-walk/capture/PlanViewerLeaflet.tsx, PlanQuickActionMenu.tsx, new PlanSheetPicker component
**Validation:** typecheck, build
**Phone test:** Switch sheets, move a saved pin, delete a saved pin
**Risk:** High — touching working plan/pin behavior. Must not regress pan/zoom or pin creation.

### Day 6 (Mon) — Landscape + Tablet Polish

**Goal:** Basic landscape and tablet support for all V1 surfaces.

- Add landscape-aware layout for plan workspace (maximize canvas)
- Add tablet breakpoint (md:) for shell — wider content, optional sidebar
- Test capture bottom sheet in landscape
- Fix any overflow/scroll issues at landscape/tablet viewports

**Files:** V1 shell components, capture components CSS, plan workspace CSS
**Validation:** typecheck, build
**Phone test:** Rotate phone to landscape — plan workspace should expand canvas
**Risk:** Low-Medium — CSS-only changes but must not break portrait

### Day 7 (Tue) — Integration Testing + Bug Fixes

**Goal:** Full walk-through testing on mobile device.

- Complete walk-through: sign up → approve → create worksite → upload plan → start walk → capture → save → return to plan → open pin → create deliverable → share
- Fix any bugs found
- Verify offline capture queue works (toggle airplane mode, capture, toggle back, verify sync)
- Test all bottom nav tabs with real data

**Files:** Bug fixes only
**Validation:** typecheck, build, full smoke test
**Phone test:** Complete end-to-end flow on physical iPhone and Android
**Risk:** Medium — bugs will be found

---

## Week 2: Native Wrapper + Store Prep + Submission

### Day 8 (Wed) — Capacitor Setup

**Goal:** Add Capacitor native wrapper for iOS and Android.

- Install @capacitor/core, @capacitor/cli, @capacitor/ios, @capacitor/android
- Create capacitor.config.ts targeting the Vercel production URL
- Add ios/ and android/ directories
- Configure camera, geolocation, file access permissions in native manifests
- Build initial native project

**Files:** capacitor.config.ts, ios/, android/, package.json
**Validation:** capacitor sync, build native projects
**Phone test:** Open app via native wrapper on both platforms
**Risk:** Medium — first native wrapper, may need config iterations

### Day 9 (Thu) — Native Polish + Splash Screens

**Goal:** Native-quality launch experience.

- Generate app icons for all required sizes (iOS: 20–1024pt, Android: mdpi–xxxhdpi)
- Create splash screens for iOS and Android
- Add apple-touch-icon meta tag
- Configure status bar, keyboard behavior, safe areas in Capacitor
- Test deep linking (if applicable)
- Fix any WebView-specific rendering issues

**Files:** public/ icons, ios/ assets, android/ assets, capacitor config
**Validation:** Build both platforms
**Phone test:** Cold launch, splash screen, immediate usability
**Risk:** Medium — WebView quirks on iOS (especially keyboard/safe-area)

### Day 10 (Fri) — App Store Accounts + Listings

**Goal:** Prepare store presence (human task, minimal code).

- Create Apple Developer account (if not exists) — $99/year
- Create Google Play Console account (if not exists) — $25 one-time
- Write app description, keywords, feature list
- Take 6.7" and 5.5" screenshots (iOS) + phone/tablet (Android)
- Fill age rating questionnaires
- Declare encryption (HTTPS = yes)
- Prepare reviewer account credentials

**Files:** None (human task)
**Risk:** Low — admin work

### Day 11 (Sat) — Final Bug Fixes + Reviewer Account

**Goal:** Ship-quality polish.

- Create reviewer demo account with is_app_reviewer=true
- Pre-populate reviewer account with a sample worksite, walk with captures, and a deliverable
- Fix any remaining UI issues found during screenshot taking
- Verify all store-required pages (privacy, terms, account deletion) work in native wrapper
- Run final typecheck + build

**Files:** Bug fixes, seed script for reviewer data
**Validation:** Full regression
**Phone test:** Complete flow as reviewer account
**Risk:** Low

### Day 12 (Sun) — Google Play Submission

**Goal:** Submit Android app to Google Play.

- Generate signed AAB (Android App Bundle)
- Upload to Google Play Console
- Fill all required store listing fields
- Submit for review (internal testing track first, then production)
- Google Play review typically takes hours to 2 days

**Files:** android/ build artifacts
**Risk:** Low — Google Play is generally faster to approve

### Day 13 (Mon) — iOS Submission

**Goal:** Submit iOS app to App Store.

- Generate signed IPA via Xcode or Capacitor CLI
- Upload to App Store Connect via Transporter
- Fill all required metadata
- Submit for review
- Apple review typically takes 1–3 days

**Files:** ios/ build artifacts
**Risk:** Medium — Apple is stricter, may reject on first try

### Day 14 (Tue) — Buffer + Response Day

**Goal:** Handle review feedback, fix rejection issues.

- Respond to any App Store reviewer questions
- Fix any rejection reasons (usually UI or permission description issues)
- Re-submit if needed
- Monitor both stores for approval

**Files:** Whatever needs fixing
**Risk:** High — rejection is possible

---

## Daily Risk Summary

| Day | Risk Level | Primary Concern |
|---|---|---|
| 1 | Low | Additive changes |
| 2 | Medium | Production route swap |
| 3 | Medium | New frontend surfaces |
| 4 | Medium | New creation flow |
| 5 | **High** | Touching plan/pin behavior |
| 6 | Low-Medium | CSS changes |
| 7 | Medium | Bug discovery |
| 8 | Medium | First native wrapper |
| 9 | Medium | WebView quirks |
| 10 | Low | Admin work |
| 11 | Low | Polish |
| 12 | Low | Submission |
| 13 | Medium | Apple strictness |
| 14 | High | Rejection response |
