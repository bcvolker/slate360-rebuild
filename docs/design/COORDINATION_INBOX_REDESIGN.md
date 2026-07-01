# Coordination Inbox -- Unified Notifications Center
## From Empty Stubs to Real Workflow Inbox

### Current State
- Milestones tab: dashed empty stub
- Direct Messages: dashed empty stub  
- Comments, uploads, reminders: all placeholder

### Target State
Option A (Recommended): Honest reduced scope

**Unified Notifications Inbox**

- Comments and @mentions on your captures
- Upload completion and processing status
- Calendar reminders
- Folder shares from your team
- Twin processing completion

**Removed: Direct Messages** (until backend fan-out lands)

### Layout

Top Bar: [All dropdown] [Unread dropdown] [Project filter]

Sections by date:
- Today: Urgent notifications (mentions, calendar soon)
- Yesterday: Recent activity
- Earlier this week: Archive

### Notification Item Format

Row structure:
- Icon (avatar for user mentions, system icon otherwise)
- Actor + action text
- Context (project name)
- Timestamp
- Primary action button

### Empty State (Honest)

`
[Inbox icon]
No notifications yet

You will receive notifications for:
- Comments and @mentions on your captures
- Upload completion and processing status
- Calendar reminders
- Folder shares from your team
- Twin processing completion
`

### Data Model

Existing: notifications table (recipient_id, type, payload, read_at, etc.)

New: notification_preferences per user
- email_enabled, push_enabled, in_app_enabled
- Category toggles: comments, mentions, uploads, calendar, shares, processing
- Quiet hours configuration

*Redesign locked: June 30, 2026*
