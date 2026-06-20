# Spec: UI / Navigation / Branding Unification (all apps)

Status: **spec / planning** (no app code). One design system, one chrome model, one component kit
across Slate360 shell, Site Walk, Twin 360, SlateDrop, Reports, Coordination, Thermal (CEO), and
desktop. Grounded in `docs/design/GRAPHITE_GLASS.md` and `components/mobile-system/mainMobileTabs.ts`.

## 1. Source of truth
**Graphite Glass is canonical.** Every app, mobile and desktop, inherits it. Rules:
- **Dark canvas is sacred:** `--graphite-canvas #0B0F15`.
- **Accents per app, via CSS vars only** (`[data-mobile-route="…"]` → `--mobile-shell-accent`);
  components reference the var, **never a raw hex**. Platform + Site Walk = `#00E699`; Twin 360 =
  `#3D8EFF`; Thermal (CEO) = its own var.
- Text: header `#FFFFFF`, body `#F8FAFC`, muted/section-labels `#A3AED0`.
- **Banned:** amber/orange anywhere in authed surfaces, decorative glow, `rounded-full` outside
  token chips, raw hex in component files. Status colors stay semantic (`red-400`, `emerald-400`).
- **Compose, don't fork:** home/hub surfaces compose `app-home-tokens.ts` +
  `MobileAppHubHeroCard` + `MobileAppHomeQuickActions`; never re-declare their class strings.
- **Enforced** by `npm run guard:design` (+ `guard:architecture`, `typecheck:changed`, `build`).

## 2. Two-layer chrome model (the unification backbone)
Resolves the erratic-navigation problem by giving every surface exactly two chrome layers:

- **Bottom nav = shell identity** (mobile). Two states:
  - **Platform nav** on platform routes: Home · Projects · SlateDrop · Activity · Account.
  - **Module nav (SWAP)** when inside a module, with an **accent strip** in that app's color:
    - Site Walk: Walks · Plans · **Start (FAB)** · Reports · More
    - Twin 360: Twins · Sets · **Capture (FAB)** · More
- **Top header = context**: title / breadcrumb, **Back vs Exit** (see §3), sync-queue chip,
  **token-balance chip** (see Token UX spec), profile. Module home shows the module brand
  (`resolveModuleHomeBrand`).
- **Capture mode strips both layers** → a floating translucent **glass pill** (Cancel/Exit, mode,
  settings) over the camera; overlays for pin/ghost/shutter. Hardware/browser back is intercepted.

Desktop mirrors this: left **sidebar = shell identity** (platform + module sections,
`dashboard-nav-config.ts`, CEO-gated items filtered by `resolveDashboardNav`), top **toolbar =
context**. Same tokens, same components, responsive.

## 3. Navigation fixes (locked decisions + known bugs)
1. **Module bottom-nav swap + accent strip** when path is under `/site-walk` or `/digital-twin`.
2. **Fix the active-tab bug:** today `resolveMainMobileTabKey` returns `"home"` for `/site-walk/*`
   and `/digital-twin/*`, so the Home tab highlights while you're deep in a module. Under the swap
   model, module routes render the **module nav** (with their own active-tab resolver); the
   platform resolver applies only to platform routes. No module sub-route should highlight Home.
3. **Back vs Exit contract:** in-stack navigation = **Back** (breadcrumb/header). Leaving a module
   or capture = **Exit**, and Exit is **confirmed** when there's unsaved/at-risk state — never a raw
   browser back. One shared capture task-header component enforces this.
4. **No dead links / no 404 placeholders:** a **route manifest** + CI guard; blocked/unentitled
   routes **redirect** (to upgrade or home), never render a dead button or bare 404. Includes the
   **`/app/slatedrop/page.tsx` fix** (missing page → blank desktop Files).
5. **Delete confirmed-dead chrome:** `components/shared/MobileBottomNav.tsx`, `DashboardV3Shell`,
   `_dashboard-legacy`, `/site-walk-v1-preview`, `/tours` redirect stub, `unreal-studio` stub.
6. **Amber→Graphite rebrand:** amber persists across ~10+ capture-v2 files + `/site-walk/walks`;
   restyle **live, reachable** Site Walk surfaces; delete/quarantine unreachable amber zones.

## 4. Unified component kit (one library, all apps, mobile + desktop)
All consume Graphite Glass tokens; all responsive. Extend `app-home-tokens.ts` primitives into a
shared kit so apps assemble, not reinvent:

- **Primitives:** glass surface, hairline border, section label, icon chip, accent var, elevation.
- **Chrome:** `AppHeader` (title/breadcrumb/back-exit/actions/token-chip), `BottomNav`
  (platform/module variants + accent strip), `Sidebar` (desktop), `CapturePill`.
- **Containers:** `Card`, `ListRow`, `DataTable` (desktop) ↔ `ListRow` stack (mobile), `Tabs`,
  `EmptyState`, `Toolbar` (desktop top ↔ mobile bottom action bar / sheet).
- **Interaction:** `Sheet`/`BottomSheet`, `ContextMenu` (radix; long-press on mobile), `Modal`,
  `FAB`, `Toast` (incl. **Undo** for archive-first), `ConfirmDialog` (for Exit/Delete).
- **Selection mode:** long-press multi-select + sticky action bar (used by SlateDrop, Walks).

**Mobile↔desktop parity rule:** identical tokens + component API; layout adapts (toolbar position,
list-vs-table, sheet-vs-popover). No app ships a one-off header/nav/card.

## 5. Per-app application
| App | Bottom/side identity | Header context | Notes |
|---|---|---|---|
| **Slate360 shell** | Platform nav | smart launcher, token chip | composes home template |
| **Site Walk** | Module nav (`#00E699`) | Walk title / Back-Exit | capture pill in capture mode |
| **Twin 360** | Module nav (`#3D8EFF`) | Twin/job status, Back-Exit | viewer chrome = `SlatePlayer` |
| **SlateDrop** | Platform (Files) / embedded | breadcrumb + selection bar | file kit + permission UI |
| **Reports** | within module | report title + share | vertical/horizontal renderer chrome |
| **Coordination** | Activity tab | inbox/calendar/contacts | unified bell |
| **Thermal (CEO)** | desktop sidebar only, gated | — | stays silent/CEO-only |

## 6. Rollout priority (from AGENTS.md) vs unified scope
The system here is defined for **all** apps, but **style rollout order** stays: authenticated mobile
**Site Walk first → SlateDrop → dashboard/auth/emails/marketing later**. Build the shared kit once;
apply it Site-Walk-first; other apps adopt as their slices ship.

## 7. Enforcement & guardrails
- `npm run guard:design` (amber/glow/raw-hex), `guard:architecture`, `typecheck:changed`, `build`.
- **Route manifest + CI guard** (no off-brand or dead routes).
- "Compose-don't-fork" lint: home surfaces must import the canonical token sheet/components.

## 8. Open items / reconciliations
- **Twin 360 visibility vs "Site Walk only at first release":** the monetization decision makes Twin
  a purchasable, entitlement-gated product with pricing, but the release-scope rule says Site Walk
  ships first. Reconcile: Site Walk ships first; Twin's nav/surfaces are built but **entitlement-/
  release-gated** until its launch (no "coming soon" placeholder). **Confirm with CEO.**
- **Orbitron / wordmark usage**: confirm display-font usage scope (wordmark/headers only).
- Amber→Graphite rebrand exact file list (audit output) before the restyle pass.
