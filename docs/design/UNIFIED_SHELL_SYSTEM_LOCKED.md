# Unified Shell System — LOCKED (2026-06-30)

Unanimous 4-platform panel consensus for one cohesive "app ecosystem" grammar across the three shells
(desktop dashboard, Site Walk mobile, Twin 360 mobile). Goal: Linear/Figma-tier, NOT AI-vibe-coded. Incremental
(tokens → primitives → per-shell adoption), no big-bang.

## Non-negotiable principles
- **Accent on interaction/tint ONLY — never a solid fill** on passive elements (chips, launcher icons). Use
  `color-mix(accent 10-12%, glass)` + accent border + accent icon. (Launcher chips FIXED, commit bb2c3f02.)
- **One chrome height** (56px / h-14 everywhere; retire 48/52/68 variants).
- **One canvas** `#0B0F15` via a token — no `#11161E`, no inline hex in chrome.
- **One nav-active grammar**: subtle tinted-glass bg + 2px accent bar (left on sidebar, top on bottom-nav) — no
  filled pills.
- **One icon + accent + label per app** (registry): Home/Hub `Home` green · Site Walk `MapPin` green · Twin 360
  `Box` blue. Retire Scan/AppWindow/Orbit/ClipboardList for those apps. (Panels split Box vs LayoutDashboard for
  dashboard — pick `LayoutDashboard`, label "Dashboard" consistently across mobile+desktop.)
- Labels IBM Plex Mono for eyebrows/section labels; 48–72px targets; bans amber/glow/rounded-full/hardcoded-hex.

## Components to build (`components/app-shell/`)
`AppHeader` (one primitive, mobile+desktop) · `AppSwitcher` (facade: popover on mobile, segmented on desktop, ONE
`APP_REGISTRY` in `lib/app-ecosystem/registry.ts`) · `AppNavItem` (shared by bottom-nav, sidebar, switcher) ·
`AppIconChip` (tinted glass) · `AppSkeleton` + `AppEmptyState` (premium loading/empty). Accent-follows-route via
`data-mobile-route`/`data-app` → `--app-chrome-accent`.

## New tokens (globals.css)
`--app-chrome-canvas/glass/border/blur`, `--app-chrome-accent` (overridden per route), `--app-accent-{hub,
site-walk,twin360,slatedrop,coordination}`, `--app-nav-active-bg/fg`, `--app-icon-chip-border/bg/fg`. Deprecate
`--mobile-header-bg` (#16181D) / bottom-nav hardcoded accent / `shadow-gold-glow`.

## Migration order (each independently shippable)
P0 tokens + accent-follows-route mapping (None risk) → P1 APP_REGISTRY + icon consolidation (grep-replace) →
**P2 tinted-glass chips (DONE for launchers) + kill remaining solid fills** → P3 `AppNavItem` + bottom-nav accent
indicator → P4 `AppHeader` (migrate MobilePlatformHeader) → P5 `AppSwitcherPopover` (mobile) → P6 delete legacy
`shared/MobileTopBar.tsx`; desktop sidebar uses `AppSwitcherSegmented` → P7 `AppEmptyState`/`AppSkeleton` sweep.

## Guard additions (enforce)
No `#EAB308`/`#11161E`/`rounded-full` on `*IconChip*`; no lucide app-identity icons outside `registry.ts`;
`MobileShell` must set `data-mobile-route`. Also: guard:design currently MISSES `rgba()`, `text-slate-*`,
`font-black`, `rounded-full` — extend the guard to catch these (they recur everywhere).

## Open CEO ruling needed
**Filled primary CTAs** (e.g. `bg-[var(--graphite-primary)]` on the main action button) technically conflict with
"accent on interactive states only, never as fills." Panels + audits flag it everywhere. Decide: (a) filled
primary CTAs are the sanctioned exception (most common SaaS pattern), or (b) primaries also go tinted-outline.
Recommend (a) — one filled CTA per screen is standard and reads premium; keep everything else tint-only.
