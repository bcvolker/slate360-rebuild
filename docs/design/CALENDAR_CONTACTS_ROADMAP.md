# Calendar + Contacts — first-class shared tools (2026-06-30)

Synthesized from an 8+ platform panel + repo audit. UNANIMOUS. **Key finding: this is EXTEND +
RESKIN, not greenfield** — `supabase/migrations/20260305000001_contacts_calendar.sql` already created
`org_contacts`, `contact_projects`, `calendar_events`, `contact_files`, and there's a
`components/coordination/contacts/*` UI. But it's minimal + off-brand (the ContactList uses hardcoded
green/slate + a **banned gold `#D4AF37` fallback** — Graphite-Glass bans amber/gold), single
email/phone, no groups/milestones/reminders, no import/sync, and `load-calendar-data.ts` reads
`site_walk_items` due dates instead of `calendar_events`. Slate360 stays the source of truth; phone/
Google are import/export targets. All migrations below are additive.

## Additive migration (build on existing tables)
- `org_contacts` add: `emails jsonb[]`, `phones jsonb[]`, `website`, `address jsonb`, `tags text[]`,
  `import_source`, `phone_contact_ref`, `dedupe_key` (+ index).
- NEW `contact_groups` (org-level, reusable recipient sets "Owners"/"Subs") + `contact_group_members`.
- `calendar_events` add: `kind text default 'event'` ('event'|'milestone'), `milestone_type`,
  `assignee_id`, `status`, `source`. (Milestones = calendar_events with a discriminator — one source
  for the month/agenda view + shared reminders/sync, no parallel table.)
- NEW `calendar_reminders` (event_id, offset_minutes, channel in_app|push|email, fired_at) + partial
  index on `fired_at is null`.
- NEW `user_sync_state` (user, org, domain calendar|contacts, provider ics|eventkit|google, ics_token,
  google_sync_token, last_synced_at).
- `contact_projects` (exists): add `stakeholder_role`, `permissions jsonb`, `can_receive_deliverables`.
- NEW `deliverable_send_batches` + `deliverable_send_recipients` (audit "sent to 8 of 10").

## Sync (Slate360 = source of truth)
- **Calendar → phone:** default **one-way `.ics` subscribe** (`GET /api/calendar/feed/[token].ics`,
  webcal://, per-user token, VALARM reminders) — zero native code, all clients. Optional **EventKit
  one-shot "Add to my calendar"** (Capacitor plugin, one-way push, store external id to update-not-
  dupe). Optional **Google two-way** (allowed paid API) for Google-Workspace teams. Avoid full two-way
  EventKit v1 (duplicate-event swamp). ICS client refresh is hours-latent → cover time-critical alerts
  with in-app/push, NOT the calendar alarm.
- **Contacts → import:** Capacitor Contacts plugin (read) → normalize (emails lowercase, phones E.164)
  → `dedupe_key` match → **user-reviewed merge screen** (never silent). Handle iOS "limited" contact
  access. Key re-imports off `phone_contact_ref`.
- **Alerts delivery:** a Trigger.dev cron (~5 min) scans `calendar_reminders` where `fired_at is null`
  and due → fans to in-app (existing NotificationsMenu) / push / email, stamps `fired_at`. Independent
  of phone sync so it works without it.

## Recipient picker (deliverable send — highest user-visible value)
Scope defaults to this project's stakeholders (`contact_projects`), toggle to all org contacts. Group
chips ("Owners"/"Subs") select whole groups; header shows "8 of 10 selected"; rows missing email are
muted + excluded from select-all; "save selection as group"; per-recipient channel toggle. On send,
one share token + audit row PER recipient (never one token for all). Snapshot recipient details so the
record survives later contact edits.

## UI (Graphite Glass — reskin the gold/green/slate to tokens)
Shared components mounted at org (`/contacts`, `/calendar`) + project (`/projects/[id]/contacts`,
`/calendar`) scope. Contacts = 3-pane (groups rail · table · detail). Calendar = month + agenda toggle,
event/milestone composer, filters. `--app-accent`, IBM Plex Mono labels, glass panels, **no amber/gold**.

## Build phases
- **P0** (extend + reskin, no new surfaces): additive migration; reskin ContactList/coordination to
  tokens (kill the gold `#D4AF37` + green/slate — also a guard:design win); point the calendar at
  `calendar_events`.
- **P1** groups + RecipientPicker wired into deliverable send.
- **P2** premium org `/contacts` + `/calendar` hubs + project tabs.
- **P3** reminders + alert delivery (Trigger cron + in-app/push/email).
- **P4** phone Contacts import + dedupe; `.ics` subscribe feed.
- **P5** EventKit one-shot add; optional Google two-way.

## HUD follow-up (native, next build slice — beyond the torch+layout already shipped 76bf15d9)
VIDEO/PHOTO toggle + photos-per-second selector (sample `ARFrame.capturedImage` on a timer, NOT
AVCapturePhotoOutput); "DEPTH RECORDING · N pts" chip (red while accumulating); walk-speed +
steadiness coach (pose-delta m/s + trackingState). Exposure/WB lock stays disabled (not feasible under
ARKit — needs leaving ARKit-led capture, which forfeits depth/poses). Full SwiftUI specced in the panel.
