# v0 → Production Workflow

Last Updated: 2026-04-09

## Core Principle

**v0 = Design sandbox. Codespace = Real implementation.**

v0 generates UI code. I translate it into production code with real backend wiring, auth, types, and design system compliance. Never paste v0 output directly — it always needs adaptation.

## How to Hand Off v0 Work

### Option A: Copy-paste (fastest for small changes)
1. Build your design in v0
2. Paste the v0 code (or a screenshot) into this chat
3. Tell me which page/component it should replace or modify
4. I read the existing file, adapt the v0 code to match our design system + types, and apply it

### Option B: v0 branch (best for large overhauls)
1. v0 creates a branch like `v0/slate360ceo-XXXX-XXXXXXXX`
2. Tell me the branch name
3. I fetch it, diff against main, and port the changes file-by-file with real backend wiring

### Option C: v0 project link (good for review)
1. Share the Vercel v0 project URL
2. I inspect the generated code via the branch or files you share
3. I map v0 components → existing Slate360 files and apply changes

## What I Do With v0 Code (Every Time)

1. **Read the target file first** — never blind-overwrite
2. **Replace v0 placeholder data** with real Supabase queries / React hooks
3. **Replace v0 color values** with CSS variables (`text-primary`, `bg-background`, `auth-input`, etc.)
4. **Replace v0 generic icons** with real SVG brand assets (`/uploads/SLATE 360-Color Reversed Lockup.svg`)
5. **Ensure auth gating** — CEO routes use `isSlateCeo`, subscription features use `getEntitlements()`
6. **Type everything** — no `any`, imports from `lib/types/`
7. **Keep files under 300 lines** — extract components if needed
8. **Run `npm run build`** before pushing — catch CSS/TS errors immediately

## Batch Size

- **3–5 related files per sitting** for UI-only changes
- **1–2 files per sitting** when wiring backend (Supabase queries, API routes, auth)
- **1 app at a time** for full app builds (Tour Builder, Design Studio, etc.)

## Safety Checklist (Run After Every Batch)

```
✅ npm run build passes
✅ TypeScript: no errors (npx tsc --noEmit)
✅ File sizes: no file over 300 lines
✅ CEO login works (slate360ceo@gmail.com)
✅ Auth pages use auth-* utility classes (not hardcoded colors)
✅ Logo is real SVG (not Sparkles icon or placeholder)
✅ No mock data in production UI
✅ git diff reviewed — no unintended changes
```

## App Build Workflow (for Tour Builder, Design Studio, etc.)

When building a full app:

### Phase 1: Design Shell (v0)
- Build the UI layout, navigation, cards, forms in v0
- Focus on the user-facing screens only
- Don't worry about backend — v0 can't do that

### Phase 2: Port + Wire (Codespace)
1. I create the route structure: `app/(dashboard)/dashboard/[app-name]/`
2. Port v0 components into `components/[app-name]/`
3. Create API routes: `app/api/[app-name]/`
4. Create Supabase tables + RLS policies
5. Wire React hooks to real data
6. Add entitlement gating via `getEntitlements()`

### Phase 3: Test + Ship
1. Build passes
2. Test as CEO — full flow works
3. Test as normal user — entitlement gates work
4. Push to main → Vercel auto-deploys
5. Test on mobile

## Design System Quick Reference

When adapting v0 output, replace:

| v0 generates | Replace with |
|---|---|
| `bg-zinc-950`, `bg-black` | `bg-background` |
| `bg-zinc-900`, `bg-gray-900` | `bg-card` or `bg-muted` |
| `text-white` | `text-foreground` |
| `text-zinc-400`, `text-gray-400` | `text-muted-foreground` |
| `border-zinc-800`, `border-gray-700` | `border-border` |
| `bg-[#D4AF37]`, `bg-yellow-*` | `bg-primary` |
| `text-[#D4AF37]` | `text-primary` |
| `text-black` (on gold bg) | `text-primary-foreground` |
| `hover:bg-[#c49f30]` | `hover:bg-primary/90` |
| Sparkles icon + "Slate360" text | `<img src="/uploads/SLATE 360-Color Reversed Lockup.svg">` |
| Auth page wrappers | `auth-page`, `auth-card`, `auth-input`, etc. |
| Glass effect inline | `bg-glass`, `border-glass` |
| Gold glow inline | `shadow-gold-glow` |
