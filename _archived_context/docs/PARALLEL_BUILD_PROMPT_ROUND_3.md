# Parallel Build Prompt — Round 3 (UI hardening + Mobile App Shell)

> Paste everything below the rule into the other AI assistant. Self-contained.
> Branch: `refactor/brand-token-migration-core-surfaces` on
> `bcvolker/slate360-rebuild`. HEAD as of this prompt: `a2143f7`.

> CONTEXT: The orchestrator (Claude/me) has already shipped the foundation
> (cost-model, 5 migrations, brand fixes, sidebar pin persistence). Your
> Round 2 work units (#2-#6) are STILL OUTSTANDING — finish those FIRST,
> then move to these. If you've already shipped #2-#6, proceed directly to
> Round 3.

---

You are continuing the Slate360 build. This round you'll deliver 6 work units
focused on UI hardening, the dedicated mobile app shell, and global removal
of legacy artifacts. The orchestrating engineer (Claude) handles DB
migrations + Stripe seeding directly.

================================================================================
ALL ROUND 1 + 2 CONVENTIONS STILL APPLY
================================================================================

Re-read `docs/PARALLEL_BUILD_PROMPT_ROUND_2.md` if needed. Critical reminders:
- Auth: `withAuth(req, handler)` / `withProjectAuth(req, ctx, handler)`. Read
  tier via `ctx.entitlements.tier`. NO `ctx.tier` / `ctx.user`.
- Response helpers: ok / created / noContent / badRequest / unauthorized /
  forbidden / notFound / conflict / serverError. Nothing else.
- DB: projects.created_by, project_folders, credit_ledger.organization_id /
  delta / category, slate360_staff keyed by email.
- Hard caps: no `any`, no file >300 lines, one component per file.
- DO NOT modify lib/server/api-auth.ts, api-response.ts, org-context.ts,
  api-app-access.ts, lib/billing/cost-model.ts.

================================================================================
KEY ARCHITECTURAL CLARIFICATION (avoid the previous round's confusion)
================================================================================

**There is ONE Next.js codebase that serves BOTH:**
1. **Web (browser)**: marketing homepage at `/`, web dashboard at `/dashboard`.
2. **Mobile App (PWA)**: same codebase, installed to home screen via the
   browser's "Add to Home Screen" / `beforeinstallprompt` flow. When launched
   as an installed PWA, the app should render a **dedicated mobile shell**
   (bottom nav, mobile-first layout) — NOT the desktop dashboard.

Detection: when running as installed PWA, `window.matchMedia('(display-mode:
standalone)').matches === true`. We use this to swap in the AppShell.

**Build a NEW route `/app` that serves as the dedicated mobile app surface.**
PWA manifest's `start_url` will be set to `/app`. Web users hitting `/dashboard`
get the existing desktop sidebar layout. Mobile/installed users hitting `/app`
get the AppShell with bottom nav.

================================================================================
WORK UNITS — BUILD IN ORDER
================================================================================

UNIT #7: REMOVE PROJECT HUB + MARKET ROBOT FROM SUBSCRIBER SURFACES
----------------------------------------------------------------

These two are NOT subscriber features. Remove from:
- All marketing copy (components/marketing-homepage.tsx — feature lists, app cards)
- Dashboard sidebar nav (components/dashboard/command-center/DashboardSidebar.tsx —
  the NAV_ITEMS array currently has `{ label: "Projects", href: "/project-hub" }`;
  change to `{ label: "Projects", href: "/projects" }` since /projects is the new
  unified route)
- Any landing/home components that mention them
- `lib/entitlements.ts` (if not already done in UNIT #2): drop `canAccessHub`

KEEP intact (do NOT delete the routes):
- `/market` (CEO-only internal tool, gated by isSlateCeo)
- `/project-hub/*` routes themselves stay for now (orchestrator will handle the
  301 redirect to /projects in a follow-up; you just remove the SUBSCRIBER-FACING
  links to them)

Verification: `grep -ri "project.hub\|project-hub\|market.robot\|/market\b" app/
components/ lib/ | grep -v "^app/api/market\|^app/market\|operations\|admin"`
should return zero hits in subscriber-facing files.

UNIT #8: MASS AMBER → COBALT SWEEP IN COMPONENTS
----------------------------------------------------------------

The `btn-amber-soft` CSS class was already remapped to cobalt. But raw Tailwind
utilities (`text-amber-500`, `bg-amber-500`, `border-amber-500`,
`hover:bg-amber-600`, `text-amber-400`, etc.) bypass the remap and STILL
RENDER AS AMBER.

Replace ALL raw amber utilities with cobalt equivalents in components/ and app/:
- `text-amber-500` → `text-cobalt`
- `text-amber-400` → `text-cobalt`
- `bg-amber-500` → `bg-cobalt`
- `bg-amber-500/10` → `bg-cobalt/10`
- `bg-amber-500/20` → `bg-cobalt/20`
- `bg-amber-950/40` → `bg-cobalt/10`
- `border-amber-500` / `border-amber-500/30` → `border-cobalt` / `border-cobalt/30`
- `border-amber-900/50` → `border-cobalt/40`
- `hover:bg-amber-500/20` → `hover:bg-cobalt/20`
- `hover:bg-amber-600` → `hover:bg-cobalt-strong`

EXCEPTION: keep amber for status indicators with semantic meaning that should
remain warning-yellow (e.g. "Pending"/"In Progress"/"Action Needed" in
punch-lists). Use `text-yellow-400` / `bg-yellow-500/20` for those — that's
already the established warning color in the design system.

Files known to contain amber (audit but don't trust this list — grep again):
- components/shared/DashboardHeader.tsx (notification dot)
- components/dashboard/command-center/CommandCenterContent.tsx
- app/(dashboard)/projects/[projectId]/punch-list/_shared.ts + page.tsx + PunchListItem.tsx
- app/(dashboard)/project-hub/[projectId]/* (mirror tree — same fixes)
- app/(dashboard)/project-hub/[projectId]/submittals/_shared.ts + page.tsx

Verification: `grep -rE "amber-[0-9]+" components/ app/ | grep -v "btn-amber-soft\|app-glow-amber\|node_modules"`
should return zero hits (or only the warning-yellow exceptions you preserved
intentionally — comment those with `// status: warning`).

UNIT #9: DASHBOARD TOP BAR DECONGESTION
----------------------------------------------------------------

The DashboardTopBar is currently crowded. Restructure:

File: components/dashboard/command-center/DashboardTopBar.tsx
- Left cluster (compact): hamburger toggle + small icon-only logo (24x24, NO
  wordmark — the wordmark lives in the sidebar header instead, visible when
  pinned)
- Center: leave empty (or breadcrumb when inside a project route — call
  useSelectedLayoutSegments to detect)
- Right cluster: search trigger (CMD+K), notifications bell, user menu avatar.
  Use existing components from `@/components/shared/header/*` if present.

Sidebar (DashboardSidebar.tsx):
- When pinned/open, show full color lockup `slate360-logo-cobalt-v3.svg` at
  top of sidebar (the sidebar bg is dark, but cobalt+graphite contrasts OK
  there). Wait — sidebar bg is `bg-zinc-950`, so use `slate360-logo-reversed-v2.svg`
  inside the sidebar for proper contrast.
- When sidebar is closed (collapsed), show only icon column 56px wide with
  the icon-only logo at top + nav icons (no labels). Hover reveals labels in
  a tooltip. This makes the sidebar a true "rail" mode.

Persistence: `localStorage.slate360.sidebar.pinned` already implemented by
the orchestrator — don't reinvent. Read on mount, write on toggle.

UNIT #10: DEDICATED MOBILE APP SHELL
----------------------------------------------------------------

New route: `/app/*` — this is what installed PWA users see.

Files:
- `app/(app)/layout.tsx` — server component, sets viewport meta for mobile,
  wraps children in `<MobileAppShell>`. Authenticated route: redirect to
  `/login?next=/app` if no user.
- `components/app/MobileAppShell.tsx` — client component, fixed bottom nav:
    Projects | Apps | Captures | Inbox | Account
  Plus persistent BetaFeedbackButton (from UNIT #5) if user.beta_tester.
  Header bar: SlateLogo (icon only, 28px) on left + page title centered +
  notifications bell on right.
- `app/(app)/app/page.tsx` — landing for /app, shows recent projects + quick
  capture CTA grid.
- `app/(app)/app/projects/page.tsx` — mobile projects list
- `app/(app)/app/apps/page.tsx` — 4 app tiles (Site Walk active during beta;
  Tours/Design/Content grayed with "Coming Soon" badge — clicking shows toast
  "Rolling out apps one at a time during beta")
- `app/(app)/app/captures/page.tsx` — quick capture launcher (camera, 360
  camera, voice note, file upload). Each launches the existing capture flow.
- `app/(app)/app/inbox/page.tsx` — notifications + comments + RFI replies
  (placeholder for now: "No notifications yet")
- `app/(app)/app/account/page.tsx` — mobile account view (name, email,
  subscription summary, sign out)

PWA manifest update (`app/manifest.ts`):
- Change `start_url` to `/app`
- Add `scope: '/app'` so the installed PWA stays in the app shell
- Confirm `display: 'standalone'`

Detection helper (so we can show "Open in App" prompts to mobile-web users):
- `lib/hooks/useIsStandalone.ts`: returns true if running as installed PWA.

UNIT #11: HOMEPAGE PERSISTENT "GET THE APP" CTA
----------------------------------------------------------------

The orchestrator added the hero CTA button copy ("Create Free Account") and
the "Free to download. 14-day all-access trial." subtext. Now add a STICKY
cross-page bottom-bar (mobile only, browser-not-installed-PWA):

- `components/home/MobileGetAppBar.tsx` — fixed bottom-of-screen pill on
  mobile-width browser sessions only (hidden on desktop, hidden when
  useIsStandalone() === true). Renders a slim cobalt bar:
  "📱 Get the Slate360 app — free  [Install]" with Install button using the
  same useInstallPrompt() hook.
- Mount in `app/(public)/layout.tsx` (or wherever the public site root layout
  lives — find via `app/(public)/` if it exists, else `app/page.tsx`).
- Suppresses itself if dismissed (sessionStorage key `slate360.getapp.dismissed`).

UNIT #12: GLOBAL REVERSAL OF EXISTING REVERSED LOGO INSTANCES
----------------------------------------------------------------

The orchestrator switched LandingHeader and LoginModal to the new cobalt
lockup (graphite text). Audit all OTHER places `slate360-logo-reversed-v2.svg`
appears (CollaboratorShell, LandingFooter, email templates, etc.) and decide:
- On dark surface (e.g. CollaboratorShell sidebar) → keep reversed-v2 (white text)
- On light surface (e.g. LandingFooter on white bg) → switch to cobalt-v3

Use `grep -r "slate360-logo-reversed-v2.svg" components/ lib/` to find them.
Also update lib/email.ts logoUrl + lib/design-system/tokens.ts to use the
cobalt variant for any LIGHT-bg emails (the existing branded HTML wrapper
has a dark gradient header → keep reversed there).

================================================================================
APPROVED COPY (UNCHANGED — same as Round 2)
================================================================================

(BETA WELCOME, CREDIT POLICY blocks unchanged — see Round 2.)

================================================================================
LOCKED PRODUCT DECISIONS (UNCHANGED)
================================================================================

- GitHub issue creation from beta feedback: MANUAL ONLY.
- Foundational 20% lifetime: REVOKED if subscription lapses >30 days.

================================================================================
VALIDATION CHECKLIST PER COMMIT
================================================================================

1. `npm run typecheck` clean
2. `bash scripts/check-file-size.sh` — no file > 300 lines
3. Every new component imported and used somewhere
4. After UNIT #8 (amber sweep): explicit grep verification in NOTES showing
   zero non-warning amber utilities remain
5. After each unit: emit "READY FOR REVIEW: UNIT #N" and pause

================================================================================
OUTPUT FORMAT (per unit) — UNCHANGED FROM ROUND 2
================================================================================

```
=== UNIT #N: <title> ===

COMMIT MESSAGE:
<conventional commit subject + body>

FILES:
--- path/to/file (NEW or MODIFIED) ---
<full content or diff with 5+ context lines>

VERIFICATION:
<commands the orchestrator should run>

NOTES:
<anything deferred or assumed>

READY FOR REVIEW: UNIT #N
```

When all 6 units delivered, end with:
"ROUND 3 COMPLETE. <N> commits, <M> files, ready for orchestrator integration."
