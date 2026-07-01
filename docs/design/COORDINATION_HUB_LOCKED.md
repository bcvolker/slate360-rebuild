# Coordination Hub — LOCKED decisions + build plan (2026-06-30)

Authoritative summary. Detailed reference spec (data model SQL, API tables, UX): see the companion
[`COORDINATION_HUB_ARCHITECTURE.md`](./COORDINATION_HUB_ARCHITECTURE.md) (1868-line panel spec). This file is
the short, decided version synthesized from a **10+ AI platform panel** (unanimous) + a repo/schema audit.
**Everything is additive.** Slate360 = source of truth; external clients use browser links + email/SMS only.

## The decisions (panel was unanimous — not close calls)

| Area | LOCKED choice | Note |
|---|---|---|
| Event model | Append-only `coordination_events` → Trigger.dev fan-out → per-user inbox rows | audit + idempotent + retryable + supports digests/prefs/billing |
| Fan-out | Trigger.dev (already in stack) | not Kafka/SQS |
| Real-time | Supabase Realtime (Postgres-changes P0 → Broadcast at scale) | DB rows are truth; realtime is a hint |
| Email | **Resend** (already wired `lib/email.ts`) P0–P1; Postmark = documented upgrade | start with what's integrated |
| SMS | Twilio + A2P 10DLC, opt-in, transactional-only, hard-capped | register 10DLC early (2–3 wk lead) |
| Push (bg) | FCM/APNs via Capacitor | allowed (not a "paid cloud API") |
| Folder sharing | Per-recipient scoped tokens + roles + RLS + audit | never one shared "anyone can do everything" link |
| External access | No-login token default; magic-link account optional | don't force accounts |
| Inbox table | New `coordination_notifications` superset (keep thin `project_notifications` legacy) | old table is `project_id NOT NULL`, no category/thread/snooze |

## Repo grounding (extend, don't rebuild)
`project_notifications` (thin), `viewer_comments` (**inbound comment source already**), `org_contacts` /
`contact_projects` / `calendar_events` / `contact_files`, SlateDrop (`slatedrop_uploads`, `project_folders`
numbered taxonomy, `unified_files`), deliverable tokens (`site_walk_deliverables.share_token`,
`digital_twin_share_tokens`), `organizations` / `organization_members` / `is_org_member`, **Resend** in
`lib/email.ts` + `lib/email-theme.ts`. RLS pattern:
`org_id in (select org_id from public.organization_members where user_id = auth.uid())`.

## P0 tables (this session — additive migration prepared)
`coordination_events` (event log) · `coordination_notifications` (inbox superset) · `notification_threads` ·
`notification_preferences` · `notification_deliveries` · `push_device_tokens`. RLS on all; inbox rows are
`user_id = auth.uid()`; events insert service-role-only, org-members read. Idempotency: `idempotency_key`
unique + `unique(user_id, event_id)` + `unique(notification_id, channel)`.

## Upload auto-routing (highest-confidence first — never silently misfile)
explicit drop-box target → portal context → capture context → type fallback (pdf/dwg→Plans, img→Photos) →
**ambiguity ⇒ Intake + "needs filing" notification + one-tap move**. Explicit beats type inference.

## Build phases
- **P0** Unified in-app inbox: migration + `lib/coordination/emit-event.ts` + Trigger `coordination.fanout`
  (in-app only) + wire `viewer_comments`/twin-complete/`project_notifications` → events + NotificationsMenu →
  full Coordination Hub page + Realtime. Kick off Twilio 10DLC + Resend domain-auth in parallel.
- **P1** Fan-out worker + Resend email channel + preferences UI + digests + quiet hours.
- **P2** Outbound messaging + recipient picker (contacts/groups) + `message_threads`/`send_batches` + Stripe metering.
- **P3** Inbound parse (email replies) + Twilio STOP/HELP + opt-out table + CAN-SPAM/TCPA.
- **P4** Folder shares (per-recipient tokens + roles + audit + watermark + download enforcement) + unified
  `/api/share/*` + wire auto-routing.
- **P5** Push (APNs/FCM) + Capacitor inbox parity + hub analytics.

## Top 5 risks → mitigations
deliverability (auth'd subdomain + suppression) · permission leakage (per-recipient tokens + server-side RLS +
watermark + audit) · notification spam (threading + digests + quiet hours + mute-thread) · cost blowout (tier
quotas + Stripe overage + hard SMS cap) · realtime reliability (outbox = no lost events; re-query on focus).

## Desktop vs app split (Brian's directive)
Apps = lightweight (capture + light interaction + **inbox glance**). Desktop = full Coordination Hub cockpit
(3-pane inbox, composer, folder-share manager, recipient picker, audit/access center, calendar authoring).
Heavy hub actions live desktop-side — same "phone=capture, desktop=author/manage" form-factor rule.

## Design-guard prerequisite (DONE this session)
Coordination/contacts/report UI + the 3 API color palettes had banned gold `#D4AF37`. **Purged** →
`--graphite-primary` / `#00E699`. The full hub reskin uses `--app-accent` blue (`#3D8EFF`), IBM Plex Mono
labels, glass panels, no amber/gold.
