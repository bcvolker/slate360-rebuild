# Slate360 Marketing Homepage Spec

Last updated: 2026-06-07

Canonical homepage: `app/(public)/page.tsx` → `MarketingPage` in `app/(public)/_components/marketing-page.tsx`.

Data sources: `lib/apps-config.ts` (apps, content modes), `lib/marketing/pricing-config.ts` (prices — **do not duplicate numbers elsewhere**).

---

## Locked pricing (monthly)

| Product | Tier | Monthly | Plan ID |
|---------|------|---------|---------|
| Site Walk | Basic | **$79** | `site-walk-basic` |
| Site Walk | Pro | **$149** | `site-walk-pro` |
| Twin 360 | Essential | **$99** | `twin-360-essential` |
| Twin 360 | Professional | **$249** | `twin-360-professional` |
| Bundle | Site Walk Pro + Twin 360 Professional | **$349** | `bundle` |
| Enterprise | Custom | Contact sales | `enterprise` |

Annual billing: **17% off** monthly (computed in `pricing-config.ts` via `ANNUAL_DISCOUNT = 0.17`). Do not hand-edit annual dollar amounts in UI — import from `lib/marketing/pricing-config.ts`.

Enterprise CTA: `/contact` only. All other paid tiers: `/signup?plan={tier.id}`.

---

## Homepage sections (order)

| # | Section component | Purpose |
|---|-------------------|---------|
| 1 | `MarketingNav` | Header + logo + pricing anchor |
| 2 | `MarketingHero` | Headline, CTAs, App Store / Google Play badges |
| 3 | `MarketingShowcase` | App + content-mode interactive demo panel |
| 4 | `MarketingSalesTiles` | Per-app value props + synergy tile |
| 5 | `MarketingPricing` | Tier cards (monthly/annual toggle) |
| 6 | `MarketingDataProcessing` | Credits / storage messaging |
| 7 | `MarketingHowItWorks` | Install → subscribe → capture flow |
| 8 | `MarketingFooter` | Legal links, logo |

Legacy launchpad homepage (`components/marketing/MarketingHomepage.tsx`) is **not** the live `/` route. Reuse its media viewers (`MarketingMediaPanel`, `ModelViewerClient`, `PanoramaViewer`) when wiring showcase placeholders — do not resurrect the full launchpad shell without explicit approval.

---

## Design tokens (Graphite Glass)

Use CSS variables — never hardcode hex in marketing components.

| Token | Role |
|-------|------|
| `--graphite-canvas` | Page background |
| `--graphite-primary` | Site Walk accent / primary CTA (`#00E699`) |
| `--twin360-blue` | Twin 360 accent (`#3D8EFF`) |
| `--graphite-text-header` | Headings |
| `--graphite-text-body` | Body copy |
| `--graphite-muted` | Secondary / labels |

Tailwind class bundles live in `app/(public)/_components/marketing-styles.ts` (`MKT_*` exports).

App accent mapping: `lib/apps-config.ts` → `AppAccentVar` (`--graphite-primary` | `--twin360-blue`).

---

## Assets (stable paths)

| Asset | Path |
|-------|------|
| Logo (nav/footer) | `<Slate360Logo />` via `components/studio-ui/LogoProvider.tsx` |
| OG / JSON-LD logo | `/uploads/slate360-logo-reversed-v2.svg` (`lib/design-system/tokens.ts`) |
| App Store badge | `/uploads/app-store-badge.svg` → `/install` |
| Google Play badge | `/uploads/google-play-badge.svg` → `/install` |
| 3D demo model | `/uploads/csb-stadium-model.glb` (launchpad viewer) |
| 360 demo pano | `/uploads/pletchers.jpg` (launchpad viewer) |

---

## Do-not-touch boundary (marketing work)

Marketing-only tasks must **not** modify:

- `components/site-walk/capture/**` (capture pipeline)
- Twin / digital-twin processing, viewers, or upload jobs outside marketing imports
- Billing / Stripe (`app/api/stripe/**`, subscription webhooks, tier enforcement)
- Supabase migrations
- `middleware.ts` (unless the task is explicitly auth/routing)
- Trigger.dev / plan rasterization jobs

Pricing display may **read** from `lib/marketing/pricing-config.ts` but must not change Stripe product IDs, webhook logic, or entitlements. Price changes require owner approval and coordinated billing updates.

---

## Validation (marketing-only changes)

Local (Windows-friendly):

```powershell
npm run typecheck:changed -- app/(public)
npm run build
```

Full `npm run typecheck` runs in CI (`.github/workflows/typecheck.yml`) — do not block isolated marketing work on local full typecheck if it OOMs.
