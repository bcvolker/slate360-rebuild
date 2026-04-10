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
