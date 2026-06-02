# Homepage Clean-Room Handoff — Dual-AI Workflow

**Created:** 2026-05-30  
**Status:** Authoritative for homepage rebuild in isolated window + safe merge into `main`  
**Audience:** Composer 2.5 (Cursor design/build window) and Grok Build (terminal validation window)

---

## Purpose

Rebuild the Slate360 public homepage (`/`) in a **clean-room** environment with a new design-token platform, then migrate into this repo **without** touching billing, Stripe, entitlements, app shells, database naming, or backend infrastructure.

This document defines:

1. **Who does what** (Composer vs Grok)
2. **Exact file scaffold** (300-line rule)
3. **Frozen contracts** (IDs, URLs, props, scroll hooks)
4. **Phase gates** (nothing merges until Grok validates)

---

## Dual-AI Roles

### Composer 2.5 (Cursor — separate window)

**Primary owner:** Visual design, component architecture, interaction fidelity, token system.

| Owns | Does NOT touch |
|------|----------------|
| New `components/marketing-v2/*` tree | `lib/entitlements.ts`, billing, Stripe |
| New design token file(s) | `middleware.ts`, app shells |
| Layout, typography, spacing, color | Supabase migrations, Trigger.dev |
| Scroll section structure + DOM hooks | `pricing-data.ts` content (import only) |
| Copy updates (including Twin 360 naming on marketing) | `app/api/*`, Site Walk capture code |
| Wire existing viewer components OR copy verbatim | Deploy, push to remote, Vercel |

**Composer deliverables per phase:**

- Pixel/interaction-matched sections in isolation
- Token module with zero hardcoded one-off colors in section files
- Each file ≤300 lines (target ≤150)
- A short `MIGRATION_NOTES.md` in the clean-room folder listing any intentional visual deltas

### Grok Build (terminal access — this repo)

**Primary owner:** Validation, contract enforcement, merge safety, build/test loops.

| Owns | Does NOT do |
|------|-------------|
| `npm run typecheck`, `npm run build` | Creative redesign decisions |
| Playwright / smoke checks | Deploy to production (no deploy permission) |
| Contract diff vs this handoff | Rewrite homepage visuals |
| File-size guard checks | Touch billing/backend unless explicitly scoped |
| Apply the **single merge commit** when gates pass | Force-push `main` |
| Fix only **contract-breaking** issues found in validation | Broad refactors |

**Grok is the gatekeeper.** Composer work does not land on `main` until Grok reports all gates green.

---

## Coordinated Workflow (Both Tools)

```
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 0 — ALIGN (both read this file + prior migration report) │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 1 — COMPOSER: Build clean-room homepage (isolated)       │
│  Output: marketing-v2/ folder + tokens + MIGRATION_NOTES.md       │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 2 — HANDOFF: Owner copies marketing-v2/ into this repo     │
│  OR Composer pastes files; Grok receives file list                │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 3 — GROK: Contract audit (checklist below, no deploy)    │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 4 — GROK: Swap route seam only                           │
│  app/(public)/page.tsx → import MarketingHomepageV2             │
│  Update e2e tests + dead footer links in same change set         │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 5 — GROK: typecheck + build + e2e + manual smoke notes   │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  PHASE 6 — OWNER: deploy / push (Grok does NOT deploy)          │
└─────────────────────────────────────────────────────────────────┘
```

### Sync protocol (keep both AIs aligned)

After each Composer session, paste this **Handoff Block** into Grok's chat:

```
HOMEPAGE HANDOFF v{N}
- Files created/changed: [list paths]
- Token file: [path]
- Intentional visual deltas: [bullets or "none"]
- Scroll hooks preserved: [yes/no — list attrs/classes]
- Viewer stack: [reused paths | copied into marketing-v2/media]
- Pricing: [imports pricing-data.ts unchanged | FLAG IF MODIFIED]
- Anchor IDs: [list]
- Plan signup URLs: [list]
- Known gaps: [bullets]
```

Grok responds with:

```
VALIDATION STATUS
- Contract audit: PASS | FAIL [items]
- typecheck: PASS | FAIL
- build: PASS | FAIL
- Blockers before merge: [list]
```

**Rule:** Composer never declares "done." Grok never declares "safe to deploy." Owner deploys.

---

## Frozen Contracts (DO NOT CHANGE)

### Route seam (only file Grok edits for go-live)

```tsx
// app/(public)/page.tsx — metadata may update title/description; plan IDs must not change
import { MarketingHomepageV2 } from "@/components/marketing-v2/MarketingHomepageV2";

export const metadata = {
  title: "…", // owner-approved
  description: "…",
};

export default function RootPage() {
  return <MarketingHomepageV2 />;
}
```

### DOM / scroll hooks (preserve OR update globals.css in same PR)

| Hook | Required on root |
|------|------------------|
| `data-marketing-homepage` | **Yes** — `app/globals.css` uses `:has([data-marketing-homepage])` |
| `marketing-snap-showcase` | **Yes** — root class |
| `marketing-snap-track` | **Yes** — wraps hero + feature sections |
| `marketing-snap-section` | **Yes** — each full-viewport section |
| `marketing-snap-section--release` | **Yes** — last feature tile only |
| `marketing-flow-section` | **Yes** — pricing section |
| `marketing-tail` | **Yes** — pricing + footer wrapper |

If Composer removes any hook, Grok must update `app/globals.css` in the **same PR** and document the new contract in `MIGRATION_NOTES.md`.

### Section anchor IDs (header dropdown + in-page links)

| ID | Section |
|----|---------|
| `site-walk-start` | First Site Walk feature tile |
| `digital-twin-start` | Digital Twin / Twin 360 feature tile |
| `pricing-matrix-section` | Pricing block |

### Pricing / signup (read-only import)

**File:** `components/marketing-launchpad/pricing-data.ts`

**Plan IDs (must appear unchanged in signup links):**

- `site-walk-basic`
- `site-walk-pro`
- `digital-twin-basic`
- `digital-twin-pro`

**Signup URL pattern:**

```
/signup?plan={tier.id}
```

**Enterprise CTA:** `/contact` only.

Composer may restyle pricing UI but **must import** tiers from `pricing-data.ts` — no duplicated prices or IDs in new files.

### Static assets (paths)

| Asset | Path |
|-------|------|
| 3D model | `/uploads/csb-stadium-model.glb` |
| Panorama | `/uploads/pletchers.jpg` |
| App Store badge | `/uploads/app-store-badge.svg` |
| Google Play badge | `/uploads/google-play-badge.svg` |
| Badge link target | `/install` |

### Header product dropdown behavior

- Desktop: Radix Popover, smooth scroll to `#site-walk-start` / `#digital-twin-start`
- Links: Pricing → `#pricing-matrix-section`, Sign In → `/login`
- Homepage header: `variant="homepage"` (absolute transparent chrome)

### Public layout (do not break)

- `app/(public)/layout.tsx` → `PublicSiteChrome` → `CookieBanner` always
- `/` skips duplicate header via `shouldSkipMarketingHeader` in `PublicSiteChrome.tsx`
- New homepage must still render its **own** header (homepage variant)

---

## Viewer Stack — Reuse, Do Not Reimplement

These files encode scroll-gating, mobile fullscreen portal, and hydration-safe 3D/pano loading. **Composer should import them verbatim** from this repo (or copy without logic changes).

### Required behavior

| Behavior | Implementation |
|----------|----------------|
| SSR off for 3D/pano | `next/dynamic(..., { ssr: false })` in media panel |
| Scroll vs drag gate | `scrollInterceptGate={mode !== "fullscreen"}` |
| Preview mode (mobile thumbnail) | `showInteractionControls={mode !== "preview"}` |
| Mobile expand | Button → `MarketingMobileStudioPortal` + `body overflow: hidden` |
| Hero multi-tab media | 4 items: Walkthrough, Exterior Model, 360 Tour, Video |
| Model camera | `cameraOrbit="45deg 65deg 107%"` |

### Files to reuse as-is (recommended)

```
components/ModelViewerClient.tsx
components/marketing-launchpad/PanoramaViewer.tsx
components/viewer/ViewerControlDock.tsx
components/marketing-launchpad/MarketingMediaPanel.tsx
components/marketing-launchpad/MarketingExpandableMediaFrame.tsx
components/marketing-launchpad/MarketingMobileStudioPortal.tsx
```

### Composer wrapper (thin, allowed)

```tsx
// components/marketing-v2/media/HomepageHeroMedia.tsx
"use client";
import { HeroMediaFrame } from "@/components/marketing-launchpad/MarketingExpandableMediaFrame";
export function HomepageHeroMedia() {
  return <HeroMediaFrame />;
}
```

If Composer copies these into `marketing-v2/media/`, Grok must diff props/behavior against originals — **zero logic drift**.

### Hero media tab config (exact)

```ts
export const HERO_MEDIA_ITEMS = [
  { id: "walkthrough", label: "Walkthrough", variant: "hero-model" as const },
  { id: "exterior-model", label: "Exterior Model", variant: "twin" as const },
  { id: "tour-360", label: "360 Tour", variant: "panorama" as const },
  { id: "field-video", label: "Video", variant: "capture" as const },
];
```

### Feature tile media variants

| Tile | `media` | `id` | `reversed` |
|------|---------|------|------------|
| Site Walk capture | `capture` | `site-walk-start` | false |
| Plan pinning | `maps` | — | true |
| Digital Twin / Twin 360 | `twin` | `digital-twin-start` | false |
| Panorama | `panorama` | — | true |

Tile **copy** may live in `marketing-v2-tiles.ts`; structure must match `MarketingTile` type from `marketing-tile-data.ts`.

---

## File Scaffold (300-Line Rule)

Target: **≤300 lines per file**, **≤150 preferred**. Split before merging if any file exceeds 300.

```
components/marketing-v2/
├── MarketingHomepageV2.tsx          # Orchestrator only (~60–80 lines)
├── marketing-v2-tokens.ts           # All class strings / CSS variables (~80–120)
├── marketing-v2-tiles.ts            # Tile + hero copy data (~70–90)
├── MIGRATION_NOTES.md               # Composer → Grok deltas
├── sections/
│   ├── HomepageHeader.tsx           # Wrap MarketingHeader or replacement (~120 max)
│   ├── HomepageHeroSection.tsx      # Copy + badges + HomepageHeroMedia (~80)
│   ├── HomepageFeatureSection.tsx   # One tile section (~70)
│   ├── HomepagePricingSection.tsx   # Imports pricing-data (~120)
│   ├── HomepagePricingTierCard.tsx  # Single tier card (~60)
│   ├── HomepagePricingLimits.tsx    # Limits table + fair usage (~100)
│   └── HomepageFooter.tsx           # Wrap MarketingFooter or replacement (~80)
└── media/
    └── HomepageHeroMedia.tsx        # Thin HeroMediaFrame wrapper (~15)
```

### Export contracts

#### `MarketingHomepageV2.tsx`

```tsx
"use client";

export function MarketingHomepageV2(): JSX.Element;
```

**Structure (must match current tree):**

```tsx
<div data-marketing-homepage className={cn(V2_PAGE_ROOT, "marketing-snap-showcase")}>
  <HomepageHeader variant="homepage" />
  <div className="marketing-snap-track">
    <HomepageHeroSection sectionClassName={...} />
    {TILES.map((tile, i) => (
      <HomepageFeatureSection key={tile.title} tile={tile} sectionClassName={snapClass(i)} />
    ))}
  </div>
  <div className={cn(V2_TAIL, V2_SURFACE_ALT, "marketing-tail")}>
    <HomepagePricingSection />
    <HomepageFooter />
  </div>
</div>
```

#### `marketing-v2-tokens.ts`

Export only **strings** (Tailwind class bundles or token maps). No React, no hooks.

```ts
export const V2_PAGE_ROOT: string;
export const V2_SURFACE_BASE: string;
export const V2_SURFACE_ALT: string;
export const V2_SNAP_SECTION: string;
export const V2_FLOW_SECTION: string;
export const V2_TAIL: string;
// … buttons, labels, tiles, pricing CTAs — all from tokens, no inline hex in sections
```

**Design direction:** Dark Glass & Amber per `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md`. No teal/emerald/blue drift unless owner explicitly approves in `MIGRATION_NOTES.md`.

#### `marketing-v2-tiles.ts`

```ts
import type { MarketingTile } from "@/components/marketing-launchpad/marketing-tile-data";

export const V2_HERO = {
  title: string;
  body: string;
  primaryCta: { label: string; href: "#pricing-matrix-section" };
};

export const V2_TILES: readonly MarketingTile[];
// Same ids, media variants, ctaHref paths as current marketing-tile-data.ts
```

#### `HomepageFeatureSection.tsx`

```tsx
type Props = {
  tile: MarketingTile;
  sectionClassName?: string;
};
export function HomepageFeatureSection(props: Props): JSX.Element;
```

#### `HomepagePricingSection.tsx`

```tsx
"use client";
export function HomepagePricingSection(): JSX.Element;
// Must render <section id="pricing-matrix-section" className={cn(V2_FLOW_SECTION, "marketing-flow-section")}>
// Must use SITE_WALK_TIERS, DIGITAL_TWIN_TIERS, ENTERPRISE_PLAN from pricing-data.ts
```

---

## What Composer Builds in the Isolated Window

Minimum viable clean-room (no repo access required):

1. Static HTML/CSS prototype **OR** Next.js mini-app with same section order
2. Token JSON/TS file exported for paste into `marketing-v2-tokens.ts`
3. Screenshot checklist: desktop hero, mobile expand portal, pricing toggle, footer
4. Explicit list of reused vs rewritten components

Composer **should not** mock Stripe, signup API, or entitlements in the isolated window.

---

## Grok Validation Checklist (Phase 3–5)

Run in this order. Stop on first FAIL; report blockers to owner.

### A. Contract audit (no commands)

- [ ] `data-marketing-homepage` present on root
- [ ] All snap/flow/tail classes present
- [ ] Anchor IDs: `site-walk-start`, `digital-twin-start`, `pricing-matrix-section`
- [ ] Signup links use exact plan IDs from `pricing-data.ts`
- [ ] No edits to `pricing-data.ts`, `lib/entitlements*`, `middleware.ts`, `app/api/billing/*`
- [ ] Viewer files unchanged OR copied with zero prop/logic diff
- [ ] All new TS/TSX files ≤300 lines
- [ ] No "Coming Soon", "beta", "demo", "placeholder", fake metrics in homepage tree

### B. Build commands

```bash
npm run typecheck
npm run build
npm run guard:file-size-regression   # if marketing-v2 adds files; note pre-existing failures
```

### C. E2E updates (same PR as homepage swap)

Fix known drift when swapping homepage:

| Test file | Issue | Fix |
|-----------|-------|-----|
| `e2e/mobile-smoke.spec.ts` | Expects `"See it. Experience it."` | Update to match new hero H1 copy |
| `e2e/route-health.spec.ts` | Looks for `#pricing` | Use `#pricing-matrix-section` |

```bash
npx playwright test e2e/route-health.spec.ts e2e/mobile-smoke.spec.ts
```

### D. Manual smoke (owner or Grok documents)

- [ ] Desktop: hero 3D model orbit, tab switch (4 tabs), panorama drag
- [ ] Mobile: tap expand → fullscreen portal → close restores scroll
- [ ] Header Product dropdown scrolls to Site Walk / Twin sections
- [ ] Pricing cadence toggle switches monthly/annual display
- [ ] `/signup?plan=site-walk-basic` reachable from tier CTA
- [ ] No horizontal overflow on 375px width
- [ ] Cookie banner still appears (via layout, not homepage)

---

## Merge Procedure (Grok only, after all gates PASS)

1. Add `components/marketing-v2/**` (new files from Composer)
2. Change **only** `app/(public)/page.tsx` import to `MarketingHomepageV2`
3. Update e2e specs for new hero copy + pricing ID
4. Optional same PR: fix footer dead links `/security`, `/cookies` → real routes or remove
5. Optional same PR: fix `ProductPageShell` anchor `/#site-walk-section-start` → `/#site-walk-start`
6. Run typecheck + build
7. **Do not delete** old `components/marketing/MarketingHomepage.tsx` until owner confirms production soak
8. Owner pushes / deploys — Grok does not deploy

### Post-soak deletion (separate PR, owner-approved)

```
components/marketing/MarketingHomepage.tsx
components/marketing/MarketingHomepagePricing.tsx
components/marketing/marketing-homepage-styles.ts
components/marketing-launchpad/MarketingLaunchpad.tsx
components/marketing-launchpad/MarketingPricingSection.tsx
```

Keep shared launchpad pieces until product pages migrate: `MarketingHeader`, `MarketingFooter`, `MarketingMediaPanel`, viewer stack.

---

## Forbidden Zones (Both AIs)

| Path / system | Reason |
|---------------|--------|
| `lib/entitlements.ts`, `lib/entitlements-modular.ts` | Billing gates |
| `app/api/billing/*`, `app/api/stripe/*` | Stripe |
| `components/marketing-launchpad/pricing-data.ts` | Plan ID contract |
| `middleware.ts` | Auth, mobile quarantine, beta gates |
| `app/(mobile)/*`, `components/mobile-system/*` | App shell — later migration window |
| `app/site-walk/*`, `components/site-walk/*` | Site Walk — later migration window |
| `app/digital-twin/*`, `lib/twin/*` | Twin 360 backend/UI — Track B |
| `src/trigger/*`, `supabase/migrations/*` | Backend infrastructure |
| Deploy / `git push` (Grok) | No deploy permission |

---

## Backend Context (Read-Only — Do Not Implement in Homepage PR)

### Site Walk — complete on `main`

- 53 API routes under `app/api/site-walk/*`
- Trigger.dev `plan.rasterize` in `src/trigger/rasterize.ts`
- Plan walk loop must remain untouched
- See `docs/audit/DO_NOT_LOSE_EXISTING_FUNCTIONALITY.md`

### Twin 360 (Digital Twin) — partial on `main`

- DB tables: `digital_twin_spaces`, `digital_twin_captures`, `digital_twin_processing_jobs`, etc.
- Mobile hub: `app/(mobile)/digital-twin/page.tsx`
- **No** `app/api/twin/` on `main`; **no** `twin.gaussian_splat` in `src/trigger/`
- Marketing may say **Twin 360**; do not rename DB columns or API paths in homepage work

---

## Prompt Starters

### Composer 2.5 (paste at start of clean-room session)

```
You are building the Slate360 homepage clean-room rebuild.
Read docs/HOMEPAGE_CLEAN_ROOM_HANDOFF.md (or the handoff pasted below).
Rules: 300 lines max per file, Dark Glass & Amber tokens, reuse viewer stack verbatim,
import pricing-data.ts read-only, preserve all DOM scroll hooks and anchor IDs.
Do not touch billing, entitlements, middleware, or app shells.
Deliver marketing-v2/ scaffold + MIGRATION_NOTES.md + Handoff Block v1.
```

### Grok Build (paste when files arrive in repo)

```
You are the validation gatekeeper for homepage migration.
Read docs/HOMEPAGE_CLEAN_ROOM_HANDOFF.md.
Run contract audit checklist A, then typecheck + build, then update/run e2e tests.
Do not deploy. Report VALIDATION STATUS block. Fix only contract breaks.
Swap app/(public)/page.tsx only after checklist A passes.
```

---

## Related docs

- Prior inspection report: conversation 2026-05-30 (homepage migration readiness)
- Design tokens (planned): `docs/design/SLATE360_V1_DESIGN_TOKEN_PLAN.md`
- Site Walk preservation: `docs/audit/DO_NOT_LOSE_EXISTING_FUNCTIONALITY.md`
- Concurrent tracks: `docs/CONCURRENT_DEVELOPMENT_TRACKS.md`
- Agent guardrails: `AGENTS.md`
