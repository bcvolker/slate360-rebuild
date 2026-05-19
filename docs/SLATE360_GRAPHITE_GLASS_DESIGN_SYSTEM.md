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
