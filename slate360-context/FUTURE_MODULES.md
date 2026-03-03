# Slate360 — Future Modules & Unbuilt Feature Specs

**Last Updated:** 2026-03-02
**Context Maintenance:** Update this file whenever module specs change or modules begin construction. Once a module is built, move its section to the appropriate topic-specific blueprint.

---

## 1. Design Studio

**Route:** `/(dashboard)/design-studio`
**Tiers:** model, business, enterprise
**Status:** ❌ Not built

### Overview
3D/2D workspace for construction design — combines 3D model viewing, 2D plan markup (Bluebeam-style), and fabrication output.

### User Profiles
| Profile | Target |
|---|---|
| Starter | Basic 3D viewing + annotation |
| Pro | Full modeling + 2D markup + export |
| Expert | Analysis tools + print/fabrication |

### Layout
- **Left panel:** Model browser, layer tree, asset library
- **Center canvas:** 3D viewport or 2D plan viewer
- **Right panel:** Properties, inspector, comments
- **Bottom bar:** Mode switcher (3D Model / 2D Plans / Analysis)

### Features
1. **Upload & Convert** — GLB, OBJ, IFC, STL import
2. **3D Model View** — orbit, section cuts, measurements, annotations
3. **2D Plans View** — Bluebeam-style PDF markup (highlight, measure, stamp, text)
4. **Review/Collaboration** — comment threads pinned to model locations
5. **Print/Fabrication** — 3D Print Lab integration

### 3D Print Lab (Sub-feature)
- Multi-printer management (USB, LAN, cloud)
- Auto-sectioning for large models
- STL/OBJ mesh preparation
- Print queue with status tracking

### Competitive Positioning
Replace: SketchUp (3D), Bluebeam (2D markup), Revit Viewer (BIM)

---

## 2. Content Studio

**Route:** `/(dashboard)/content-studio`
**Tiers:** creator, model, business, enterprise
**Status:** ❌ Not built

### Overview
Media creation and management tools — video editing, image processing, social media content generation for construction marketing.

---

## 3. 360 Tour Builder

**Route:** `/(dashboard)/tour-builder`
**Tiers:** creator, model, business, enterprise
**Status:** ❌ Not built

### Overview
Create 360° virtual tours from panoramic photos using Pannellum viewer.

### Key Requirements
- Hotspot placement (link scenes, add info markers)
- Tour sequencing and auto-play
- Embed/share export
- Free PWA concept: "Slate360 360 Tour" — standalone viewer for sharing tours

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

Read-only project view for external stakeholders (clients, inspectors) without requiring Slate360 account.

---

## 13. Context Maintenance Checklist

When a module begins construction:
- [ ] Move its section from this file to a dedicated blueprint
- [ ] Create route files
- [ ] Add to dashboard sidebar
- [ ] Gate with `getEntitlements(tier)`
- [ ] Update `SLATE360_PROJECT_MEMORY.md` build status table
