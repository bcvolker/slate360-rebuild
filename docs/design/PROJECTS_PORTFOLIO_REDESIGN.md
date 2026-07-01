# Projects Portfolio Overview — Real Construction PM Dashboard
## From Vanity KPIs to Actionable Portfolio Management

**Current State:** Fake RFI/Submittal/Budget/Completed/On-Hold cards with "Phase 1 snapshot only" disclaimer, multi-hue palette, no real workflow.

**Target State:** Real construction portfolio home showing what contractors actually need to track across multiple active projects.

---

## 1. What Contractors Actually Need to See

### Primary Concerns (Ranked)

| Priority | Concern | Data Source | Action |
|----------|---------|-------------|--------|
| 1 | **What's happening TODAY** | `calendar_events` today + `notifications` unread | Open project, respond |
| 2 | **Which projects need attention** | `projects.status` + `open_items_count` + `last_activity_at` | Drill into at-risk |
| 3 | **Captures/deliverables in flight** | `site_walk_sessions` + `twin_captures` + `deliverables.status` | Complete, submit, share |
| 4 | **Storage/credits runway** | `org_usage` + `billing` | Upgrade, manage |
| 5 | **Team/contractor activity** | `project_contacts` + recent `share_activity_log` | Follow up |

### Metrics That DON'T Matter (Eliminate)

- ❌ "Budget variance" — not tracked in Slate360
- ❌ "RFI response time" — requires external PM tool integration
- ❌ "Safety incidents" — not a capture tool, would be manual entry
- ❌ "Completion percentage" — arbitrary without detailed schedules

---

## 2. Data Model Additions

```sql
-- ============================================
-- PROJECT PORTFOLIO ROLLUPS (Materialized View)
-- ============================================

CREATE MATERIALIZED VIEW project_portfolio_stats AS
SELECT 
    p.id as project_id,
    p.org_id,
    p.name,
    p.status,
    p.created_at,
    p.updated_at,
    
    -- Last activity (any table touch)
    GREATEST(
        p.updated_at,
        (SELECT MAX(created_at) FROM site_walk_sessions WHERE project_id = p.id),
        (SELECT MAX(created_at) FROM twin_captures WHERE project_id = p.id),
        (SELECT MAX(created_at) FROM site_walk_deliverables WHERE project_id = p.id),
        (SELECT MAX(created_at) FROM calendar_events WHERE project_id = p.id)
    ) as last_activity_at,
    
    -- Capture counts
    (SELECT COUNT(*) FROM site_walk_sessions WHERE project_id = p.id AND status != 'archived') as active_walks,
    (SELECT COUNT(*) FROM site_walk_sessions WHERE project_id = p.id AND status = 'draft') as draft_walks,
    (SELECT COUNT(*) FROM twin_captures WHERE project_id = p.id AND status IN ('processing', 'uploading')) as processing_twins,
    (SELECT COUNT(*) FROM twin_captures WHERE project_id = p.id AND status = 'ready') as ready_twins,
    
    -- Deliverable status
    (SELECT COUNT(*) FROM site_walk_deliverables WHERE project_id = p.id AND status = 'draft') as draft_deliverables,
    (SELECT COUNT(*) FROM site_walk_deliverables WHERE project_id = p.id AND status = 'shared') as shared_deliverables,
    
    -- Today's events
    (SELECT COUNT(*) FROM calendar_events 
     WHERE project_id = p.id 
     AND DATE(start_at AT TIME ZONE 'UTC') = CURRENT_DATE
     AND status != 'cancelled') as today_events,
    
    -- Open items (synthetic: captures needing submit + deliverables needing share)
    ((SELECT COUNT(*) FROM site_walk_sessions WHERE project_id = p.id AND status = 'draft') +
     (SELECT COUNT(*) FROM twin_captures WHERE project_id = p.id AND status = 'ready' AND NOT shared) +
     (SELECT COUNT(*) FROM site_walk_deliverables WHERE project_id = p.id AND status = 'draft')
    ) as open_items_count,
    
    -- Storage
    (SELECT COALESCE(SUM(size_bytes), 0) FROM unified_files 
     WHERE project_id = p.id) as storage_bytes

FROM projects p
WHERE p.deleted_at IS NULL;

CREATE INDEX idx_portfolio_stats_org ON project_portfolio_stats(org_id, last_activity_at DESC);
CREATE INDEX idx_portfolio_stats_attention ON project_portfolio_stats(org_id, open_items_count DESC) 
WHERE open_items_count > 0;

-- Refresh strategy: Every 5 minutes or on significant events
CREATE OR REPLACE FUNCTION refresh_portfolio_stats()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY project_portfolio_stats;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- ORG-LEVEL ROLLUPS (for portfolio header)
-- ============================================

CREATE MATERIALIZED VIEW org_portfolio_summary AS
SELECT 
    org_id,
    COUNT(*) as total_projects,
    COUNT(*) FILTER (WHERE status = 'active') as active_projects,
    COUNT(*) FILTER (WHERE open_items_count > 0) as projects_needing_attention,
    SUM(active_walks) as total_active_walks,
    SUM(processing_twins) as twins_processing,
    SUM(ready_twins) as twins_ready,
    SUM(draft_deliverables) as deliverables_incomplete,
    SUM(shared_deliverables) as deliverables_shared,
    SUM(storage_bytes) as total_storage_bytes
FROM project_portfolio_stats
GROUP BY org_id;

CREATE INDEX idx_org_summary ON org_portfolio_summary(org_id);
```

---

## 3. Redesigned Layout

```
┌─────────────────────────────────────────────────────────────────────────────────────────┐
│  [Logo]  Projects                                    [Search]  [+] New Project  [👤]   │
├─────────────────────────────────────────────────────────────────────────────────────────┤
│                                                                                         │
│  PORTFOLIO SUMMARY (collapsible, sticky)                                              │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  Active Projects         Walks in Flight        Twins Ready      Deliverables │  │
│  │  ┌─────┐                ┌─────┐                ┌─────┐         ┌─────────┐  │  │
│  │  │  12 │                │  5  │                │  3  │         │ 2 / 8   │  │  │
│  │  │     │                │draft│                │ready│         │ incomplete │  │
│  │  └─────┘                └─────┘                └─────┘         └─────────┘  │  │
│  │       3 need attention       2 uploading          1 processing                    │  │
│  │                                                                                  │  │
│  │  Storage: ▓▓▓▓▓▓▓▓░░ 340 GB / 500 GB    Credits: 42    [Manage]                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  TODAY ─────────────────────────────────────────────────────────────────────────        │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔴 9:00 AM   Site Inspection — Oak Ridge Roof                    [View project →] │  │
│  │ 🟡 2:00 PM   Deliverable Review — Riverfront Condos              [Open draft →]  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  PROJECTS ─────────────────────────────────────────────────────────────────────       │
│  [Active ▼] [Sort: Last Activity ▼] [List/Grid ▼]                                      │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │ 🔴 Needs attention                                                                │  │
│  │                                                                                  │  │
│  │  ▓ Oak Ridge Roof Replacement          [Resume walk] [Submit twin] [Share →]  │  │
│  │    🟡 2 drafts awaiting submission    🔵 1 twin ready to share                    │  │
│  │    Last activity: 2 hours ago · 4 team members                                    │  │
│  │                                                                                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  ▓ Riverfront Condominiums Phase 2            [Capture] [View deliverables →]    │  │
│  │    🟢 1 walk shared yesterday                                                   │  │
│  │    Last activity: 14 hours ago · 6 team members                                  │  │
│  │                                                                                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  ┌──────────────────────────────────────────────────────────────────────────────────┐  │
│  │  ▓ Historic Courthouse Restoration              [Start capture]                │  │
│  │    ⚪ No recent activity                                                         │  │
│  │    Last activity: 3 days ago · 2 team members                                      │  │
│  │                                                                                  │  │
│  └──────────────────────────────────────────────────────────────────────────────────┘  │
│                                                                                         │
│  + [New Project] placeholder card                                                       │
│                                                                                         │
└─────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Component Implementation

```tsx
// components/projects/ProjectsPortfolioOverview.tsx
'use client';

import { useState } from 'react';
import { useOrgPortfolioStats } from '@/hooks/useOrgPortfolioStats';
import { useProjectPortfolioItems } from '@/hooks/useProjectPortfolioItems';
import { useTodayCalendarEvents } from '@/hooks/useTodayCalendarEvents';
import { cn } from '@/lib/utils';
import { 
  Plus, Search, AlertCircle, Camera, Box, 
  Send, Clock, Users, ChevronRight, MoreHorizontal 
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ProgressBar } from '@/components/ui/ProgressBar';
import { Link } from 'next/link';

type ProjectFilter = 'all' | 'active' | 'attention' | 'recent';
type ViewMode = 'grid' | 'list';
type SortBy = 'activity' | 'name' | 'items';

export function ProjectsPortfolioOverview() {
  const [filter, setFilter] = useState<ProjectFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [sortBy, setSortBy] = useState<SortBy>('activity');
  const [showSummary, setShowSummary] = useState(true);
  
  const { summary, isLoading: summaryLoading } = useOrgPortfolioStats();
  const { projects, isLoading: projectsLoading } = useProjectPortfolioItems({ 
    filter, 
    sortBy,
    limit: 20 
  });
  const { todayEvents } = useTodayCalendarEvents();
  
  const hasAttentionProjects = summary?.projects_needing_attention > 0;
  
  return (
    <div className="min-h-screen bg-graphite-canvas">
      {/* Header */}
      <PortfolioHeader 
        onNewProject={() => router.push('/app/projects/new')}
      />
      
      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        
        {/* Summary Bar */}
        {showSummary && summary && (
          <PortfolioSummaryBar 
            summary={summary}
            onDismiss={() => setShowSummary(false)}
          />
        )}
        
        {/* Today's Agenda */}
        {todayEvents.length > 0 && (
          <TodaySection events={todayEvents} />
        )}
        
        {/* Projects List */}
        <section>
          <ProjectsToolbar
            filter={filter}
            onFilterChange={setFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            count={projects.length}
          />
          
          {hasAttentionProjects && filter === 'all' && (
            <AttentionGroup 
              projects={projects.filter(p => p.open_items_count > 0)}
            />
          )}
          
          <ProjectsGrid 
            projects={projects.filter(p => p.open_items_count === 0 || filter !== 'all')}
            viewMode={viewMode}
          />
          
          <NewProjectCard />
        </section>
        
      </main>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// SUMMARY BAR (Real metrics, not vanity)
// ───────────────────────────────────────────────────────────────────────────────

function PortfolioSummaryBar({ summary, onDismiss }: SummaryBarProps) {
  const storagePercent = (summary.total_storage_bytes / (500 * 1024 * 1024 * 1024)) * 100;
  
  return (
    <div className="glass-panel p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">Portfolio Summary</h2>
        <Button variant="ghost" size="sm" onClick={onDismiss}>
          Hide
        </Button>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* Active Projects */}
        <SummaryStat
          value={summary.active_projects}
          label="Active Projects"
          subtext={summary.projects_needing_attention > 0 
            ? `${summary.projects_needing_attention} need attention` 
            : 'All current'
          }
          variant={summary.projects_needing_attention > 0 ? 'warning' : 'default'}
          icon={<FolderKanban className="w-5 h-5" />}
        />
        
        {/* Walks in Flight */}
        <SummaryStat
          value={summary.total_active_walks}
          label="Walks"
          subtext={`${summary.draft_walks} drafts to submit`}
          variant={summary.draft_walks > 0 ? 'action' : 'default'}
          icon={<Camera className="w-5 h-5" />}
        />
        
        {/* Twins Ready */}
        <SummaryStat
          value={summary.twins_ready}
          label="Twins Ready"
          subtext={summary.twins_processing > 0 
            ? `${summary.twins_processing} processing` 
            : 'Ready to share'
          }
          variant={summary.twins_ready > 0 ? 'success' : 'default'}
          icon={<Box className="w-5 h-5" />}
        />
        
        {/* Deliverables */}
        <SummaryStat
          value={summary.deliverables_incomplete}
          label="Draft Deliverables"
          subtext={`${summary.deliverables_shared} already shared`}
          variant={summary.deliverables_incomplete > 0 ? 'action' : 'default'}
          icon={<Send className="w-5 h-5" />}
        />
      </div>
      
      {/* Storage & Credits */}
      <div className="flex items-center gap-6 pt-2 border-t border-white/[0.06]">
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="text-graphite-400">Storage</span>
            <span className="text-graphite-300">
              {formatBytes(summary.total_storage_bytes)} / 500 GB
            </span>
          </div>
          <ProgressBar 
            value={storagePercent} 
            variant={storagePercent > 90 ? 'danger' : storagePercent > 75 ? 'warning' : 'default'}
          />
        </div>
        
        <div className="flex items-center gap-3">
          <span className="text-sm text-graphite-300">
            <span className="text-white font-medium">{summary.credits}</span> credits
          </span>
          <Button variant="secondary" size="sm">
            Manage
          </Button>
        </div>
      </div>
    </div>
  );
}

function SummaryStat({ value, label, subtext, variant, icon }: SummaryStatProps) {
  const variantStyles = {
    default: 'border-white/[0.06]',
    warning: 'border-amber-500/30 bg-amber-500/5',
    action: 'border-[#00E699]/30 bg-[#00E699]/5',
    success: 'border-[#3D8EFF]/30 bg-[#3D8EFF]/5'
  };
  
  return (
    <div className={cn(
      "p-4 rounded-xl border bg-white/[0.02]",
      variantStyles[variant]
    )}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-2xl font-bold text-white">{value}</p>
          <p className="text-sm text-graphite-400 mt-0.5">{label}</p>
        </div>
        <div className={cn(
          "text-graphite-500",
          variant === 'warning' && 'text-amber-500',
          variant === 'action' && 'text-[#00E699]',
          variant === 'success' && 'text-[#3D8EFF]'
        )}>
          {icon}
        </div>
      </div>
      <p className={cn(
        "text-xs mt-2",
        variant === 'warning' ? 'text-amber-400' : 'text-graphite-500'
      )}>
        {subtext}
      </p>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// TODAY SECTION (What needs action today)
// ───────────────────────────────────────────────────────────────────────────────

function TodaySection({ events }: TodaySectionProps) {
  return (
    <section>
      <h2 className="label-mono text-graphite-500 mb-3">TODAY</h2>
      <div className="glass-panel divide-y divide-white/[0.06]">
        {events.map(event => (
          <div 
            key={event.id}
            className="flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-lg flex items-center justify-center",
                event.priority === 'high' ? 'bg-red-500/10 text-red-500' : 'bg-graphite-800 text-graphite-400'
              )}>
                {getEventIcon(event.type)}
              </div>
              <div>
                <p className="font-medium text-white">{event.title}</p>
                <p className="text-sm text-graphite-400">
                  {formatTime(event.startAt)} · {event.projectName}
                </p>
              </div>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href={`/app/projects/${event.projectId}/calendar?event=${event.id}`}>
                View project <ChevronRight className="w-4 h-4 ml-1" />
              </Link>
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// ATTENTION GROUP (Projects needing action)
// ───────────────────────────────────────────────────────────────────────────────

function AttentionGroup({ projects }: AttentionGroupProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-500" />
        <h3 className="text-sm font-semibold text-amber-400">
          Needs Attention ({projects.length})
        </h3>
      </div>
      <div className="space-y-3">
        {projects.map(project => (
          <AttentionProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  );
}

function AttentionProjectCard({ project }: { project: PortfolioProject }) {
  const quickActions = [];
  
  if (project.draft_walks > 0) {
    quickActions.push({
      label: `Submit ${project.draft_walks} walk${project.draft_walks > 1 ? 's' : ''}`,
      href: `/app/projects/${project.id}/walks?filter=draft`,
      variant: 'primary' as const,
      icon: <Camera className="w-4 h-4" />
    });
  }
  
  if (project.ready_twins > 0) {
    quickActions.push({
      label: `Share ${project.ready_twins} twin${project.ready_twins > 1 ? 's' : ''}`,
      href: `/app/projects/${project.id}/twins?filter=ready`,
      variant: 'secondary' as const,
      icon: <Box className="w-4 h-4" />
    });
  }
  
  if (project.draft_deliverables > 0) {
    quickActions.push({
      label: `Complete deliverable`,
      href: `/app/projects/${project.id}/deliverables?filter=draft`,
      variant: 'ghost' as const,
      icon: <Send className="w-4 h-4" />
    });
  }
  
  return (
    <div className="glass-panel p-4 border-l-2 border-l-amber-500">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          {project.coverImage ? (
            <img 
              src={project.coverImage} 
              alt="" 
              className="w-12 h-12 rounded-lg object-cover"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-graphite-800 flex items-center justify-center">
              <FolderKanban className="w-5 h-5 text-graphite-500" />
            </div>
          )}
          <div>
            <h4 className="font-medium text-white">{project.name}</h4>
            <p className="text-sm text-graphite-400">
              {project.location || 'No location set'} · {formatRelativeTime(project.last_activity_at)}
            </p>
          </div>
        </div>
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/app/projects/${project.id}`}>
            Open <ChevronRight className="w-4 h-4 ml-1" />
          </Link>
        </Button>
      </div>
      
      {/* Status chips */}
      <div className="flex flex-wrap gap-2 mt-3">
        {project.draft_walks > 0 && (
          <Badge variant="warning" size="sm">
            <Camera className="w-3 h-3 mr-1" />
            {project.draft_walks} draft walk{project.draft_walks > 1 ? 's' : ''}
          </Badge>
        )}
        {project.ready_twins > 0 && (
          <Badge variant="success" size="sm">
            <Box className="w-3 h-3 mr-1" />
            {project.ready_twins} twin{project.ready_twins > 1 ? 's' : ''} ready
          </Badge>
        )}
        {project.draft_deliverables > 0 && (
          <Badge variant="default" size="sm">
            <Send className="w-3 h-3 mr-1" />
            {project.draft_deliverables} incomplete deliverable{project.draft_deliverables > 1 ? 's' : ''}
          </Badge>
        )}
      </div>
      
      {/* Quick actions */}
      {quickActions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-4">
          {quickActions.slice(0, 2).map((action, i) => (
            <Button key={i} variant={action.variant} size="sm" asChild>
              <Link href={action.href}>
                {action.icon}
                <span className="ml-2">{action.label}</span>
              </Link>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// PROJECT CARDS (Standard projects)
// ───────────────────────────────────────────────────────────────────────────────

function ProjectsGrid({ projects, viewMode }: ProjectsGridProps) {
  if (projects.length === 0) {
    return (
      <EmptyState
        icon={<FolderKanban className="w-12 h-12" />}
        title="No projects found"
        description="Create your first project to get started with site documentation."
        action={<Button>Create Project</Button>}
      />
    );
  }
  
  return (
    <div className={cn(
      viewMode === 'grid' 
        ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        : "space-y-3"
    )}>
      {projects.map(project => (
        <ProjectCard 
          key={project.id} 
          project={project} 
          viewMode={viewMode}
        />
      ))}
    </div>
  );
}

function ProjectCard({ project, viewMode }: ProjectCardProps) {
  const gridContent = (
    <>
      {/* Cover image or gradient */}
      <div className="h-32 relative overflow-hidden">
        {project.coverImage ? (
          <img 
            src={project.coverImage} 
            alt="" 
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-graphite-700 to-graphite-800" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-graphite-900 to-transparent" />
        
        {/* Status badge */}
        {project.today_events > 0 && (
          <Badge 
            variant="primary" 
            size="sm"
            className="absolute top-3 right-3"
          >
            {project.today_events} today
          </Badge>
        )}
      </div>
      
      {/* Content */}
      <div className="p-4">
        <h3 className="font-medium text-white truncate">{project.name}</h3>
        <p className="text-sm text-graphite-400 mt-1 truncate">
          {project.location || 'No location'}
        </p>
        
        {/* Activity summary */}
        <div className="flex items-center gap-3 mt-3 text-xs text-graphite-500">
          {project.active_walks > 0 && (
            <span className="flex items-center gap-1">
              <Camera className="w-3 h-3" />
              {project.active_walks} walk{project.active_walks > 1 ? 's' : ''}
            </span>
          )}
          {project.ready_twins > 0 && (
            <span className="flex items-center gap-1">
              <Box className="w-3 h-3" />
              {project.ready_twins} twin{project.ready_twins > 1 ? 's' : ''}
            </span>
          )}
          {project.shared_deliverables > 0 && (
            <span className="flex items-center gap-1">
              <Send className="w-3 h-3" />
              {project.shared_deliverables} shared
            </span>
          )}
        </div>
        
        {/* Last activity */}
        <p className="text-xs text-graphite-500 mt-3">
          <Clock className="w-3 h-3 inline mr-1" />
          {formatRelativeTime(project.last_activity_at)}
        </p>
      </div>
    </>
  );
  
  const listContent = (
    <div className="flex items-center gap-4 p-4">
      {project.coverImage ? (
        <img 
          src={project.coverImage} 
          alt="" 
          className="w-16 h-16 rounded-lg object-cover shrink-0"
        />
      ) : (
        <div className="w-16 h-16 rounded-lg bg-graphite-800 flex items-center justify-center shrink-0">
          <FolderKanban className="w-6 h-6 text-graphite-500" />
        </div>
      )}
      
      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-white">{project.name}</h3>
        <p className="text-sm text-graphite-400">
          {project.location || 'No location'} · Active
        </p>
        
        <div className="flex items-center gap-4 mt-2 text-xs text-graphite-500">
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatRelativeTime(project.last_activity_at)}
          </span>
          {project.team_member_count > 0 && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {project.team_member_count} members
            </span>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-2 shrink-0">
        {project.draft_walks > 0 && (
          <Badge variant="warning" size="sm">{project.draft_walks} drafts</Badge>
        )}
        <Button variant="ghost" size="sm">
          Open <ChevronRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </div>
  );
  
  return (
    <Link href={`/app/projects/${project.id}`}>
      <div className={cn(
        "glass-panel overflow-hidden hover:border-white/[0.12] transition-colors cursor-pointer group",
        viewMode === 'grid' ? '' : ''
      )}>
        {viewMode === 'grid' ? gridContent : listContent}
      </div>
    </Link>
  );
}

// ───────────────────────────────────────────────────────────────────────────────
// NEW PROJECT CARD (Placeholder)
// ───────────────────────────────────────────────────────────────────────────────

function NewProjectCard() {
  return (
    <button
      onClick={() => router.push('/app/projects/new')}
      className="glass-panel border-dashed border-white/[0.15] hover:border-white/[0.25] hover:bg-white/[0.03] transition-all p-6 flex flex-col items-center justify-center gap-3 min-h-[200px] group"
    >
      <div className="w-12 h-12 rounded-full bg-white/[0.06] flex items-center justify-center group-hover:bg-[#00E699]/10 group-hover:text-[#00E699] transition-colors">
        <Plus className="w-6 h-6 text-graphite-400 group-hover:text-[#00E699]" />
      </div>
      <div className="text-center">
        <p className="font-medium text-white">New Project</p>
        <p className="text-sm text-graphite-500 mt-0.5">Start documenting a site</p>
      </div>
    </button>
  );
}
```

---

## 5. API Surface

```typescript
// app/api/portfolio/route.ts

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Get org from user
  const { data: membership } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .single();
  
  if (!membership) {
    return NextResponse.json({ error: 'No org' }, { status: 400 });
  }
  
  // Portfolio summary
  const { data: summary } = await supabase
    .from('org_portfolio_summary')
    .select('*')
    .eq('org_id', membership.org_id)
    .single();
  
  // Project list with stats
  const { data: projects } = await supabase
    .from('project_portfolio_stats')
    .select(`
      *,
      team_members:project_contacts(count)
    `)
    .eq('org_id', membership.org_id)
    .order('last_activity_at', { ascending: false });
  
  return NextResponse.json({
    summary,
    projects: projects?.map(p => ({
      ...p,
      team_member_count: p.team_members?.[0]?.count || 0
    })) || []
  });
}
```

---

*Redesign locked: June 30, 2026*