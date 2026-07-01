# Report Builder: Template Auto-Assembly Flow
## Zero-Training Report Creation from Site Walk Sessions

**Date:** July 1, 2026  
**Context:** Working `DeliverableEditorClient` with `ViewerItem[]` content model, PDF export live, branding live, /view/[token] share live  
**Goal:** Auto-populate deliverables from walks with 3–4 templates, minimal clicks to send

---

## 1. Core UX Philosophy: "Review, Don't Build"

**Anti-pattern to avoid:** Starting user with blank canvas (current friction point)  
**New pattern:** Template seeds blocks → Auto-assemble from walk data → User reviews/edits → Send

**Contractor Mental Model:**
```
"I did the walk → Slate360 makes the report → I check it → I send it"
                         ↑
                    (template magic)
```

---

## 2. The Four Templates

| Template | Use Case | Block Signature | Auto-Seeded From Walk |
|----------|----------|-----------------|----------------------|
| **Daily Field Report** | End-of-day summary for GC | Cover → Weather → Photo Grid → Voice Summary → Signature | All photos, weather, voice memos, timestamp |
| **Inspection Report** | Formal observation for records | Cover → Executive Summary → Photo Grid (with annotations) → Notes per Stop → Plan Overlay → Signature | Flagged photos, voice transcripts, plan pins |
| **Progress Report** | Before/after comparison | Cover → Comparison Block → Photo Grid → Twin 360 (if available) → Timeline → Signature | Matched stops from previous walk |
| **Punch List** | Deficiency tracking for closeout | Cover → Deficiency Table → Photo Grid (flagged issues) → Assignee List → Signature | Flagged issues only, assignee tags |

---

## 3. Template Block Definitions

```typescript
// types/report-templates.ts

type TemplateId = 'daily-field' | 'inspection' | 'progress' | 'punch-list';

interface ReportTemplate {
  id: TemplateId;
  name: string;
  description: string;
  icon: LucideIcon;
  accent: 'green' | 'blue' | 'amber' | 'red'; // For template picker only, not report
  defaultBlocks: TemplateBlock[];
  filterItems: (items: ViewerItem[]) => ViewerItem[];
  sortItems: (items: ViewerItem[]) => ViewerItem[];
}

// Blocks that map to ViewerItem types or are synthetic

type TemplateBlock =
  | { type: 'cover'; title: string; subtitle?: string }
  | { type: 'weather'; source: 'auto' | 'manual' }
  | { type: 'photo_grid'; layout: '2x2' | '3x2' | 'auto'; filter?: string[] }
  | { type: 'photo_comparison'; matchBy: 'gps' | 'stop_number' | 'manual' }
  | { type: 'voice_summary'; transcribe: boolean }
  | { type: 'notes_per_stop'; includeVoice: boolean }
  | { type: 'plan_overlay'; planId: string | 'auto' }
  | { type: 'deficiency_table'; severityFilter?: ('critical' | 'major' | 'minor')[] }
  | { type: 'timeline'; showDates: boolean }
  | { type: 'twin_360'; twinId: string | 'latest' }
  | { type: 'signature_line'; signatory: string }
  | { type: 'heading'; text: string; level: 1 | 2 | 3 }
  | { type: 'text'; text: string }
  | { type: 'metadata_table'; fields: ('date' | 'time' | 'weather' | 'gps' | 'device' | 'author')[] };
```

---

## 4. Template Specifications

### Template A: Daily Field Report

```typescript
const dailyFieldTemplate: ReportTemplate = {
  id: 'daily-field',
  name: 'Daily Field Report',
  description: 'End-of-day summary with weather, photos, and observations',
  icon: Sun,
  accent: 'green',
  
  defaultBlocks: [
    { type: 'cover', title: 'Daily Field Report', subtitle: '{project_name} — {date}' },
    { type: 'metadata_table', fields: ['date', 'time', 'weather', 'author'] },
    { type: 'heading', text: 'Site Conditions', level: 2 },
    { type: 'photo_grid', layout: '3x2' }, // All photos
    { type: 'heading', text: 'Voice Notes Summary', level: 2 },
    { type: 'voice_summary', transcribe: true },
    { type: 'heading', text: 'Work Completed', level: 2 },
    { type: 'text', text: '[Tap to add summary of work completed today]' },
    { type: 'signature_line', signatory: 'Site Supervisor' },
  ],
  
  filterItems: (items) => items, // Include all
  sortItems: (items) => items.sort((a, b) => {
    // Photos first, then voice, then notes
    const typeOrder = { photo: 0, voice: 1, note: 2 };
    return (typeOrder[a.type] ?? 99) - (typeOrder[b.type] ?? 99);
  }),
};
```

**Visual preview of assembled report:**
```
┌─────────────────────────────────────────────────────────────────┐
│  [ORG LOGO]                                                     │
│  DAILY FIELD REPORT                                             │
│  Oak Ridge Roof Replacement — July 1, 2024                      │
├─────────────────────────────────────────────────────────────────┤
│  Date: July 1, 2024          Weather: Partly cloudy, 84°F      │
│  Time: 2:34 PM – 3:47 PM     Author: Brian Volker              │
├─────────────────────────────────────────────────────────────────┤
│  SITE CONDITIONS                                                │
│  ┌────────┐ ┌────────┐ ┌────────┐                            │
│  │ Photo 1│ │ Photo 2│ │ Photo 3│                            │
│  │ Stop 1 │ │ Stop 2 │ │ Stop 3 │                            │
│  └────────┘ └────────┘ └────────┘                            │
│  ┌────────┐ ┌────────┐                                         │
│  │ Photo 4│ │ Photo 5│  [14 more photos…]                      │
│  │ Stop 4 │ │ Stop 5│                                          │
│  └────────┘ └────────┘                                         │
├─────────────────────────────────────────────────────────────────┤
│  VOICE NOTES SUMMARY                                            │
│  ▶ 0:34 — "North elevation looks good, no issues…"            │
│  ▶ 0:12 — "Access to south side blocked by equipment"          │
├─────────────────────────────────────────────────────────────────┤
│  WORK COMPLETED                                                 │
│  [Tap to add summary of work completed today]                  │
│                                                                 │
│  ___________________________    ________________                │
│  Site Supervisor Signature      Date                            │
└─────────────────────────────────────────────────────────────────┘
```

---

### Template B: Inspection Report

```typescript
const inspectionTemplate: ReportTemplate = {
  id: 'inspection',
  name: 'Inspection Report',
  description: 'Formal observation with detailed notes and plan overlay',
  icon: ClipboardCheck,
  accent: 'blue',
  
  defaultBlocks: [
    { type: 'cover', title: 'Field Inspection Report', subtitle: '{project_name}' },
    { type: 'heading', text: 'Executive Summary', level: 2 },
    { type: 'text', text: '[Tap to summarize inspection findings]' },
    { type: 'heading', text: 'Observations by Location', level: 2 },
    { type: 'notes_per_stop', includeVoice: true },
    { type: 'heading', text: 'Photo Documentation', level: 2 },
    { type: 'photo_grid', layout: 'auto', filter: ['flagged', 'annotated'] },
    { type: 'heading', text: 'Site Plan Reference', level: 2 },
    { type: 'plan_overlay', planId: 'auto' },
    { type: 'metadata_table', fields: ['date', 'time', 'gps', 'device', 'author'] },
    { type: 'signature_line', signatory: 'Inspector' },
  ],
  
  filterItems: (items) => items.filter(i => 
    i.flags?.length > 0 || i.annotations?.length > 0 || i.type === 'voice'
  ),
  sortItems: (items) => items.sort((a, b) => {
    // Flagged first, then by stop number
    const aFlagged = a.flags?.length > 0 ? 0 : 1;
    const bFlagged = b.flags?.length > 0 ? 0 : 1;
    if (aFlagged !== bFlagged) return aFlagged - bFlagged;
    return (a.stopNumber ?? 0) - (b.stopNumber ?? 0);
  }),
};
```

**Key difference:** Notes are grouped by stop with voice transcription inline.

---

### Template C: Progress Report

```typescript
const progressTemplate: ReportTemplate = {
  id: 'progress',
  name: 'Progress Report',
  description: 'Before/after comparison across multiple walks',
  icon: TrendingUp,
  accent: 'amber',
  
  defaultBlocks: [
    { type: 'cover', title: 'Progress Report', subtitle: '{project_name}' },
    { type: 'heading', text: 'Comparison Overview', level: 2 },
    { type: 'photo_comparison', matchBy: 'gps' }, // Matches stops by GPS
    { type: 'heading', text: 'Current State', level: 2 },
    { type: 'photo_grid', layout: '3x2' },
    { type: 'heading', text: '3D Model Progress', level: 2 },
    { type: 'twin_360', twinId: 'latest' },
    { type: 'heading', text: 'Timeline', level: 2 },
    { type: 'timeline', showDates: true },
    { type: 'signature_line', signatory: 'Project Manager' },
  ],
  
  filterItems: (items) => items, // All current walk
  sortItems: (items) => items.sort((a, b) => (a.timestamp ?? 0) - (b.timestamp ?? 0)),
  
  // Requires: previous walk for comparison
  requiresPreviousWalk: true,
};
```

**Comparison block visual:**
```
┌─────────────────────────────────────────────────────────────────┐
│  STOP 3 — North Elevation                                         │
│  ┌──────────────────┐    ┌──────────────────┐                    │
│  │ [June 14 Photo]  │ ↔  │ [July 1 Photo]   │                    │
│  │ "Before"         │    │ "After"          │                    │
│  └──────────────────┘    └──────────────────┘                    │
│  [Drag slider] or [Side-by-side] or [Overlay opacity]           │
└─────────────────────────────────────────────────────────────────┘
```

---

### Template D: Punch List

```typescript
const punchListTemplate: ReportTemplate = {
  id: 'punch-list',
  name: 'Punch List',
  description: 'Deficiency tracking for project closeout',
  icon: AlertCircle,
  accent: 'red',
  
  defaultBlocks: [
    { type: 'cover', title: 'Punch List', subtitle: '{project_name}' },
    { type: 'heading', text: 'Outstanding Items', level: 2 },
    { type: 'deficiency_table', severityFilter: ['critical', 'major', 'minor'] },
    { type: 'heading', text: 'Issue Documentation', level: 2 },
    { type: 'photo_grid', layout: 'auto', filter: ['issue'] },
    { type: 'heading', text: 'Assignments', level: 2 },
    { type: 'text', text: '[Tap to assign items to contractors]' },
    { type: 'signature_line', signatory: 'General Contractor' },
  ],
  
  filterItems: (items) => items.filter(i => 
    i.flags?.includes('issue') || i.tags?.includes('punch')
  ),
  sortItems: (items) => items.sort((a, b) => {
    // Critical first
    const severityOrder = { critical: 0, major: 1, minor: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  }),
};
```

**Deficiency table block:**
```
┌─────────────────────────────────────────────────────────────────┐
│  #  │ Item              │ Severity │ Photo │ Assigned │ Due    │
│  ─────────────────────────────────────────────────────────────  │
│  1  │ North flashing    │ Critical │ [📷]  │ [Select] │ [Date] │
│  2  │ South gutter      │ Major    │ [📷]  │ [Select] │ [Date] │
│  3  │ Paint touch-up    │ Minor    │ [📷]  │ [Select] │ [Date] │
└─────────────────────────────────────────────────────────────────┘
```

---

## 5. Entry Points: "Create Report From Walk"

### Entry Point A: Post-Walk Review Screen (Primary)

```
┌─────────────────────────────────────────────────────────────────┐
│  ← Walks                      Review Walk                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Oak Ridge Roof — Walk #12                                    │
│  14 stops · 47 photos · 3 voice notes · 2:34 PM               │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │  [THUMBNAIL GRID — 6 visible, 41 more]                    │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  CREATE DELIVERABLE FROM THIS WALK                              │
│  Choose a template to auto-generate your report:               │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   [SUN]      │  │ [CLIPBOARD]  │  │ [TRENDING]   │         │
│  │              │  │              │  │              │         │
│  │ Daily Field  │  │  Inspection  │  │   Progress   │         │
│  │   Report     │  │    Report    │  │    Report    │         │
│  │              │  │              │  │              │         │
│  │ Best for:    │  │ Best for:    │  │ Best for:    │         │
│  │ End-of-day   │  │ Formal obs   │  │  Before/     │         │
│  │ summaries    │  │  records     │  │   after      │         │
│  │              │  │              │  │              │         │
│  │  [14 items]  │  │  [8 flagged] │  │ [Needs prev] │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                 │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │             [ALERT CIRCLE]                                │ │
│  │                                                           │ │
│  │  Punch List              3 flagged issues found           │ │
│  │  [7 items — Critical: 1, Major: 2, Minor: 3]              │ │
│  └───────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ─ or ─                                                         │
│                                                                 │
│  [Start from blank] — Build your deliverable manually           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Template card design (Graphite Glass):**
```tsx
<TemplateCard
  icon={template.icon}
  name={template.name}
  description={template.description}
  itemCount={filteredItems.length}
  disabled={template.requiresPreviousWalk && !previousWalk}
  onClick={() => selectTemplate(template.id)}
  // Visual: 72px touch target, green accent on hover
/>
```

### Entry Point B: Deliverables List "New" Button

```
┌─────────────────────────────────────────────────────────────────┐
│  Deliverables                                  [+ New ▼]        │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  [DROPDOWN]                                                     │
│  ─────────────────────────────                                  │
│  From recent walk:                                              │
│  • Oak Ridge Roof — Walk #12 (today, 2:34 PM)                  │
│  • Riverfront Condos — Walk #8 (yesterday, 9:00 AM)            │
│  ─────────────────────────────                                  │
│  [Start blank deliverable]                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Entry Point C: Walk Detail "Generate Report" CTA

```tsx
// In walk detail screen, prominent button:
<Button variant="primary" size="lg" className="h-14">
  <FileText className="w-5 h-5 mr-2" />
  Generate Report
</Button>
```

---

## 6. Auto-Assembly Flow (Zero-Training UX)

```
USER ACTION                          SYSTEM RESPONSE
────────────────────────────────────────────────────────────────
Tap "Generate Report" on walk review    → Show template picker
                                          
Tap "Daily Field Report" template       → Auto-assemble:
                                          • Create deliverable entity
                                          • Seed title: "Daily Field Report — {project} — {date}"
                                          • Map walk items to blocks per template logic
                                          • Open in editor (pre-populated)
                                          
See pre-populated editor                  → Review mode (not blank):
                                          • All photos already in photo_grid block
                                          • Voice memos already in voice_summary
                                          • Weather already in metadata_table
                                          • One placeholder text block for manual summary
                                          
Edit if needed                            • Reorder blocks (arrows)
                                          • Add/remove items from grid
                                          • Edit captions
                                          • Add manual text
                                          
Tap "Preview"                           → Full PDF preview (branded)

Tap "Send"                              → Share dialog (email, link, SlateDrop)
────────────────────────────────────────────────────────────────
```

**Time to send:** ~2 minutes (vs. 15+ minutes building from blank)

---

## 7. Editor Adaptations for Template Mode

### Visual Indicators: Auto vs. Manual Blocks

```tsx
// In block list, subtle indicator of provenance
<BlockRow
  block={block}
  sourceIndicator={block.autoPopulated ? 'auto' : 'manual'}
  // Shows: "[A]" badge or subtle tint for auto-populated
/>
```

```
┌─────────────────────────────────────────────────────────────────┐
│  [PHOTO GRID BLOCK]                                    [A]     │
│  14 photos from walk                                          │
│  [Edit grid →] [Remove all]                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Smart Suggestions Sidebar

Instead of raw source list, show smart suggestions:

```
SMART SUGGESTIONS
─────────────────
Based on your template:

[+] Add weather summary block
   (Weather data available: 84°F, partly cloudy)

[+] Flag 3 photos as "issues"
   (Voice notes mention problems)

[+] Add plan overlay
   (Project has active plan: Site_Plan_v2.pdf)

[+] Link previous walk for comparison
   (Walk #11 from June 14 available)
```

---

## 8. Data Mapping: Walk → Template Blocks

```typescript
// lib/reports/template-assembler.ts

interface WalkSession {
  id: string;
  projectId: string;
  stops: WalkStop[];
  weather?: WeatherData;
  planPins?: PlanPin[];
  startTime: Date;
  endTime: Date;
  author: User;
}

interface AssembleResult {
  deliverableId: string;
  title: string;
  content: ViewerItem[];
  exportConfig: {
    templateId: TemplateId;
    autoPopulated: boolean;
    sourceWalkId: string;
  };
}

export async function assembleFromTemplate(
  walk: WalkSession,
  templateId: TemplateId,
  previousWalk?: WalkSession // For progress reports
): Promise<AssembleResult> {
  const template = TEMPLATES[templateId];
  
  // 1. Flatten walk items
  const allItems = walk.stops.flatMap(stop => [
    ...stop.photos.map(p => ({ ...p, stopNumber: stop.number, type: 'photo' })),
    ...stop.voiceMemos.map(v => ({ ...v, stopNumber: stop.number, type: 'voice' })),
    ...stop.notes.map(n => ({ ...n, stopNumber: stop.number, type: 'note' })),
  ]);
  
  // 2. Filter per template
  const filteredItems = template.filterItems(allItems);
  
  // 3. Sort per template
  const sortedItems = template.sortItems(filteredItems);
  
  // 4. Map to ViewerItem[] content blocks
  const content: ViewerItem[] = template.defaultBlocks.map(block => 
    renderBlock(block, sortedItems, walk, previousWalk)
  );
  
  // 5. Create deliverable
  const deliverable = await createDeliverable({
    projectId: walk.projectId,
    title: renderTemplateString(template.defaultBlocks[0].title, { 
      project_name: walk.projectName,
      date: format(walk.startTime, 'MMMM d, yyyy')
    }),
    content,
    sourceWalkId: walk.id,
    exportConfig: {
      templateId,
      autoPopulated: true,
      showMetadata: templateId === 'inspection', // Inspections need metadata
    }
  });
  
  return {
    deliverableId: deliverable.id,
    title: deliverable.title,
    content,
    exportConfig: deliverable.exportConfig,
  };
}

function renderBlock(
  block: TemplateBlock,
  items: ViewerItem[],
  walk: WalkSession,
  previousWalk?: WalkSession
): ViewerItem {
  switch (block.type) {
    case 'photo_grid':
      return {
        id: `grid-${crypto.randomUUID()}`,
        type: 'photo_grid',
        items: items.filter(i => i.type === 'photo'),
        layout: block.layout,
        autoPopulated: true,
      };
      
    case 'voice_summary':
      return {
        id: `voice-summary-${crypto.randomUUID()}`,
        type: 'voice_summary',
        items: items.filter(i => i.type === 'voice'),
        transcribe: block.transcribe,
        autoPopulated: true,
      };
      
    case 'photo_comparison':
      if (!previousWalk) {
        // Fallback to regular photo grid
        return renderBlock({ type: 'photo_grid', layout: '3x2' }, items, walk);
      }
      return {
        id: `comparison-${crypto.randomUUID()}`,
        type: 'photo_comparison',
        currentItems: items.filter(i => i.type === 'photo'),
        previousItems: previousWalk.stops.flatMap(s => s.photos),
        matchBy: block.matchBy,
        autoPopulated: true,
      };
      
    case 'weather':
      return {
        id: `weather-${crypto.randomUUID()}`,
        type: 'weather',
        data: walk.weather,
        autoPopulated: true,
      };
      
    // ... other block types
    
    default:
      return {
        id: `${block.type}-${crypto.randomUUID()}`,
        type: block.type,
        ...block,
        autoPopulated: true,
      };
  }
}
```

---

## 9. Progressive Disclosure: Simple → Advanced

### Level 1: One-Tap Send (For repeat users)

```
After first successful report:
[☑] Remember my last template: "Daily Field Report"

Next walk → [Generate Report] → Skips picker, uses remembered template
            → Brief "Assembling Daily Field Report..." toast
            → Opens editor with [Review & Send] primary CTA
```

### Level 2: Template Customization (For power users)

```
In editor: [Customize Template ▼]

Options:
• Save as my default for this project
• Create custom template from this layout
• Manage my templates → Opens template library
```

---

## 10. Graphite Glass Implementation

### Template Picker Styling

```tsx
// Template picker — green accent (Site Walk surface)
<TemplatePicker className="data-[app='site-walk']">

// Template card
<TemplateCard
  className={cn(
    "glass-panel p-6 rounded-xl border border-white/[0.06]",
    "hover:border-[#00E699]/30 hover:bg-[#00E699]/5",
    "transition-all cursor-pointer",
    "h-full flex flex-col"
  )}
>
  <div className="w-12 h-12 rounded-lg bg-[#00E699]/10 flex items-center justify-center mb-4">
    <template.icon className="w-6 h-6 text-[#00E699]" />
  </div>
  
  <h3 className="text-base font-semibold text-white mb-2">
    {template.name}
  </h3>
  
  <p className="text-sm text-graphite-400 mb-4 flex-1">
    {template.description}
  </p>
  
  <div className="flex items-center justify-between text-xs">
    <span className="text-graphite-500">
      {itemCount} items
    </span>
    <ChevronRight className="w-4 h-4 text-graphite-500 group-hover:text-[#00E699]" />
  </div>
</TemplateCard>
```

### Editor "Auto" Badge

```tsx
<Badge
  variant="outline"
  className="border-dashed border-graphite-500/30 text-graphite-400"
>
  <Sparkles className="w-3 h-3 mr-1" />
  Auto
</Badge>
```

### Touch Targets (48–72px)

- Template cards: 72px min-height, full card clickable
- Block reorder arrows: 48px × 48px
- Send button: 56px height (primary CTA)
- Edit grid button: 48px min-height

---

## 11. Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Time walk → deliverable sent | < 3 minutes | Analytics on flow duration |
| Template selection rate | > 80% | % of reports using template vs. blank |
| Edit rate | 60–70% | % of auto reports with user edits (indicates engagement) |
| Send rate | > 90% | % of started reports that get sent (indicates quality) |
| Template repeat usage | > 60% | % users using same template 2+ times |

---

## 12. API Surface

```typescript
// POST /api/site-walk/deliverables/from-template
interface CreateFromTemplateRequest {
  walkId: string;
  templateId: TemplateId;
  previousWalkId?: string; // For progress reports
  customizations?: {
    title?: string;
    includeItems?: string[]; // Specific item IDs
    excludeItems?: string[];
  };
}

interface CreateFromTemplateResponse {
  deliverableId: string;
  previewUrl: string;
  editUrl: string;
  estimatedBlockCount: number;
  autoPopulatedBlocks: string[];
}

// GET /api/site-walk/templates
interface ListTemplatesResponse {
  templates: ReportTemplate[];
  recommendedForWalk: TemplateId[]; // Based on walk data analysis
}

// GET /api/site-walk/deliverables/:id/assemble-preview
// Returns assembled content without creating — for preview before commit
```

---

*Design locked: July 1, 2026*
