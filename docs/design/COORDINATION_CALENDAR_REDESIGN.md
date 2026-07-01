# Coordination Calendar -- Real Event Management
## From Read-Only Agenda to Full Calendar CRUD

### Current State
- MobileCalendarClient shows read-only agenda derived from milestones
- CalendarClient.tsx is orphaned mock

### Target State
Full calendar with create/edit, reminders, project association, inbox integration

### Data Model Additions

Already exists: calendar_events, project_milestones
Need: event instances for recurring, reminder delivery tracking

New table: calendar_reminder_deliveries
- event_id, user_id, reminder_minutes, scheduled_for
- delivered_at, notification_id, skipped

### Layout: Month View

Calendar grid with dot indicators for events
- Click date to create event
- Click existing event to view/edit
- Today highlighted in accent color
- Events with project association show project color dot

### Layout: Agenda View

List view by date:
- Today section expanded by default
- Future events collapsible
- Past events collapsed by default

Each event row shows:
- Time
- Title
- Project badge (if associated)
- Type badge (Inspection/Walk/Meeting/Milestone)
- Primary action button

### Create/Edit Event

Form fields:
- Title (text input)
- Project (dropdown, optional, creates link)
- Date + Time (date picker + time range)
- All day toggle
- Type dropdown (Inspection/Walk/Meeting/Milestone/Custom)
- Reminders checklist (15min, 1hr, 1day, custom)
- Notes textarea

### Calendar Event Types

1. Inspection -- Site visit with deliverable expectation
2. Walk -- Capture session scheduled
3. Meeting -- Internal/external coordination
4. Milestone -- Project milestone (synced from project_milestones)
5. Custom -- Freeform event

### Reminder System

On event create:
- Insert rows into calendar_reminder_deliveries for each enabled reminder
- Scheduled_for calculated from event start_at minus reminder_minutes

Trigger.dev job runs every minute:
- Query deliveries where scheduled_for <= now() AND delivered_at IS NULL
- Create notification for each
- Mark delivered_at = now()

Notification generates inbox item + push/email per user preferences

### Integration with Inbox

Events generate notifications:
- calendar_reminder -- At reminder time
- calendar_event_created -- Notify project team members
- calendar_event_updated -- Notify attendees of changes  
- calendar_event_cancelled -- Notify attendees

### Mobile Considerations

- Month view is primary on mobile
- Agenda toggle button
- Bottom sheet for create/edit
- Swipe between months
- Quick-add from project context (pre-fill project)

*Redesign locked: June 30, 2026*
