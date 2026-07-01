# SlateDrop — File Manager UX Design (Prompt A)
## Dropbox/Finder/Explorer-class file system for Slate360

**Design Philosophy:** SlateDrop is a **first-class file system**, not an afterthought. It must feel instantly familiar to anyone who has used Microsoft Explorer, Apple Finder, or Dropbox — while adding construction-specific intelligence (auto-routing, plan conversion, evidentiary handling).

**Backend (existing, don't redesign):**
- Per-project auto-provisioned folders: `Photos/Plans/Deliverables/Intake/Submissions`
- S3-backed items with `slatedrop_items` table
- Plan-PDF conversion pipeline (`plan_sets`)
- Secure link model: view / download / upload permissions

**Aesthetic:** Graphite Glass — `#0B0F15` canvas, translucent panels, hairline borders, single accent on interaction states.

---

## 1. Desktop Explorer — Three-Pane Workspace

### Wireframe Layout (1440px desktop)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  SLATE360  [Site Walk] [Twin 360]  │  Search files...                │  [+] Upload   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  ┌──────────────┐  ┌──────────────────────────────────────────┐  ┌─────────────────────┐ │
│  │              │  │                                          │  │                     │ │
│  │ 📁 FOLDERS   │  │  📄 ITEMS (Grid/List)                   │  │  👁️ PREVIEW        │ │
│  │              │  │                                          │  │                     │ │
│  │ Project      │  │  ┌────────┐ ┌────────┐ ┌────────┐       │  │  ┌───────────────┐  │ │
│  │ └── 📁 01_   │  │  │ [📄]   │ │ [📄]   │ │ [📄]   │       │  │  │               │  │ │
│  │     Proj...  │  │  │ Plan   │ │ Site   │ │ RFI-   │       │  │  │   Preview     │  │ │
│  │ ├── 📁 02_   │  │  │ A1.pdf │ │ Photo  │ │ 023.pdf│       │  │  │   Area        │  │ │
│  │ │   Site_    │  │  │ 2.4 MB │ │ JPG    │ │ 1.1 MB │       │  │  │               │  │ │
│  │ │   Walk     │  │  └────────┘ └────────┘ └────────┘       │  │  │   [Select     │  │ │
│  │ ├── 📁 03_   │  │                                          │  │  │    an item]   │  │ │
│  │ │   Digital  │  │  [Sort: Name ▼] [View: Grid ▼]            │  │  │               │  │ │
│  │ │   Twin     │  │                                          │  │  └───────────────┘  │ │
│  │ ├── 📁 04_   │  │  Name              Size   Modified  Type  │  │                     │ │
│  │ │   PM_Doc.. │  │  ─────────────────────────────────────  │  │  📋 Details         │ │
│  │ └── 📁 05_   │  │  Site_Plan_A1.pdf  2.4MB  Today     PDF   │  │  ────────────────   │ │
│  │     Team_    │  │  RFI_Response.pdf  1.1MB  Yesterday PDF   │  │  Name: ---          │ │
│  │     Shared   │  │  IMG_4521.jpg      4.8MB  Today     JPG   │  │  Size: ---          │ │
│  │              │  │  ...                                    │  │  Modified: ---      │ │
│  │ ──────────   │  │                                          │  │                     │ │
│  │ 📍 Starred   │  │  [______________________________]        │  │  🔗 Share           │ │
│  │ 🕓 Recent    │  │  Drag files here to upload               │  │  ⬇️ Download        │ │
│  │ 🗑️ Trash     │  │                                          │  │  ✏️ Rename          │ │
│  │              │  └──────────────────────────────────────────┘  │  🗑️ Delete          │ │
│  └──────────────┘                                            │  └─────────────────────┘ │
│                                                              │                          │
│  14 items │ 2.4 GB used │ Project: Oak Ridge Roof           │                          │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### Left Pane: Folder Tree (220px fixed)

**Structure:**
- **Root:** Project name (click → project home)
- **Auto-provisioned folders** (numbered taxonomy):
  - `01_Project_Info/` → Contracts, Drawings, Permits, Specs, Insurance
  - `02_Site_Walk/` → Photos, Notes, Voice_Memos, Plans, Deliverables, Data
  - `03_Digital_Twin/` → Clips, Models, Source_Assets, Deliverables
  - `04_PM_Documents/` → RFIs, Submittals, Schedule, Budget, Daily_Logs
  - `05_Team_Shared/` → Uploads, Shared_Links
- **Smart views:** Starred, Recent, Trash

**Interactions:**
- Single click: select folder, load contents in center
- Double click: expand/collapse (if subfolders exist)
- Right-click: context menu (New folder, Rename, Delete, Share)
- Drag hover: highlight as drop target
- Keyboard: ↑↓ navigate, → expand, ← collapse, Enter open

**Visual:**
- Indent: 12px per level
- Folder icon: `lucide-folder` closed, `lucide-folder-open` active
- Active state: `bg-[#00E699]/10 border-l-2 border-[#00E699]`
- Text: `text-sm text-slate-300`, active `text-white`

#### Center Pane: Item Grid/List (flex: 1)

**View modes:**

**Grid view (default for images/plans):**
- Large thumbnails: 160×160px + 24px label area
- Metadata overlay on hover: size, date
- Selection: `border-2 border-[#00E699]` + checkbox

**List view (default for documents):**
- Columns: Name | Size | Modified | Type | Actions
- Sortable headers: click toggles asc/desc
- Column widths: Name (flex), Size (80px), Modified (120px), Type (80px)

**Multi-select:**
- Click: select single
- Cmd/Ctrl+click: toggle selection
- Shift+click: range select
- Cmd/Ctrl+A: select all visible

**Drag-and-drop:**
- Drag files from desktop → center pane = upload to current folder
- Drag items within list → move to folder (hover folder in left pane)
- Visual feedback: ghost preview, drop zone highlight

**Empty state:**
```
┌─────────────────────────┐
│                         │
│    [folder icon]        │
│                         │
│   This folder is empty  │
│                         │
│   [Upload files]        │
│   or drag & drop        │
│                         │
└─────────────────────────┘
```

**Loading state:** Skeleton grid (6 items) with pulse animation

#### Right Pane: Preview & Actions (280px fixed)

**States:**

**Nothing selected:**
- Project stats: total files, storage used, last activity
- Quick actions: Upload, Create folder, New share link

**Single item selected:**
- Preview area (max 200px height):
  - Images: actual thumbnail scaled
  - PDFs: first page thumbnail
  - Videos: thumbnail + play overlay
  - Unknown: generic icon + file type
- Details list:
  - Name (editable on click)
  - Size
  - Created / Modified
  - Type
  - Location (breadcrumb path)
  - Uploaded by
- Actions stack:
  - [🔗 Share] — primary, accent color
  - [⬇️ Download]
  - [✏️ Rename]
  - [🗑️ Move to trash]
  - [📋 Copy link]

**Multiple items selected:**
- Count: "4 items selected"
- Total size
- Bulk actions: Download ZIP, Share, Move, Delete

### Breadcrumb Navigation

```
Oak Ridge Roof / 01_Project_Info / Drawings / Architectural
```
- Each segment clickable
- Root = project name
- Truncates with "..." if > 4 segments on mobile

### Upload Experience

**Drop zone overlay:**
- Full center pane highlight on drag-over
- Border: `2px dashed #00E699`
- Text: "Drop files to upload to [folder name]"

**Upload queue:**
- Bottom-right toast stack
- Progress bar per file
- Cancel button (X)
- On complete: "14 files uploaded to 02_Site_Walk/Photos"

**Auto-routing (intent detection):**
| File pattern | Detected type | Routed to |
|-------------|---------------|-----------|
| *.pdf with "plan" "drawing" "A-" "sheet" | Plan | `01_Project_Info/Drawings` or `02_Site_Walk/Plans` |
| *.pdf with "contract" "agreement" | Contract | `01_Project_Info/Contracts` |
| *.pdf with "RFI" "submittal" | PM Doc | `04_PM_Documents/RFIs` or `Submittals` |
| IMG_* *.jpg *.png (EXIF GPS) | Site photo | `02_Site_Walk/Photos` |
| *.mp4 *.mov (mobile export) | Video clip | `02_Site_Walk/Data` or `03_Digital_Twin/Clips` |
| Any file via "Share to Intake" | Unsorted | `05_Team_Shared/Uploads` |

**User control:** Upload dialog shows "Detected: Plan PDF → 01_Project_Info/Drawings" with [Change folder] dropdown allowing override.

---

## 2. Mobile App — Touch-First File Browser

**Principle:** Same mental model as desktop, but one-decision-per-screen, glove-friendly (56–72px touch targets), outdoor-readable contrast.

### Screen Flow

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Project Home   │────▶│  Files List     │────▶│  File Detail    │
│  [Files card]   │     │  (folder view)  │     │  (preview)      │
└─────────────────┘     └─────────────────┘     └─────────────────┘
         │                       │
         ▼                       ▼
    ┌─────────────────┐   ┌─────────────────┐
    │  Upload Sheet   │   │  Folder Picker  │
    │  (source/type)  │   │  (tree modal)   │
    └─────────────────┘   └─────────────────┘
```

### Wireframe: Files List (mobile)

```
┌─────────────────────────────┐
│ ←  Files              [+]   │
├─────────────────────────────┤
│ 📁 01_Project_Info     12 ▶ │
│ 📁 02_Site_Walk        48 ▶ │
│ 📁 03_Digital_Twin      3 ▶ │
│ 📁 04_PM_Documents      8 ▶ │
│ 📁 05_Team_Shared       5 ▶ │
├─────────────────────────────┤
│ 📄 Site_Plan_A1.pdf    2MB │
│ 📄 RFI_001.pdf        1MB │
│ 🖼️ IMG_4521.jpg       4MB │
│ 🖼️ IMG_4522.jpg       3MB │
│ 🎥 Walkthrough.mp4   120MB│
│                             │
│          [________________]│
│       Pull up to load more │
└─────────────────────────────┘
```

### Component Specifications (Mobile)

**Folder row:**
- Height: 72px
- Icon: 24px folder, left
- Name: `text-base font-medium text-white`
- Count badge: right, `text-sm text-slate-400`
- Chevron: far right, `text-slate-500`

**File row:**
- Height: 64px
- Thumbnail: 48px square, rounded 4px
- Name: `text-sm text-white` (truncated)
- Size: `text-xs text-slate-400`
- Tap: open preview
- Long-press: multi-select mode (checkboxes appear)

**Preview screen:**
```
┌─────────────────────────────┐
│ ←  Site_Plan_A1.pdf   [⋮]   │
├─────────────────────────────┤
│                             │
│                             │
│      [PDF thumbnail         │
│        or image]            │
│                             │
│                             │
├─────────────────────────────┤
│ 📋 DETAILS                  │
│ ─────────────────────────── │
│ Name          Site_Plan...   │
│ Size          2.4 MB        │
│ Uploaded      Today, 2:34 PM│
│ By            Brian Volker  │
│                             │
│ 🔗 Share link               │
│ ⬇️ Download                 │
│ 🗑️ Delete                   │
└─────────────────────────────┘
```

**Upload flow:**
1. Tap [+] → Bottom sheet: "Upload from Camera / Photo Library / Files / Scan Document"
2. Select source → Native picker
3. Post-selection → "Detected: Site photo → 02_Site_Walk/Photos" with [Change] option
4. Upload progress bar (inline)
5. Success: brief toast, item appears in list

---

## 3. Secure Link Sharing

### Creating a Share Link (Desktop)

**Flow:** Select file(s) → Click [Share] → Share dialog

```
┌─────────────────────────────────────────┐
│  🔗 Create share link           [×]     │
├─────────────────────────────────────────┤
│                                         │
│  2 items:                               │
│  [📄] Site_Plan_A1.pdf                  │
│  [📄] RFI_Response_001.pdf              │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  Permission                             │
│  ○ View only                            │
│  ● View & Download                      │
│  ○ View, Download & Upload (Intake)    │
│                                         │
│  Expiry                                 │
│  [7 days ▼]                             │
│                                         │
│  Password (optional)                    │
│  [____________________]                 │
│                                         │
│  ─────────────────────────────────────  │
│                                         │
│  [📋 Copy link]  [✉️ Email]  [📱 SMS]   │
│                                         │
│  https://slate360.ai/s/abc123xyz        │
│                                         │
└─────────────────────────────────────────┘
```

### Permission Levels

| Level | Can View | Can Download | Can Upload | Use Case |
|-------|----------|--------------|------------|----------|
| View only | ✅ | ❌ | ❌ | Client review, public showcase |
| View & Download | ✅ | ✅ | ❌ | Contractor receives plans |
| Intake (Upload) | ✅ | ✅ | ✅ | Subcontractor submits deliverables |

**Intake folder behavior:** Upload permission = files land in `05_Team_Shared/Intake/[link-id]/` for review before moving to proper location.

### Recipient Experience (No-Login)

**Share viewer:**
```
┌─────────────────────────────────────────┐
│  [Slate360 logo]        [Slate360.ai]   │
├─────────────────────────────────────────┤
│                                         │
│  Oak Ridge Roof — Files shared          │
│  From: Brian Volker (Slate360)         │
│                                         │
│  ┌─────────┐ ┌─────────┐               │
│  │ [PDF]   │ │ [PDF]   │               │
│  │ Plan A1 │ │ RFI Res │               │
│  │ 2.4 MB  │ │ 1.1 MB  │               │
│  └─────────┘ └─────────┘               │
│                                         │
│  [⬇️ Download all (ZIP)]               │
│                                         │
│  Expires: August 15, 2026               │
│                                         │
└─────────────────────────────────────────┘
```

**Branded elements:**
- Sender's org logo (if set)
- Project cover image as header background
- Accent color from project brand settings

---

## 4. Permission Model Matrix

```
                    ┌─────────────────────────────────────────┐
                    │           Project / Folder               │
                    └─────────────────────────────────────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   Org Admin     │         │  Project Owner  │         │  Collaborator   │
│  (subscriber)   │         │  (subscriber)   │         │  (limited seat) │
├─────────────────┤         ├─────────────────┤         ├─────────────────┤
│ All projects    │         │ Own projects    │         │ Assigned projects│
│ Full CRUD       │         │ Full CRUD       │         │ View + capture  │
│ Manage billing  │         │ Add collaborators│        │ Cannot delete   │
│ Org settings    │         │ Create deliverables│      │ Cannot export   │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                       │
           ┌───────────────────────────┴───────────────────────────┐
           │                                                       │
           ▼                                                       ▼
┌─────────────────┐                                         ┌─────────────────┐
│  Share Link     │                                         │  External       │
│  (token-gated)  │                                         │  (no account)   │
├─────────────────┤                                         ├─────────────────┤
│ Per-link scope  │                                         │ View only       │
│ View/DL/Upload  │                                         │ or download     │
│ Time-limited    │                                         │ No upload       │
│ Revocable       │                                         │ Expires         │
└─────────────────┘                                         └─────────────────┘
```

### Implementation: SlateDrop Permission Check

```typescript
// lib/slatedrop/permissions.ts
interface SlateDropPermission {
  canView: boolean;
  canDownload: boolean;
  canUpload: boolean;
  canDelete: boolean;
  canShare: boolean;
  canRename: boolean;
  canMove: boolean;
}

function resolveSlateDropPermissions(
  user: UserContext,
  item: SlateDropItem,
  project: ProjectContext
): SlateDropPermission {
  // Admin/owner = full
  if (user.isOrgAdmin || project.ownerId === user.id) {
    return { canView: true, canDownload: true, canUpload: true, 
             canDelete: true, canShare: true, canRename: true, canMove: true };
  }
  
  // Collaborator = limited
  if (user.isCollaborator) {
    return { canView: true, canDownload: false, canUpload: true, 
             canDelete: false, canShare: false, canRename: false, canMove: false };
  }
  
  // Share link = token claims
  if (user.isShareToken) {
    return {
      canView: true,
      canDownload: user.tokenClaims.includes('download'),
      canUpload: user.tokenClaims.includes('upload'),
      canDelete: false, canShare: false, canRename: false, canMove: false
    };
  }
  
  // Default = view only
  return { canView: true, canDownload: false, canUpload: false,
           canDelete: false, canShare: false, canRename: false, canMove: false };
}
```

---

## 5. Component Inventory

### Desktop Components

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `SlateDropExplorer` | `components/slatedrop/Explorer.tsx` | `projectId, folderId?, onSelect?` | Three-pane shell |
| `FolderTree` | `components/slatedrop/FolderTree.tsx` | `folders, activeId, onSelect, onExpand` | Left pane tree |
| `ItemGrid` | `components/slatedrop/ItemGrid.tsx` | `items, selection, viewMode, onSelect, onAction` | Center grid/list |
| `PreviewPane` | `components/slatedrop/PreviewPane.tsx` | `item, actions, permissions` | Right preview |
| `Breadcrumb` | `components/slatedrop/Breadcrumb.tsx` | `path[], onNavigate` | Path navigation |
| `UploadDropzone` | `components/slatedrop/UploadDropzone.tsx` | `folderId, onUpload, detectType` | Drag overlay |
| `ShareDialog` | `components/slatedrop/ShareDialog.tsx` | `items, onCreateLink` | Link creation |
| `UploadQueue` | `components/slatedrop/UploadQueue.tsx` | `uploads, onCancel` | Progress toasts |

### Mobile Components

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `MobileFilesList` | `components/slatedrop/mobile/FilesList.tsx` | `folderId, items, onSelect` | Scrollable list |
| `MobileFileDetail` | `components/slatedrop/mobile/FileDetail.tsx` | `item, onShare, onDownload` | Full-screen preview |
| `UploadSheet` | `components/slatedrop/mobile/UploadSheet.tsx` | `isOpen, onSelectSource` | Bottom sheet |
| `FolderPickerModal` | `components/slatedrop/mobile/FolderPicker.tsx` | `folders, onSelect` | Tree modal |

### Shared Components

| Component | Purpose |
|-----------|---------|
| `FileIcon` | Type-appropriate icon (pdf, image, video, unknown) |
| `FileTypeBadge` | "PDF", "JPG", "MP4" badge |
| `FileSize` | Human-readable size (KB, MB, GB) |
| `TimeAgo` | "Today", "Yesterday", "3 days ago" |
| `ShareLinkCard` | Link display with copy/qr |
| `PermissionToggle` | View/Download/Upload selector |

---

## 6. States

### Empty States

**No files in project:**
- Icon: Empty folder illustration
- Headline: "This project has no files yet"
- Body: "Upload plans, contracts, and site photos to get started"
- Actions: [Upload files], [Create folder]

**No search results:**
- Icon: Search with X
- Headline: "No files match 'site plan'"
- Body: "Try a different search term or check other folders"
- Actions: [Clear search], [Browse all folders]

**Trash empty:**
- Icon: Trash can
- Headline: "Trash is empty"
- Body: "Deleted files appear here for 30 days"

### Loading States

**Folder tree:** Skeleton lines (6 folders) with pulse
**Item grid:** Skeleton cards (8 items) with pulse
**Preview:** Blurred thumbnail with spinner overlay
**Upload:** Progress bar (0–100%) with filename

### Error States

**Upload failed:**
- Toast: "Upload failed — network error"
- Retry button inline
- Failed item marked in queue

**Permission denied:**
- Modal: "You don't have permission to delete this file"
- Explanation text + [Request access] or [OK]

**Folder not found:**
- Full screen: "Folder not found or moved"
- [Go to project root]

---

## 7. Top 3 Pitfalls

### Pitfall 1: Exposing the folder tree complexity
**Risk:** Users don't understand the numbered taxonomy (01_, 02_) and feel confused.
**Mitigation:**
- Display **friendly names** in UI: "Project Info" not "01_Project_Info"
- Auto-route uploads without asking (with [Change] override)
- Collapse empty folders by default
- Provide "Recent" and "Starred" smart views as escape hatches

### Pitfall 2: Mobile-desktop feature parity gaps
**Risk:** Users can't complete key tasks on mobile (share link creation, bulk move).
**Mitigation:**
- Mobile gets **full share link creation** (dialog, not sheet, for complexity)
- Bulk actions via **long-press → selection mode** (same pattern as iOS Photos)
- Folder moves via **picker modal** (not drag-and-drop)
- Test critical paths: upload → share → view on both form factors

### Pitfall 3: Share link security vs. usability tension
**Risk:** Links are either too locked down (frustrating) or too open (risky).
**Mitigation:**
- **Default to "View & Download"** (most common need)
- Surface **expiry prominently** in recipient view
- Allow **revocation** from project owner dashboard
- **Audit log** who accessed what via share links
- Password option for sensitive plans (construction sites)

---

## 8. Best-in-Class References

| Product | Pattern We Adopt |
|-----------|------------------|
| **Apple Finder** | Three-pane layout, breadcrumb navigation, Cmd+click multi-select, Quick Look preview |
| **Dropbox** | Smart sync indicators, share link creation flow, upload queue toasts, file type icons |
| **Google Drive** | Drag-to-upload, folder tree + grid view, permission levels, "Shared with me" |
| **Box** | Enterprise permission matrix, folder upload, version history (future), watermarking (future) |
| **Procore Documents** | Construction-specific routing, plan/drawing organization, RFI attachment linking |
| **Egnyte** | Hybrid cloud/local sync, offline indicator, large file handling |

---

## 9. API Integration Points

```typescript
// Key existing APIs (from PROJECT_LAYER_AND_WALK_START.md)

// List folders
GET /api/slatedrop/projects/[id]/folders

// List items in folder
GET /api/slatedrop/folders/[id]/items?page=1&limit=50

// Upload (multipart)
POST /api/slatedrop/upload
Body: FormData { file, folderId, detectedType?, projectId }

// Create share link
POST /api/slatedrop/share-links
Body: { itemIds: string[], permission: 'view'|'download'|'upload', expiryDays: number }

// Download
GET /api/slatedrop/items/[id]/download?token=

// Delete/Move (soft delete)
POST /api/slatedrop/items/[id]/delete
POST /api/slatedrop/items/move
Body: { itemIds, destinationFolderId }
```

---

*Design locked: June 28, 2026*
*Author: AI Design Panel + Brian Volker*
*Status: Ready for implementation (desktop explorer, mobile list, share flows)*
