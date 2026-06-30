# Slate360 — Unified Shell Grammar (AUTHORITATIVE, Jun 29 2026)

**Supersedes** the stale `SLATE360_DESKTOP_SHELL_ECOSYSTEM.md` (which used banned amber `#F59E0B`,
`--accent-glow`, `rounded-full`, and fictional `/app/site-walk/*` routes). Synthesized from an 8+
platform design panel + two repo-grounded reviews. **One Graphite-Glass product, three surfaces
(Dashboard/Platform · Site Walk green · Twin 360 blue), differing ONLY by accent.**

## The reconciliation (real repo state — this is a REBUILD, not greenfield)
- **TWO competing desktop shells exist** and must collapse into ONE: `components/dashboard-desktop/`
  (production — clean token discipline `dashboard-tokens.ts`, REAL routes `/dashboard`, `/projects`,
  `/site-walks`, `/digital-twins`, `/slatedrop`, `/more/*`, nav-pill archetype) and
  `components/dashboard-v3/` (the intended `/app` "cockpit" — but **hardcoded hex** `#0B0F15`/`zinc-*`,
  half its hrefs are `"#"`). **Plan:** keep dashboard-desktop's tokens + real routes; fold v3's cockpit
  in as the *content* of `/app`; delete v3's hardcoded-hex sidebar.
- **One nav source:** the switcher + rail both read `resolveDashboardNav(...)`
  (`components/dashboard-desktop/dashboard-nav-config.ts`) so `APP_STORE_MODE`/CEO/staff gating stays in
  ONE place (Twin 360 stays `appStoreHidden` in store mode — no second gating system).
- **Real tokens only** (`app/globals.css`): `--graphite-canvas #0B0F15`, `--graphite-primary #00E699`,
  `--twin360-blue #3D8EFF`, `--graphite-muted`, glass = `bg-white/[0.04] backdrop-blur-md border-white/10
  rounded-xl`. No hex in components; no amber; no glow; no `rounded-full`.

## Accent-only differentiation (SHIPPED foundation — Phase 1)
- **`--app-accent`** in `:root` (default `--graphite-primary`) + `[data-app="twin360"] → --twin360-blue`,
  `[data-app="site-walk"]`/`[data-app="dashboard"] → --graphite-primary` (appended in `app/globals.css`).
- Shell root sets `data-app`; switching app flips ONE variable. Components reference `var(--app-accent)`
  for **interactive states only** (active nav border/tint, focus ring, primary-button border/text,
  progress, selected chips) — **never as a panel/background fill**. Dashboard = neutral/green.

## (a) IA + layout
**Desktop — 3-pane, FILLS the viewport (no voids):** top bar (52–56px: brand · **app switcher** ·
project scope · ⌘K · account) · left rail (72↔220px collapsible: shared nav + app section) · center
workspace (fluid `flex-1 min-w-0`, no max-width) · right context pane (320px, **collapses to 0 when
nothing is selected** → center reclaims width). One front door per shared surface:

| Surface | Canonical route | Desktop | Mobile |
|---|---|---|---|
| Home/cockpit | `/app` (or `/dashboard`) | rail → center | tab/home |
| Projects | `/projects` | rail → center + context | tab |
| **SlateDrop** | **`/slatedrop` (ONE route)** | rail → center 3-pane Finder | "Files" tab |
| Contacts | `/contacts` | rail → center | More sheet |
| Calendar | `/calendar` | rail → center | More sheet |
| Deliverables | `/deliverables` (+ app filter) | rail → center | hub → list |

**Mobile — focused stack:** one decision per screen, 48–72px targets, bottom nav (Home · Capture ·
Files · More); no 3-pane; shared nav behind a Menu sheet; capture = full-bleed (shell detached). The
existing `MobileAppRootContent` (`data-mobile-route` accent scoping + launcher grid) is the model the
desktop should *rhyme* with, not replicate.

## (b) App switcher
Segmented control in the top bar (desktop) / launcher grid (mobile). Switching sets `data-app` on the
shell root → remaps `--app-accent`; **does NOT** change the rail, layout, or chrome. The active pill
renders in its own accent (previews green/blue). `Cmd/Ctrl+1` Site Walk, `Cmd/Ctrl+2` Twin 360. Respects
`resolveDashboardNav` gating (Twin hidden in store mode).

## (c) Action / label taxonomy (SHIPPED — `lib/shell/action-labels.ts`)
One label per intent, imported everywhere (rail, ⌘K, empty states, toasts). Closed verb set:
**New · Upload · Start · Open · Share · Create · Review · Resume · Done · Back.** "Start" is **mobile
capture only** (desktop = Upload/assemble/author). Entities: Walk/Stop/Deliverable (SW),
Scan/Clip/Model (Twin), Project/File (shared). Banned (CI grep): "New Work", "Start a Walk", etc.

## (d) SlateDrop = Finder/Explorer-class, ONE chrome
**Desktop:** 3-pane INSIDE the center workspace (the shell rail/top stay put) — folder tree (auto-
provisioned Photos/Plans/Deliverables/Intake/Submissions) · sortable file list (multi-select, drag-to-
move, breadcrumb, context menu, keyboard nav) · **preview = the shared shell context pane** (not a
bespoke panel). Auto-routing surfaced as a "Routed to Plans" chip, not hand-managed. **Mobile:** focused
single column (breadcrumb header → list → preview sheet → long-press actions); FAB = Upload. **Kill the
duplicate reachabilities:** one route `/slatedrop`; project "recent files" + mobile quick action
deep-link into it (`/slatedrop?project=&path=`), never a different file UI.

## (e) Capture → Review → Deliver spine (shared)
Both apps use ONE stage model + a `ShellStageStepper` in the workspace header (accent from `--app-accent`,
green dots SW / blue Twin): **Capture/Upload → Review → Deliver.** Desktop skips on-device capture
(upload-assembled); primary CTA = Upload + "Continue on phone" (QR/deep-link).

## (e) Component structure (target)
`components/shell/`: `UnifiedAppShell` (root: `data-app` + 3-pane), `ShellTopBar`, `ShellNavRail`,
`ShellWorkspace`, `ShellContextPane`, `AppSwitcher`, `ShellCommandPalette`, `shell-tokens.ts`,
`useShellApp.ts` (derive active app from pathname). Single `app/(authenticated)/layout.tsx` wraps all
post-login routes; capture routes opt out via a nested full-bleed layout. Reuse `dashboardDesktopTokens`
with `--graphite-primary → --app-accent` in the active classes; primary button =
`bg-[var(--app-accent)] text-[var(--graphite-canvas)]` (dark text, no glow, no pill).

## Build order (each step independently shippable)
1. ✅ **Phase 1:** `--app-accent` var + `data-app` blocks + `action-labels.ts` + this doc.
2. ✅ **Phase 2:** `shell-tokens.ts` + `AppSwitcher` + `/preview/unified-shell` (design target).
3. **Phase 3 — refactor `DashboardDesktopShell` IN PLACE** (panel consensus: Option A, NOT a mount
   swap — the mount `app/(dashboard)/layout.tsx` owns auth/beta-gate/mobile-fork/InviteShareProvider).
   - ✅ **3a (shipped 55df385d):** pure `resolveShellApp(pathname)` + `data-app` on the shell root +
     nav-chrome tokens `--graphite-primary → --app-accent` (no-op on green, Twin routes go blue).
   - **3b:** rebuild `DashboardDesktopTopBar` (brand wordmark + tick · `AppSwitcher` · ⌘K · account);
     derive `twinVisible` from `resolveDashboardNav` (single gate — drop AppSwitcher's hardcoded fork).
   - **3c:** collapsing `ShellContextPane` (default collapsed → center reclaims; per-surface opt-in).
   - **3d:** SlateDrop into the `(dashboard)` group (one chrome) — kill the `app/slatedrop` `StudioAuthedShell` 3rd chrome.
4. Wire `CommandPalette` to the shell + replace banned CTAs repo-wide with `SHELL_ACTION`.
5. **dashboard-v3 decision (BLOCKER for cleanup):** ⚠️ v3 is NOT dead — `app/(dashboard-v3)/layout.tsx`
   mounts it and `.cursorrules:25` names `/app` (DashboardV3Shell) as the canonical post-login cockpit.
   Resolve `/app` routing (fold v3 content into `/dashboard` or keep `/app` as the cockpit) BEFORE deleting v3.
6. Site Walk / Twin desktop upload surfaces in the center; mobile hubs aligned to the spine.

## Guardrails
Canvas `var(--graphite-canvas)` only · glass `bg-white/[0.04] backdrop-blur-md border-white/10 rounded-xl`
· IBM Plex Mono uppercase `tracking-[0.14em]` labels · accent = `var(--app-accent)` on borders/text/rings
ONLY · no `rounded-full`/amber/glow/raw-hex · desktop fills viewport (no floating phone column) · phone
capture full-bleed 48–72px.

See [[slate360-slatedrop-and-desktop-shell]], `SLATEDROP_AND_DESKTOP_SHELL.md`,
`SLATE360_UNIFIED_DESIGN_SYSTEM_GAP_AUDIT.md`. (Untracked panel drafts to fold in then delete:
`SLATE360_DESKTOP_SHELL_ECOSYSTEM.md` [stale], `SLATE360_UNIFIED_SHELL_GRAMMAR.md`,
`SLATEDROP_FILE_MANAGER_DESIGN.md`, `DELIVERABLE_VIEWER_ARCHITECTURE.md`.)
