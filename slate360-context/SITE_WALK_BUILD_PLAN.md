# Site Walk — Comprehensive Build Plan

Last Updated: 2026-04-10
Status: **Architecture decisions locked. Ready to build.**
Audience: This document is designed for an AI assistant to help plan layout, features, UX, workflows, and deliverables — then generate prompts for implementation.

---

## 1. What Is Site Walk?

Site Walk is a **mobile-first field documentation app** for construction professionals. It is the FIRST app in the Slate360 ecosystem being built end-to-end, and will serve as the template for how all future apps integrate.

Users walk a job site, take photos, add notes (keyboard or voice), tag GPS locations, mark items on drawings, and generate professional deliverables — all from their phone.

### Target Users
- **General Contractors (GCs)**: Document progress, generate punch lists, send reports to clients/architects
- **Subcontractors**: Document their own work, submit completion walkthroughs, respond to punch list items
- **Inspectors**: Structured inspection checklists with photo evidence
- **Estimators/Sales**: Document site conditions for proposals and estimates
- **Project Managers**: Track progress across multiple sites from the office

### Core Use Cases
1. **Progress Documentation**: Walk a site, photograph each area, auto-tag with GPS + timestamp
2. **Punch Lists**: Tag deficiencies on drawings, assign to responsible parties, track resolution
3. **Inspections**: Structured checklists with photo evidence, pass/fail items
4. **Proposals / Estimates**: Document existing site conditions for scope of work
5. **Reports**: Combine photos, notes, and data into branded shareable deliverables

### Key Design Principles
- **Mobile-first**: Designed for one-handed use on a job site (phone in one hand)
- **Offline-capable**: Construction sites have basements, remote areas, poor cell coverage
- **Auto-save everything**: Never lose field data — every capture saves immediately
- **Professional output**: Branded deliverables, PDF export, digital viewer links
- **Voice-to-text**: Hands may be dirty, gloved, or holding tools
- **Fast capture**: Minimize taps between deciding to photograph something and the photo being saved
- **GPS + timestamp on everything**: Automatic location tagging for audit trail

---

## 2. The Slate360 Platform Context

Site Walk is NOT a standalone app — it lives inside the Slate360 ecosystem. Understanding the platform is essential for designing Site Walk correctly.

### Platform Architecture
- **One account, one dashboard, multiple apps**: User logs into Slate360 once and accesses all subscribed apps from the dashboard
- **PWA (Progressive Web App)**: Installs to home screen like a native app, no App Store needed
- **Desktop + Mobile = same app**: Office managers see the same data as field workers, real-time synced
- **Per-app subscriptions**: Users subscribe to individual apps (Site Walk, 360 Tours, etc.) at different tiers

### Tier System (per-app)
```
trial → standard → business → enterprise
```
| Tier | Site Walk Specifics |
|---|---|
| **Trial** | Limited sessions, limited storage, limited deliverables. Test before buying. |
| **Standard** | Full access for individual users. X GB storage, Y sessions/month, Z deliverables/month (limits TBD) |
| **Business** | Multi-seat teams. More storage, contributor invites, priority support. |
| **Enterprise** | ALL apps, unlimited everything, admin panel, white-label branding. |

### How Site Walk Integrates with the Platform
| Platform Feature | How Site Walk Uses It |
|---|---|
| **Dashboard** | App card shows recent sessions, quick-start button, storage usage |
| **Project Hub** | Each Site Walk session is linked to a project. Sessions appear in the project's tool tabs |
| **SlateDrop** (file manager) | All photos, notes, and deliverables are stored as files in SlateDrop. Uses presigned S3 URLs for upload |
| **Project Folders** | `/Site Walk/Sessions/` and `/Site Walk/Deliverables/` folders auto-provisioned |
| **History Folder** | Submitted deliverables auto-snapshot to `/History/` (immutable record) |
| **Deliverable Access Tokens** | Shared viewer links use the platform's token-based access system |
| **Activity Log** | Every session start/end, photo capture, deliverable submit is logged |
| **Contributors** | Invited subs/collaborators can do walks within scoped project access |
| **Billing** | `/api/billing/app-checkout` handles subscription, credit packs for extra storage/AI |
| **Beta Access Codes** | Beta testers enter a code to unlock Site Walk before public pricing goes live |
| **Notifications** | Real-time push when contributors submit work, when deliverables are viewed |
| **Entitlements** | `canAccessStandalonePunchwalk` flag gates access. `getEntitlements()` enforces limits |

---

## 3. What Already Exists (Code Inventory)

### Database
| Table | Status | Description |
|---|---|---|
| `site_walk_sessions` | ✅ Exists | Created in migration `20260407000002`. Columns: id, org_id, project_id, created_by, title, status (draft/in_progress/completed/archived), started_at, completed_at, metadata (JSONB). RLS enabled. |
| `site_walk_items` | ❌ Not built | Individual captures within a session (see schema below) |
| `site_walk_deliverables` | ❌ Not built | Generated deliverables from sessions (see schema below) |
| `projects` | ✅ Exists | Project entity — sessions link to projects |
| `project_folders` | ✅ Exists | Folder structure — sessions store files in project folders |
| `slatedrop_uploads` | ✅ Exists | File records — photos/media link to this table |
| `project_activity_log` | ✅ Exists | Audit trail for all project events |
| `deliverable_access_tokens` | ✅ Exists | Token-based sharing for deliverables |
| `org_feature_flags` | ✅ Exists | Contains `standalone_site_walk` boolean + `site_walk_seat_limit`/`site_walk_seats_used` |

### UI Components
| File | Lines | What It Does |
|---|---|---|
| `components/site-walk/BlockEditor.tsx` | 118 | Block-based deliverable editor. Manages title, blocks, preview toggle. |
| `components/site-walk/BlockRenderer.tsx` | 196 | Renders individual editor blocks (heading, text, image, divider, callout). |
| `components/site-walk/BlockToolbar.tsx` | 51 | Dropdown for adding new block types to deliverables. |

### Routes
| Route | Status | Description |
|---|---|---|
| `/site-walk` | ✅ Landing page | Shows welcome message after subscription, gates access via entitlements |
| `/site-walk/[projectId]/deliverables/new` | ✅ Exists | Creates new deliverable using BlockEditor |

### Types
| File | Description |
|---|---|
| `lib/types/blocks.ts` | TypeScript types for BlockEditor: `BlockType`, `EditorBlock` (union of Heading/Text/Image/Divider/Callout), `createBlock()` factory |

### Platform Integration Points
| Integration | Status |
|---|---|
| Navigation links (sidebar, mobile nav, quick nav) | ✅ Wired |
| Marketing homepage app card | ✅ Wired |
| Billing checkout (`/api/billing/app-checkout`) | ✅ Wired (env vars TBD) |
| Stripe webhook (app subscription activation) | ✅ Wired |
| Upload validation (`validate-upload-permissions.ts`) | ✅ Blocks large files for site_walk context |
| SlateDrop folder tree (shows Site Walk icon) | ✅ Wired |
| Dashboard APPS array (walled-garden-dashboard) | ✅ Shows Site Walk card |

### What Is NOT Built
- ❌ Session CRUD API routes
- ❌ Item capture API (photos, GPS, voice notes)
- ❌ Mobile capture UI (camera-first UX)
- ❌ Session review/edit screen
- ❌ Deliverable generation pipeline
- ❌ PDF export
- ❌ Offline sync queue (IndexedDB)
- ❌ Voice-to-text integration
- ❌ AI note formatting
- ❌ Drawing overlay / pin system
- ❌ History folder auto-provisioning on submit
- ❌ Contributor walk flow
- ❌ Real-time sync (field → office notifications)

---

## 4. Database Schema (New Tables Needed)

### `site_walk_items`
Individual captures within a session.
```sql
CREATE TABLE public.site_walk_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.site_walk_sessions(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL CHECK (item_type IN ('photo', 'note', 'voice_note', 'drawing_pin', 'checklist_item')),
  content_text TEXT,                        -- note text or voice transcription
  file_id UUID REFERENCES public.slatedrop_uploads(id), -- linked photo/media
  location_lat DOUBLE PRECISION,            -- GPS latitude
  location_lng DOUBLE PRECISION,            -- GPS longitude
  location_label TEXT,                       -- "Building A, Floor 3, Room 301"
  drawing_id UUID,                           -- if pinned to a drawing
  drawing_x DOUBLE PRECISION,               -- pin X coordinate on drawing
  drawing_y DOUBLE PRECISION,               -- pin Y coordinate on drawing
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved', 'na')),
  assigned_to TEXT,                           -- who needs to fix (punch list)
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  sort_order INT NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### `site_walk_deliverables`
Generated deliverables from sessions.
```sql
CREATE TABLE public.site_walk_deliverables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.site_walk_sessions(id) ON DELETE SET NULL,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL CHECK (deliverable_type IN (
    'punch_list', 'inspection_report', 'proposal', 'progress_report', 'custom'
  )),
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'final')),
  content JSONB NOT NULL DEFAULT '{}'::jsonb,   -- structured deliverable data
  pdf_file_id UUID REFERENCES public.slatedrop_uploads(id),    -- generated PDF
  history_file_id UUID REFERENCES public.slatedrop_uploads(id), -- immutable copy
  branding_logo_url TEXT,
  access_token_id UUID REFERENCES public.deliverable_access_tokens(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  submitted_at TIMESTAMPTZ
);
```

---

## 5. User Flows (Complete)

### Flow 1: Mobile Field Capture (Primary Use Case)

```
1. USER OPENS SITE WALK
   - From dashboard: tap Site Walk app card → enters Site Walk home
   - From home screen: tap installed PWA icon → opens directly to Site Walk
   - From Project Hub: tap "Start Walk" on a project → enters that project's Site Walk

2. SELECT OR CREATE PROJECT
   - If coming from Project Hub: project already selected
   - If from dashboard/home: shows list of recent projects with "Start Walk" buttons
   - "New Project" option → Create Project Wizard (existing) → auto-provisions folders

3. START NEW SESSION
   - Pick session type (dropdown or quick-select cards):
     • Progress Walk (default — general documentation)
     • Punch List (deficiency tracking)
     • Inspection (structured checklist)
     • Proposal / Estimate (site condition documentation)
     • General / Custom
   - Auto-generate session name: "Apr 10 Walk - {Project Name}"
   - User can edit the name
   - Session status → "in_progress"

4. WALK MODE (the core experience)
   - Full-screen camera viewfinder as primary UI
   - Bottom action bar:
     • 📷 Camera shutter button (center, large)
     • 🎤 Voice note button (left)
     • ✏️ Text note button (right)
     • 📐 Drawing overlay button (if drawings uploaded)
   - Top status bar:
     • Session name
     • Item count ("12 items captured")
     • GPS indicator (green = active, orange = acquiring, red = no signal)
     • Offline indicator (if disconnected)
     • Battery/time (system)
   - CAPTURE FLOW:
     a. Tap camera → photo taken → auto-saved immediately
     b. Optional: add note to photo (text or voice)
     c. Optional: tag location label ("Building A, Floor 3")
     d. Optional: set priority (for punch list items)
     e. Optional: assign to someone (for punch list items)
     f. Item appears in session timeline (scrollable list below camera)
   - GPS auto-tags every capture with lat/lng
   - Timestamp auto-applied
   - Each item auto-saves to IndexedDB immediately, syncs to server when online

5. DURING THE WALK
   - User can scroll down to see timeline of all captured items
   - Can tap any item to edit notes, change priority, add assignment
   - Can delete items (with confirmation)
   - Can reorder items (drag handle)
   - Can pause session (close app — it resumes automatically)
   - Voice notes: tap mic → speak → auto-transcribes → editable text note

6. DRAWING OVERLAY (if drawings uploaded)
   - User taps drawing button → sees uploaded plan/blueprint
   - Pinch-to-zoom, pan around
   - Tap on drawing → drops a numbered pin
   - Pin links to a photo + note (capture from that location)
   - Pins visible on drawing with status colors (red = open, green = resolved)
   - Great for punch lists: "Pin 7 on Level 3 Plan: cracked tile, Room 301"

7. END SESSION → REVIEW
   - User taps "Review & Complete"
   - Review screen: scrollable list of all items with thumbnails
   - Can edit any item (notes, priority, assignment, order)
   - Can delete items
   - Can add missed items
   - AI format option: "Clean up my notes" → AI rewrites notes in professional tone
   - Preview deliverable option: see what the final output will look like

8. SUBMIT SESSION
   - Session status → "completed"
   - Deliverable draft auto-generated based on session type
   - All photos synced to S3 / SlateDrop (if they weren't already)
   - Snapshot saved to /History/ folder (immutable record)
   - Subscriber notified in dashboard (if submitted by contributor)
```

### Flow 2: Contributor Walk

```
1. Contributor receives invitation (email/text with link + access code)
2. Clicks link → creates free Slate360 account (or signs in)
3. Enters access code → gains scoped project access
4. Sees only their assigned project(s) in a simplified interface
5. Taps "Start Walk" → same capture flow as above, but:
   - Can only work on assigned projects
   - Cannot access other apps or settings
   - Cannot delete/edit other people's items
6. On submit:
   - TWO versions saved:
     a. Editable version (subscriber can review/modify)
     b. PDF snapshot (immutable record of what was submitted)
   - Subscriber gets notification: "John submitted 8 photos — Building A Walk"
   - Files saved to project's /Site Walk/ folder
```

### Flow 3: Office Review (Desktop)

```
1. Office manager opens Slate360 on desktop (PWA or browser)
2. Gets notification: "New walk submitted — Building A Progress"
3. Opens session → sees all photos, notes, pins on drawings
4. Can edit, annotate, add comments
5. Generates deliverable:
   - Selects items to include
   - Chooses format: PDF, digital viewer link, or interactive email
   - Adds company branding (logo)
   - Previews final output
6. Sends to client via email, text, or copy link
7. Tracks: has client opened it? Downloaded?
```

### Flow 4: Punch List Resolution Cycle

```
1. Inspector creates Punch List session → captures deficiencies with photos
2. Each item: photo + note + location pin + priority + assigned party
3. Submits → punch list deliverable generated
4. Sends to GC or responsible party
5. Assigned party receives notification
6. They open their assigned items → fix the issue → take resolution photo
7. Mark item as "Resolved" with photo evidence
8. Inspector re-walks → verifies resolutions → marks confirmed
9. Final punch list: all items resolved, new deliverable generated
10. Sent to client/architect as proof of completion
```

---

## 6. Offline Behavior (Critical for Construction)

```
1. App detects no connectivity → "Offline Mode" indicator (subtle, not blocking)
2. User continues ALL operations: photos, notes, voice, drawing pins
3. Everything saves to IndexedDB immediately (never lost)
4. Sync indicator: "12 items waiting to upload" (badge in top bar)
5. Connectivity returns → background sync begins automatically
6. Items upload to S3, records created in Supabase, in order
7. Conflict resolution: server timestamp wins, but local edits are never discarded
8. Green checkmark: "All synced" (badge clears)
9. If user submits a session while offline:
   - Session marked "pending_sync" locally
   - On reconnect: full sync → submit → notifications fire
```

### IndexedDB Schema (planned)
```
Store: pendingItems
  - id (auto-increment)
  - sessionId
  - itemType
  - contentText
  - imageBlob (binary)
  - lat, lng
  - metadata
  - createdAt
  - syncStatus: 'pending' | 'uploading' | 'synced' | 'failed'

Store: sessions
  - id
  - projectId
  - title
  - sessionType
  - status
  - items (array of item IDs)
  - lastSynced
```

---

## 7. Deliverable System

### Deliverable Types
| Type | Content | Typical Recipients |
|---|---|---|
| **Progress Report** | Photos organized by area, notes, timeline | Client, architect, owner |
| **Punch List** | Deficiencies with photos, location pins, assignments, priority | GC, subcontractors |
| **Inspection Report** | Checklist items with pass/fail, photos, notes | Building official, client |
| **Proposal / Estimate** | Existing conditions photos + notes + scope description | Potential client |
| **Custom Report** | Any combination of above | Anyone |

### Deliverable Formats
| Format | How It Works |
|---|---|
| **PDF** | Server-generated PDF with company branding, photos, notes, drawings. Download or email. |
| **Digital Viewer Link** | Shareable URL → branded web page with photo gallery, interactive 360 tours, drawing overlays, downloadable media. Token-gated. |
| **Interactive Email** | Rich HTML email with inline photos, expandable galleries, embedded 360 viewer. No attachments needed. |

### Branding
- User uploads company logo in Account Settings (AccountProfileTab already has avatar upload)
- TODO: Add separate "Company Logo" upload for deliverable branding
- Deliverables show company logo, company name, project name, date
- Enterprise: full white-label (Slate360 completely invisible)

### Sharing & Access Control
- Each shared deliverable gets a `deliverable_access_token` (existing system)
- Token controls: expiry date, max view count, revocable
- Viewer can browse but cannot edit
- Download option configurable (subscriber decides if client can download raw files)
- Tracking: subscriber sees when link was opened, by whom, how many times

---

## 8. Folder Structure Per Project

When a user with Site Walk creates a project:
```
/Projects/{Project Name}/
├── Documents/
├── Drawings/
├── Photos/
├── Reports/
├── Correspondence/
├── History/              ← immutable deliverable snapshots
├── Misc/
└── Site Walk/            ← auto-provisioned for Site Walk subscribers
    ├── Sessions/         ← each session gets a dated subfolder
    │   ├── 2026-04-10_Building-A-Walk/
    │   │   ├── photo_001.jpg
    │   │   ├── photo_002.jpg
    │   │   └── session.json (metadata)
    │   └── 2026-04-12_Punch-List-Floor-3/
    │       ├── photo_001.jpg
    │       └── session.json
    └── Deliverables/     ← submitted deliverables (editable copies)
        ├── Punch-List_Building-A.pdf
        └── Progress-Report_Apr-10.pdf
```

---

## 9. Browser APIs Used

| Feature | API | Support | Notes |
|---|---|---|---|
| Camera capture | `<input type="file" accept="image/*" capture="environment">` | All mobile | Use `capture="environment"` for rear camera |
| Direct camera (advanced) | `navigator.mediaDevices.getUserMedia()` | All browsers | For viewfinder mode |
| GPS location | `navigator.geolocation.getCurrentPosition()` | All browsers | Permission required, watch for timeout |
| Voice-to-text | `SpeechRecognition` / `webkitSpeechRecognition` | Chrome, Edge, Safari 16.4+ | Fallback: keyboard input |
| Offline storage | `IndexedDB` via `idb` library | All browsers | Primary offline store |
| Background sync | `ServiceWorker` + `SyncManager` | Chrome/Edge, partial Safari | Fallback: sync on app open |
| Vibration feedback | `navigator.vibrate()` | Android only | Nice-to-have for capture feedback |
| Screen wake lock | `navigator.wakeLock.request('screen')` | Modern browsers | Prevent screen timeout during walks |
| Compass heading | `DeviceOrientationEvent` | Most devices | Direction indicator for GPS |

---

## 10. Key Architecture Decisions (Already Resolved)

All of these are CONFIRMED in `PLATFORM_ARCHITECTURE_PLAN.md`:

| Decision | Resolution |
|---|---|
| **PWA vs. Native** | PWA. Same codebase everywhere. Capacitor wrapper for App Store later (Phase 3+). |
| **Offline mode for beta?** | YES — build IndexedDB queue. Construction sites need it. |
| **History folder immutability** | Owner/admin CAN delete with 2-step confirmation. Deletion is logged. |
| **Auto-generate PDF on submit?** | NO auto-PDF. Subscriber chooses format via Deliverables section. |
| **Contributor submissions** | TWO versions saved: editable + PDF snapshot. Both go to project folders + History. |
| **Contributor invitation** | Email/text invite with subscriber-chosen access code. Both link + code required. |
| **Download policy** | Every file has prominent Download action. Bulk ZIP supported. |
| **Project folders** | Base 7 folders for all projects + app-specific folders auto-provisioned per subscription. |
| **Real-time sync** | Supabase Realtime events → push to desktop. Toast notifications + auto-refresh. |
| **Voice-to-text** | Browser Speech Recognition API. AI can clean up transcriptions. |
| **Drawing overlay** | Users upload plans (PDF/DWG). Pin items to specific locations on plans. |

---

## 11. UI/UX Design Requirements

### Mobile Capture Screen (Walk Mode)
- **Full-screen camera viewfinder** — maximum screen real estate for the camera
- **Minimal chrome** — only essential controls visible
- **One-handed operation** — primary button (camera shutter) reachable with thumb
- **Dark mode** — easier on eyes in bright daylight (less glare)
- **High contrast controls** — must be visible in direct sunlight
- **Haptic feedback** on capture (vibration on Android)
- **Large, obvious capture indicators** — "Photo saved" flash, item count badge

### Session Timeline (Below Camera)
- Scrollable list of captured items (newest first or oldest first, user choice)
- Each item: thumbnail + note preview + timestamp + priority badge
- Tap to expand and edit
- Swipe actions (delete, assign, prioritize)

### Review Screen
- Grid or list view of all session items
- Drag-to-reorder
- Inline editing of notes
- Bulk actions (select multiple → delete, change priority)
- AI cleanup button for notes
- Preview deliverable button

### Dashboard Integration
- Site Walk card shows: sessions this week, pending items, storage used
- "Quick Walk" button — starts a new session on the most recent project
- Recent sessions list with resume/complete options

### Responsive Design
| Screen | Layout |
|---|---|
| **Phone (portrait)** | Camera viewfinder full-width, bottom action bar, timeline slides up |
| **Phone (landscape)** | Camera left half, timeline right half |
| **Tablet** | Camera 60% left, timeline + details 40% right |
| **Desktop** | Full project view with session list, timeline, map, drawing overlay |

---

## 12. API Routes Needed

```
POST   /api/site-walk/sessions              — Create new session
GET    /api/site-walk/sessions?projectId=X   — List sessions for project
GET    /api/site-walk/sessions/[id]          — Get session detail + items
PATCH  /api/site-walk/sessions/[id]          — Update session (title, status, metadata)
DELETE /api/site-walk/sessions/[id]          — Delete session

POST   /api/site-walk/items                  — Create item (photo, note, pin)
PATCH  /api/site-walk/items/[id]             — Update item (note, status, priority, assignment)
DELETE /api/site-walk/items/[id]             — Delete item
POST   /api/site-walk/items/reorder          — Bulk reorder items

POST   /api/site-walk/deliverables           — Create deliverable from session
GET    /api/site-walk/deliverables/[id]      — Get deliverable content
PATCH  /api/site-walk/deliverables/[id]      — Update deliverable
POST   /api/site-walk/deliverables/[id]/submit — Submit + generate PDF + History snapshot
POST   /api/site-walk/deliverables/[id]/share  — Generate sharing token/link

POST   /api/site-walk/ai/format-notes        — AI cleanup of session notes
```

---

## 13. Metadata Captured Per Item

Every capture automatically includes:
```json
{
  "gps": { "lat": 33.7490, "lng": -84.3880, "accuracy": 4.2, "heading": 127 },
  "timestamp": "2026-04-10T14:32:15.000Z",
  "device": { "platform": "iOS", "browser": "Safari", "screenWidth": 390 },
  "weather": { "temp": "72F", "conditions": "Partly Cloudy" },
  "session": { "id": "...", "itemNumber": 7, "sessionType": "punch_list" },
  "connectivity": "online"
}
```

Weather data: use free API (OpenWeatherMap or similar) based on GPS coordinates. Cache per-session (don't call for every photo).

---

## 14. Build Checklist

### Phase 1: Core Capture + Sessions
1. Create `site_walk_items` migration + RLS policies
2. Create `site_walk_deliverables` migration + RLS policies
3. Build session CRUD API routes (create, list, get, update, delete)
4. Build item CRUD API routes (create, update, delete, reorder)
5. Build mobile capture UI (camera viewfinder, action bar, timeline)
6. Build session review/edit screen
7. Wire GPS auto-tagging
8. Wire auto-save (each capture → API immediately)
9. Update folder provisioning to include `/Site Walk/Sessions/` and `/Site Walk/Deliverables/`

### Phase 2: Deliverables + Sharing
10. Build deliverable creation from session
11. Build deliverable editor (BlockEditor + enhancements)
12. Build PDF generation (server-side)
13. Build digital viewer page (public, token-gated)
14. Wire deliverable sharing (generate token, send link)
15. Auto-snapshot to /History/ on submit

### Phase 3: Offline + Voice + AI
16. Build IndexedDB offline queue
17. Build service worker for sync
18. Integrate voice-to-text (Speech Recognition API)
19. Build AI note formatting (OpenAI or similar)
20. Build drawing overlay + pin system

### Phase 4: Contributors + Polish
21. Build contributor invitation flow
22. Build contributor walk UI (scoped permissions)
23. Build real-time notifications (Supabase Realtime)
24. Wire into dashboard (app card, recent sessions widget, quick-start)
25. Beta test with access codes
26. Bug reporting integration with CEO Command Center

---

## 15. Competitive Landscape

For the AI assistant helping with design: these are the competitors to study for feature inspiration and differentiation.

| Competitor | What They Do Well | Where Slate360 Can Win |
|---|---|---|
| **Procore** | Industry standard for project management, massive feature set | Procore is expensive and complex. Slate360 targets ease-of-use + modern design |
| **PlanGrid** (Autodesk) | Drawing management, punch lists, field reports | Slate360 integrates file management + field capture + deliverables in one app |
| **Fieldwire** | Task management on drawings, punch lists | Slate360 adds voice-to-text, AI formatting, branded deliverables |
| **OpenSpace** | 360 photo documentation | Slate360 combines 360 tours with regular photos + notes + deliverables |
| **CompanyCam** | Photo-first field documentation | Slate360 goes beyond photos: voice, drawings, structured deliverables, offline |
| **JobNimbus** | CRM + project management for contractors | Slate360 is field-capture-first, not CRM-first |

**Slate360's unique value**: One ecosystem that covers field capture, file management, project management, 3D/360 visualization, and professional deliverables — competitors require 3-4 separate tools for this.

---

## 16. Questions for the Design AI Assistant

These are the open UX/design questions that need answers before implementation:

1. **Walk Mode camera UX**: Full viewfinder with overlay controls, or camera button that opens the native camera?
2. **Item timeline layout**: Vertical timeline (Instagram stories style), card list, or photo grid?
3. **Session type selection**: Cards, dropdown, or radio buttons? Should it be on a separate screen or inline?
4. **Drawing overlay UX**: How should users navigate between drawing sheets? Thumbnail strip? Dropdown?
5. **Punch list assignment**: Type a name, select from directory, or both?
6. **Voice note UX**: Press-and-hold button, or tap to start/stop?
7. **Review screen layout**: Grid view, list view, or map view based on GPS? Toggle between them?
8. **Deliverable builder**: Drag-and-drop blocks, or sequential wizard?
9. **Desktop session view**: Split panel (photos + map), or tabbed sections?
10. **Notification design**: Toast + badge, or a dedicated notification center?
11. **Quick actions from dashboard**: What should the Site Walk card show? Last 3 sessions? Quick-start button?
12. **Session resume**: When user re-opens an in-progress session, show the camera or the timeline?
13. **Photo annotation**: Should users be able to draw arrows/circles on photos? (Like CompanyCam)

---

## 17. Success Criteria

Site Walk is ready for beta when:
- [ ] A user can create a session, capture 20+ photos with notes, and submit — all in < 15 minutes
- [ ] GPS tags are accurate and persistent
- [ ] Offline mode works: capture 10+ items without internet, sync when reconnected
- [ ] Deliverable PDF looks professional with company branding
- [ ] Viewer link works for non-account-holders
- [ ] Desktop user sees field data in real-time (< 5 second delay)
- [ ] No data loss under any condition (app close, network drop, battery death)
- [ ] Works on iPhone Safari, Android Chrome, and desktop Chrome/Edge
# Site Walk — Build Plan

Last Updated: 2026-04-10
Status: **Planning — do not build until architecture decisions are locked**
Prerequisite: Read `PLATFORM_ARCHITECTURE_PLAN.md` first.

---

## 1. What Is Site Walk?

Site Walk is a mobile-first field documentation app for construction professionals. Users walk a job site, take photos, add notes (keyboard or voice), tag locations, and generate professional deliverables.

### Core Use Cases
- **Progress documentation**: Walk a site, photograph each area, auto-tag with GPS + timestamp
- **Punch lists**: Tag deficiencies on drawings, assign responsibility, track resolution
- **Inspections**: Structured checklists with photo evidence
- **Proposals / Estimates**: Document site conditions for scope of work
- **Reports**: Combine photos, notes, and data into shareable deliverables

### Key Principles
- Mobile-first (designed for phone in one hand on a job site)
- Offline-capable (basements, remote sites, poor cell coverage)
- Auto-save everything (never lose field data)
- Professional output (branded deliverables, PDF export, digital viewer links)
- Voice-to-text for notes (hands may be dirty/gloved)

---

## 2. Existing Infrastructure That Site Walk Uses

| System | What it provides | Status |
|---|---|---|
| **Auth + Org** | User accounts, org membership | ✅ Done |
| **Entitlements** | `canAccessStandalonePunchwalk` flag gates access | ✅ Done |
| **Billing** | `/api/billing/app-checkout` for standalone app subscription | ✅ Done (env vars TBD) |
| **Beta codes** | `access_codes` table + redemption flow | 🔲 Planned |
| **Projects** | Create projects, auto-provision folders | ✅ Done |
| **Project folders** | `/Site Walk/` folder per project | 🔲 Needs provisioning update |
| **SlateDrop upload** | Presigned S3 URL → direct upload → finalize | ✅ Done |
| **SlateDrop files** | List, download, move, rename, delete, share, ZIP | ✅ Done |
| **External links** | Token-gated project access for subs/clients | ✅ Done |
| **Deliverable tokens** | `deliverable_access_tokens` for sharing tours/reports/walks | ✅ Done |
| **Activity log** | `project_activity_log` for audit trail | ✅ Done |
| **PDF generation** | ❌ Not built yet |
| **Offline queue** | ❌ Not built yet |
| **Voice-to-text** | ❌ Not built (browser Speech Recognition API available) |
| **AI note formatting** | ❌ Not built |
| **Drawing overlay** | ❌ Not built |

---

## 3. Database Tables

### Existing (reuse)
- `projects` — project entity
- `project_folders` — folder structure
- `slatedrop_uploads` — file records
- `project_activity_log` — audit trail
- `project_external_links` — sharing
- `deliverable_access_tokens` — deliverable access
- `org_feature_flags` — app entitlements

### New Tables Needed

#### `site_walk_sessions`
One row per walk session. A user might do multiple walks on a project.
```
id, project_id, org_id, created_by,
title,                            -- "Building A Floor 3 Walk" or auto-generated
status ('draft' | 'in_progress' | 'submitted'),
session_type ('progress' | 'punch_list' | 'inspection' | 'proposal' | 'report' | 'general'),
started_at, completed_at,
metadata (JSONB),                 -- route taken, weather, notes summary
folder_id (FK → project_folders), -- the session's folder in SlateDrop
created_at, updated_at
```
Status: `site_walk_sessions` table already exists (renamed from `punchwalk_sessions` in migration `20260408000008`). **Verify current schema matches needs.**

#### `site_walk_items`
Individual captures within a session (photos, notes, pins on drawings).
```
id, session_id, project_id, org_id, created_by,
item_type ('photo' | 'note' | 'voice_note' | 'drawing_pin' | 'checklist_item'),
content_text,                     -- note text or voice transcription
file_id (FK → slatedrop_uploads), -- linked photo/media file
location_lat, location_lng,       -- GPS coordinates
location_label,                   -- "Building A, Floor 3, Room 301"
drawing_id,                       -- if pinned to a drawing
drawing_x, drawing_y,             -- pin coordinates on drawing
status ('open' | 'resolved' | 'na'), -- for punch/inspection items
assigned_to,                      -- who needs to fix it (punch list)
priority ('low' | 'medium' | 'high' | 'critical'),
sort_order INT,                   -- user can reorder items
metadata (JSONB),                 -- extensible
created_at, updated_at
```

#### `site_walk_deliverables`
Generated deliverables from sessions.
```
id, session_id, project_id, org_id, created_by,
deliverable_type ('punch_list' | 'inspection_report' | 'proposal' | 'progress_report' | 'custom'),
title,
status ('draft' | 'final'),
content (JSONB),                  -- structured deliverable data
pdf_file_id (FK → slatedrop_uploads), -- generated PDF
history_file_id (FK → slatedrop_uploads), -- immutable copy in History folder
branding_logo_url,                -- company logo for this deliverable
access_token_id,                  -- linked deliverable_access_token for sharing
created_at, updated_at, submitted_at
```

---

## 4. The Site Walk User Flow

### Mobile Capture Flow
```
1. User opens Site Walk app (from dashboard or home screen)
2. Selects existing project OR creates new project
3. Starts new session:
   - Picks session type (progress, punch list, inspection, etc.)
   - Names the session (or auto-generates: "Apr 10 Walk - {Project}")
4. Walk mode activates:
   - Camera button (front and center)
   - Note button (keyboard or voice)
   - Drawing overlay button (if drawings uploaded)
   - GPS auto-tags every capture
   - Timestamp auto-applied
   - Each item auto-saves immediately
5. User can pause and resume anytime (session stays in "in_progress")
6. When done: "Review & Submit" button
7. Review screen: scroll through all captures, edit notes, reorder, delete
8. AI format option: "Clean up my notes" → AI rewrites in professional tone
9. Submit → generates deliverable draft
10. User can edit deliverable, add company logo, export PDF, or send viewer link
11. On submit: snapshot saved to /History/ folder (immutable)
```

### Offline Behavior
```
1. User enters area with no connectivity
2. App detects offline → shows "Offline Mode" indicator
3. User continues taking photos, adding notes — all save to IndexedDB
4. Sync indicator: "12 items waiting to upload"
5. Connectivity returns → background sync begins
6. Items upload to S3, records created in Supabase
7. Green checkmark: "All synced"
```

### Deliverable Sharing
```
1. User taps "Share" on a deliverable
2. Options:
   a. Generate PDF → download or email
   b. Generate viewer link → copy/text/email
   c. Send to specific contact (from project stakeholders)
3. Viewer link shows branded page:
   - Company logo (user's logo, or enterprise brand)
   - Photos in gallery view
   - Notes formatted professionally
   - 360 photos in interactive viewer
   - 3D models in model viewer
   - Download option (if permitted)
4. Access controlled by deliverable_access_token (expiry, max views, revocable)
```

---

## 5. Folder Structure Per Project

When a user with Site Walk creates a project:
```
/Projects/{Project Name}/
├── Documents/
├── Drawings/
├── Photos/
├── Reports/
├── Correspondence/
├── History/              ← immutable deliverable snapshots
├── Misc/
└── Site Walk/            ← auto-provisioned for Site Walk subscribers
    ├── Sessions/         ← each session gets a dated subfolder
    │   ├── 2026-04-10_Building-A-Walk/
    │   │   ├── photo_001.jpg
    │   │   ├── photo_002.jpg
    │   │   └── notes.json
    │   └── 2026-04-12_Punch-List-Floor-3/
    └── Deliverables/     ← submitted deliverables (editable copies)
        ├── Punch-List_Building-A.pdf
        └── Inspection_Floor-3.pdf
```

Sub-folder structure TBD — will be finalized after app build based on actual feature needs.

---

## 6. Browser APIs Used

| Feature | API | Support |
|---|---|---|
| Camera capture | `<input type="file" accept="image/*" capture="environment">` | ✅ All mobile browsers |
| GPS location | `navigator.geolocation.getCurrentPosition()` | ✅ All browsers (permission required) |
| Voice-to-text | `SpeechRecognition` / `webkitSpeechRecognition` | ✅ Chrome, Edge, Safari 16.4+ |
| Offline storage | `IndexedDB` via `idb` library | ✅ All browsers |
| Background sync | `ServiceWorker` + `SyncManager` | ✅ Chrome/Edge, 🟡 partial Safari |
| Vibration feedback | `navigator.vibrate()` | ✅ Android, ❌ iOS |
| Screen wake lock | `navigator.wakeLock.request('screen')` | ✅ Modern browsers |

---

## 7. Dependencies on Architecture Decisions

These must be resolved (in `PLATFORM_ARCHITECTURE_PLAN.md`) before building:

| Decision | Blocks |
|---|---|
| History folder immutability | Whether submitted snapshots can ever be deleted |
| Auto-generate PDF on submit | The submit flow UX |
| Offline mode priority for beta | Whether to build IndexedDB sync for v1 |
| External collaborator token access | How subs interact with Site Walk data |
| App-specific sub-folders | Exact folder tree for `/Site Walk/` |

---

## 8. Build Checklist (when ready)

1. 🔲 Verify `site_walk_sessions` table schema matches needs
2. 🔲 Create `site_walk_items` migration
3. 🔲 Create `site_walk_deliverables` migration
4. 🔲 Update folder provisioning to include `/Site Walk/` + sub-folders
5. 🔲 Build API routes: session CRUD, item CRUD, deliverable CRUD
6. 🔲 Build mobile capture UI (camera, notes, GPS, voice)
7. 🔲 Build session review/edit screen
8. 🔲 Build deliverable generation (PDF + viewer link)
9. 🔲 Build offline queue (if decided for beta)
10. 🔲 Build AI note formatting (if decided for beta)
11. 🔲 Wire into dashboard (app card, recent sessions widget)
12. 🔲 Beta test with access codes
13. 🔲 Bug reporting integration with CEO Command Center
