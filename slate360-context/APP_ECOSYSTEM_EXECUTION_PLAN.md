# Slate360 App Ecosystem Execution Plan

**Last Updated:** 2026-03-11  
**Purpose:** Revenue-first execution plan for standalone apps, future module packaging, and cross-app delivery/sharing/sync architecture.

---

## 1. Objective

Build the Slate360 app ecosystem in a sequence that generates revenue before the full platform is finished, while preserving a clean long-term path to shared auth, shared storage, shared billing, and native wrappers later.

This plan is intentionally **not** a generic wish list. It is the execution order, product strategy, and build shape for the next app launches.

---

## 2. Strategic Principles

1. **Sell a narrow outcome, not the full platform.** Early customers buy one job-to-be-done.
2. **Web first, then PWA, then native wrapper.** Do not start with React Native or separate mobile codebases.
3. **One auth system, one billing system, one file backbone.** Standalone apps reuse Slate360 auth, Stripe, entitlements, and SlateDrop-backed storage.
4. **Every app must create reusable platform assets.** Files, comments, reports, links, and activity should remain valuable when the customer later upgrades into the full platform.
5. **Sharing is a product, not an afterthought.** External links, upload requests, review flows, and deliverable packs are core monetization features.
6. **Offline/mobile support is selective.** Only field-first apps get PWA/offline work early.
7. **Avoid fragmented implementations.** Standalone apps must remain thin shells over shared services, not separate products with duplicate logic.

---

## 3. Recommended Launch Order

### Wave 1 — Fastest Revenue

| Order | App | Why First | Launch Shape |
|---|---|---|---|
| 1 | 360 Tour Builder + Hosting | Clearest sellable output, strong visual value, easiest demo-to-close path | Web app first, optional PWA install, public share links |
| 2 | PunchWalk | Strong field use case, daily adoption potential, can later feed Project Hub | PWA first, mobile-optimized web, offline queue later |
| 3 | SlateDrop Deliverables | Monetizable file delivery/request workflow that supports all other apps | Web app first with public links and packs |

### Wave 2 — Expansion Products

| Order | App | Why Next | Launch Shape |
|---|---|---|---|
| 4 | Photo Log | Pairs naturally with PunchWalk and Project Hub | Web + PWA install |
| 5 | Plan Review | Higher-value office workflow after sharing/versioning foundation exists | Desktop-first web app |
| 6 | Walk-to-Quote | High-value vertical product once capture + files + templates are reliable | Web first, mobile-friendly |

### Wave 3 — Ecosystem Glue / Multipliers

| Order | App | Why Later | Launch Shape |
|---|---|---|---|
| 7 | Slate360 Capture | Companion upload/capture app that strengthens every other product | PWA first, Capacitor wrapper later |
| 8 | Native wrappers | Only after 2+ apps prove demand and install behavior | Capacitor shells |

---

## 4. Shared Platform Foundation

These items are required so future apps do not fork the architecture.

### 4A. Shared Services

| Capability | Canonical System | Notes |
|---|---|---|
| Auth | Supabase auth + existing server auth helpers | No parallel app auth |
| Billing | Stripe + `org_feature_flags` + merged entitlements | One subscription model for tiers + standalone apps |
| Storage | SlateDrop + `project_folders` + `unified_files` | Every app writes artifacts here |
| Sharing | Tokenized public links + upload links + review links | Reused by Tours, SlateDrop, PunchWalk, Photo Log |
| Activity | Shared audit/activity log pattern | Important for cross-app timeline later |
| Search | Shared file/entity search | Needed for `/apps` discoverability and app switching |
| Notifications | Shared in-app + email notification layer | Reuse existing notification center plans |

### 4B. Shared Data Contracts

Every standalone app should attach its outputs to shared records whenever possible.

| Output | Backing Pattern | Reused By |
|---|---|---|
| Uploaded media | `unified_files` + SlateDrop folders | Tours, Capture, Photo Log, PunchWalk |
| Deliverable pack | `slatedrop_packs` | SlateDrop, Tour exports, reports |
| External share link | `slatedrop_shares`-style token system | Tours, file requests, client reports |
| Review comments | Shared comment/audit schema | Plan Review, Design Studio, Tour review |
| Field observations | Project Hub entities + mobile submission tokens | PunchWalk, Photo Log |

### 4C. App Shell Rules

1. Standalone routes use the same auth and entitlement merge pattern as dashboard routes.
2. Shared components live in `components/` and shared data logic lives in `lib/`.
3. Each app keeps its standalone page thin; business logic belongs in reusable hooks/services.
4. Public share pages are distinct, minimal entry points and must not require dashboard context.

---

## 5. Product Build Strategies

## 5A. 360 Tour Builder + Hosting

**Positioning:** Upload 360 imagery, build tours fast, share polished links, and keep projects visually updated without Matterport-style platform overhead.

**Primary buyers:** Realtors, builders, remodelers, property marketers, inspectors, project teams.

**Core use cases:**
- Upload Insta360/Ricoh Theta panoramas and organize by site/floor/date
- Link scenes with hotspots and notes
- Publish a share link for clients/stakeholders
- Track progress over time with date-stamped tours

**MVP features:**
- Panorama upload pipeline
- Scene list + hotspot editor
- Public share link with branded viewer
- Basic floor plan pinning
- Tour metadata: title, address, capture date, tags
- Save outputs to SlateDrop folders automatically

**Build strategy:**
- Start as desktop-friendly web app with responsive viewer
- Add PWA install prompt, but do not treat offline as MVP-critical
- Use public tour routes and tokenized review links early
- Reuse SlateDrop request links for collecting panos from field crews or photographers

**Monetization path:**
- Entry: hosted tours with storage caps and branded share pages
- Upsell: more storage, white-label links, progress timeline, hotspot analytics, team seats
- Attach service revenue: “we build/upload your first tours for you”

**What makes it strategically important later:**
- Becomes the visual front end for Project Hub, PunchWalk, Photo Log, and client portals
- Creates reusable public sharing and deliverable infrastructure

---

## 5B. PunchWalk

**Positioning:** Fast field punch and observation capture from phone, without forcing office-heavy PM software flows.

**Primary buyers:** Supers, field engineers, foremen, inspectors, small GCs.

**Core use cases:**
- Walk a site and log punch items from a phone
- Add photos, trade, due date, assignee, and location notes fast
- Share a resolution list with subcontractors or owners
- Feed issues back into Project Hub later for customers who upgrade

**MVP features:**
- Mobile-first punch entry form
- Photo capture/upload
- Status, trade, assignee, due date
- Public/mobile link support for invited field users
- Simple list view with filters and export

**Build strategy:**
- Build as PWA-first route with touch targets, camera-first UI, and fast load on poor connections
- Delay full offline sync until after the core submission flow is stable
- Use tokenized public intake for subcontractors where appropriate
- Keep the data model aligned with Project Hub punch items so upgrade is seamless

**Monetization path:**
- Standalone subscription for small field teams
- Seat or project-based pricing later
- Upsell: offline mode, branded reports, owner portal sharing, hotspot-to-tour linkage

**What makes it strategically important later:**
- Forms the basis for daily logs, observations, and broader field command workflows
- Strong candidate for eventual Capacitor wrapper

---

## 5C. SlateDrop Deliverables

**Positioning:** File delivery, request links, version history, and deliverable packs for teams that constantly send documents, photos, and closeout materials.

**Primary buyers:** PMs, coordinators, construction admins, agencies, consultants.

**Core use cases:**
- Send files or folder-level deliverables to external parties
- Request uploads without giving full portal access
- Build a closeout or handoff package with a single share link
- Track who viewed or downloaded shared materials

**MVP features:**
- File/folder share links with expiry
- Upload-only request links
- Deliverable pack builder with zip + manifest
- Version history panel
- Send/audit history

**Build strategy:**
- Start on web with a polished external share experience
- Use this as the foundation for all other app sharing flows
- Build audit and pack generation before deeper offline/PWA work

**Monetization path:**
- Standalone subscription for small teams needing controlled delivery
- Tiered storage and branded portals
- Upsell: client spaces, unlimited packs, advanced audit/export

**What makes it strategically important later:**
- It is the delivery substrate for Tours, Photo Log, Plan Review, Walk-to-Quote, and future client portals

---

## 5D. Photo Log

**Positioning:** Quick site photo logging with report-ready output.

**Primary buyers:** GCs, owners reps, inspectors, facilities teams.

**Core use cases:**
- Capture or upload site photos by date/area/trade
- Build PDF reports without manual formatting
- Share weekly progress packages with clients

**MVP features:**
- Upload/camera capture
- Date/area/trade grouping
- Caption and annotation fields
- PDF report generation
- Save report output to SlateDrop and share externally

**Build strategy:**
- Reuse SlateDrop uploads and Deliverable Packs
- Keep it web-first but mobile-friendly
- Add PWA install after core reporting is stable

**Monetization path:**
- Standalone app or included add-on for field/reporting tiers
- Per-report credit option is acceptable if PDF generation cost becomes material

---

## 5E. Plan Review

**Positioning:** Lightweight plan review, markup, and review-link workflow without full BIM complexity.

**Primary buyers:** Architects, PMs, precon teams, owners reps.

**Core use cases:**
- Upload plan PDFs
- Redline, comment, and share review links
- Track revisions and review decisions

**MVP features:**
- PDF viewer + annotation layer
- Comment pins
- Revision set organization
- Public/private review links
- Export reviewed PDF and audit trail

**Build strategy:**
- Desktop-first web app
- Reuse Design Studio viewer concepts, but keep the product lighter and faster to adopt
- Do not block launch on full Design Studio delivery

**Monetization path:**
- Monthly subscription for consultants and PM teams
- Upsell to Design Studio or broader Slate360 tiers later

---

## 5F. Walk-to-Quote

**Positioning:** Capture a site walk and turn it into a client-facing proposal package quickly.

**Primary buyers:** Remodelers, specialty trades, small GCs, sales-led builders.

**Core use cases:**
- Capture photos/notes/360 scenes during a walkthrough
- Organize scope items
- Assemble a proposal packet or deliverable bundle

**MVP features:**
- Walk capture form with photos and notes
- Scope sections/templates
- Proposal/deliverable PDF packet
- Share link for customer review

**Build strategy:**
- Only start after Tours + SlateDrop packs + basic templates exist
- Build on top of existing file, report, and share infrastructure instead of inventing a new stack

**Monetization path:**
- Higher-value standalone app with vertical-specific templates
- Strong hybrid service component early: setup templates and branded proposal packs for customers

---

## 5G. Slate360 Capture

**Positioning:** Companion upload/capture tool for crews in the field.

**Primary buyers:** Existing Slate360 customers and app subscribers, not usually net-new first-sale buyers.

**Core use cases:**
- Upload photos, panos, and documents fast from phone
- Route uploads into the right project/app workspace
- Queue uploads when signal is weak

**MVP features:**
- Mobile upload inbox
- Project/folder targeting
- Camera capture shortcut
- Upload status tray

**Build strategy:**
- PWA first with minimal UI
- Add offline queue when `slatedrop_shares` and upload-tray infrastructure are solid
- Wrap with Capacitor only after repeated field usage proves value

**Monetization path:**
- Mostly retention and upsell support
- Can be free with upper tiers or low-cost standalone companion app

---

## 6. Deliverables, Sharing, and Sync Strategy

This is the long-term structure that keeps apps connected instead of siloed.

### 6A. Deliverables Model

| Deliverable Type | Produced By | Stored In | Shared Via |
|---|---|---|---|
| Public tour link | Tour Builder | Tour metadata + SlateDrop assets | Tokenized public viewer |
| Punch report PDF | PunchWalk | SlateDrop `/Reports/` or app folder | Share link or deliverable pack |
| Photo log PDF | Photo Log | SlateDrop `/Reports/` | Share link or pack |
| Plan review export | Plan Review | SlateDrop `/Drawings/` or `/Reviews/` | Review link or pack |
| Proposal packet | Walk-to-Quote | SlateDrop `/Proposals/` | Share link or pack |
| Closeout package | SlateDrop | Pack manifest + zip artifact | Deliverable pack link |

### 6B. Sharing Model

| Sharing Need | Pattern |
|---|---|
| Public view-only asset | Tokenized link with expiry/passcode |
| External upload request | Upload-only tokenized link |
| Collaborative review | Review token with comment permissions |
| Large deliverable handoff | Pack link with manifest + download analytics |
| Customer portal later | Aggregated tokenized workspace built on same primitives |

### 6C. Sync Model

| Sync Scenario | Recommended Behavior |
|---|---|
| Standalone app user upgrades to Slate360 | Preserve org, files, share history, and feature flags; expose integrated module access |
| PunchWalk item promoted into Project Hub | Keep original item id/history and attach project references rather than re-creating |
| Photo Log linked to Tour Builder or PunchWalk | Reuse shared file ids and metadata tags |
| Tour hotspot creates Project Hub issue later | Store linked entity ids on both sides for traceability |
| Walk-to-Quote deliverable reused in Content Studio later | Use shared file ids and origin metadata |

**Rule:** Sync should usually mean shared records plus richer cross-links, not background duplication.

---

## 7. Build Sequence by Horizon

## 7A. Next 30 Days

1. Finalize the app ecosystem data model and billing path: `org_feature_flags`, `/api/apps/subscribe`, `/apps`, entitlement merge.
2. Build the SlateDrop sharing primitives that every launch app depends on: request links, share links, deliverable packs, version history baseline.
3. Start 360 Tour Builder MVP with upload, viewer, hotspoting, and public sharing.
4. Add a sales-ready landing and checkout path for the first app instead of waiting for the full ecosystem page.

## 7B. 30–60 Days

1. Launch 360 Tour Builder publicly.
2. Add basic tour analytics, branded links, and storage-based pricing tiers.
3. Build PunchWalk MVP as a mobile-first PWA.
4. Connect app outputs into SlateDrop and shared audit trails.

## 7C. 60–90 Days

1. Launch PunchWalk.
2. Launch SlateDrop Deliverables as a clear standalone offer.
3. Start Photo Log using the same upload/report/share backbone.
4. Validate which app shows the strongest retention and expansion behavior before deeper native work.

---

## 8. Required Platform Deliverables Before App Scale

| Deliverable | Why It Matters | Priority |
|---|---|---|
| `org_feature_flags` + entitlement merge | Required for standalone billing model | Critical |
| Functional `/apps` directory | Needed for discovery, purchase, and install flow | Critical |
| Tokenized share/upload links | Core product surface for every app | Critical |
| Deliverable pack generation | Monetizable output layer | High |
| Shared audit/event logging | Needed for trust, review, and future analytics | High |
| PWA install support | Needed for PunchWalk and Capture | High |
| Offline upload queue | Important for field apps, but not Day 1 for all apps | Medium |
| Capacitor wrappers | Only after install/use evidence | Low initially |

---

## 9. Product-Specific Success Criteria

| App | MVP Success Signal |
|---|---|
| 360 Tour Builder | Users can upload, build, and share a tour without manual support |
| PunchWalk | A superintendent can log and resolve issues from phone in a real site walk |
| SlateDrop Deliverables | Teams send/retrieve real project files through secure links and packs |
| Photo Log | A weekly progress report can be built and shared in minutes |
| Plan Review | A reviewer can redline, comment, and export without leaving the browser |
| Walk-to-Quote | A contractor can produce a shareable proposal packet from a walkthrough |
| Capture | A field user can upload with near-zero friction under weak connectivity |

---

## 10. Anti-Patterns To Avoid

1. Do not build separate storage models for standalone apps.
2. Do not ship native apps before PWA/workflow adoption is proven.
3. Do not let each app invent its own share-link or public-view architecture.
4. Do not tie monetization to finishing all dashboard modules.
5. Do not build heavy AI/GPU features before the first revenue apps can sell and onboard cleanly.

---

## 11. Canonical Decision

If there is a conflict between "finish the big platform" and "ship the first sellable app," the priority is:

1. Shared billing/entitlements foundation
2. Shared sharing/deliverable foundation
3. 360 Tour Builder launch
4. PunchWalk launch
5. SlateDrop Deliverables launch
6. Broader ecosystem expansion

This is the default execution order unless new customer evidence overrides it.