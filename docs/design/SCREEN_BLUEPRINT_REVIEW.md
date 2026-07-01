# Slate360 Screen Blueprint Review
## THIN/SLOP Analysis + Flow Optimization + 3D Tiles Architecture

**Date:** July 1, 2026  
**Designer:** External Platform Review  
**Scope:** All THIN/SLOP screens, linear workflow, missing high-value features

---

## Executive Summary

| Category | Count | Screens |
|----------|-------|---------|
| **SLOP** (rebuild first) | 3 | Integrations hub, Report builder, Contacts detail |
| **THIN** (add value) | 4 | Dashboard widgets, Calendar month view, Capture flow v2, Reports landing |
| **Missing** (new build) | 2 | Onboarding wizard, Cross-company project linking |

**Biggest ROI:** Site Walk Report Builder → real document export is CEO-critical.  
**Biggest Risk:** "Integrations — In Development" is app-store auto-reject.

---

## PART A: SLOP Screens → Full Rebuilds

---

### 1. /integrations — "In Development" Stub (CRITICAL)

**Current State:**
```tsx
<div className="flex flex-col items-center justify-center...">
  <Link2 size={32} className="text-zinc-600 mb-3" />
  <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
    Integrations — In Development
  </p>
</div>
```

**Why This Blocks Release:**
- App Store Review Guideline 2.3: "Apps that are not functional or incomplete will be rejected"
- "In Development" is a red flag for unfinished product

**Decision Matrix:**

| Option | Effort | Risk | Recommendation |
|--------|--------|------|----------------|
| A. Hide route entirely | 1 hr | Zero | **DO NOW** — remove from nav, 404 the route |
| B. Build real integrations hub | 2–3 weeks | Medium | Phase 2 after release |
| C. Replace with "Coming Soon" | 30 min | High | Still rejectable, don't do |

**Immediate Action:**
```typescript
// components/dashboard-desktop/dashboard-nav-config.ts
// REMOVE this entry:
{
  // label: "Integrations",
  // href: "/integrations",
  // icon: Link2Icon,
  // disabled: true  // ← This doesn't save you in review
}

// middleware.ts or route handler
// Return 404 for /integrations until rebuilt
```

**Future Real Integrations Hub (Phase 2):**
- Procore connection (OAuth 2.0)
- Autodesk BIM 360 sync
- QuickBooks invoicing
- Dropbox/Google Drive bridge
- Slack notifications channel

---

### 2. /site-walk/reports/new — Report Builder (CEO-CRITICAL)

**Current State Analysis:**
- Static mockup with drag handles (no drag logic)
- "Generate PDF & Save to SlateDrop" button with NO onClick
- Placeholders: "LOGO HERE", "Organization Name", "YYYY-MM-DD"
- Hardcoded `sky-500` (violates one-accent rule)
- No persistence, no PDF generation, no actual document output

**What Contractors Actually Need:**

Construction professionals don't want to "drag blocks." They want:
1. **Auto-generated reports** from walk data (photos + notes + metadata)
2. **One-click PDF export** that looks professional
3. **Client-ready deliverables** with their logo, not manual composition

**Redesigned Flow:**

```
SIMPLIFIED LINEAR WORKFLOW:

Capture Complete (Site Walk)
    ↓
[Auto] Report Pre-generated
    ↓
Report Studio (Review/Edit)
    • Auto-selected: all photos with timestamps
    • Auto-inserted: voice memos as captions  
    • Auto-added: weather, GPS, device metadata
    • User can: reorder, add text blocks, toggle sections
    ↓
[Export] → PDF to SlateDrop / Email to client / Share link
```

**New Component Architecture:**

```tsx
// app/(dashboard)/site-walk/reports/new/ReportStudio.tsx
// No drag-and-drop. Linear block list with simple controls.

interface ReportBlock {
  id: string;
  type: 'cover' | 'photo_grid' | 'note_transcript' | 'metadata_table' | 'signature';
  sourceData: WalkSessionData; // Auto-populated
  order: number;
  visible: boolean;
  customCaption?: string;
}

export function ReportStudio({ walkId }: { walkId: string }) {
  const { blocks, reorder, toggleVisible, updateCaption, generatePDF } = useReport(walkId);
  
  return (
    <div className="flex h-full">
      {/* Left: Block List (NOT drag-drop — click to reorder) */}
      <BlockSidebar
        blocks={blocks}
        onMoveUp={(id) => reorder(id, -1)}
        onMoveDown={(id) => reorder(id, 1)}
        onToggle={(id) => toggleVisible(id)}
        onCaptionChange={(id, text) => updateCaption(id, text)}
      />
      
      {/* Center: Live Preview (A4 ratio, scrollable) */}
      <ReportPreview blocks={blocks.filter(b => b.visible)} />
      
      {/* Right: Export Options */}
      <ExportPanel
        onExportPDF={() => generatePDF({ format: 'pdf' })}
        onSaveToSlateDrop={() => generatePDF({ format: 'pdf', destination: 'slatedrop' })}
        onEmailClient={(email) => generatePDF({ format: 'pdf', destination: 'email', recipients: [email] })}
      />
    </div>
  );
}
```

**Block Types (Auto-Generated, User Can Toggle/Reorder):**

| Block | Source | User Control |
|-------|--------|--------------|
| Cover Page | Project metadata + org branding | Edit title/subtitle |
| Photo Grid | All walk photos, auto-grouped by stop | Reorder, select subset |
| Voice Memo Transcripts | Auto-transcribed (or raw audio) | Toggle text/audio |
| Metadata Table | Timestamp, GPS, weather, device | Toggle columns |
| Plan Overlay | Stops pinned on uploaded plan | Toggle visibility |
| Signature Line | Project contact signature | Toggle, edit label |

**PDF Generation (Server-Side via Trigger.dev):**

```typescript
// src/trigger/generate-report-pdf.ts
import { puppeteer } from 'puppeteer-core';

export const generateReportPDF = task({
  id: 'generate-report-pdf',
  run: async ({ reportId, blocks, branding }) => {
    // 1. Compile HTML from React PDF template
    const html = compileReportTemplate({ blocks, branding });
    
    // 2. Puppeteer render to PDF
    const browser = await puppeteer.launch();
    const page = await browser.newPage();
    await page.setContent(html);
    const pdf = await page.pdf({ 
      format: 'A4',
      printBackground: true,
      margin: { top: '20mm', right: '20mm', bottom: '20mm', left: '20mm' }
    });
    
    // 3. Upload to SlateDrop or send via email
    const fileUrl = await uploadToSlateDrop(pdf, `${reportId}.pdf`);
    
    return { fileUrl, pageCount: blocks.length };
  }
});
```

**UI Design (Graphite Glass Compliant):**

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  [← Reports]  Report Studio — Oak Ridge Site Walk #3              [Preview] [Export] │
├───────────────┬──────────────────────────────────────────────┬────────────────────────┤
│               │                                              │                        │
│  SECTIONS     │           LIVE PREVIEW (A4)                  │    EXPORT              │
│               │                                              │                        │
│  ☑ Cover      │   ┌────────────────────────────────────┐   │    PDF                 │
│  ☑ Photos     │   │ OAK RIDGE ROOF REPLACEMENT         │   │    ━━━━━━━━            │
│  ☑ Notes      │   │ Site Walk Report — June 28, 2024   │   │    A4 · 12 pages       │
│  ☐ Weather    │   │                                    │   │                        │
│  ☑ Metadata   │   │ [Photo grid renders here]          │   │    [Download PDF]      │
│               │   │                                    │   │                        │
│  [+ Add Text] │   │ Page 2...                          │   │    [Save to SlateDrop] │
│               │   │                                    │   │                        │
│  ───────────  │   └────────────────────────────────────┘   │    [Email to client]   │
│               │                                              │      [Select contacts]   │
│  Reorder:     │                                              │                        │
│  [▲] [▼]      │                                              │    Branding:           │
│               │                                              │    [Logo] [Colors]     │
│               │                                              │                        │
└───────────────┴──────────────────────────────────────────────┴────────────────────────┘
```

**Key Changes:**
- No drag-and-drop (construction users prefer explicit buttons)
- Auto-generate from walk data (zero-starting point)
- One-click export (PDF, SlateDrop, email)
- Professional default template (not white page)

---

### 3. Contacts ?contact= Dead-End

**Current State:** URL changes but no detail view opens.

**Fix:** Open contact detail in slide-over or modal.

```tsx
// components/coordination/ContactDetailSheet.tsx

interface ContactDetailSheetProps {
  contactId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ContactDetailSheet({ contactId, isOpen, onClose }: ContactDetailSheetProps) {
  const { contact, projects } = useContact(contactId);
  
  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[400px] sm:w-[540px]">
        <SheetHeader>
          <SheetTitle>{contact.name}</SheetTitle>
          <SheetDescription>{contact.company || 'No company'}</SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${contact.phone}`}>
                <Phone className="w-4 h-4 mr-2" />
                Call
              </a>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <a href={`mailto:${contact.email}`}>
                <Mail className="w-4 h-4 mr-2" />
                Email
              </a>
            </Button>
            <Button variant="outline" size="sm" onClick={() => shareContact(contact)}>
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </div>
          
          {/* Contact Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <Mail className="w-4 h-4 text-graphite-500" />
              <span className="text-white">{contact.email}</span>
            </div>
            {contact.phone && (
              <div className="flex items-center gap-3 text-sm">
                <Phone className="w-4 h-4 text-graphite-500" />
                <span className="text-white">{contact.phone}</span>
              </div>
            )}
            {contact.role && (
              <div className="flex items-center gap-3 text-sm">
                <Briefcase className="w-4 h-4 text-graphite-500" />
                <span className="text-white">{contact.role}</span>
              </div>
            )}
          </div>
          
          {/* Shared Projects */}
          <div>
            <h4 className="label-mono text-graphite-500 mb-3">SHARED PROJECTS</h4>
            <div className="space-y-2">
              {projects.map(project => (
                <Link 
                  key={project.id}
                  href={`/app/projects/${project.id}`}
                  className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] hover:bg-white/[0.04]"
                >
                  <Folder className="w-4 h-4 text-graphite-500" />
                  <span className="text-sm text-white">{project.name}</span>
                  <ChevronRight className="w-4 h-4 text-graphite-500 ml-auto" />
                </Link>
              ))}
            </div>
          </div>
          
          {/* Edit / Delete */}
          <div className="flex gap-2 pt-4 border-t border-white/[0.06]">
            <Button variant="outline" onClick={() => editContact(contact)}>
              Edit Contact
            </Button>
            <Button variant="ghost" className="text-red-400" onClick={() => deleteContact(contact.id)}>
              Delete
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
```

---

## PART B: THIN Screens → Add Value

---

### 4. Dashboard Widget System

**Current State:** 160px hero tile, no expandable sections.

**Vision from DASHBOARD_VISION.md:**
- Squarish featured project hero (twin snapshot / 360 still / walk photo)
- Expandable widgets: Usage, PDF, Map/3D Tiles
- No scrolling — all tools visible or expandable

**Missing Widgets (Priority Order):**

| Widget | Purpose | Data | Interaction |
|--------|---------|------|-------------|
| **Usage** | Credits + storage | `org_usage`, `billing` | [Buy more] button |
| **Active Projects** | Quick project entry | `projects` | Click → project workspace |
| **Needs Attention** | Inbox preview | `notifications` | Click → inbox |
| **Recent Captures** | Walks/twins awaiting action | `site_walk_sessions`, `twin_captures` | [Submit] [Review] |
| **Deliverables in Flight** | Draft → shared status | `site_walk_deliverables` | [Complete] [Share] |
| **Map/3D Tiles** | Project locations + directions | `projects` (lat/lng) | Click → Google Maps with directions |
| **Calendar** | This week at glance | `calendar_events` | Click → full calendar |

**Widget System Architecture:**

```tsx
// components/dashboard/widgets/DashboardWidgetShell.tsx

interface DashboardWidgetProps {
  title: string;
  icon: React.ReactNode;
  action?: { label: string; href: string };
  collapsible?: boolean;
  defaultExpanded?: boolean;
  badge?: number | string;
  children: React.ReactNode;
}

export function DashboardWidget({
  title,
  icon,
  action,
  collapsible = false,
  defaultExpanded = true,
  badge,
  children
}: DashboardWidgetProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  
  return (
    <div className="glass-panel overflow-hidden">
      {/* Header — always visible */}
      <button
        onClick={() => collapsible && setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center justify-between p-4",
          collapsible && "cursor-pointer hover:bg-white/[0.02]"
        )}
      >
        <div className="flex items-center gap-3">
          <div className="text-graphite-500">{icon}</div>
          <h3 className="label-mono">{title}</h3>
          {badge && (
            <Badge variant={badge > 0 ? "primary" : "default"} size="sm">
              {badge}
            </Badge>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {action && (
            <Link href={action.href} className="text-xs text-graphite-400 hover:text-white">
              {action.label} →
            </Link>
          )}
          {collapsible && (
            <ChevronDown 
              className={cn(
                "w-4 h-4 text-graphite-500 transition-transform",
                expanded && "rotate-180"
              )} 
            />
          )}
        </div>
      </button>
      
      {/* Content — collapsible */}
      {expanded && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
}
```

**Dashboard Layout (1440px+):**

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│  Logo · App Switcher · ⌘K · [Project Picker ▼] · [Account ▼]                                 │
├──────────────┬──────────────────────────────────────────────────────────┬───────────────────┤
│              │                                                                          │                   │
│  LEFT RAIL   │           CENTER: WIDGET GRID (fill height, no scroll)                   │  RIGHT CONTEXT   │
│  (72→220px)  │                                                                          │  (320px)          │
│              │  ┌──────────────────────┐ ┌──────────────────────┐ ┌────────────────┐   │                   │
│  ─Navigation │  │  FEATURED PROJECT    │ │  NEEDS ATTENTION     │ │  THIS WEEK     │   │  [Selected item]  │
│   Home       │  │  [Squarish hero]     │ │  ● 3 comments      │   │  • Mon: Site   │   │                   │
│   Projects   │  │  [Enter project →]   │ │  ● 1 twin ready    │   │  • Wed: Walk   │   │  details or       │
│   Files      │  └──────────────────────┘ │  [Open inbox →]    │   │  [View all →]  │   │  global calendar  │
│   Twins      │  ┌──────────────────────┐ └──────────────────────┘ └────────────────┘   │  mini-view        │
│   Walks      │  │  RECENT CAPTURES     │ ┌──────────────────────┐                       │                   │
│   Calendar   │  │  Walk #12 [Submit]   │ │  STORAGE & CREDITS   │                       │                   │
│   Hub        │  │  Twin #3 [View]      │ │  ▓▓▓▓▓▓░░░ 340/500 │                       │                   │
│              │  │  [All captures →]    │ │  42 credits [Buy]    │                       │                   │
│              │  └──────────────────────┘ └──────────────────────┘                       │                   │
│              │                                                                          │                   │
│              │  ┌──────────────────────────────────────────────────────────────────┐   │                   │
│              │  │  PROJECT MAP — 3 locations [View in Google Maps] [Get directions]  │   │                   │
│              │  │  [Interactive 3D Tiles or 2D Google Map embed]                    │   │                   │
│              │  └──────────────────────────────────────────────────────────────────┘   │                   │
│              │                                                                          │                   │
└──────────────┴──────────────────────────────────────────────────────────────────────────┴───────────────────┘
```

---

### 5. Calendar — Month View + Create/Edit

**Current State:** Agenda-only, read-only, no month grid.

**Add:**
1. Month grid view (toggle with agenda)
2. Create event (already exists — wire to button)
3. Edit event (bottom sheet on mobile, modal on desktop)
4. Delete event (with confirmation)

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│  [← Coordination]  Calendar                                          [+ New Event]   │
├─────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                     │
│  [June 2024 ▼]  [←] [→]        [Month ▼] [Today]                                   │
│                                                                                     │
│  ┌────┬────┬────┬────┬────┬────┬────┐                                              │
│  │ Su │ Mo │ Tu │ We │ Th │ Fr │ Sa │                                              │
│  ├────┼────┼────┼────┼────┼────┼────┤                                              │
│  │    │    │    │    │    │ 1  │ 2  │  ● = has event                              │
│  │    │    │    │    │    │    │    │  🔴 = today                                  │
│  ├────┼────┼────┼────┼────┼────┼────┤                                              │
│  │ 3  │ 4  │ 5  │ 6  │ 7🔴│ 8  │ 9  │  ○ = selected                               │
│  │    │ ●  │    │ ●● │    │    │    │                                              │
│  └────┴────┴────┴────┴────┴────┴────┘                                              │
│                                                                                     │
│  JUNE 7, 2024 — EVENTS                                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────┐ │
│  │ 🔴 9:00 AM   Site Inspection — Oak Ridge Roof                    [Edit →]     │ │
│  │    Project: Oak Ridge · Inspection · 1 hour                                  │ │
│  └──────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                     │
└─────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 6. Capture Flow V2 — Persist Attachments

**Current State:** `SAMPLE_STOPS`, unpersisted attachments, hardcoded `#6EA7A0`.

**Simplify:**
- Remove V2 experimental flow OR make it the canonical flow
- Persist attachments to `site_walk_attachments` table
- Remove hardcoded color (use token)

---

## PART C: Linear Workflow Optimization

### Current Flow (BROKEN CONNECTIONS):

```
Dashboard → Projects → [Project Workspace]
    ↓           ↓
Capture ← ? ← ? ← ? ← ? (dead end, no clear path)
    ↓
Report Builder (SLOP, no export)
    ↓
? (no deliverable created)
    ↓
? (no share flow)
```

### Optimized Flow (Near-Zero Training):

```
START: Dashboard Hero (or Projects List)
    ↓
Click Featured Project → Enter Project Workspace
    ↓
[Big obvious button] CAPTURE (Site Walk | Twin 360)
    ↓
Capture Flow (native iOS or web fallback)
    ↓
Review Screen — thumbnails + notes + metadata
    ↓
[Submit for processing] → Credits/time estimate shown
    ↓
Processing Screen (staged progress, can leave)
    ↓
Notification: "Your walk is ready"
    ↓
Click notification → Deliverable Studio
    ↓
Auto-generated report (photos + notes + metadata)
    ↓
[Edit report] → [Add logo] → [Export PDF]
    ↓
[Share with client] → Enter email → Send
    ↓
Client receives: View link + PDF download
    ↓
Dashboard: "Delivered: Oak Ridge Report" → Click → Analytics
```

**Key Improvements:**
1. **One hero CTA** — Featured project has dominant "Capture" button
2. **No orphan screens** — Every screen has clear next step
3. **Auto-generate** — Report pre-built from walk (not blank canvas)
4. **Notification-driven** — User leaves, gets pinged, returns
5. **Client-ready output** — PDF + share link, not "export coming soon"

---

## PART D: Cross-Company Collaboration

### Missing: Project Linking Between Orgs

**Scenario:**
- GC (General Contractor) has project in Slate360
- Subcontractor (plumber) also uses Slate360
- Currently: GC exports PDF, emails to sub, sub re-uploads
- Wanted: GC adds sub as "linked org" on project, sub sees project in their dashboard

**Data Model:**

```sql
-- New table: cross-org project links
CREATE TABLE project_org_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id),
    owner_org_id UUID NOT NULL REFERENCES organizations(id),
    linked_org_id UUID NOT NULL REFERENCES organizations(id),
    
    -- Permission scope
    scope_level VARCHAR(20) NOT NULL CHECK (scope_level IN (
        'view_only',           -- Can view walks/twins, no capture
        'capture_only',        -- Can capture, can't delete/edit
        'full_collaborator'    -- Full project access except deletion
    )),
    
    -- Who initiated
    invited_by_user_id UUID NOT NULL REFERENCES auth.users(id),
    
    -- Status
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'accepted', 'declined', 'revoked'
    )),
    
    -- Metadata
    message TEXT, -- Optional invitation message
    accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT now(),
    
    -- Constraints
    UNIQUE(project_id, linked_org_id)
);

-- Index for quick lookup
CREATE INDEX idx_project_org_links_linked ON project_org_links(linked_org_id, status);

-- RLS: Linked org members can see project
CREATE POLICY project_cross_org_access ON projects
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM project_org_links
        WHERE project_id = projects.id
        AND linked_org_id = auth.jwt()->>'org_id'
        AND status = 'accepted'
    )
);
```

**UI Flow:**

```
Project Settings → Team → [+ Link External Organization]
    ↓
Enter org slug or email domain
    ↓
Select permission level: [View only] [Capture] [Full collaborator]
    ↓
Send invitation
    ↓
Recipient org admin sees: "Slate360 Roofing wants to link on Oak Ridge"
    ↓
[Accept] → Project appears in their dashboard with badge "Linked from Slate360 Roofing"
```

**Dashboard Badge for Linked Projects:**

```tsx
<Badge variant="outline" className="border-dashed border-graphite-500/50">
  <Link2 className="w-3 h-3 mr-1" />
  Linked from {sourceOrgName}
</Badge>
```

---

## PART E: 3D Tiles Surrounding Context (Google vs OSS)

### Requirement
Show context around a capture: buildings, terrain, streets. Two approaches:

| Approach | Cost | Quality | Setup | Recommendation |
|----------|------|---------|-------|----------------|
| **Google Photorealistic 3D Tiles** | $6/1000 requests (free tier: 100K/mo) | Excellent, real-world buildings | Google Cloud API key, OAuth | **Primary** — best quality, lowest dev cost |
| **CesiumJS + OSM Buildings** | Free (tile CDN) | Good buildings, no terrain detail | Cesium ion token | **Fallback** — unlimited, lower fidelity |
| **Mapbox 3D (Mapbox GL JS v2)** | Usage-based | Good, limited coverage | Mapbox token | **Alternative** — if already on Mapbox |

### Recommended: Google Photorealistic 3D Tiles

**Why:**
- Best visual quality (photorealistic meshes, not extruded footprints)
- Covers 2500+ cities globally
- CesiumJS integration = existing Three.js/React Three Fiber knowledge applies
- 100K free requests/month = 1000 project previews for typical usage

**Implementation:**

```tsx
// components/maps/Google3DTilesViewer.tsx
import { CesiumComponent } from 'resium';
import { Ion, createGooglePhotorealistic3DTileset } from 'cesium';

interface Google3DTilesViewerProps {
  centerLat: number;
  centerLng: number;
  captureRadius?: number; // meters
  onTileLoad?: () => void;
}

export function Google3DTilesViewer({ 
  centerLat, 
  centerLng, 
  captureRadius = 200,
  onTileLoad 
}: Google3DTilesViewerProps) {
  // Google Cloud API key (stored in env, rotated)
  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  
  // Create tileset
  const tileset = createGooglePhotorealistic3DTileset(GOOGLE_MAPS_API_KEY, {
    // Options for performance
    maximumScreenSpaceError: 8,
    skipLevelOfDetail: true,
    baseScreenSpaceError: 1024,
    skipScreenSpaceErrorFactor: 16,
    skipLevels: 1,
    immediatelyLoadDesiredLevelOfDetail: false,
    loadSiblings: false,
    cullWithChildrenBounds: true,
    cullRequestsWhileMoving: true,
    cullRequestsWhileMovingMultiplier: 10,
    preloadWhenHidden: false,
    preferLeaves: true,
    maximumMemoryUsage: 512, // MB
  });
  
  return (
    <CesiumComponent
      terrainProvider={undefined} // 3D tiles include terrain
      cameraPosition={{ lat: centerLat, lng: centerLng, height: 500 }}
    >
      <Entity>
        {/* Capture location marker */}
        <Billboard
          position={Cartesian3.fromDegrees(centerLng, centerLat, 50)}
          image="/icons/capture-marker.svg"
          scale={0.5}
        />
        
        {/* Capture radius circle */}
        <Entity
          position={Cartesian3.fromDegrees(centerLng, centerLat, 1)}
          ellipse={{
            semiMinorAxis: captureRadius,
            semiMajorAxis: captureRadius,
            material: Color.fromCssColorString('#00E699').withAlpha(0.2),
            outline: true,
            outlineColor: Color.fromCssColorString('#00E699'),
          }}
        />
      </Entity>
      
      {/* 3D Tiles */}
      <Cesium3DTileset
        url={tileset}
        onReady={onTileLoad}
      />
    </CesiumComponent>
  );
}
```

**Dashboard Widget Integration:**

```tsx
// components/dashboard/widgets/ProjectMapWidget.tsx

export function ProjectMapWidget({ projectId }: { projectId: string }) {
  const { project, captures } = useProjectWithCaptures(projectId);
  const [mapMode, setMapMode] = useState<'2d' | '3d'>('2d');
  
  if (!project.lat || !project.lng) {
    return (
      <EmptyState
        icon={<Map className="w-8 h-8" />}
        title="No location set"
        description="Add a project address to see it on the map."
        action={<Button variant="outline">Add location</Button>}
      />
    );
  }
  
  return (
    <DashboardWidget
      title="Project Locations"
      icon={<Map className="w-5 h-5" />}
      action={{ label: 'Get directions', href: `https://maps.google.com/?q=${project.lat},${project.lng}` }}
    >
      <div className="h-[300px] rounded-lg overflow-hidden relative">
        {mapMode === '3d' ? (
          <Google3DTilesViewer
            centerLat={project.lat}
            centerLng={project.lng}
            captureRadius={200}
          />
        ) : (
          <GoogleMapEmbed
            center={{ lat: project.lat, lng: project.lng }}
            markers={captures.map(c => ({ lat: c.lat, lng: c.lng }))}
          />
        )}
        
        {/* Toggle */}
        <div className="absolute top-3 right-3 flex bg-black/60 rounded-lg overflow-hidden">
          <button
            onClick={() => setMapMode('2d')}
            className={cn(
              "px-3 py-1.5 text-xs",
              mapMode === '2d' ? "bg-white text-black" : "text-white/70"
            )}
          >
            2D
          </button>
          <button
            onClick={() => setMapMode('3d')}
            className={cn(
              "px-3 py-1.5 text-xs",
              mapMode === '3d' ? "bg-white text-black" : "text-white/70"
            )}
          >
            3D
          </button>
        </div>
        
        {/* Directions button */}
        <a
          href={`https://maps.google.com/dir/?api=1&destination=${project.lat},${project.lng}`}
          target="_blank"
          rel="noopener"
          className="absolute bottom-3 right-3 flex items-center gap-2 px-3 py-2 bg-graphite-canvas/90 rounded-lg text-xs text-white hover:bg-graphite-canvas"
        >
          <Navigation className="w-3.5 h-3.5" />
          Get directions
        </a>
      </div>
      
      {/* Capture markers list */}
      <div className="mt-3 space-y-2">
        {captures.slice(0, 3).map(capture => (
          <div key={capture.id} className="flex items-center gap-2 text-xs">
            <MapPin className="w-3.5 h-3.5 text-graphite-500" />
            <span className="text-white">{capture.title || `Capture ${capture.id.slice(0, 8)}`}</span>
            <span className="text-graphite-500">
              {formatDistance(capture.lat, capture.lng, project.lat, project.lng)} from center
            </span>
          </div>
        ))}
        {captures.length > 3 && (
          <Link href={`/app/projects/${projectId}/walks`} className="text-xs text-graphite-400 hover:text-white">
            + {captures.length - 3} more captures →
          </Link>
        )}
      </div>
    </DashboardWidget>
  );
}
```

**Cost Estimation:**

| Usage Tier | Requests/Month | Cost | Notes |
|------------|----------------|------|-------|
| Startup | 10,000 | $0 (free tier) | 100 project previews |
| Growth | 100,000 | $0 (free tier) | 1000 project previews |
| Scale | 500,000 | $2,400 | 5000 previews |
| Enterprise | 2,000,000 | $11,400 | Custom pricing likely |

**Fallback Strategy:**
If Google quota exceeded or unavailable:
1. Auto-fallback to CesiumJS + OSM Buildings (lower quality, free)
2. Show 2D Google Maps instead
3. Display quota warning in widget settings

---

## PART F: Missing High-Value Features

### 1. Onboarding Wizard

**Current State:** Signup → Pending verification → Dashboard. No guidance.

**Gap:** New users don't know:
- What a "project" is in Slate360 context
- How to capture (phone vs desktop)
- What happens after capture

**Simple Onboarding (3 steps):**

```
Step 1: Welcome + What is Slate360?
    "Document construction sites with your phone.
     Create 3D twins, site walks, and professional reports."
    [Next]

Step 2: Create Your First Project
    [Project name input]
    [Address input]
    [Create project]

Step 3: How to Capture
    [Phone: Download iOS app] [QR code]
    [Desktop: Use 360 camera + upload]
    [Start with sample data]

[Done] → Dashboard with first project featured
```

### 2. Search (⌘K)

**Missing:** No global search. Users must navigate through menus.

**Quick Win:** `cmdk` integration

```tsx
// components/search/CommandPalette.tsx
import { Command } from 'cmdk';

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const { projects, walks, twins, files } = useSearchIndex();
  
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  return (
    <Command.Dialog open={open} onOpenChange={setOpen}>
      <Command.Input placeholder="Search projects, walks, twins..." />
      <Command.List>
        <Command.Group heading="Projects">
          {projects.map(p => (
            <Command.Item key={p.id} onSelect={() => router.push(`/app/projects/${p.id}`)}>
              <Folder className="w-4 h-4 mr-2" />
              {p.name}
            </Command.Item>
          ))}
        </Command.Group>
        <Command.Group heading="Recent Walks">
          {walks.map(w => (
            <Command.Item key={w.id} onSelect={() => router.push(`/app/walks/${w.id}`)}>
              <Camera className="w-4 h-4 mr-2" />
              {w.title}
            </Command.Item>
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
```

### 3. Mobile-Responsive Dashboard

**Current State:** Desktop dashboard exists. Mobile uses separate app home.

**Gap:** Tablet users (iPad Pro in field) get desktop layout that's unusable.

**Solution:** Responsive dashboard breakpoints:
- < 768px: Mobile app home (existing)
- 768–1024px: Tablet (collapsible rail, 2-col widgets)
- > 1024px: Desktop (full layout)

---

## Implementation Priority

### Week 1: Blockers
1. **Hide /integrations route** — 1 hour, unblocks app store
2. **Fix contacts dead-end** — 4 hours

### Week 2–3: Core Value
3. **Rebuild Report Builder** — auto-generate + PDF export
4. **Dashboard widgets** — Usage, Active Projects, Needs Attention

### Week 4: Polish
5. **Calendar month view + edit**
6. **Project map widget** (Google 3D Tiles)
7. **⌘K search**

### Phase 2: Collaboration
8. **Cross-company project linking**
9. **Onboarding wizard**
10. **Real integrations hub** (Procore, etc.)

---

*Review completed: July 1, 2026*