# Do Not Lose Existing Functionality

Last Updated: 2026-05-14
Status: Read-only audit. No code changes.

## Purpose

Every feature below is materially built and working. During the V1 UI rebuild, these must be preserved. The V1 migration must replace visual chrome, not rewrite behavior.

## Critical Path — Plan Walk Core Loop

| Feature | Code Location | How to Test | V1 Connection | Must Not Change |
|---|---|---|---|---|
| Plan display + pan/zoom | PlanViewerLeaflet.tsx | Open plan, pan and zoom | V1 plan workspace wraps this | Leaflet initialization, image loading, tile management |
| Long-press pin creation | PlanViewerLeafletEvents.tsx | Long press empty plan area → draft pin appears | Keep as-is | Event handler, draft pin creation logic |
| Saved pin open | PlanViewerLeaflet.tsx, PlanQuickActionMenu.tsx | Tap saved pin → menu opens | Keep as-is | Pin click handler, item resolution |
| Plan-linked capture | CaptureContext.tsx, SessionCaptureClient.tsx | From plan, start capture → item links to pin | Keep as-is | Pin-to-item linking, capture_mode=plan_pin |
| Quick capture | SessionCaptureClient.tsx | Start quick capture → camera opens | Keep as-is | Camera initialization, item creation |
| Save + return to plan | CaptureDataBottomSheet.tsx | Save capture → returns to plan view | Keep as-is | Save flow, navigation state |
| Plan rasterization | Trigger.dev task, plan_raster_jobs | Upload PDF → rasterization completes → sheets appear | V1 plan upload uses same API | Trigger task, S3 paths, plan_raster_jobs table |

## Site Walk Data Loading

| Feature | Code Location | How to Test | V1 Connection | Must Not Change |
|---|---|---|---|---|
| Home data loader | app/site-walk/page.tsx loadHubData() | Open /site-walk → data loads | V1 Home uses same loader | Supabase queries, data shape |
| Walks data loader | app/site-walk/(act-2-inputs)/walks/page.tsx loadWalks() | Open walks page → sessions appear | V1 Worksites uses same loader | Session queries, thumbnail URLs |
| Capture data loader | app/site-walk/(act-2-inputs)/capture/page.tsx | Open capture → session + plans load | V1 capture wraps same loader | Plan set/sheet queries |
| Setup data loader | app/site-walk/(act-1-setup)/setup/page.tsx | Open setup → projects + contacts load | V1 setup uses same loader | Project/contact queries |
| Deliverables data loader | app/site-walk/(act-3-outputs)/deliverables/page.tsx | Open deliverables → list loads | V1 deliverables uses same loader | Deliverable queries |

## SlateDrop File Management

| Feature | Code Location | How to Test | V1 Connection | Must Not Change |
|---|---|---|---|---|
| Presigned upload | /api/slatedrop/upload-url, /api/slatedrop/complete | Upload file → appears in folder | V1 SlateDrop tab links here | S3 presign logic, upload-url validation |
| Auto folder provisioning | lib/slatedrop/provisioning.ts | Create project → 17 folders appear | Automatic on project creation | Folder names, idempotency |
| Photo auto-filing | lib/site-walk/slatedrop-bridge.ts bridgePhotoToSlateDrop() | Capture photo → appears in Photos folder | Automatic | Bridge logic, folder targeting |
| Secure send | /api/slatedrop/secure-send | Share file → token email sent | V1 SlateDrop has share | Token generation, email |
| File requests | /api/slatedrop/request-link | Generate upload link → external user uploads | V1 SlateDrop has file requests | Token validation, public upload |

## Deliverables System

| Feature | Code Location | How to Test | V1 Connection | Must Not Change |
|---|---|---|---|---|
| Deliverable CRUD | /api/site-walk/deliverables/* | Create, list, update, delete | V1 Deliverables tab | API contracts |
| Share link generation | /api/site-walk/deliverables/[id]/share | Generate share → token returned | V1 share button | Token generation |
| PDF export | /api/site-walk/deliverables/[id]/export | Export PDF → uploaded to S3 | V1 export button | jsPDF rendering, S3 upload |
| Email send (3 modes) | /api/site-walk/deliverables/send | Send deliverable → email arrives | V1 send button | Resend email logic |
| Public viewer | /view/[token], /share/deliverable/[token] | Open share link → deliverable renders | Keep as-is | Token validation, rendering |
| View tracking | site_walk_deliverable_views | Open shared link → view counted | Keep as-is | Atomic view increment |
| Viewer comments | /api/view/[token]/comments | Comment on shared deliverable | Keep as-is | Token-scoped access |

## Coordination Features

| Feature | Code Location | How to Test | V1 Connection | Must Not Change |
|---|---|---|---|---|
| Coordination inbox | /coordination/inbox, InboxTabs component | Open inbox → items/assignments appear | V1 Coordination tab links here | |
| Contacts manager | /coordination/contacts, ContactsClient | Open contacts → list appears | V1 Coordination tab links here | |
| Calendar | /coordination/calendar, CalendarClient | Open calendar → events appear | V1 Coordination tab links here | |
| Assignments CRUD | /api/site-walk/assignments/* | Create/edit assignment | V1 Coordination surfaces | API contracts |
| Comments CRUD | /api/site-walk/comments/* | Create/read comments | V1 comment threads | API contracts |
| Assigned work | /site-walk/assigned-work, /my-work | View assigned items | Migrate to Coordination | |

## Auth + Operations

| Feature | Code Location | How to Test | V1 Connection | Must Not Change |
|---|---|---|---|---|
| User approval flow | OperationsConsoleClient.tsx, /api/admin/beta | Approve pending user → they can access app | Admin-only | Approval logic, account_status field |
| Feedback inbox | /operations-console/feedback | View submitted bugs/features | Admin-only | beta_feedback queries |
| Beta/foundational flags | /api/admin/beta PATCH | Toggle flags → user access changes | Admin-only | Profile field updates |
| App reviewer flag | profiles.is_app_reviewer | Set reviewer → bypasses approval | Admin-only | Middleware bypass logic |
| Entitlement gating | lib/entitlements.ts, lib/server/org-feature-flags.ts | Check access → correct features visible | V1 uses same gates | resolveOrgEntitlements(), getEntitlements() |
| Billing/Stripe | /api/billing/*, /api/stripe/webhook | Checkout → subscription created | Keep as-is | Stripe integration |
| Account deletion | /api/account/delete | Delete account → Stripe cancelled, data removed | Keep as-is | Deletion logic |

## Capture Metadata + AI

| Feature | Code Location | How to Test | V1 Connection | Must Not Change |
|---|---|---|---|---|
| GPS capture | lib/hooks/useGeolocation.ts | Capture with location → GPS stored | Automatic | Geolocation API |
| Weather capture | lib/site-walk/metadata.ts | Capture → weather data stored | Automatic | Weather API call |
| Voice transcription | /api/site-walk/transcribe, /api/site-walk/items/[id]/voice | Record voice → transcription returned | Keep as-is | Whisper/AI call |
| AI note formatting | /api/site-walk/notes/format | Format field notes → cleaned text | Keep as-is | AI call |
| Offline capture queue | lib/site-walk/offline-db.ts, sync-manager.ts | Capture offline → syncs when online | V1 inherits | IndexedDB + sync logic |
