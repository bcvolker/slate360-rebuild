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

## 11. Mobile Layout Geometry
- **Page Padding**: Horizontal padding uses `px-4`. Vertical sections use gaps like `gap-4` or `gap-5`. Content begins closely under headers.
- **Section Spacing**: Keep dead space to a minimum; use `pt-4` and top anchoring (`justify-start`) unless vertically centering a specific empty state.
- **Card Radius**: App tiles, quick actions, and panels share rounded, consistent radii (e.g. `rounded-xl` or `rounded-2xl`).
- **Quick Action Height**: Quick actions maintain a standardized hit target area (`min-h-[90px]`).
- **Contained Panel Geometry**: Mobile scrolling lists are held in strict contained viewports to avoid bleed. They maintain standard nested tab heights, strict interior padding (`px-3 pt-2 pb-6`), and identical empty state scales.
- **Bottom Nav**: Navigators float with safe-area spacing and distinct rounded top corners.
- **App Cards Layout**: App cards sit symmetrically in a grid (e.g., `sm:grid-cols-2` scaling) sharing common icons and descriptions.
- **Cross-Platform**: Desktop pages use the same visual tokens but DO NOT share the exact mobile layout constraints, retaining wider dashboard freedom.
- **Global Adoption**: All future elements including auth, emails, marketing, and feature modules must implement these Graphite Glass tokens.

## 12. Shared Mobile Primitives

The following shared primitives live in `components/mobile-system/`. **Both `/app` and `/site-walk` must migrate to these before new Site Walk capture UI is built.**

| Primitive | File | Replaces |
|---|---|---|
| `mobileTokens` | `mobileTokens.ts` | Scattered class strings in shell components |
| `MobileActionCard` | `MobileActionCard.tsx` | Inline `QuickActionCard` (CommandCenterContent) + `SiteWalkV1ActionGrid` buttons |
| `MobileActionGrid` | `MobileActionGrid.tsx` | Inline `grid grid-cols-2 gap-3` divs |
| `MobileAppCard` | `MobileAppCard.tsx` | Inline `AppTile` (CommandCenterContent) |
| `MobileTabbedPanel` | `MobileTabbedPanel.tsx` | Inline Tabs in CommandCenterContent + `SiteWalkV1ListPanel` |
| `MobileEmptyState` | `MobileEmptyState.tsx` | Inline `ActivityEmptyState` + `EmptyList` utility |

### Token Values (Slice 1 — May 2026)
- Action card height: `min-h-[96px]` (unified from /app 90px and /site-walk 100px)
- Action icon: `h-7 w-7` / `size-7` (unified to 28px for iPhone readability)
- Action label: `text-[13px] font-medium`
- Panel border: `border-white/10`
- Panel background: `bg-white/[0.03]`
- Panel tab height: `h-9`
- Active tab: `border-b-2 border-amber-500 text-white`
- Empty state padding: `py-8`

### Migration Status
- **Slice 1** (current): Primitives created. No consumers changed.
- **Slice 2** (next): Migrate `/app` `CommandCenterContent` to use shared primitives.
- **Slice 3** (after Slice 2): Migrate `/site-walk` home shell to use shared primitives.
- **Slice 4**: Screenshot QA on physical device.
- **Slice 5**: Begin Site Walk capture/data-entry UI.
