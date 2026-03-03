# Slate360 — Future Modules & Unbuilt Feature Specs

**Last Updated:** 2026-03-03
**Context Maintenance:** Update this file whenever module specs change or modules begin construction. Once a module is built, move its section to the appropriate topic-specific blueprint.

> **Build Roadmap:** See `FUTURE_FEATURES.md` for the phased build plan (7 phases), dependency graph, safe build order, and infrastructure checklist. This file contains the detailed specs for each unbuilt module.

> **App Ecosystem:** Each module below can operate as both a Slate360 dashboard tab AND a standalone subscribable app. See `FUTURE_FEATURES.md` Phase 3 for the app ecosystem infrastructure (PWA foundation, standalone routes, subscription model, Capacitor native wrappers). Standalone app subscriptions use `org_feature_flags` table + expanded `getEntitlements()`. Users with a Slate360 tier subscription get integrated access; standalone subscribers get the module + basic SlateDrop storage.

---

## 1. Design Studio

**Route:** `/(dashboard)/design-studio`  
**Standalone Route:** `/design-studio` (standalone subscribers)  
**Tiers:** model, business, enterprise  
**Status:** ❌ Not built  
**Build Phase:** Phase 2 in `FUTURE_FEATURES.md` — 11-step safe build order  
**Standalone Pricing:** Part of Slate360 tiers; Plans PDF Tool standalone at $29–$99/mo

### Overview
3D/2D workspace for construction design — combines 3D model viewing, 2D plan markup (Bluebeam-style), digital twin processing, and fabrication output. Six project types auto-configure the workspace: 2D Design, 3D Design, 2D Plan Review, Smart PDF Tool, Digital Twin, 3D Print/Fabrication.

### User Profiles
| Profile | Target |
|---|---|
| Starter | Basic 3D viewing + annotation |
| Pro | Full modeling + 2D markup + export |
| Expert | Analysis tools + print/fabrication |

### Layout
- **Top bar:** Module title, project selector, Simple/Advanced toggle, undo/redo, save, export, share
- **Left panel:** File browser (SlateDrop), asset library, versions/timeline, upload dropzone
- **Center canvas:** Three.js / React Three Fiber viewport (3D) or PDF.js overlay (2D)
- **Right panel:** Properties, inspector, comments — changes based on mode + selection
- **Bottom bar:** Mode tabs: Upload · Design · Review · Print · Analyze · Animate

### Viewer Stack (Open-Source)
Three.js + React Three Fiber (base), xeokit (BIM/IFC), web-ifc (parsing), PDF.js (2D), SuperSplat (Gaussian Splats), OpenCascade.js + JSCAD (parametric), Kiri:Moto (slicer), Pannellum (360)

### Features
1. **Upload & Convert** — GLB, OBJ, IFC, STL, DWG (via conversion), PDF import
2. **3D Model View** — orbit, section cuts, measurements, annotations
3. **2D Plans View** — Bluebeam-style PDF markup (highlight, measure, stamp, text)
4. **Review/Collaboration** — comment threads pinned to model locations; shareable review links
5. **Print/Fabrication** — 3D Print Lab: repair, scale, split, connector library, CuraEngine WASM slicer
6. **Digital Twin** — Upload wizard → quality tier → credit estimator → GPU processing → web viewer → timeline
7. **Animation** — Camera path on 3D model → fly-through → MP4 export → auto-save to Content Studio
8. **Sharing** — View links (no login) + review links (comment-back, writes to Project Hub as RFI)

### Safe Build Order
Shell → SlateDrop panel → 3D viewer → 2D viewer → IFC/BIM → Upload pipeline → Review → Print Lab → Digital Twin → Animation → Sharing

### Project Hub Integration
- `projectHubId` reference in metadata; attach model versions to Daily Logs, RFIs, Submittals
- Digital Twin Timeline: date-stamped versions, compare overlay/slider, morph timelapse MP4

### Competitive Positioning
Replace: SketchUp (3D), Bluebeam (2D markup), Revit Viewer (BIM), DroneDeploy (digital twins)

---

## 2. Content Studio

**Route:** `/(dashboard)/content-studio`  
**Tiers:** creator, model, business, enterprise  
**Status:** ❌ Not built  
**Build Phase:** Phase 4B in `FUTURE_FEATURES.md`

### Overview
Media creation and management tools — photo report generation, video trimming, social media exports. Receives MP4 exports from Design Studio morph timelapse. Reads media from SlateDrop.

---

## 3. 360 Tour Builder

**Route:** `/(dashboard)/tour-builder`  
**Standalone Route:** `/tour-builder`  
**Tiers:** creator, model, business, enterprise  
**Status:** ❌ Not built  
**Build Phase:** Phase 4A in `FUTURE_FEATURES.md`  
**Standalone Pricing:** $25–$99/mo  
**Native App:** `ai.slate360.tour` (Slate360 Tours)

### Overview
Create 360° virtual tours from panoramic photos using Pannellum viewer.

### Key Requirements
- Hotspot placement (link scenes, add info markers)
- Tour sequencing and auto-play
- Floor plan mapping (upload PDF/image → drop pano pins on plan)
- Shareable public tour links (`/tour/[token]`)
- Multi-floor navigation
- Progress comparison (same angle, different dates)
- Hotspot → Punch List auto-create
- Upload pipeline: Insta360/Ricoh Theta via web, desktop drag-drop, email-to-project, SlateDrop request links
- Free standalone PWA for field crews to capture and view tours

---

## 4. Geospatial & Robotics

**Route:** `/(dashboard)/geospatial-robotics`
**Tiers:** model, business, enterprise
**Status:** ❌ Not built

### Overview
Drone flight planning, aerial survey processing, point cloud visualization, orthomosaic generation.

### GPU Processing (see GPU_WORKER_DEPLOYMENT.md for full spec)
- COLMAP for photogrammetry
- OpenMVS for dense reconstruction
- PDAL + Entwine for point cloud processing
- gltf-pipeline for GLB optimization (Draco compression + LOD)
- py3dtiles for Cesium 3D Tiles

---

## 5. Virtual Studio

**Route:** `/(dashboard)/virtual-studio`
**Tiers:** model, business, enterprise
**Status:** ❌ Not built

### Overview
VR/immersive experience builder for construction site walkthroughs and client presentations.

---

## 6. CEO Command Center

**Route:** `/(dashboard)/ceo`
**Tiers:** enterprise only
**Status:** 🟡 Stub exists (20 lines)

### Spec
Three zones:
1. **Business Health** — Revenue, costs, margin, runway calculations
2. **Actions & Experiments** — Pricing what-if slider, action items, content management
3. **Controls** — Team management, feature flags

### Data Model
```typescript
interface RevenueSnapshot { mrr: number; arr: number; growth: number; churn: number; }
interface CostSnapshot { infra: number; labor: number; marketing: number; }
type PlanMetric = { tier: Tier; activeCount: number; revenue: number; }
```

### Zustand Store
`useCeoStore` with hydrate, simulation, action items, margin/runway calculations.

### API Routes
- `GET /api/ceo/overview` — business health data
- `POST /api/ceo/action` — create/update action items

---

## 7. Analytics & Reports

**Route:** `/(dashboard)/analytics-reports`
**Tiers:** business, enterprise
**Status:** 🟡 Stub exists (37 lines)

### Component
`components/dashboard/AnalyticsReportsClient.tsx` (290 lines) — uses Recharts.

---

## 8. Athlete360

**Route:** `/athlete360`
**Status:** ❌ Not built

### Two Modes
1. **Practice Field** — live session capture and clip creation
2. **Film Room** — review clips with coaching tools

### Layout
Three-panel: Roster & Clips | Viewer | Coach↔Player messaging

### Data Model
```typescript
interface Athlete { id: string; name: string; sport: string; position: string; }
interface AthleteSession { id: string; athleteId: string; date: string; type: 'practice' | 'game'; }
interface AthleteClip { id: string; sessionId: string; startTime: number; endTime: number; tags: string[]; }
interface ClipThreadMessage { id: string; clipId: string; authorRole: 'coach' | 'athlete'; text: string; }
```

### API Routes
- `GET /api/athlete360/athletes`
- `GET /api/athlete360/sessions`
- `GET /api/athlete360/clips`
- `POST /api/athlete360/clips`
- `GET /api/athlete360/threads`
- `POST /api/athlete360/threads`
- `GET /api/athlete360/homework`

### Viewer Modes
- Body Lines skeleton overlay
- Interactive 3D model viewer

---

## 9. My Account Page

**Route:** `/dashboard/account` or `/(dashboard)/account`
**Status:** Partially built

### Sections
1. **Overview** — profile completeness bar, quick stats
2. **Profile & Preferences** — name, avatar, interface presets (simple/creator/project)
3. **Subscription & Billing** — current plan, upgrade/downgrade, credit balance
4. **Security & Access** — password change, 2FA, sessions
5. **API & Integrations** — API keys, connected services
6. **Data & Storage** — usage breakdown, export

### API Routes
- `GET /api/account/overview` — profile + tier + role + usage
- `PATCH /api/account/profile` — update profile
- `POST /api/billing/portal` — Stripe portal redirect
- `GET /api/account/usage` — storage + credit breakdown
- `POST /api/account/api-keys` — manage API keys

### Org Settings
- Per-user entitlement toggles (override tier defaults)
- Seat management (business/enterprise)
- Custom org branding

---

## 10. SlateDrop External Link System (Future Enhancement)

### Data Model
```sql
CREATE TABLE slatedrop_links (
  id UUID PRIMARY KEY,
  project_id UUID REFERENCES projects(id),
  label TEXT,
  expires_at TIMESTAMPTZ,
  max_uploads INT DEFAULT 10,
  require_email BOOLEAN DEFAULT true,
  allowed_types TEXT[],
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE slatedrop_uploads (
  id UUID PRIMARY KEY,
  link_id UUID REFERENCES slatedrop_links(id),
  filename TEXT,
  s3_key TEXT,
  uploader_email TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT now()
);
```

### API Routes (Not Built)
- `POST /api/projects/[projectId]/external-links` — create share link
- `GET /api/external/slatedrop/[linkId]` — get link info (public)
- `POST /api/external/slatedrop/[linkId]/presign` — generate upload URL (public)
- `POST /api/external/slatedrop/[linkId]/finalize` — complete upload (public)
- `GET /api/projects/[projectId]/external-links/uploads` — list uploads

### UI Components (Not Built)
- `SlateDropManager` — manage external links from project
- `SlateDropLinkCard` — individual link card with metrics
- `PublicDropZone` — public upload page for external users
- `SlateDropMetricsPanel` — analytics dashboard for link activity

---

## 11. Market Module

**Route:** `/market`
**Status:** ✅ Built (3,006-line monolith needs decomposition)

### Features
- Prediction market listings (Polymarket integration)
- AI market bot (`lib/market-bot.ts`)
- Trading interface (wagmi + viem for Web3)
- Market scanner, whale tracker

### API Routes (14 total)
`/api/market/activity`, `bot-status`, `buy`, `directives`, `book`, `polymarket`, `resolution`, `scan`, `scheduler/health`, `scheduler/tick`, `summary`, `trades`, `wallet-connect`, `whales`

---

## 12. External Stakeholder Portal (Not Built)

**Route:** `/external/project/[token]`  
**Build Phase:** Phase 1D in `FUTURE_FEATURES.md`

Read-only project view for external stakeholders (clients, inspectors) without requiring Slate360 account. Uses `slatedrop_shares`-style token system. Supports: view-only project summary, RFI response form, submittal approval (approve/reject with signature), daily log summary.

---

## 13. App Ecosystem Infrastructure (Not Built)

**Build Phase:** Phase 3 + Phase 6 in `FUTURE_FEATURES.md`

### Current State
- **PWA:** Zero infrastructure (no manifest, no service worker, no next-pwa package). Marketing pages at `/features/ecosystem-apps` claim PWA but nothing is implemented.
- **Native Apps:** No Capacitor, Expo, or React Native. No app store accounts.
- **Standalone Subscriptions:** No `org_feature_flags` table. Entitlements only support tier-level gating.

### What Needs to Be Built
1. **PWA Foundation:** `manifest.webmanifest`, service worker, `next-pwa` package, install prompt
2. **Standalone Routes:** Per-module routes that work independently of dashboard
3. **Subscription Model:** `org_feature_flags` table, expanded `getEntitlements()`, standalone Stripe products
4. **App Directory:** Functional `/apps` page replacing marketing-only `/features/ecosystem-apps`
5. **Capacitor Wrappers:** iOS/Android shells for main app + key standalone apps
6. **App Store Submission:** Apple ($99/yr) + Google ($25 one-time) developer accounts

### Standalone Apps Planned
| App | Bundle ID | Pricing |
|---|---|---|
| Slate360 (main) | `ai.slate360.app` | Tier-based |
| SlateDrop | `ai.slate360.slatedrop` | $39–$99/mo |
| 360 Tours | `ai.slate360.tour` | $25–$99/mo |
| PunchWalk | `ai.slate360.punch` | $15–$49/mo |
| Slate360 Capture | `ai.slate360.capture` | Free w/ Business+ |

---

## 13. Context Maintenance Checklist

When a module begins construction:
- [ ] Move its section from this file to a dedicated blueprint
- [ ] Create route files
- [ ] Add to dashboard sidebar
- [ ] Gate with `getEntitlements(tier)`
- [ ] Update `SLATE360_PROJECT_MEMORY.md` build status table
