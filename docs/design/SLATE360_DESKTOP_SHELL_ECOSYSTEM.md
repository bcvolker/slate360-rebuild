# Slate360 Desktop App Shell + Ecosystem (Prompt B)
## Post-Login Premium SaaS Workspace — Site Walk + Twin 360

**Design Philosophy:** After login, users enter a **unified premium workspace** that contains two distinct applications: **Site Walk** (green accent `#00E699`) and **Twin 360** (blue accent `#3D8EFF`). Both share infrastructure (projects, contacts, calendar, SlateDrop) but differ in their core work surface. The shell makes them feel like **one coherent ecosystem** — not two bolted-on tools.

**Critical distinction:** On desktop, you **do not capture**. Capture happens on phone/tablet. Desktop = upload + organize + author deliverables.

**Aesthetic:** Graphite Glass — dark `#0B0F15` canvas, translucent panels, hairline borders. Only the accent color changes between apps.

---

## 1. The Shell Architecture

### Layout Pattern: Rail + Center + Context + ⌘K

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│                                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────────────────────┐   │
│  │ Slate360                                    Site Walk │ Twin 360          [⌘K] 👤   │   │
│  ├─────────────────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                                     │   │
│  │  ┌────────┐  ┌──────────────────────────────────────────────┐  ┌─────────────────┐  │   │
│  │  │        │  │                                              │  │                 │  │   │
│  │  │  NAV   │  │           CENTER WORKSPACE                   │  │    CONTEXT      │  │   │
│  │  │  RAIL  │  │                                              │  │    PANE         │  │   │
│  │  │        │  │                                              │  │                 │  │   │
│  │  │        │  │                                              │  │                 │  │   │
│  │  │  🏠    │  │                                              │  │                 │  │   │
│  │  │ Home   │  │   (Content varies by route)                  │  │  (Selection     │  │   │
│  │  │        │  │                                              │  │   details,      │  │   │
│  │  │  📁    │  │   Projects / Walks / Twins / Files /         │  │   quick         │  │   │
│  │  │ Proj.. │  │   Deliverables / Contacts / Calendar         │  │   actions)      │  │   │
│  │  │        │  │                                              │  │                 │  │   │
│  │  │  👥    │  │                                              │  │                 │  │   │
│  │  │ Team   │  │                                              │  │                 │  │   │
│  │  │        │  │                                              │  │                 │  │   │
│  │  │  📅    │  │                                              │  │                 │  │   │
│  │  │ Cal..  │  │                                              │  │                 │  │   │
│  │  │        │  │                                              │  │                 │  │   │
│  │  │  ⚙️    │  │                                              │  │                 │  │   │
│  │  │ Set..  │  │                                              │  │                 │  │   │
│  │  │        │  │                                              │  │                 │  │   │
│  │  └────────┘  └──────────────────────────────────────────────┘  └─────────────────┘  │   │
│  │                                                                                     │   │
│  │   ◄── 72px ──►  ◄────────── fluid center ──────────────►  ◄── 320px (fixed) ───►   │   │
│  │                                                                                     │   │
│  └─────────────────────────────────────────────────────────────────────────────────────┘   │
│                                                                                             │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
```

### Component Specifications

#### Top Bar (56px fixed)

**Left:**
- Slate360 wordmark logo (no icon-only)

**Center:**
- App switcher tabs: `[Site Walk]` `[Twin 360]`
- Active tab: underline 2px accent color, text white
- Inactive: text `slate-400`, hover `slate-200`

**Right:**
- `[⌘K]` command palette trigger (always visible)
- User avatar (circle, 32px) with dropdown

**Accent swap:**
- Site Walk active: accent = `#00E699`
- Twin 360 active: accent = `#3D8EFF`
- All accent-colored elements update instantly on switch

#### Left Rail (72px icon + label, expandable to 220px)

**Collapsed (default):** Icon + 2-char label, 72px width
**Expanded (hover/click):** Full label, 220px width

**Sections (shared):**
| Icon | Label | Route | Description |
|------|-------|-------|-------------|
| 🏠 | Home | `/app` | Dashboard, recent activity, quick actions |
| 📁 | Projects | `/app/projects` | Project list + picker |
| 👥 | Team | `/app/team` | Contacts hub, stakeholders |
| 📅 | Calendar | `/app/calendar` | Cross-project schedule |
| ⚙️ | Settings | `/app/settings` | Profile, org, billing |

**App-specific additions:**

**Site Walk rail additions:**
| Icon | Label | Route |
|------|-------|-------|
| 🚶 | Walks | `/app/site-walk/walks` |
| 📋 | Deliverables | `/app/site-walk/deliverables` |

**Twin 360 rail additions:**
| Icon | Label | Route |
|------|-------|-------|
| 🎬 | Clips | `/app/twin/clips` |
| 🧊 | Models | `/app/twin/models` |

**Visual:**
- Active item: `bg-white/5 border-l-2 border-[accent]`
- Inactive: `text-slate-400 hover:text-white hover:bg-white/5`
- Transition: 150ms ease

#### Center Workspace (flex: 1)

- Scrollable content area
- Max-width: none (fills available space)
- Padding: 24px
- Background: `#0B0F15`

#### Right Context Pane (320px fixed, collapsible)

- Shows selection details, quick actions
- Collapses to 0 when no selection
- Collapse toggle: ◀ / ▶ at pane edge
- Content: Dynamic based on selection type

---

## 2. ⌘K Command Palette

**Universal, app-aware command system** (Linear/Notion/Vercel pattern).

```
┌─────────────────────────────────────────┐
│  ⌘K                                   │
├─────────────────────────────────────────┤
│  Search commands, projects, files...     │
│  [______________________________]       │
│                                         │
│  RECENT                                 │
│  → Oak Ridge Roof                       │
│  → Upload clips to Twin 360             │
│  → Create deliverable                   │
│                                         │
│  QUICK ACTIONS                          │
│  [+] Create new project                 │
│  [↑] Upload files                       │
│  [🚶] Start walk from last project      │
│  [📋] Generate quick deliverable          │
│                                         │
│  NAVIGATE                               │
│  Site Walk > Walks                      │
│  Site Walk > Deliverables               │
│  Twin 360 > Models                      │
│  Projects > All                         │
│                                         │
└─────────────────────────────────────────┘
```

**Implementation:**
- Trigger: `Cmd+K` (Mac) / `Ctrl+K` (Windows)
- Global shortcut listener in shell
- Fuzzy search across projects, files, commands
- Context-aware: different quick actions per app

---

## 3. Site Walk Desktop Workspace

### Overview: Upload-Assembled Walks

**Core concept:** Desktop Site Walk is a **walk authoring workbench** — you assemble walks from uploaded photos/files, then build deliverables.

### Screen: Walks List

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Site Walk                                                    [+ New walk] [↑ Upload]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  PROJECT: Oak Ridge Roof                                    [Change ▼]  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  📋 Active Walks          │  ✓ Completed Walks                          │   │
│  ├─────────────────────────────────────────────────────────────────────────┤   │
│  │                                                                         │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                     │   │
│  │  │ [site photo]│  │ [plan view] │  │ [roof shot] │                     │   │
│  │  │             │  │             │  │             │                     │   │
│  │  │ Walk #12    │  │ Walk #11    │  │ Walk #10    │                     │   │
│  │  │ Jun 28      │  │ Jun 25      │  │ Jun 20      │                     │   │
│  │  │ 24 stops    │  │ 18 stops    │  │ 32 stops    │                     │   │
│  │  │ In progress │  │ Delivered   │  │ Delivered   │                     │   │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                     │   │
│  │                                                                         │   │
│  │  Walk #12 — started from mobile, 8 items uploaded                       │   │
│  │  [Continue assembling] [Review stops] [Create deliverable]            │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Screen: Assemble Walk (Upload + Organize)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Walks / Assemble Walk #12                                          [Save] [Done]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  DROP FILES HERE OR BROWSE                                              │   │
│  │  Photos from site visit → auto-tagged with GPS/time                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  16 ITEMS (drag to reorder)                                             │   │
│  │                                                                         │   │
│  │  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐     │   │
│  │  │[001]│ │[002]│ │[003]│ │[004]│ │[005]│ │[006]│ │[007]│ │[008]│ ... │   │
│  │  │ 9am │ │ 9am │ │9:05 │ │9:05 │ │9:10 │ │9:12 │ │9:15 │ │9:20 │     │   │
│  │  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘ └─────┘     │   │
│  │                                                                         │   │
│  │  Stop 1: Foundation          Stop 2: North Elevation                   │   │
│  │  4 photos + 1 note           3 photos + voice memo                     │   │
│  │                                                                         │   │
│  │  [Add note] [Add tag] [Mark as issue]                                  │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  METADATA (extracted from photos)                                       │   │
│  │  Date: June 28, 2026  │  Duration: 1h 24m  │  Coverage: ~2000 sq ft    │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Screen: Deliverable Authoring

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Walks / Deliverable: Walk #12 Report                      [Preview] [Send...]  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌────────────────────────────┐  ┌──────────────────────────────────────────┐   │
│  │  TEMPLATE                  │  │  BLOCK EDITOR (Notion-style)             │   │
│  ├────────────────────────────┤  │                                          │   │
│  │  ○ Site inspection           │  │  ┌────────────────────────────────────┐ │   │
│  │  ● Progress report            │  │  │ Cover: [site photo]              │ │   │
│  │  ○ Punch list                 │  │  │ Oak Ridge Roof — June 28, 2026     │ │   │
│  │  ○ Safety audit               │  │  └────────────────────────────────────┘ │   │
│  │                              │  │                                        │   │
│  │  ──────────────────────────  │  │  ┌────────────────────────────────────┐ │   │
│  │                              │  │  │ Stop 1: Foundation                │ │   │
│  │  INCLUDED                    │  │  │ [photo strip]                      │ │   │
│  │  ☑ All photos                │  │  │ Notes: Foundation inspection...    │ │   │
│  │  ☑ Voice memos               │  │  │ Tags: #foundation #inspection      │ │   │
│  │  ☑ GPS locations             │  │  └────────────────────────────────────┘ │   │
│  │  ☑ Timestamp overlay         │  │                                        │   │
│  │  ☐ Progress comparison       │  │  ┌────────────────────────────────────┐ │   │
│  │    (before/after slider)     │  │  │ Stop 2: North Elevation           │ │   │
│  │                              │  │  │ [photo strip + voice ▶]           │ │   │
│  │  BRANDING                    │  │  │ Tags: #elevation #progress        │ │   │
│  │  Logo: [upload]              │  │  └────────────────────────────────────┘ │   │
│  │  Accent: [#00E699 ▼]         │  │                                        │   │
│  │                              │  │  [+ Add section] [+ Import from other] │   │
│  └────────────────────────────┘  └──────────────────────────────────────────┘   │
│                                                                                 │
│  ─────────────────────────────────────────────────────────────────────────────  │
│  Format: [PDF ▼] │ Quality: [High ▼] │ Estimated size: 4.2 MB                   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Twin 360 Desktop Workspace

### Overview: Upload Clips → Submit → Author Deliverables

**Core concept:** Desktop Twin 360 is a **3D reconstruction workbench** — upload clips/photos, submit to cloud processing, review the resulting splat, then deliver.

### Screen: Clips Library

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ Twin 360                                            [+ Upload clips] [+ New model]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  PROJECT: Oak Ridge Roof                                    [Change ▼]  │   │
│  │  Location: 34.0522° N, 118.2437° W  │  Surrounding: [Google 3D Tiles ▼]  │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  SOURCE CLIPS (ready to process)                                        │   │
│  │                                                                         │   │
│  │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐                         │   │
│  │  │ [clip]  │ │ [clip]  │ │ [clip]  │ │   +   │                         │   │
│  │  │ Clip 1  │ │ Clip 2  │ │ Clip 3  │ │ Upload  │                         │   │
│  │  │ 1:24    │ │ 1:18    │ │ 0:52    │ │  more   │                         │   │
│  │  │ 94 MB   │ │ 89 MB   │ │ 62 MB   │ │         │                         │   │
│  │  └─────────┘ └─────────┘ └─────────┘ └─────────┘                         │   │
│  │                                                                         │   │
│  │  ┌─────────────────────────────────────────────────────────────────┐   │   │
│  │  │  3 clips | Total: 3:34 | Est. processing: 12 min | 2 credits    │   │   │
│  │  │  [Add more files]  [Reorder]  [Remove]  [Save draft]             │   │   │
│  │  │                                                                 │   │   │
│  │  │  [▶ Submit for processing]                                      │   │   │
│  │  └─────────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  PROCESSED MODELS                                                       │   │
│  │                                                                         │   │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                     │   │
│  │  │ [splat      │ │ [splat      │ │ [splat      │                     │   │
│  │  │  preview]   │ │  preview]   │ │  preview]   │                     │   │
│  │  │             │ │             │ │             │                     │   │
│  │  │ Model #7    │ │ Model #6    │ │ Model #5    │                     │   │
│  │  │ Complete    │ │ Complete    │ │ Failed      │                     │   │
│  │  │ [View] [⬇️] │ │ [View] [⬇️] │ │ [Retry]     │                     │   │
│  │  └─────────────┘ └─────────────┘ └─────────────┘                     │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Screen: Submit for Processing

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Clips / Submit Model                                                        [×]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  REVIEW & CONFIRM                                                               │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Source clips                                                           │   │
│  │  [▶] Clip 1 — 1:24 — Overlap: yes — LiDAR: yes                          │   │
│  │  [▶] Clip 2 — 1:18 — Overlap: yes — LiDAR: yes                          │   │
│  │  [▶] Clip 3 — 0:52 — Overlap: yes — LiDAR: yes                          │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  Processing options                                                     │   │
│  │                                                                         │   │
│  │  Quality: [High (default) ▼]                                          │   │
│  │    High = max splat count, 15–20 min, 2 credits                         │   │
│  │    Medium = balanced, 8–12 min, 1 credit                                │   │
│  │    Draft = fast preview, 3–5 min, 0.5 credit                            │   │
│  │                                                                         │   │
│  │  Surrounding context: [1 block radius ▼]                                │   │
│  │    Blend Google Photorealistic 3D Tiles around reconstruction           │   │
│  │                                                                         │   │
│  │  Output format: [SPZ ▼] [PLY ▼] [LAS ▼]                                 │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  LIVE ESTIMATE                      ORG BALANCE                         │   │
│  │                                                                         │   │
│  │  Processing time: 12–15 minutes         Credits: 47                       │   │
│  │  Cost: 2 credits                        [Buy more]                        │   │
│  │                                                                         │   │
│  │  [◀ Back]                    [Start processing ▶]                       │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  [💾 Save for later — finish on phone]                                           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Screen: Model Viewer + Deliverable

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ← Models / Model #7 — Oak Ridge Roof              [Share] [Download] [Deliverable]│
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                                                                         │   │
│  │                           [SPLOSHER VIEWER]                             │   │
│  │                    (Gaussian splat, rotate/zoom/pan)                    │   │
│  │                                                                         │   │
│  │                    ┌─────────────────────────┐                           │   │
│  │                    │                         │                           │   │
│  │                    │     [3D reconstruction]  │                           │   │
│  │                    │        of roof          │                           │   │
│  │                    │                         │                           │   │
│  │                    └─────────────────────────┘                           │   │
│  │                                                                         │   │
│  │     [← Rotate] [Reset view] [Zoom ±] [Fullscreen] [Help ?]            │   │
│  │                                                                         │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │  DETAILS                            ACTIONS                             │   │
│  │  ─────────────────────────────────────────────────────────────────────  │   │
│  │  Created: Jun 28, 2026              [Create deliverable]              │   │
│  │  Processing: 14 min                 [Add to site walk]                  │   │
│  │  Size: 45 MB (SPZ)                  [Pin to plan]                       │   │
│  │  Quality: High                      [Open in new tab]                 │   │
│  │  Surrounding: 1 block               [Delete]                            │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 5. Tier Gating UX

### Principle: Visible but Locked

**Never hide** tier-gated features. Always show them with clear upgrade affordance.

### Tier Badge Pattern

```
┌─────────────────────────────────────────────────────────┐
│  Oak Ridge Roof                            [PRO ▼]      │
│  Roof inspection project                                │
│                                                         │
│  Site Walks │ Twins │ Files │ Team │ Deliverables      │
└─────────────────────────────────────────────────────────┘
```

**Badge variants:**
- Free: `[FREE]` (muted, `slate-500`)
- Pro: `[PRO]` (accent color, `#00E699` or `#3D8EFF`)
- Enterprise: `[ENTERPRISE]` (gold, `#F59E0B`)

### Locked Feature Pattern

**Before upgrade (visible but disabled):**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🔄 360 Photos on Plans                                │
│   Attach 360° captures to plan locations                │
│                                                         │
│   [🔒 Upgrade to Pro — $29/mo]                          │
│                                                         │
│   Includes: 360 photos, walks-with-plans, 10 team seats │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

**After upgrade (enabled):**
```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│   🔄 360 Photos on Plans                                │
│   Attach 360° captures to plan locations                │
│                                                         │
│   [Configure] [Start walk with plans]                   │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### Gate Trigger Points

| Feature | Gate Location | CTA |
|---------|---------------|-----|
| Walks-with-plans | Project home, plan upload complete | "Enable plan pinning — Upgrade to Pro" |
| 360 photos | Capture source picker | "360° capture — Upgrade to Pro" |
| Twin 360 processing | Submit screen | "Process this model — Buy credits or upgrade" |
| Collaborator invites | Team tab, seat limit reached | "Add more seats — Upgrade" |
| Deliverable templates | Template picker | "Professional templates — Upgrade" |

---

## 6. Visual Language: One Ecosystem, Two Accents

### Accent Token System

```css
/* CSS variables (tailwind.config.ts) */
:root {
  /* Base (always the same) */
  --graphite-bg: #0B0F15;
  --graphite-panel: rgba(15, 23, 42, 0.7);
  --glass-border: rgba(148, 163, 184, 0.1);
  --text-primary: #FFFFFF;
  --text-secondary: #94A3B8;
  
  /* Accent (switched per app) */
  --accent-primary: var(--site-walk-green); /* or var(--twin-blue) */
  --accent-glow: var(--site-walk-green-glow); /* or var(--twin-blue-glow) */
}

[data-app="site-walk"] {
  --accent-primary: #00E699;
  --accent-glow: rgba(0, 230, 153, 0.3);
}

[data-app="twin-360"] {
  --accent-primary: #3D8EFF;
  --accent-glow: rgba(61, 142, 255, 0.3);
}
```

### Shared Components with Accent Swap

| Element | Site Walk | Twin 360 |
|---------|-----------|----------|
| Active tab underline | `#00E699` | `#3D8EFF` |
| Button primary bg | `#00E699` | `#3D8EFF` |
| Button primary text | `#0B0F15` (dark) | `#0B0F15` (dark) |
| Selected state bg | `rgba(0,230,153,0.1)` | `rgba(61,142,255,0.1)` |
| Selected border | `#00E699` | `#3D8EFF` |
| Icon accent | `#00E699` | `#3D8EFF` |
| Loading spinner | `#00E699` | `#3D8EFF` |
| Progress bar fill | `#00E699` | `#3D8EFF` |
| Toggle on | `#00E699` | `#3D8EFF` |
| Link hover | `#00E699` | `#3D8EFF` |

### Animation: Accent Transition

```css
/* Smooth 200ms accent swap */
.accent-aware {
  transition: background-color 200ms ease, 
              border-color 200ms ease, 
              color 200ms ease,
              box-shadow 200ms ease;
}
```

---

## 7. Component Inventory

### Shell Components

| Component | File | Props | Description |
|-----------|------|-------|-------------|
| `AppShell` | `components/shell/AppShell.tsx` | `app: 'site-walk' \| 'twin-360', user, project?` | Root layout |
| `TopBar` | `components/shell/TopBar.tsx` | `activeApp, onAppSwitch` | Logo, switcher, ⌘K, avatar |
| `LeftRail` | `components/shell/LeftRail.tsx` | `items, activeId, collapsed` | Navigation rail |
| `ContextPane` | `components/shell/ContextPane.tsx` | `selection, actions, onClose` | Right detail pane |
| `CommandPalette` | `components/shell/CommandPalette.tsx` | `isOpen, onClose, commands` | ⌘K modal |
| `AccentProvider` | `components/shell/AccentProvider.tsx` | `accent: 'green' \| 'blue'` | CSS variable injection |

### Site Walk Components

| Component | File | Description |
|-----------|------|-------------|
| `WalksGrid` | `components/site-walk/WalksGrid.tsx` | Walk cards with status |
| `WalkAssembler` | `components/site-walk/WalkAssembler.tsx` | Upload + organize |
| `StopOrganizer` | `components/site-walk/StopOrganizer.tsx` | Drag-drop reorder |
| `DeliverableEditor` | `components/site-walk/DeliverableEditor.tsx` | Block-based editor |
| `BlockRenderer` | `components/site-walk/blocks/BlockRenderer.tsx` | Photo, note, voice, map blocks |

### Twin 360 Components

| Component | File | Description |
|-----------|------|-------------|
| `ClipGrid` | `components/twin/ClipGrid.tsx` | Source clips |
| `ModelGrid` | `components/twin/ModelGrid.tsx` | Processed models |
| `SubmitPanel` | `components/twin/SubmitPanel.tsx` | Processing options |
| `EstimateCalculator` | `components/twin/EstimateCalculator.tsx` | Live credits + time |
| `SplatViewer` | `components/twin/SplatViewer.tsx` | SPZ/PLY viewer embed |

### Shared Workspace Components

| Component | File | Description |
|-----------|------|-------------|
| `ProjectHeader` | `components/workspace/ProjectHeader.tsx` | Project switcher + tier badge |
| `UploadDropzone` | `components/workspace/UploadDropzone.tsx` | Desktop drag-drop |
| `FileGrid` | `components/workspace/FileGrid.tsx` | Generic file grid |
| `TierGateCard` | `components/workspace/TierGateCard.tsx` | Locked feature promo |
| `ContextActions` | `components/workspace/ContextActions.tsx` | Quick action buttons |

---

## 8. Screen Flow Diagram

```
                                    ┌─────────────┐
                                    │   /login    │
                                    └──────┬──────┘
                                           │
                                           ▼
┌──────────────────────────────────────────────────────────────────────────┐
│                              APP SHELL                                    │
│  ┌────────┐  ┌──────────────────────────────────────┐  ┌──────────────┐  │
│  │  Rail  │  │        CENTER WORKSPACE              │  │   Context    │  │
│  │        │  │                                        │  │              │  │
│  │ Home   │  │  ┌────────────────────────────────┐   │  │              │  │
│  │ Proj.. │  │  │     SITE WALK WORKSPACE        │   │  │              │  │
│  │ Team   │  │  │  ────────────────────────────  │   │  │   Details    │  │
│  │ Cal..  │  │  │  Walks list → Assemble walk    │   │  │   Actions    │  │
│  │ Set..  │  │  │           ↓                    │   │  │              │  │
│  │        │  │  │  Deliverable editor → Share    │   │  │              │  │
│  │        │  │  └────────────────────────────────┘   │  │              │  │
│  │        │  │                                        │  │              │  │
│  │        │  │  ┌────────────────────────────────┐   │  │              │  │
│  │        │  │  │     TWIN 360 WORKSPACE         │   │  │              │  │
│  │        │  │  │  ────────────────────────────  │   │  │              │  │
│  │        │  │  │  Clips library → Submit panel  │   │  │              │  │
│  │        │  │  │           ↓                      │   │  │              │  │
│  │        │  │  │  Processing → Model viewer       │   │  │              │  │
│  │        │  │  │           ↓                      │   │  │              │  │
│  │        │  │  │  Deliverable (360 embed)         │   │  │              │  │
│  │        │  │  └────────────────────────────────┘   │  │              │  │
│  └────────┘  └──────────────────────────────────────┘  └──────────────┘  │
└──────────────────────────────────────────────────────────────────────────┘
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              ▼                            ▼                            ▼
        ┌─────────────┐            ┌─────────────┐              ┌─────────────┐
        │   ⌘K Cmd    │            │  Projects   │              │  Settings   │
        │   Palette   │            │  (shared)   │              │  (shared)   │
        └─────────────┘            └─────────────┘              └─────────────┘
```

---

## 9. States

### Empty States

**No projects (first run):**
```
┌─────────────────────────────────────────┐
│                                         │
│     [illustration: building + 360]      │
│                                         │
│     Welcome to Slate360                 │
│                                         │
│     Create your first project to start  │
│     documenting and modeling sites.     │
│                                         │
│     [Create project] [Explore demo]     │
│                                         │
└─────────────────────────────────────────┘
```

**No walks in project:**
```
│  No walks yet                           │
│  Start a walk from mobile, or upload    │
│  photos to assemble one here.          │
│  [How site walks work] [Upload photos]  │
```

**No clips in Twin:**
```
│  No clips yet                           │
│  Upload video clips from your phone   │
│  to build a 3D model.                  │
│  [How Twin 360 works] [Upload clips]    │
```

### Loading States

**App switch:**
- Accent color fades (150ms)
- Content cross-fades (200ms)
- No full-page reload

**Content loading:**
- Skeleton cards (6–8 items)
- Shimmer: `bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800`

**Processing (Twin):**
- Progress bar with time estimate
- Stage indicators: "Uploading → Extracting frames → Running COLMAP → Training splats → Finalizing"
- Cancel button (stops job, saves partial)

### Error States

**App switch failed:**
- Toast: "Failed to load Twin 360 — retrying"
- Auto-retry 3×, then manual [Retry]

**Project load failed:**
- Inline: "Could not load project details"
- [Select different project] [Contact support]

**Processing failed (Twin):**
- Error card with specific message:
  - "Not enough overlap between clips"
  - "Processing timed out — try lower quality"
  - "Out of credits — buy more"
- [Retry with different settings] [Delete and re-upload]

---

## 10. Top 3 Pitfalls

### Pitfall 1: Mobile-desktop feature parity confusion
**Risk:** Users expect to capture on desktop (because "it's an app") and are frustrated when they can't.
**Mitigation:**
- **Clear entry messaging:** On first desktop Site Walk visit, show: "Site Walk capture happens on mobile. Desktop is for organizing photos and creating deliverables."
- **Prominent upload affordance:** Make "Upload from device" the primary CTA, not secondary
- **QR code pattern:** "Scan to capture on mobile" — link to app store + pre-authenticate

### Pitfall 2: App switch disorientation
**Risk:** Users lose context when switching between Site Walk and Twin 360.
**Mitigation:**
- **Project continuity:** Stay in the same project when switching apps (if project has both walk and twin data)
- **Visual continuity:** Only accent color changes — layout, rail position, all other chrome stays identical
- **Animate the switch:** 150ms accent fade, not instant jump
- **Keyboard shortcut:** `Cmd+1` = Site Walk, `Cmd+2` = Twin 360 (match tab order)

### Pitfall 3: Tier gating frustration
**Risk:** Free users hit paywalls repeatedly and churn.
**Mitigation:**
- **Generous free tier:** Give them enough walks/projects to experience value before gating
- **Clear upgrade path:** Always explain *why* upgrade unlocks value, not just "locked"
- **One-click upgrade:** From any gate, [Upgrade] → Stripe checkout → immediate unlock (no redirect hell)
- **Trial cues:** "Pro free for 14 days" banner for new users

---

## 11. Best-in-Class References

| Product | Pattern We Adopt |
|---------|------------------|
| **Linear** | Three-pane layout, ⌘K palette, accent color system, command-oriented UI |
| **Vercel Dashboard** | App switcher tabs, project-centric navigation, clean data tables |
| **Notion** | Block-based editor, left rail navigation, workspace switcher |
| **Figma** | Multi-product nav (Design / FigJam), consistent shell, accent swapping |
| **Procore** | Construction project home, tabbed workspace, deliverable authoring |
| **DroneDeploy** | 3D model viewer integration, processing queue, map/model toggle |

---

## 12. Implementation Notes

### Route Structure

```
/app                          → App shell with redirect to last active
/app?app=site-walk           → Site Walk workspace (default)
/app?app=twin-360             → Twin 360 workspace

/app/site-walk/walks          → Walks list
/app/site-walk/walks/[id]     → Walk detail/assemble
/app/site-walk/deliverables   → Deliverable templates
/app/site-walk/deliverables/[id]/edit → Deliverable editor

/app/twin/clips               → Clips library
/app/twin/clips/submit        → Submit for processing
/app/twin/models              → Processed models
/app/twin/models/[id]         → Model viewer

/app/projects                 → Project list (shared)
/app/projects/[id]            → Project home (context-aware redirect)
/app/team                     → Contacts hub (shared)
/app/calendar                 → Calendar (shared)
/app/settings                 → Settings (shared)
```

### State Management

```typescript
// Shell context
interface AppShellState {
  activeApp: 'site-walk' | 'twin-360';
  currentProject: Project | null;
  leftRailCollapsed: boolean;
  contextPaneOpen: boolean;
  contextSelection: Selection | null;
}

// Accent injection (SSR-safe)
const AccentProvider: React.FC<{ accent: 'green' | 'blue' }> = ({ accent, children }) => {
  useEffect(() => {
    document.documentElement.setAttribute('data-app', accent === 'green' ? 'site-walk' : 'twin-360');
  }, [accent]);
  return children;
};
```

---

*Design locked: June 28, 2026*
*Author: AI Design Panel + Brian Volker*
*Status: Ready for implementation*
