# Site Walk: Master Architecture & Feature Map

## ☂️ Overarching Strategy: Bridging Field & Office

Site Walk is a real-time ecosystem bridge. It is built on these foundational capabilities:

### Real-Time Multiplayer Sync
Using Supabase Realtime/Broadcast. Multiple users (e.g., GC + Subs) can walk the same site simultaneously, dropping pins on the same digital blueprint instantly.

### Indestructible Offline-First Resilience
IndexedDB offline queues seamlessly catch all blobs, text, and vector markups when signal drops, syncing silently in the background with `updated_at` collision resolution.

### Tier-Gated Collaboration Logic
- Free Collaborators: Limited UI defaulting to "Assigned Tasks". Can comment and resolve, but premium features are locked/grayed-out.
- Standard Tier: Solo mode (0 collaborators). Field Projects only.
- Business Tier: CM Projects with 3+ collaborators, scheduling, and budgets.

### Actionable Leadership Oversight
Generates heatmaps of floor plan issue clusters, subcontractor scorecards (time-to-resolution), and financial risk tracking—not vanity metrics.

### Audit Trails
Immutable logging of status changes and read receipts.

---

## 🎬 Act 1: Setting the Chess Board (Setup & Ingestion)

**Goal:** Segmented, low-friction setup based on tiers.

### 1A. Global Settings & Foundational Data (All Tiers)

- Company Identity Hub: High-res PNG logo uploads, brand colors, company address.
- User Profiles: Digital signature uploads, direct phone, title.
- Global Address Book: Unified directory for instant typeahead search of trades/clients.

### 1B. Field Project Setup (Standard Tier)

- Lean Container: Requires only Name, Scope, and Location.
- Smart Map Autocomplete: Geofencing setup.
- The Master Plan Room: PDF upload zone. Backend splits multi-page PDFs into optimized image tiles for mobile rendering.

### 1C. Construction Management Setup (Business Tier)

- CM Master Container: Unlocks tabs for Cost-Coded Budgets, Schedule/Milestones (Gantt), RFIs, and Submittals.
- Advanced Stakeholder Mapping: Unlimited permissions management.

---

## 🎬 Act 2: The Inputs (Frictionless Field Capture)

**Goal:** Indestructible, mobile-optimized, high-contrast tools for gloved hands.

### Core Navigation & UX

- The Ad-Hoc Trigger: Massive "START WALK NOW" button bypasses Act 1 for emergency capture.
- Dual-Mode Interface: Floating toggle `[ 📷 Camera | 🗺️ Plan ]`.
- Touch Targets: Strict 44x44px minimums.
- High-Contrast Glare Mode: `bg-slate-50` canvas, pure white cards, `border-slate-300`.
- Battery Saver Mode: Toggle to reduce frame rates and pause background syncing.

### Asset Ingestion & Metadata

- Native OS Camera Ingest: Drag-and-drop/multi-select from device camera roll.
- Auto-Conversion & Compression: HEIC/ProRAW conversion, client-side video compression.
- Automated Metadata: GPS, weather, and EXIF timestamp extraction.
- 360° Media Ingest: Support for equirectangular panoramas.
- Background Upload Queue: UI showing "3/50 files uploading..." without blocking capture.

### Interactive Markups & Plans

- The Unified Vector Toolbar: Floating dock to Draw, Pin, Text. Saved as vector math, not flattened pixels.
- The "Oops" Engine: Local Undo/Redo stack for canvas markups.
- Plan Layering: Toggle between "Clean Base Plan" vs. "Current Walk Pins" vs. "Historical Pins".
- Blueprint Navigation: Two-finger pinch-to-zoom (mobile) and Sheet Index bottom-sheet for multi-page PDFs.
- Ghost Camera (Before/After): Translucent overlay of the original photo in the viewfinder to perfectly align repair shots.

### Data Entry (The Bottom Sheet)

- Keyboard Push-Up UX: KeyboardAvoidingView ensures the mobile keyboard never covers the dropped pin.
- Voice-Dictation Friendly: Large text areas for native iOS/Android dictation.
- The AI Magic Wand: "✨ Format with AI" button turns messy dictation into structured titles/descriptions.
- Hardware Triggers: Volume up/down buttons map to snapping photos.

---

## 🎬 Act 3: The Outputs (Deliverables & Optics)

**Goal:** Turn raw field data into impressive, formatted value.

### Deliverable Generation

- The Report Studio: Notion-style block editor to drag-and-drop Act 2 inputs into branded PDF reports, proposals, and estimates.
- Automated Formatting: Table of Contents generator, map view summaries, auto-calculated summary statistics (Open vs. Closed).
- AI Executive Summary: 3-paragraph automated updates for owners.

### Interactive Presentation & Portals

- Cinematic Presentation Mode: Pitch-black slideshow interface for casting to TVs. Features a bottom filmstrip. Presenters control the view; viewers can "Detach" to explore asynchronously.
- SlateDrop Client Portal: Gated web link (Magic Link Login). Clients view a Kanban board of their assigned items.
- Threaded Communications: iMessage-style chats within SlateDrop for specific pins/photos.

### Data Routing

- Cross-Session Querying: Filtering by tags (e.g., `#SafetyHazard`) across massive projects.
- Export Flexibility: CSV/Excel integration for Procore/Primavera P6.

---

## 📁 React Folder Layout (Implementation Plan)

Based on this architecture, the `app/site-walk/` directory should be organized as follows:

```text
/app
  /site-walk
    layout.tsx (The Global App Shell wrapper)

    /(act-1-setup)
      /projects (Dashboard, Intake Forms, Plan Room uploads)
      /directory (Global Address Book)

    /(act-2-inputs)
      /capture (The beating heart: Dual-mode Camera/Plan view)
        _components/
          UnifiedToolbar.tsx
          DataInputBottomSheet.tsx
          PlanViewer.tsx

    /(act-3-outputs)
      /deliverables (Notion-style block editor)
      /present (Cinematic Slideshow Mode)
```

## Route Group Strategy Confirmation

The `/(act-X)` route group strategy is the right App Router structure because it keeps user-facing URLs clean while preserving the 3 Act Play code organization:

- `app/site-walk/(act-1-setup)/projects/page.tsx` → `/site-walk/projects`
- `app/site-walk/(act-1-setup)/directory/page.tsx` → `/site-walk/directory`
- `app/site-walk/(act-2-inputs)/capture/page.tsx` → `/site-walk/capture`
- `app/site-walk/(act-3-outputs)/deliverables/page.tsx` → `/site-walk/deliverables`
- `app/site-walk/(act-3-outputs)/present/page.tsx` → `/site-walk/present`

This should become the forward source of truth for the new Site Walk build. Legacy archived routes under `_legacy_v1` should not drive new architecture.
