# Dashboard Placeholder Rebuild -- Implementation Summary
## Three Screens: Real Value, No More Mock Data

## Files Created

1. PROJECTS_PORTFOLIO_REDESIGN.md -- Real PM portfolio home
2. COORDINATION_CALENDAR_REDESIGN.md -- Full CRUD calendar
3. COORDINATION_INBOX_REDESIGN.md -- Honest notifications inbox

## Implementation Priority

### Phase 1: Projects Portfolio (highest impact)

Delete old mock components:
- components/projects/ProjectsPortfolioOverview.tsx (current)
- Any KPI card components with fake data

Create new:
- hooks/useOrgPortfolioStats.ts -- Fetch from org_portfolio_summary
- hooks/useProjectPortfolioItems.ts -- Fetch from project_portfolio_stats
- components/projects/PortfolioHeader.tsx -- Title, search, new project button
- components/projects/PortfolioSummaryBar.tsx -- Storage, credits, counts
- components/projects/AttentionGroup.tsx -- Projects needing action (amber highlight)
- components/projects/TodaySection.tsx -- Today is calendar events
- components/projects/ProjectCard.tsx -- Grid and list variants
- components/projects/NewProjectCard.tsx -- Create placeholder card

Database work:
- Create materialized view project_portfolio_stats
- Create materialized view org_portfolio_summary
- Add refresh function and schedule

### Phase 2: Coordination Inbox (clearest UX)

Delete old:
- components/inbox/InboxTabs.tsx or any tabs with empty stubs
- Milestones empty state component
- Direct Messages empty state component

Create new:
- app/(dashboard)/inbox/page.tsx -- Single unified view
- components/inbox/NotificationList.tsx -- Date-grouped list
- components/inbox/NotificationItem.tsx -- Single row with icon/action
- components/inbox/InboxEmptyState.tsx -- Honest explanation
- hooks/useNotifications.ts -- Real-time via Supabase

Database work:
- Verify notifications table has all required fields
- Create notification_preferences table

Remove:
- Delete "Direct Messages" tab entirely
- Delete "Milestones" tab (milestones are calendar events)

### Phase 3: Coordination Calendar (most backend work)

Delete old:
- components/calendar/CalendarClient.tsx (orphaned mock)

Keep and enhance:
- app/(dashboard)/calendar/page.tsx (uses MobileCalendarClient)
- Rename/refactor to unified CalendarClient

Create new:
- components/calendar/MonthView.tsx -- Calendar grid
- components/calendar/AgendaView.tsx -- List view
- components/calendar/EventCreateSheet.tsx -- Bottom sheet (mobile) / modal (desktop)
- components/calendar/EventEditForm.tsx -- Full CRUD form
- components/calendar/EventTypeBadge.tsx -- Type indicators
- hooks/useCalendarEvents.ts -- Month range query
- hooks/useCreateEvent.ts -- Mutation
- hooks/useUpdateEvent.ts -- Mutation
- hooks/useDeleteEvent.ts -- Mutation

Database work:
- calendar_events table exists, verify schema
- Create calendar_reminder_deliveries table
- Create reminder delivery job in Trigger.dev

## Graphite Glass Compliance Checklist

All three screens must:

Background:
- Use bg-graphite-canvas (#0B0F15)

Containers:
- Use glass-panel (translucent, subtle border)

Typography:
- Labels: label-mono (IBM Plex Mono, uppercase, slate-400)
- Headers: text-white, font-semibold
- Body: text-graphite-300

Accents (ONE per surface):
- Interactive states: hover:border-white/[0.12]
- Active items: bg-[accent]/5 border-[accent]/30
- Only on hover/focus, not persistent decoration

No banned patterns:
- No amber/glow
- No rounded-full buttons (use rounded-lg)
- No hardcoded hex colors outside design tokens
- No multi-hue palettes
- No placeholder/mocking language in production UI

## Migration Strategy

1. Feature flag all new screens (e.g., ?v2portfolio=1)
2. Build parallel to existing, do not delete until ready
3. Deploy database changes first (materialized views are safe)
4. Switch default to new screens once tested
5. Delete old components after 1 week stable

*Implementation guide: June 30, 2026*
