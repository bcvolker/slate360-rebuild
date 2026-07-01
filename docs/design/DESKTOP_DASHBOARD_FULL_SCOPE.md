# Slate360 Desktop Dashboard — Full Scope Specification
## Construction Documentation SaaS: Author, Manage, Deliver

**Context:** Desktop is the "author/manage" cockpit — phone does capture, desktop does heavy work  
**Design:** Graphite Glass — dark canvas `#0B0F15`, glass panels, one accent per surface, IBM Plex Mono labels  
**Constraint:** ~2–5% of target state currently exists — full overhaul required  

---

## 1. Dashboard IA & Widget Architecture

### Core Principle: Actionable, Not Vanity

**What construction professionals actually need to see:**

| Widget | Purpose | Data Source | Action |
|--------|---------|-------------|--------|
| **Active Projects** | Projects with recent activity | `projects` + `site_walk_sessions` + `twin_captures` | Open, capture, manage |
| **Items Needing Attention** | Inbox from Coordination Hub | `notifications` | Act, respond, delegate |
| **Recent Captures** | Walks/twins awaiting processing | `site_walk_sessions` + `twin_captures` | Review, submit, share |
| **Deliverables in Flight** | Draft → shared status | `site_walk_deliverables` | Edit, send, follow up |
| **Storage & Credits** | Usage, billing heads-up | `org_usage` + `billing` | Upgrade, manage |
| **Upcoming Milestones** | Calendar events this week | `calendar_events` | View, reschedule |
| **Recent Client Activity** | Views, comments, questions | `share_activity_log` | Respond |

### Dashboard Layout (1440px+)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  TOP BAR: Logo · App Switcher · ⌘K · Project Picker · Account                          │
├──────────────┬──────────────────────────────────────────────────┬───────────────────────┤
│              │                                                  │                       │
│  LEFT RAIL   │           CENTER: DASHBOARD GRID                 │  RIGHT CONTEXT      │
│  (72→220px)  │                                                  │  (320px, optional)  │
│              │  ┌────────────────────────────────────────────┐   │                       │
│  Navigation  │  │  ROW 1: Primary Actions                  │   │  Selected item      │
│              │  │  [New Walk] [New Twin] [New Deliverable] │   │  details + quick    │
│  · Home      │  └────────────────────────────────────────────┘   │  actions            │
│  · Projects  │                                                  │                       │
│  · Files     │  ┌──────────────────────┐ ┌──────────────────┐  │  OR: Global         │
│  · Twins     │  │  Active Projects     │ │  Needs Attention │  │      Calendar       │
│  · Walks     │  │  4 cards             │ │  6 inbox items   │  │      mini-view      │
│  · Calendar  │  │                      │ │                  │  │                       │
│  · Hub       │  └──────────────────────┘ └──────────────────┘  │                       │
│              │                                                  │                       │
│              │  ┌──────────────────────┐ ┌──────────────────┐  │                       │
│              │  │  Recent Captures     │ │  Deliverables    │  │                       │
│              │  │  (walks + twins)     │ │  in Flight       │  │                       │
│              │  │                      │ │                  │  │                       │
│              │  └──────────────────────┘ └──────────────────┘  │                       │
│              │                                                  │                       │
│              │  ┌────────────────────────────────────────────┐   │                       │
│              │  │  Storage & Credits Bar                     │   │                       │
│              │  │  [▓▓▓▓▓▓░░░  340GB / 500GB]  [42 credits]  │   │                       │
│              │  └────────────────────────────────────────────┘   │                       │
│              │                                                  │                       │
└──────────────┴──────────────────────────────────────────────────┴───────────────────────┘
```

### Widget Specifications

```tsx
// components/dashboard/widgets/ActiveProjectsWidget.tsx

interface ActiveProjectsWidgetProps {
  maxItems?: number;
  onProjectClick: (project: Project) => void;
  onNewProject: () => void;
}

export function ActiveProjectsWidget({ 
  maxItems = 4, 
  onProjectClick,
  onNewProject 
}: ActiveProjectsWidgetProps) {
  const { projects } = useActiveProjects({ limit: maxItems });
  
  return (
    <DashboardWidget 
      title="Active Projects"
      icon={<FolderKanban className="w-5 h-5" />}
      action={{ label: 'View all', href: '/app/projects' }}
    >
      <div className="grid grid-cols-2 gap-3">
        {projects.map(project => (
          <ProjectCard
            key={project.id}
            project={project}
            stats={{
              walks: project.walksCount,
              twins: project.twinsCount,
              lastActivity: project.lastActivityAt
            }}
            onClick={() => onProjectClick(project)}
            coverImage={project.coverImageUrl}
          />
        ))}
        
        {/* New Project placeholder */}
        <button
          onClick={onNewProject}
          className="flex flex-col items-center justify-center gap-3 p-6 rounded-xl border border-dashed border-white/[0.15] bg-white/[0.02] hover:bg-white/[0.04] hover:border-white/[0.25] transition-all min-h-[140px]"
        >
          <Plus className="w-8 h-8 text-graphite-500" />
          <span className="text-sm font-medium text-graphite-400">New Project</span>
        </button>
      </div>
    </DashboardWidget>
  );
}

// Card component
function ProjectCard({ project, stats, onClick, coverImage }: ProjectCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative flex flex-col overflow-hidden rounded-xl bg-graphite-800/50 border border-white/[0.06] hover:border-white/[0.12] transition-all text-left"
    >
      {/* Cover image or gradient */}
      <div className="h-20 relative overflow-hidden">
        {coverImage ? (
          <img 
            src={coverImage} 
            alt="" 
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-graphite-700 to-graphite-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-graphite-800/50 to-transparent" />
      </div>
      
      {/* Content */}
      <div className="p-3 flex-1 flex flex-col">
        <h3 className="font-medium text-white text-sm line-clamp-1">{project.name}</h3>
        <p className="text-xs text-graphite-400 mt-1">{project.location || 'No location'}</p>
        
        {/* Stats row */}
        <div className="flex items-center gap-3 mt-3 text-xs text-graphite-500">
          {stats.walks > 0 && (
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {stats.walks} walks
            </span>
          )}
          {stats.twins > 0 && (
            <span className="flex items-center gap-1">
              <Box className="w-3 h-3" />
              {stats.twins} twins
            </span>
          )}
        </div>
        
        {/* Last activity */}
        <p className="text-xs text-graphite-500 mt-2">
          {stats.lastActivity ? formatRelativeTime(stats.lastActivity) : 'No activity'}
        </p>
      </div>
    </button>
  );
}
```

```tsx
// components/dashboard/widgets/NeedsAttentionWidget.tsx

export function NeedsAttentionWidget() {
  const { notifications, markRead } = useInbox({ filter: 'unread', limit: 6 });
  const criticalCount = notifications.filter(n => n.priority === 'urgent' || n.priority === 'high').length;
  
  return (
    <DashboardWidget
      title={
        <span className="flex items-center gap-2">
          Needs Attention
          {criticalCount > 0 && (
            <Badge variant="destructive" className="text-xs">{criticalCount}</Badge>
          )}
        </span>
      }
      icon={<Bell className="w-5 h-5" />}
      action={{ label: 'Inbox', href: '/app/hub/inbox' }}
    >
      <div className="space-y-2">
        {notifications.map(notification => (
          <NotificationRow
            key={notification.id}
            notification={notification}
            onClick={() => {
              markRead(notification.id);
              router.push(notification.primary_action_url);
            }}
          />
        ))}
        
        {notifications.length === 0 && (
          <EmptyState
            icon={<CheckCircle className="w-8 h-8" />}
            title="All caught up"
            description="No items need your attention right now."
          />
        )}
      </div>
    </DashboardWidget>
  );
}
```

```tsx
// components/dashboard/widgets/RecentCapturesWidget.tsx

export function RecentCapturesWidget() {
  const { captures } = useRecentCaptures({ limit: 6 });
  
  return (
    <DashboardWidget
      title="Recent Captures"
      icon={<Video className="w-5 h-5" />}
      action={{ label: 'All captures', href: '/app/captures' }}
    >
      <div className="space-y-2">
        {captures.map(capture => (
          <CaptureRow
            key={capture.id}
            capture={capture}
            type={capture.type} // 'walk' | 'twin'
            status={capture.status} // 'draft' | 'uploading' | 'processing' | 'ready'
            onReview={() => router.push(`/app/${capture.type}s/${capture.id}/review`)}
            onSubmit={() => submitCapture(capture.id)}
          />
        ))}
      </div>
    </DashboardWidget>
  );
}

function CaptureRow({ capture, type, status, onReview, onSubmit }: CaptureRowProps) {
  const isReadyToSubmit = status === 'draft' || status === 'ready';
  
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.04] hover:border-white/[0.08] transition-colors">
      {/* Thumbnail or icon */}
      <div className="w-12 h-12 rounded-lg bg-graphite-800 flex items-center justify-center shrink-0">
        {type === 'walk' ? (
          <Camera className="w-5 h-5 text-graphite-500" />
        ) : (
          <Box className="w-5 h-5 text-blue-500" />
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">{capture.title}</p>
        <p className="text-xs text-graphite-400">
          {capture.projectName} · {formatRelativeTime(capture.createdAt)}
        </p>
      </div>
      
      {/* Status + Action */}
      <div className="flex items-center gap-2">
        <StatusBadge status={status} />
        
        {isReadyToSubmit && (
          <Button size="sm" variant="primary" onClick={onSubmit}>
            Submit
          </Button>
        )}
      </div>
    </div>
  );
}
```

---

## 2. Desktop Workspaces — Full Specification

### Workspace 1: Projects & Files (SlateDrop)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [Projects] [Files] [Team] [Settings]          [Search]    [+] New Project                │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PROJECTS LIST (Table/Card hybrid)                                                     │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ Filter: [All] [Active] [Completed] [Archived]      Sort: [Last Active ▼]         │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                  │  │
│  │  ▓  Oak Ridge Roof Replacement              12 walks  3 twins   [→]          │  │
│  │     3420 Industrial Blvd, Dallas, TX          Updated 2 hours ago               │  │
│  │                                                                                  │  │
│  │  ▓  Riverfront Condominiums Phase 2         8 walks   1 twin    [→]          │  │
│  │     1500 Riverfront Blvd, Austin, TX          Updated 1 day ago                 │  │
│  │                                                                                  │  │
│  │  ▓  Historic Courthouse Restoration         5 walks   0 twins   [→]          │  │
│  │     100 Courthouse Square, Fredericksburg     Updated 3 days ago                │  │
│  │                                                                                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘

PROJECT DETAIL (click project):

┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [← Projects]  Oak Ridge Roof Replacement              [Capture] [Share] [Settings]    │
├──────────────┬──────────────────────────────────────────────────┬───────────────────────┤
│              │                                                  │                       │
│  TABS        │           CONTENT AREA                           │  PROJECT CONTEXT      │
│              │                                                  │                       │
│  Overview    │  ┌────────────────────────────────────────────┐   │  Team Members (5)    │
│  Files ⬅    │  │  SLATEDROP EXPLORER                          │   │  ├ Sarah (Admin)     │
│  Walks       │  │                                              │   │  ├ Mike (Editor)      │
│  Twins       │  │  01_Project_Info/                            │   │  └ +3 more            │
│  Deliverables│  │  ├── Drawings/                               │   │                       │
│  Team        │  │  │   ├── Site_Plan_v2.pdf         [2.4 MB]   │   │  Upcoming:           │
│  Settings    │  │  │   └── Elevation_North.pdf      [1.8 MB]   │   │  • Site inspection   │
│              │  │  ├── Contracts/                               │   │    tomorrow, 9am    │
│              │  │  └── Permits/                                 │   │                       │
│              │  │                                              │   │  Storage:           │
│              │  │  02_Site_Walk/                               │   │  340 GB / 500 GB    │
│              │  │  ├── Photos/                                  │   │  [Manage]            │
│              │  │  ├── Walk_2024_06_28/                         │   │                       │
│              │  │  └── Deliverables/                            │   │                       │
│              │  │                                              │   │                       │
│              │  └────────────────────────────────────────────┘   │                       │
│              │                                                  │                       │
└──────────────┴──────────────────────────────────────────────────┴───────────────────────┘
```

**SlateDrop Explorer Component:**

```tsx
// components/slatedrop/SlateDropExplorer.tsx

export function SlateDropExplorer({ projectId }: { projectId: string }) {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFolder, setSelectedFolder] = useState<string>('root');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [previewItem, setPreviewItem] = useState<FileItem | null>(null);
  
  const { folders } = useProjectFolders(projectId);
  const { items } = useFolderItems(selectedFolder);
  
  return (
    <div className="flex h-full">
      {/* Left: Folder Tree */}
      <FolderTree
        folders={folders}
        selectedId={selectedFolder}
        onSelect={setSelectedFolder}
        className="w-56 border-r border-white/[0.06]"
      />
      
      {/* Center: Items Grid/List */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Breadcrumbs + Toolbar */}
        <ExplorerToolbar
          breadcrumbs={getBreadcrumbs(selectedFolder)}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          selectedCount={selectedItems.length}
          onDelete={() => deleteItems(selectedItems)}
          onShare={() => openShareDialog(selectedItems)}
          onUpload={() => openUploadDialog(selectedFolder)}
        />
        
        {/* Items */}
        {viewMode === 'grid' ? (
          <ItemGrid
            items={items}
            selectedIds={selectedItems}
            onSelectionChange={setSelectedItems}
            onDoubleClick={setPreviewItem}
            onContextMenu={(item, e) => showContextMenu(item, e)}
          />
        ) : (
          <ItemList
            items={items}
            columns={['name', 'size', 'modified', 'type']}
            selectedIds={selectedItems}
            onSelectionChange={setSelectedItems}
            onSort={(column) => handleSort(column)}
          />
        )}
      </div>
      
      {/* Right: Preview Pane */}
      <AnimatePresence>
        {previewItem && (
          <PreviewPane
            item={previewItem}
            onClose={() => setPreviewItem(null)}
            className="w-80 border-l border-white/[0.06]"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
```

### Workspace 2: Twin Editor (3D + 2D Plans)

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [Projects] [Twins] [Walks] [Files]                      [New Twin] [Help]              │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  TWIN EDITOR: Oak Ridge Roof — Twin #3                                                │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  [TAB: 3D VIEW] [TAB: 2D PLAN] [TAB: MEASUREMENTS] [TAB: EXPORT]               │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                  │  │
│  │  ┌────────────────────────────────────────────┐  ┌──────────────────────────────┐  │
│  │  │                                            │  │  TOOLS                       │  │
│  │  │   [3D SPLAT VIEWER]                        │  │                              │  │
│  │  │                                            │  │  Transform:                  │  │
│  │  │   • Orbit controls                         │  │  [Move] [Rotate] [Scale]     │  │
│  │  │   • Section planes (clip open)           │  │                              │  │
│  │  │   • Measurement annotations                │  │  Edit:                       │  │
│  │  │   • Floater removal brush                │  │  [Crop Box] [Section Cut]    │  │
│  │  │   • Annotation markers                   │  │  [Delete Points]             │  │
│  │  │                                            │  │                              │  │
│  │  │                                            │  │  Filters:                    │  │
│  │  │                                            │  │  [Color] [Intensity] [Class]│  │
│  │  └────────────────────────────────────────────┘  └──────────────────────────────┘  │
│  │                                                                                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  STATUS: Model ready · 2.4M splats · 45 MB · Last edited 2 hours ago by Sarah          │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**3D Splat Editor (SuperSplat Embedded):**

```tsx
// components/twin/SplatEditor.tsx

export function SplatEditor({ twinId }: { twinId: string }) {
  const [activeTool, setActiveTool] = useState<Tool>('navigate');
  const [sectionPlanes, setSectionPlanes] = useState<SectionPlane[]>([]);
  const [selectedPoints, setSelectedPoints] = useState<number[]>([]);
  const [editHistory, setEditHistory] = useState<EditAction[]>([]);
  
  const { splatUrl } = useTwinSplat(twinId);
  const { roomPlan } = useTwinRoomPlan(twinId);
  
  return (
    <div className="flex h-full">
      {/* Main Viewer */}
      <div className="flex-1 relative">
        <SuperSplatEmbed
          url={splatUrl}
          tools={{
            activeTool,
            sectionPlanes,
            onSectionPlaneAdd: (plane) => setSectionPlanes([...sectionPlanes, plane]),
            onSectionPlaneMove: (id, position) => updateSectionPlane(id, position),
            onPointSelection: setSelectedPoints,
            onEdit: (action) => {
              setEditHistory([...editHistory, action]);
              applyEdit(action);
            }
          }}
        />
        
        {/* Floating measurement overlay */}
        {roomPlan && (
          <MeasurementOverlay
            roomPlan={roomPlan}
            visible={activeTool === 'measure'}
            onMeasurementCreate={addMeasurement}
          />
        )}
      </div>
      
      {/* Right Tool Panel */}
      <div className="w-72 border-l border-white/[0.06] bg-graphite-canvas/50 flex flex-col">
        {/* Transform Tools */}
        <ToolGroup title="Transform">
          <ToolButton 
            icon={<Move3d />}
            label="Move"
            active={activeTool === 'move'}
            onClick={() => setActiveTool('move')}
          />
          <ToolButton 
            icon={<Rotate3d />}
            label="Rotate"
            active={activeTool === 'rotate'}
            onClick={() => setActiveTool('rotate')}
          />
          <ToolButton 
            icon={<Scale3d />}
            label="Scale"
            active={activeTool === 'scale'}
            onClick={() => setActiveTool('scale')}
          />
        </ToolGroup>
        
        {/* Edit Tools */}
        <ToolGroup title="Edit">
          <ToolButton 
            icon={<Crop />}
            label="Crop Box"
            active={activeTool === 'crop'}
            onClick={() => setActiveTool('crop')}
          />
          <ToolButton 
            icon={<Slice />}
            label="Section Cut"
            active={activeTool === 'section'}
            onClick={() => setActiveTool('section')}
          />
          <ToolButton 
            icon={<Eraser />}
            label="Remove Floaters"
            active={activeTool === 'select'}
            onClick={() => setActiveTool('select')}
          />
        </ToolGroup>
        
        {/* RoomPlan Overlay (if available) */}
        {roomPlan && (
          <ToolGroup title="Floor Plan">
            <Toggle 
              label="Show walls"
              checked={showWalls}
              onChange={setShowWalls}
            />
            <Toggle 
              label="Show measurements"
              checked={showMeasurements}
              onChange={setShowMeasurements}
            />
          </ToolGroup>
        )}
        
        {/* History */}
        <div className="flex-1 overflow-y-auto p-4">
          <h4 className="label-mono mb-3">Edit History</h4>
          <HistoryList 
            actions={editHistory}
            onUndo={(index) => undoTo(index)}
          />
        </div>
        
        {/* Actions */}
        <div className="p-4 border-t border-white/[0.06] space-y-2">
          <Button 
            variant="primary" 
            fullWidth
            onClick={saveChanges}
            disabled={editHistory.length === 0}
          >
            Save Changes
          </Button>
          <Button 
            variant="secondary" 
            fullWidth
            onClick={exportModel}
          >
            Export Model
          </Button>
        </div>
      </div>
    </div>
  );
}
```

**2D Plan Editor (Konva-based):**

```tsx
// components/twin/PlanEditor.tsx

export function PlanEditor({ twinId }: { twinId: string }) {
  const canvasRef = useRef<Konva.Stage>(null);
  const [scale, setScale] = useState(1);
  const [activeTool, setActiveTool] = useState<'select' | 'move-wall' | 'add-door' | 'measure'>('select');
  const [selectedWall, setSelectedWall] = useState<Wall | null>(null);
  
  const { roomPlan, updateWall, addOpening } = useRoomPlan(twinId);
  
  return (
    <div className="flex h-full">
      {/* Canvas */}
      <div className="flex-1 relative bg-graphite-950">
        <KonvaStage
          ref={canvasRef}
          width={canvasWidth}
          height={canvasHeight}
          scale={scale}
          onWheel={(e) => handleZoom(e, setScale)}
        >
          <Layer>
            {/* Grid */}
            <GridLines spacing={1 / scale} unit="meters" />
            
            {/* Walls */}
            {roomPlan.walls.map(wall => (
              <WallShape
                key={wall.id}
                wall={wall}
                selected={selectedWall?.id === wall.id}
                accuracyTier={wall.source === 'roomplan' ? 'measured' : 'estimated'}
                onClick={() => setSelectedWall(wall)}
                onDragEnd={(newP1, newP2) => updateWall(wall.id, newP1, newP2)}
                draggable={activeTool === 'move-wall'}
              />
            ))}
            
            {/* Openings */}
            {roomPlan.openings.map(opening => (
              <OpeningShape
                key={opening.id}
                opening={opening}
                onClick={() => editOpening(opening)}
              />
            ))}
            
            {/* Rooms */}
            {roomPlan.rooms.map(room => (
              <RoomLabel
                key={room.id}
                room={room}
                area={room.floorArea}
                position={room.centroid}
              />
            ))}
            
            {/* Measurements */}
            {measurements.map(m => (
              <MeasurementLabel
                key={m.id}
                value={m.value}
                unit={m.unit}
                position={m.position}
                angle={m.angle}
              />
            ))}
          </Layer>
        </KonvaStage>
        
        {/* Zoom controls */}
        <ZoomControls 
          scale={scale}
          onZoomIn={() => setScale(s => s * 1.2)}
          onZoomOut={() => setScale(s => s / 1.2)}
          onReset={() => setScale(1)}
          className="absolute bottom-4 left-4"
        />
      </div>
      
      {/* Right: Properties & Tools */}
      <div className="w-80 border-l border-white/[0.06] bg-graphite-canvas/50">
        {selectedWall ? (
          <WallPropertiesPanel
            wall={selectedWall}
            onUpdate={updateWall}
            onAddOpening={(type, position) => addOpening(selectedWall.id, type, position)}
          />
        ) : (
          <PlanToolsPanel
            activeTool={activeTool}
            onToolChange={setActiveTool}
            measurements={calculateMeasurements(roomPlan)}
          />
        )}
      </div>
    </div>
  );
}
```

### Workspace 3: Deliverable Studio

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [← Deliverables]  Site Walk Report — Oak Ridge Roof         [Preview] [Share] [Export]  │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  DELIVERABLE STUDIO — Block-based editor                                               │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  [Add Block ▼]  Brand: [Slate360 ▼]  Theme: [Dark ▼]  Layout: [Standard ▼]       │  │
│  ├──────────────────────────────────────────────────────────────────────────────────┤  │
│  │                                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  BLOCK: Cover Page                                                          │ │  │
│  │  │  Title: Oak Ridge Roof Replacement — Phase 1 Documentation               │ │  │
│  │  │  Subtitle: Site walk conducted June 28, 2024                               │ │  │
│  │  │  Prepared by: Brian Volker, Slate360                                         │ │  │
│  │  │  [Edit] [Move ▲ ▼] [Delete]                                                  │ │  │
│  │  └────────────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  BLOCK: Photo Grid (6 items)                                              │ │  │
│  │  │  ┌────────┐ ┌────────┐ ┌────────┐                                          │ │  │
│  │  │  │ [img]  │ │ [img]  │ │ [img]  │  [+ Add photos]                           │ │  │
│  │  │  │ Stop 1 │ │ Stop 2 │ │ Stop 3 │                                          │ │  │
│  │  │  └────────┘ └────────┘ └────────┘                                          │ │  │
│  │  │  [Edit layout] [Replace photos] [Add captions]                             │ │  │
│  │  └────────────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  BLOCK: Before/After Comparison                                            │ │  │
│  │  │  Walk: June 28, 2024 ← → Walk: June 14, 2024                             │ │  │
│  │  │  [slider comparison] or [side-by-side]                                      │ │  │
│  │  │  [Select walks] [Configure]                                                 │ │  │
│  │  └────────────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  BLOCK: 360° Viewer                                                        │ │  │
│  │  │  [Embedded splat viewer — Stop 4]                                          │ │  │
│  │  │  [Configure view position] [Add annotation]                               │ │  │
│  │  └────────────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                                  │  │
│  │  ┌────────────────────────────────────────────────────────────────────────────┐ │  │
│  │  │  BLOCK: Notes & Voice Memos (4 items)                                      │ │  │
│  │  │  ▶ Voice memo 0:34 — "The north elevation shows..."                        │ │  │
│  │  │  • Text note: Foundation inspection completed                             │ │  │
│  │  └────────────────────────────────────────────────────────────────────────────┘ │  │
│  │                                                                                  │  │
│  │  [+ Add Block] — [Photo Grid] [Before/After] [360 Viewer] [Plan Overlay]       │  │
│  │                [Text] [Metrics Table] [Map] [File Download]                    │  │
│  │                                                                                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

**Deliverable Block System:**

```tsx
// types/deliverable.ts

type DeliverableBlock = 
  | CoverBlock
  | PhotoGridBlock
  | BeforeAfterBlock
  | Viewer360Block
  | PlanOverlayBlock
  | NotesBlock
  | TextBlock
  | MetricsBlock
  | MapBlock
  | FileDownloadBlock;

interface CoverBlock {
  type: 'cover';
  title: string;
  subtitle?: string;
  preparedBy: string;
  date: string;
  projectId: string;
  coverImage?: string;
}

interface PhotoGridBlock {
  type: 'photo_grid';
  layout: '2x2' | '3x2' | '1x3' | 'auto';
  items: {
    stopId: string;
    photoId: string;
    caption?: string;
    highlight?: boolean;
  }[];
  showMetadata: boolean;
}

interface BeforeAfterBlock {
  type: 'before_after';
  walk1Id: string;
  walk2Id: string;
  stopMatching: 'auto' | 'manual';
  matchedStops: {
    stop1Id: string;
    stop2Id: string;
    similarity: number;
  }[];
  viewerType: 'slider' | 'side-by-side';
}

interface Viewer360Block {
  type: 'viewer_360';
  twinId?: string;
  splatUrl?: string;
  initialPosition?: { x: number; y: number; z: number };
  annotations?: Annotation[];
}

// ... additional block types

// components/deliverables/DeliverableEditor.tsx

export function DeliverableEditor({ deliverableId }: { deliverableId: string }) {
  const { blocks, reorderBlocks, addBlock, updateBlock, deleteBlock } = useDeliverable(deliverableId);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState(false);
  
  return (
    <div className="flex h-full">
      {/* Editor Canvas */}
      <div className="flex-1 overflow-y-auto p-8 bg-graphite-950">
        <div className="max-w-3xl mx-auto space-y-4">
          {blocks.map((block, index) => (
            <BlockEditor
              key={block.id}
              block={block}
              isSelected={selectedBlockId === block.id}
              onSelect={() => setSelectedBlockId(block.id)}
              onMoveUp={() => reorderBlocks(index, index - 1)}
              onMoveDown={() => reorderBlocks(index, index + 1)}
              onDelete={() => deleteBlock(block.id)}
              onUpdate={(updates) => updateBlock(block.id, updates)}
            />
          ))}
          
          {/* Add Block */}
          <AddBlockMenu onSelect={addBlock} />
        </div>
      </div>
      
      {/* Right: Block Properties / Preview */}
      <div className="w-80 border-l border-white/[0.06] bg-graphite-canvas/50">
        {selectedBlockId ? (
          <BlockPropertiesPanel
            block={blocks.find(b => b.id === selectedBlockId)!}
            onUpdate={(updates) => updateBlock(selectedBlockId, updates)}
          />
        ) : (
          <DeliverablePropertiesPanel
            deliverableId={deliverableId}
            onPreview={() => setPreviewMode(true)}
            onShare={() => openShareDialog(deliverableId)}
          />
        )}
      </div>
      
      {/* Preview Modal */}
      {previewMode && (
        <PreviewModal
          deliverableId={deliverableId}
          onClose={() => setPreviewMode(false)}
        />
      )}
    </div>
  );
}
```

### Workspace 4: Coordination Hub Cockpit

See comprehensive specification in `COORDINATION_HUB_ARCHITECTURE.md`. Key desktop additions:

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [Inbox] [Messages] [Shares] [Calendar]                    [New Message] [Settings]      │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  COORDINATION HUB — Inbox (primary view)                                               │
│                                                                                         │
│  ┌──────────────┬──────────────────────────────────────────────────┬───────────────┐  │
│  │              │                                                  │               │  │
│  │  FILTERS     │  NOTIFICATION LIST                               │  THREAD/      │  │
│  │              │                                                  │  DETAIL PANEL │  │
│  │  All         │  ┌────────────────────────────────────────────┐   │               │  │
│  │  ● 12       │  │ 🔴 Sarah Chen commented on Site Walk       │   │  [Selected    │  │
│  │             │  │    Report — "Can you clarify..."           │   │   item or     │  │
│  │  Comments   │  │    2 hours ago · Deliverable              │   │   empty]      │  │
│  │  ● 3        │  └────────────────────────────────────────────┘   │               │  │
│  │             │                                                  │               │  │
│  │  Uploads    │  ┌────────────────────────────────────────────┐   │               │  │
│  │  ● 2        │  │ 📎 Subcontractor uploaded 3 files to       │   │               │  │
│  │             │  │    RFIs folder — Auto-routed               │   │               │  │
│  │  Alerts     │  │    4 hours ago · Project: Oak Ridge         │   │               │  │
│  │  ● 1        │  └────────────────────────────────────────────┘   │               │  │
│  │             │                                                  │               │  │
│  │  Calendar   │  ┌────────────────────────────────────────────┐   │               │  │
│  │  ● 5        │  │ 📅 Site inspection due tomorrow             │   │               │  │
│  │             │  │    9:00 AM — Set reminder?                 │   │               │  │
│  │             │  └────────────────────────────────────────────┘   │               │  │
│  │             │                                                  │               │  │
│  └──────────────┴──────────────────────────────────────────────────┴───────────────┘  │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Phased Build Plan

### Phase 0: Foundation (Weeks 1–2)
- Database schema (notifications, messages, shares)
- RLS policies
- Resend/SMS provider setup
- Trigger.dev event bus
- Supabase Realtime subscriptions

### Phase 1: Dashboard Core (Weeks 3–4)
- Dashboard shell (top bar, left rail, widget grid)
- Active Projects widget
- Needs Attention widget
- Storage/Credits bar
- Navigation between workspaces

### Phase 2: Projects & SlateDrop (Weeks 5–6)
- Projects list/table view
- Project detail shell
- SlateDrop folder tree
- File grid/list with preview
- Upload with auto-routing
- Share dialog (folder/file)

### Phase 3: Coordination Hub (Weeks 7–8)
- Inbox UI (filters, list, thread panel)
- Realtime notifications
- Recipient picker with groups
- Message composer (email/SMS)
- Calendar month/agenda views

### Phase 4: Twin Editor (Weeks 9–10)
- SuperSplat embed integration
- 3D viewer workspace
- Basic tools (crop, section, delete)
- 2D plan editor (Konva setup)
- Wall/room editing

### Phase 5: Deliverable Studio (Weeks 11–12)
- Block-based editor shell
- Cover, Photo Grid, Text blocks
- Before/After block
- 360 Viewer block
- Preview & share flow

### Phase 6: Polish & Integration (Weeks 13–14)
- Cross-workspace navigation
- Search (⌘K)
- Keyboard shortcuts
- Mobile responsive
- Performance optimization

---

## 4. OSS Accelerators

| Component | Library | Purpose | Integration |
|-----------|---------|---------|-------------|
| **File Browser** | `react-folder-tree` or custom | Folder tree UI | SlateDrop left rail |
| **2D Canvas** | `react-konva` | Plan editing, annotations | Twin plan editor |
| **Splat Viewer** | `supersplat` (PlayCanvas) | 3D Gaussian splat editing | Twin 3D editor |
| **Block Editor** | `react-dnd` + custom | Deliverable block reordering | Studio |
| **Calendar** | `react-big-calendar` or `fullcalendar` | Month/week/agenda views | Hub |
| **Docking** | `dockview` | Optional panel docking | Advanced users |
| **PDF Export** | `react-pdf` or `puppeteer` | Deliverable PDF generation | Studio export |
| **Charts** | `recharts` | Usage, metrics visualizations | Dashboard |
| **Virtualization** | `react-window` | Long lists (files, inbox) | Performance |
| **Search** | `cmdk` | ⌘K command palette | Global |

---

*Specification locked: June 30, 2026*