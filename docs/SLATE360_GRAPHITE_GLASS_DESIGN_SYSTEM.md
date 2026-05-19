# Slate360 Graphite Glass Design System

**Core Principle:**
Desktop dashboard and mobile app shells are distinct experiences but must share the same visual language.

## 1. Color Rules
- Use graphite / charcoal / near-black as the foundation.
- Avoid generic navy blue.
- Avoid brown-looking cards or large amber fills.
- Use amber/copper only as an accent.
- Use white/slate text with sufficient contrast.
- Use subtle white/10 borders.

## 2. Approved Base Tokens
- **Background**: \`#0B0F15\` (Slate360 base).
- **Header Background**: \`#0B0F15/88\` (glass).
- **Panel Background**: \`white/4\` or \`white/5\` on top of base.
- **Card Background**: \`white/[0.04]\`.
- **Border**: \`white/10\`.
- **Primary Accent**: Amber/Copper (e.g. \`amber-500\`).
- **Active State**: \`amber-500/10\` with `text-amber-500`.
- **Muted Text**: \`zinc-500\` or \`slate-400\`.
- **Status Colors**: Standard destructive (\`red-400\`), success (\`emerald-400\`), warning (\`amber-400\`).

## 3. Component Rules
- **Headers**: Compact, glass, subtle bottom border.
- **Bottom Navs**: Rounded top corners, float above safe area, text sizes at 10px-11px.
- **Contained Scrolling Panels**: Strict flex layouts to avoid scroll bleed. Soft rounded corners.
- **Tab Strips**: Simple bordered active state with amber.
- **Quick Action Cards**: Minimal glass cards with centered icon/text.
- **App Cards**: Consistent branding.
- **Deliverable Rows**: Standard list item row with clear actions.
- **Forms & Sheets**: Use standard primitives (GlassCard, Sheet).
- **Empty States**: Centered muted icon, muted text, small amber CTA.
- **CTAs**: Accent color only.
- **Status Chips**: Standard small rounded badges.
- **Hover/Focus**: Mild background color shift (\`hover:bg-white/[0.08]\`).

## 4. Mobile Shell Rules
- Slate360 app shell remains simple and app-like.
- It must not duplicate desktop Dashboard V3.
- Bottom nav stays platform-level.
- Site Walk/Digital Twin/360 Tours live under Your Apps.

## 5. Desktop Dashboard Rules
- Dashboard V3 is the desktop command center.
- Desktop can have richer visual/data sections.
- Do not squeeze desktop dashboard into mobile.

## 6. Site Walk Rules
- Site Walk shell uses same mobile tokens.
- Site Walk Home is module-specific.
- Top-left back arrow returns to \`/app\`.
- Bottom Home returns to Site Walk Home.
- Capture is full-screen and should not inherit duplicate chrome.

## 7. Digital Twin Rules
- Track B must visually align to Graphite Glass.
- Track B must not modify Dashboard V3, \`/app\` shell, or Site Walk UI without Track A coordination.

## 8. Auth/Marketing/Email Rules
- Login/signup/account creation should use the same logo, dark graphite base, amber CTA, and clean glass panels.
- Confirmation emails should be simpler but use Slate360 logo, graphite header/footer, amber CTA, and neutral body.

## 9. v0/Copilot Usage Rules
- v0 can be used for visual prototypes.
- v0 output must be converted into native Slate360 components/tokens.
- Do not paste generic v0 card systems directly into production.
- Do not use fake v0 data in live components.

## 10. Required Future-Chat Instruction
**Every new chat working on UI must read this design-system doc plus \`SLATE360_PROJECT_MEMORY.md\` and \`CONCURRENT_DEVELOPMENT_TRACKS.md\` before making UI changes.**
**Shell family rules (mandatory for every new surface):**
- Mobile/PWA app pages (`/app`, `/site-walk`, and future apps) → use `components/mobile-system/MobileAppShell` plus shared `MobileTopBar`, `MobileBottomNav`, `MobileSection`, and panel primitives
- Desktop dashboard pages → use Dashboard V3 / desktop Graphite Glass patterns
- Marketing / auth / email pages → use Graphite Glass marketing/auth/email templates
- Do not create new one-off card/tab/nav/shell systems
- If a needed shared primitive does not exist, create it in `components/mobile-system/` first, then consume it
## 11. Mobile Layout Geometry
- **Page Padding**: Horizontal padding uses `px-4`. Vertical sections use gaps like `gap-4` or `gap-5`. Content begins closely under headers.
- **Section Spacing**: Keep dead space to a minimum; use `pt-4` and top anchoring (`justify-start`) unless vertically centering a specific empty state.
- **Card Radius**: App tiles, quick actions, and panels share rounded, consistent radii (e.g. `rounded-xl` or `rounded-2xl`).
- **Quick Action Height**: Quick actions maintain a standardized hit target area (`min-h-[96px]`).
- **App Launcher Grid**: App launcher buttons ("Your Apps") use `MobileAppButton` (compact vertical: icon + title + subtitle) inside `MobileActionGrid` (always `grid-cols-2`, no responsive prefix). Single app centers with `col-span-2 mx-auto w-1/2`.
- **Contained Panel Geometry**: Mobile scrolling lists are held in strict contained viewports to avoid bleed. They maintain standard nested tab heights, strict interior padding (`px-3 pt-2 pb-6`), and identical empty state scales.
- **Bottom Nav Clearance (MANDATORY)**: Any screen with a fixed or in-flow bottom nav must reserve clearance equal to nav height + `env(safe-area-inset-bottom)`. **Preferred pattern**: place the nav as a `shrink-0` in-flow item in the shell flex column (not `fixed`), so the `flex-1` main content area automatically stops above it. Do NOT use `pb` workarounds when children use `h-full`. Do NOT use `fixed` bottom nav unless the shell itself is NOT a fixed/full-viewport flex column.
- **Contained Panel Scroll**: List/activity panels must scroll internally (`overflow-y-auto` inside the panel, `min-h-0` on the panel container). The PAGE must never scroll content under the nav — the PANEL scrolls.
- **Contained Panel Height Rule (MANDATORY)**: To give a panel a definite height so `overflow-y-auto` works, propagate height via FLEX — NOT via CSS `height: 100%`. Specifically: make the shell `<main>` a `flex flex-col overflow-hidden` container; give the view component `flex-1 min-h-0` so it fills main via flex (not `h-full` percentage); inside the view, use a CSS Grid or flex column where the panel zone is `flex-1` or `1fr`. **Never use `h-full` inside an `overflow-y-auto` scroll container** — WebKit resolves this as `auto`, breaking all `1fr` grid rows inside.
- **Mobile Module List Panel Cap (MANDATORY)**: Populated module-home list panels must use a capped visible frame and internal body scroll. Use `mobileTokens.moduleListPanelFrame` (`h-full max-h-[min(34dvh,320px)]`) on the panel frame and keep row content inside `MobileTabbedPanel`'s `overflow-y-auto` body. This prevents a real row list from visually dominating the viewport while preserving the same contained-panel rhythm as `/app` activity panels.
- **Shared Shell Contract (MANDATORY)**: `/app` and `/site-walk` must both import and render `MobileAppShell` from `components/mobile-system`. Their navs must use the generic `MobileBottomNav` primitive (route-link items for `/app`; in-memory tab items for `/site-walk`). Their section headings must use `MobileSection`. Do not add page-level `fixed` navs, custom bottom padding clearances, or independent header/nav systems for mobile app surfaces.
- **Cross-Platform**: Desktop pages use the same visual tokens but DO NOT share the exact mobile layout constraints, retaining wider dashboard freedom.
- **Global Adoption**: All future elements including auth, emails, marketing, and feature modules must implement these Graphite Glass tokens.

## 12. Shared Mobile Primitives

The following shared primitives live in `components/mobile-system/`. **Both `/app` and `/site-walk` must migrate to these before new Site Walk capture UI is built.**

| Primitive | File | Replaces |
|---|---|---|
| `mobileTokens` | `mobileTokens.ts` | Scattered class strings in shell components |
| `MobileAppShell` | `MobileAppShell.tsx` | Independent `/app` and `/site-walk` height/nav geometry |
| `MobileTopBar` | `MobileTopBar.tsx` | One-off mobile header frame geometry |
| `MobileBottomNav` | `MobileBottomNav.tsx` | Fixed platform nav + separate Site Walk tab nav geometry |
| `MobileSection` | `MobileSection.tsx` | One-off section labels/spacing in mobile home screens |
| `MobileActionCard` | `MobileActionCard.tsx` | Inline `QuickActionCard` (CommandCenterContent) + `SiteWalkV1ActionGrid` buttons |
| `MobileActionGrid` | `MobileActionGrid.tsx` | Inline `grid grid-cols-2 gap-3` divs |
| `MobileAppCard` | `MobileAppCard.tsx` | Inline `AppTile` (CommandCenterContent) — horizontal row, for list use only |
| `MobileAppButton` | `MobileAppButton.tsx` | App launcher 2-col grid button (vertical: icon + title + subtitle) |
| `MobileTabbedPanel` | `MobileTabbedPanel.tsx` | Inline Tabs in CommandCenterContent + `SiteWalkV1ListPanel` |
| `MobileEmptyState` | `MobileEmptyState.tsx` | Inline `ActivityEmptyState` + `EmptyList` utility |

### Token Values (Slice 1 — May 2026)
- Action card height: `min-h-[96px]` (unified from /app 90px and /site-walk 100px)
- Action icon: `h-7 w-7` / `size-7` (unified to 28px for iPhone readability)
- Action label: `text-[13px] font-medium`
- Panel border: `border-white/10`
- Panel background: `bg-white/[0.03]`
- Panel tab height: `h-9`
- Module list panel cap: `h-full max-h-[min(34dvh,320px)]`
- Active tab: `border-b-2 border-amber-500 text-white`
- Empty state padding: `py-8`

### Migration Status
- **Slice 1** ✅ (b7da100 — May 2026): Primitives created. No consumers changed.
- **Slice 2** ✅ (88134a9): `/app` CommandCenterContent fully migrated to all 5 shared primitives.
- **Slice 3** ✅ (84f1037): Site Walk header h-14, SiteWalkV1ActionGrid migrated, list panel border fixed.
- **Slice 4** ✅ (feat(pwa) commit — May 2026): MobileAppButton created; /app apps use 2-col grid; SiteWalkV1ListPanel delegates to MobileTabbedPanel; HomeView uses MobileEmptyState + grid-rows-[auto_1fr]; blur unified.
- **Slice 5** ✅ (fix(pwa) commit — May 2026): SiteWalkV1BottomNav moved from `fixed` to in-flow `shrink-0`; nav clearance now handled by flex column geometry. `SiteWalkV1ListPanel` passes `minHeight="min-h-0"` to prevent floor overflow on short viewports. `EmptyList` → `MobileEmptyState` in WorksitesView + SlateDropView.
- **Slice 6** ✅ (fix(pwa): contained panel scroll — May 2026): Fixed Site Walk list panel scroll containment. Root cause: `<main overflow-y-auto>` in SiteWalkV1Shell caused `height: 100%` (`h-full`) on HomeView's CSS Grid to resolve as `auto` (WebKit bug — percentage heights in `overflow-y-auto` flex items can fail). This made `grid-rows: 1fr` become `auto` → panel grew with content. **Fix**: Changed `<main>` to `flex flex-col overflow-hidden` so HomeView uses `flex-1` (flex propagation, no percentage inheritance). Grid `1fr` row now gets a truly definite height. All non-HomeView views updated to `flex-1 min-h-0 overflow-y-auto` so they scroll within the contained main.
- **Slice 7** ✅ (feat(pwa): shared mobile shell architecture — May 2026): `/app` and `/site-walk` now both render through `MobileAppShell`; both nav systems use shared `MobileBottomNav`; both mobile home screens use `MobileSection`; `/app` activity panel and `/site-walk` list panel both fill a controlled remaining-height region and scroll internally.
- **Slice 8** ✅ (fix(pwa): cap Site Walk home list panel height — May 2026): Added `mobileTokens.moduleListPanelFrame` and applied it to `SiteWalkV1ListPanel` so populated Site Walk lists cap their visible frame at `min(34dvh,320px)` and continue scrolling rows internally. Added `MobileTabbedPanel.bodyClassName` to give module-list bodies extra bottom scroll padding without changing `/app`.
- **Slice 9** (next): Begin Site Walk capture/data-entry UI build.
