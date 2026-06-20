# Spec: Notification Service (fan-out)

Status: **spec / planning** (no app code). One event → preference-filtered fan-out across in-app
(realtime), email, SMS, and Web Push. Backbone for upload alerts, link replies, job-done, low
tokens, and calendar reminders. See `RESEARCH_SYNTHESIS_AND_DECISIONS.md` §1, §5.

## 1. Current state (from audit)
- `project_notifications` (in-app only) + `useNotificationsState` + `NotificationsMenu`.
- Email (`lib/email.ts`, Resend) used ad-hoc; SMS (`lib/sms.ts`, Twilio) installed but **unwired**.
- **No Web Push.** `app/sw.ts` is a **kill-switch** that unregisters — must be replaced first.
- Prefs live in Supabase **`user_metadata`** — can't be queried server-side for fan-out.

## 2. Data model (new)

```sql
-- canonical event (source of truth; powers in-app bell)
notifications (
  id uuid pk, user_id uuid, org_id uuid, project_id uuid null,
  type text,                 -- 'file.uploaded','report.comment','twin.ready','token.low',...
  title text, body text, link_path text, data jsonb,
  read_at timestamptz null, created_at timestamptz default now()
);
-- per-user per-event channel matrix (replaces user_metadata)
notification_preferences (
  user_id uuid, event_type text,
  in_app bool default true, email bool default true, sms bool default false, web_push bool default false,
  digest text default 'instant',          -- instant|hourly|daily|off
  quiet_start time null, quiet_end time null, tz text default 'UTC',
  primary key (user_id, event_type)
);
-- delivery log: idempotency + throttle + audit
notification_deliveries (
  id uuid pk, notification_id uuid, user_id uuid, channel text,
  status text,               -- queued|sent|failed|skipped|throttled
  provider_id text, error text, dedupe_key text, created_at timestamptz default now()
);
-- one row per browser/device push endpoint
push_subscriptions (
  id uuid pk, user_id uuid, endpoint text unique, p256dh text, auth text,
  user_agent text, created_at timestamptz default now()
);
```

## 3. API

```ts
// server-only entry point; everything calls this
await notify({
  event: "file.uploaded",
  userId,             // or recipients[] resolved by caller / helper
  orgId, projectId,
  payload: { title, body, linkPath, data },
  idempotencyKey: `file.uploaded:${fileId}:${userId}`,
});
```
`notify()` (1) inserts the canonical `notifications` row immediately (drives the bell), then
(2) enqueues a **Trigger.dev** task `notifications.dispatch`.

## 4. Dispatch (Trigger.dev task)
For each recipient: load prefs → for each enabled channel → check **dedupe** (`dedupe_key` unique
24h) + **throttle** (Upstash sliding window, e.g. ≤3 SMS/h, ≤50 email/h) + **quiet hours** (defer
to next allowed slot or roll into digest) → send → log a `notification_deliveries` row. Channels run
in parallel; one channel failing never blocks another. Trigger gives retries/backoff for free.

| Channel | Provider | Notes |
|---|---|---|
| in_app | `notifications` row + **Supabase Realtime** | bell increments live (no refresh) |
| email | Resend (`lib/email.ts`) | templated; digest-batchable |
| sms | Twilio (`lib/sms.ts`) | urgent only; opt-in; STOP/HELP compliance |
| web_push | `web-push` + VAPID | installed-PWA on iOS (see §6) |

## 5. In-app realtime bell
Subscribe per user: `postgres_changes` INSERT on `notifications where user_id=eq.<id>` → push into
the bell store; unread = `count(read_at is null)`. One bell component shared by mobile + desktop
shells. `POST /api/notifications/read` marks one/all read (exists).

## 6. Web Push + iOS PWA constraints (the hard part)
**Prerequisite:** replace the kill-switch SW with a real Serwist SW that has `push` +
`notificationclick` handlers; bump SW version so old clients update.

- iOS 16.4+ push works **only when the PWA is installed to the Home Screen** (not a Safari tab) →
  detect `display-mode: standalone`; if iOS in-browser, prompt "Add to Home Screen" first.
- Permission **must be requested inside a user tap** (a Settings "Enable notifications" button) —
  never on load (silently fails on iOS).
- `userVisibleOnly: true`; **every push must show a notification**.
- Generate VAPID keys once (`web-push generate-vapid-keys`); public key to client, private server-side.
- Subscribe → `POST /api/push/subscribe` → store in `push_subscriptions`. Prune on 404/410.

```js
// SW (replaces kill-switch)
self.addEventListener("push", e => { const d=e.data?.json()??{};
  e.waitUntil(self.registration.showNotification(d.title,{ body:d.body, data:{url:d.url},
    tag:d.tag, icon:"/icons/icon-192.png", badge:"/icons/badge.png" })); });
self.addEventListener("notificationclick", e => { e.notification.close();
  e.waitUntil(clients.openWindow(e.notification.data.url)); });
```

## 7. Event catalog (v1)
`file.uploaded` (client delivered files), `report.comment` (link reply), `twin.ready` / `twin.failed`,
`deliverable.ready`, `walk.assigned`, `share.viewed`, `token.low`, `calendar.reminder`.

## 8. Reliability
Idempotency key on every `notify()`; at-least-once with the dedupe table; in-app + email are
authoritative for critical alerts (push is best-effort); digest task (scheduled Trigger) batches
hourly/daily for `digest` users.

## 9. Migration & UI
- Backfill `notification_preferences` from existing `user_metadata`; point `SettingsNotificationsPanel`
  at the new table.
- Keep `project_notifications` reads working during transition (view/alias to `notifications`).

## 10. Build order
1. Tables + `notify()` + in-app insert + realtime bell + prefs table/UI.
2. Email fan-out (Resend) + dedupe/throttle/quiet-hours + delivery log.
3. SW redesign → Web Push (subscribe + send + prune).
4. SMS (urgent) + digest task.
5. Wire events: upload-complete, report.comment, twin job callback, token.low, calendar.reminder.

## 11. Open items
- Reference architecture: Novu (study only; not adopting).
- Native push for Capacitor shells (APNs/FCM) is a separate path from PWA web-push.
