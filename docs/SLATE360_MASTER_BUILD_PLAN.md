# Slate360 Master Build Plan & Migration Strategy

Last Updated: 2026-04-13

---

## 1. What Is Slate360

**Slate360 is a downloadable app** (PWA now, eventually native iOS/Android).
It is the main product that users sign into, subscribe through, and work inside of.

Inside the Slate360 app lives an **ecosystem of app modules**:
- Site Walk
- 360 Tours
- Design Studio
- Content Studio

These modules are **not separate products, not separate businesses, not separate apps with separate auth stacks.** They are entitlement-gated feature sets inside the single Slate360 product.

**The website (slate360.ai)** is the public marketing surface. It teaches users about the platform, lets them create an account, and lets them subscribe. Once authenticated, the web experience IS the web version of the Slate360 app — same backend, same database, same auth, same entitlements. On mobile, those same pages become the downloaded app experience via PWA (and eventually native wrappers).

**One account. One organization. One subscription system. One cross-platform product surface.**

---

## 2. Identity & Subscription Model

### Identity
- One user belongs to one or more organizations
- Subscriptions belong to the organization
- Entitlements resolve at the organization level

### Module Tiers (per module, per org)
Each module has two paid tiers:
- **Standard** — core features, single license
- **Pro** — full features, single license

| Module | Standard | Pro |
|---|---|---|
| Site Walk | $79/mo | $149/mo |
| 360 Tours | TBD | TBD |
| Design Studio | TBD | TBD |
| Content Studio | TBD | TBD |

### Bundles (explicit Stripe products, not dynamic discounts)
| Bundle | Includes | Price |
|---|---|---|
| Field Bundle | Site Walk Pro + 360 Tours Pro | TBD |
| Studio Bundle | Design Studio Pro + Content Studio Pro | TBD |
| All Access | All four modules at Pro | TBD |

### Business Tier
Full Slate360 app with all project management tools (scheduling, budgeting, RFIs, submittals, collaborator assignment) + full-featured Site Walk: **$399/mo**

### Enterprise
All-access with negotiated bulk licenses. Admin can assign seats and permissions. **Custom pricing.**

### Add-ons
- Storage add-ons (10 GB, 50 GB increments)
- Credit packs (500, 2000, 5000)

### What Each Subscription Level Unlocks
- **No subscription**: Can access Slate360 shell (dashboard home, pricing, billing, settings, app catalog, upgrade prompts). Cannot create projects or use workspace tools.
- **Site Walk Standard ($79)**: Can create projects, create/share deliverables, limited PM tools. No scheduling, budgeting, collaborator assignment, RFIs, submittals.
- **Site Walk Pro ($149)**: Full Site Walk features + field-office sync + advanced PM tools.
- **Multiple module subscriptions**: Unlock cross-module synergy features (e.g., SW + Tours unlocks 360 content in deliverables).
- **Business ($399)**: All Slate360 project management power tools + full Site Walk. The command center fully activates.
- **Enterprise**: Everything + bulk license management + admin controls + white-label.

---

## 3. Access Layers (Gating Architecture)

### Layer 0: Public Marketing
Unauthenticated users see: homepage, pricing, learn-more pages per module, "Coming Soon" badges on unfinished apps. CTA to sign up / download.

### Layer 1: Platform Shell
Authenticated users (any tier, including free/trial) can access:
- Dashboard home (reduced state — upgrade prompts, app catalog)
- Pricing / billing / manage subscription
- Settings (account, org, team)
- Module overview cards (locked/unlocked states)

### Layer 2: Workspace Activation
Requires `hasAnyPaidModule = true`:
- Create and manage projects
- Command center (active project metrics, RFIs, submittals, schedules)
- SlateDrop file management
- Calendar / contacts sync
- Project collaboration (if tier allows)

### Layer 3: Module Access
Requires specific module entitlement:
- `/app/site-walk/*` requires `apps.site_walk.active`
- `/app/tours/*` requires `apps.tours.active`
- `/app/design-studio/*` requires `apps.design_studio.active`
- `/app/content-studio/*` requires `apps.content_studio.active`

### Entitlement Resolver (canonical)
Must return:
```
hasAnyPaidModule: boolean
canUseProjectWorkspace: boolean
activeBundle: null | "field_bundle" | "studio_bundle" | "all_access"
apps.site_walk: { active: boolean, tier: "none" | "standard" | "pro" }
apps.tours: { active: boolean, tier: "none" | "standard" | "pro" }
apps.design_studio: { active: boolean, tier: "none" | "standard" | "pro" }
apps.content_studio: { active: boolean, tier: "none" | "standard" | "pro" }
totalStorageGB: number
totalCreditsPerMonth: number
```

---

## 4. What the Slate360 App Actually Is (Command Center)

After login, users enter the Slate360 app. This is NOT a metrics dashboard with large placeholder cards. This is an **interactive command center** — the hub from which users launch and manage everything.

### Command Center must include:
- **Project launcher**: Create, select, and drill into individual projects
- **Condensed project snapshot**: Small-footprint overview of all projects (status, phase, key metrics) — does NOT dominate the screen
- **Clickable metrics row**: Open RFIs, pending submittals, overdue items — one condensed row, every item clickable to drill down
- **Module launchers**: Launch Site Walk, Tours, etc. based on entitlements
- **SlateDrop**: Dropbox-clone optimized for construction (project-organized, subfolder system, history folder, auto-routing from collaborators)
- **Visual carousel**: Scrolling carousel of recent deliverables, active projects, or key items
- **Calendar / Contacts**: Syncable calendar and contacts features
- **Collaboration**: Assign collaborators per project (if tier allows)
- **Notifications / Activity feed**: Real-time updates from field and office

### What it is NOT:
- NOT a page of large metric cards that aren't clickable
- NOT a static page of placeholder text
- NOT a traditional SaaS dashboard with vanity metrics occupying most of the screen

---

## 5. Web vs App — There Is No Difference

The website after login IS the web version of the Slate360 app. The downloadable app IS the same thing in a mobile-optimized shell.

- **Same auth** (Supabase)
- **Same org** (organization table)
- **Same subscription** (Stripe → org_app_subscriptions)
- **Same entitlements** (resolveModularEntitlements)
- **Same database** (Supabase)
- **Same API** (Next.js API routes)
- **Same project data**

Only the client surface changes:
- Browser → web app
- PWA install → feels like native
- Later: Tauri/Electron desktop shell, Capacitor/React Native mobile

Do NOT build separate auth, billing, or product logic for "web" vs "app." One system, many surfaces.

---

## 6. Download & Install Strategy

### Near-term (now)
- Web app is the primary surface
- PWA installable on mobile and desktop (manifest, service worker, icons already exist)
- Subscription happens on website
- "Download" = install the PWA

### Later
- Tauri or Electron for desktop app wrapper
- Capacitor or React Native for native mobile
- App store listings (requires TWA config, signing certs — started in Phase 12)

### Critical rule
All surfaces use the same backend. Do NOT fork the product for different platforms.

---

## 7. Module Availability Status

| Module | Publicly Visible | Available to Purchase | Fully Implemented |
|---|---|---|---|
| Site Walk | Yes | Yes (ASAP) | Backend: 95%, UI: needs design |
| 360 Tours | Yes + "Coming Soon" | No | Shell only |
| Design Studio | Yes + "Coming Soon" | No | Shell only |
| Content Studio | Yes + "Coming Soon" | No | Shell only |

Do NOT sell unfinished modules as active subscriptions.

---

## 8. Route Architecture (Target State)

### Public (unauthenticated)
```
/                       Homepage
/pricing                Pricing page (all modules + bundles)
/apps/site-walk         Learn more — Site Walk
/apps/360-tours         Learn more — 360 Tours
/apps/design-studio     Learn more — Design Studio
/apps/content-studio    Learn more — Content Studio
/login                  Auth
/signup                 Auth
```

### Authenticated Shell
```
/dashboard              Command center (Slate360 app home)
/projects               Project list + creation (requires hasAnyPaidModule)
/billing                Subscription management
/settings               Account, org, team settings
/slatedrop              File management (requires hasAnyPaidModule)
```

### Module Routes
```
/app/site-walk/*        Site Walk workspace (requires site_walk entitlement)
/app/tours/*            360 Tours workspace (requires tours entitlement)
/app/design-studio/*    Design Studio workspace (requires design_studio entitlement)
/app/content-studio/*   Content Studio workspace (requires content_studio entitlement)
```

### Internal (not subscription-gated)
```
/market                 Market Robot (CEO access)
/ceo                    CEO dashboard (CEO access)
/athlete360             Athlete360 (CEO access)
```

---

## 9. Migration Phases

### Phase 0: Unblock Deployments (CRITICAL)
- Fix route conflicts: delete duplicate pages under `(dashboard)/` that clash with `(apps)/`
- Resolve site-walk dual route (`app/site-walk/` vs `app/(apps)/site-walk/`)
- Remove fake company names from homepage TrustBar (legal risk)
- Verify `npm run build` passes
- Push and confirm Vercel deploys successfully

### Phase 1: Naming Standardization
- Rename modular tier `basic` → `standard` everywhere
- Affects: TS types, plan keys, Stripe webhook parsers, checkout mappers, UI labels, DB values

### Phase 2: Canonical Entitlement System
- Make `resolveModularEntitlements()` the single source of truth
- Return `hasAnyPaidModule`, `canUseProjectWorkspace`, per-app flags
- Deprecate legacy `getEntitlements(tier)` for new routes
- Keep backward compat for existing orgs with legacy data

### Phase 3: Route Protection & Workspace Gating
- Shell routes: authenticated only
- Workspace/project routes: authenticated + `hasAnyPaidModule`
- Module routes: authenticated + specific module entitlement
- Unfinished modules: show "Coming Soon" state, not broken routes

### Phase 4: Pricing UI Realignment
- Rewrite homepage pricing to match Section 2 above
- All 4 modules visible, Coming Soon on Tours/Design/Content
- Site Walk Standard/Pro purchasable end-to-end
- Bundle section visible but marked TBD until modules are ready
- Enterprise = "Contact us"

### Phase 5: Webhook & Checkout Stability
- Verify Stripe checkout → webhook → org entitlement update flow
- Ensure module subscription activates correctly
- Support cancellation/downgrade
- Idempotent webhook processing

### Phase 6: Command Center Rebuild
- Replace placeholder dashboard with the interactive command center described in Section 4
- Condensed project snapshots, clickable metrics, module launchers, visual carousel
- This is the core of what makes Slate360 valuable

### Phase 7: Site Walk End-to-End
- First fully sellable module
- Subscribe → entitlement activates → Site Walk workspace accessible
- Field capture, deliverables, sharing all working

---

## 10. Rules of Engagement for AI Agents

1. **DO NOT** mix legacy and modular pricing in public UI
2. **DO NOT** sell unfinished modules unless explicitly marked "Coming Soon" / "Early Access"
3. **DO NOT** build separate auth/billing/backend for web vs app
4. **DO NOT** create placeholder buttons that do nothing in production flows
5. **DO NOT** use fake company names, endorsements, or testimonials
6. **DO** make modular entitlements the single source of truth
7. **DO** use `standard`/`pro` naming (never `basic`)
8. **DO** gate workspace tools behind `hasAnyPaidModule`
9. **DO** gate module routes behind specific module entitlements
10. **DO** work in small, testable increments with clear diffs