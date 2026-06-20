# Slate360 Feature Specs — Reports, SlateDrop, Coordination, Viewers, Tokens, Enterprise

Status: **planning** (no app code yet). Grounded in code investigation (2026-06): route
inventory, data-model/entitlements audit, and three deep dives (twin/deliverable viewers,
SlateDrop + the broken portal link, coordination hub). Companion to
`PLATFORM_PRODUCT_PLAN.md` and `MOBILE_UX_DECISIONS_AND_MONETIZATION.md`.

Guiding principle this round: **integrate, don't reinvent.** Most of what's needed already
exists in the repo or in a mature open-source library; the work is wiring, fixing, and
unifying — not greenfield building.

---

## 0. Headline findings (what's real vs broken)

| Area | Reality | Action |
|---|---|---|
| **SlateDrop "portal" link** | **Broken on desktop** — `/app/slatedrop/layout.tsx` exists but **`/app/slatedrop/page.tsx` is missing**, so `/slatedrop` renders blank. Mobile route works. | One-file fix. |
| **SlateDrop file manager** | **Robust already**: upload, download, move, rename, soft-delete, multi-select, drag-drop, right-click menu, search, share links. Missing: **copy**, **upload notifications**, permission-management UI. | Polish, don't replace. |
| **Twin viewer** | **Sophisticated already** (Spark splats, model-viewer GLB, Photo Sphere 360; exterior-orbit + interior-walk; framing math). Bug: model loads **off-center/off-screen**. | Targeted centering fix + control clarity. |
| **Deliverable/share viewers** | Per-media viewers exist + shared `ExternalPortalShell` + `TwinViewerCanvasShell` + Q&A threads. **No unified multi-media player.** | Generalize into one player. |
| **Contacts** | **Real** (`org_contacts` + `contact_projects`, org-wide, CRUD API). | Add desktop UI + project view. |
| **Calendar** | Data model real (`calendar_events`); **UI is a stub**; **no iPhone/Android integration**. | Build UI + ICS feed. |
| **Inbox** | Notifications tab real (`project_notifications`); **Messages tab is a stub** (no data model). | Unify around link-reply threads. |
| **Notifications** | **In-app only**; email sporadic; **Twilio SMS infra exists but unwired**; **no push**; no realtime. | Build fan-out service. |
| **Upload notifications** | **Do not exist** — no notify when a client uploads to a folder. | Wire on upload-complete. |

---

## 1. One-Click Report (the deliverable) — definition

**One template → two outputs, one Q&A loop.** Defined precisely:

- **(a) Interactive web link** (token-gated; `app/share/deliverable/[token]` + `ExternalPortalShell`
  + `SharedDeliverableDocument` + `DeliverableSlideshow` already exist). Stakeholders click
  through walk results, notes, and **embedded interactive media** (twin, 360, video, slideshow).
- **(b) PDF attachment** for email/text/download. Render the **same** report template
  server-side with **headless Chrome (Puppeteer)** via Trigger.dev → pixel-perfect PDF.
  Interactive media degrade gracefully in PDF (poster image + "View interactive version" link
  back to the web report).
- **(c) Q&A back-and-forth**: the deliverable share already captures stakeholder questions and
  notifies + emails the owner (`/api/share/deliverable/[token]/questions`). **Gap:** owner
  can't reply *back* to the stakeholder yet → add owner-reply + notify (see §4).

**Aesthetic (high-end, sophisticated):** cover (project **logo/brand color pulled from the
project record**, project name, client, date, author) → executive summary + key stats →
sections grouped by location/stop → **before/after pairs** (from ghost progression) → annotated
photos with notes → embedded interactive media → sign-off. Consistent type scale, generous
whitespace, brand accent, dark-on-light print / elegant dark web theme.

**Delivery:** email (Resend) + SMS (Twilio) already wired for shares. **Token cost:** PDF
render (heavy) costs tokens; web link is free. **Build:** finish `deliverables/new` as a real
builder (today it just redirects); add a report **list** (today `/site-walk/reports` is
info-only); add one-tap "Generate report" from walk review.

---

## 2. SlateDrop — Dropbox/Finder-grade file system

**Fix the broken link first:** create `app/slatedrop/page.tsx` rendering `SlateDropBrowserShell`
at org root (no project scope) — so desktop has a real Files home. (Also remove the dead
duplicate `components/shared/MobileBottomNav.tsx` that still points at `/slatedrop`.)

**Keep the custom shell, fill the gaps** (it's already bound to `project_folders` + permissions
+ S3; ripping it out for a library would lose that). Add:
- **Copy** action (only missing core verb); confirm select-all + keyboard shortcuts.
- **Permission-management UI** (desktop): per-folder **view / upload / download** by role and by
  person, using existing `project_folders.allowed_roles` / `allow_upload` / `allow_download` /
  `is_private`. Plus the existing public **upload-intake link** (`request-link`) for outside
  parties.
- **Upload notifications** (the big one): on `/api/slatedrop/complete`, create a
  `project_notifications` row for folder owner/watchers + fan-out (email/push) — "Client
  uploaded 3 files to *Project X / Photos*." This is what lets a user know the moment a client
  delivers files.
- **Mobile polish**: `MobileSlateDropBrowser` exists; tune touch targets, long-press context
  menu, sheet-based move/rename.

**Optional library path (only if we want a richer grid/tree fast):**
[@cubone/react-file-manager](https://www.npmjs.com/package/@cubone/react-file-manager) or
[@ray-solutions/react-file-manager](https://www.npmjs.com/package/@ray-solutions/react-file-manager)
ship Finder-style UX + per-item permissions out of the box. **Recommendation: keep custom,
polish** — revisit a library only if UX bar isn't met.

---

## 3. Coordination Hub — contacts, calendar, inbox

- **Contacts** (real): add a **desktop** contacts surface; expose **project-scoped** view via the
  existing `contact_projects` junction (so a project shows its people; the org keeps the master
  list). Low effort.
- **Calendar**: (1) build the UI to actually render `calendar_events` (mobile UI is a stub
  today); (2) **iPhone/Android integration via ICS, not a sync engine** — per-event
  "Add to calendar" (`.ics` download) + a **per-user tokenized subscribe feed**
  (`webcal://…/calendar/<token>.ics`, RFC 5545, **CRLF line endings**) so events flow into
  Apple/Google/Outlook and **auto-update**. Add reminders → notifications (see §4).
- **Inbox**: the Messages tab is a stub with no backing. **Reframe the inbox as a unified
  activity + conversation center** around things that already exist: (a) notifications, (b)
  **stakeholder link-reply threads** (deliverable Q&A + external RFI/submittal responses), made
  **two-way** so the owner replies and the external party is emailed. Defer internal user-to-user
  DMs to a later phase (no data model exists; not the urgent need).

---

## 4. Notifications — one fan-out service

Today: in-app only (`project_notifications`), email ad-hoc, SMS infra unused, no push, no
realtime. Build **one `notify()` service** that, per user preferences, fans out to:
- **In-app** (existing table) + **realtime bell** (Supabase realtime subscription — currently
  you must refresh).
- **Email** (Resend — already integrated).
- **SMS** (Twilio — infra exists, just unwired).
- **Web Push** (PWA service worker + VAPID). iOS works **only as an installed PWA on 16.4+**,
  and the permission prompt **must be behind a user tap**.

Wire it to the events that matter: **client uploaded files**, **client replied to a link**,
**processing job complete**, **low token balance**, **calendar reminder**. Add notification
**preferences** (per-channel, per-event) and basic throttling.

---

## 5. Digital Twin viewer — fix centering + controls

**Centering bug (root cause):** the Spark splat mesh is rendered rotated `[Math.PI, 0, 0]`, but
the bounding box that drives camera framing (`lib/digital-twin/exterior-camera-frame.ts`) is
very likely computed **before/without that transform**, so the camera frames the wrong center
and the model sits off-screen. **Fix:** compute the **world-space AABB after the mesh transform**
(or transform the frame target by the same rotation), then fit the camera with the existing
`EXTERIOR_FILL_FRACTION` logic. Verify via the preview harness (measure DOM; screenshots time
out on this app).

**Controls clarity:** the code *does* have left-drag-orbit, right-drag-pan, wheel/pinch-zoom,
double-click-to-enter-interior, and interior look. The reason it *feels* broken is the model is
off-screen (nothing under the cursor) — fixing centering should restore the feel. Then improve
**discoverability + consistency**:
- Default mode = **orbit around the model** (drag rotate, scroll/pinch zoom, two-finger/right-drag
  pan), with a persistent **"Recenter"** and an **auto-frame on load**.
- A clear **"Walk inside" toggle** for first-person; inside, drag = look around 360°.
- On-screen control hints + buttons (mobile finger + desktop mouse parity).
- Optional gentle **auto-rotate** until first interaction (showcases the model immediately).

---

## 6. Universal multi-media deliverable player (consistent delivery)

Today each media type has its own viewer (Spark twin, model-viewer GLB, Photo Sphere 360, native
video/img, thermal slideshow) wrapped per-route; **there is no single player** that switches
between media within one deliverable, and the **control language differs per type**.

**Spec — one player shell** (generalize the existing `TwinViewerCanvasShell` pattern):
- Consistent **chrome** for every deliverable: branded header (project logo), bottom **control
  bar**, fullscreen, share, Q&A — identical across media types.
- Media **slots**: each slot delegates to the right engine (twin / 360 / video / image /
  slideshow) but presents a **consistent control grammar**: **drag = rotate/pan, scroll/pinch =
  zoom, swipe/arrows = next item, double-tap = reset**, with full **desktop-mouse + mobile-touch**
  parity.
- A deliverable that contains a twin + a 360 tour + photos becomes a **swipeable set of slots**
  with one consistent UI — not stacked sections.
- Reuse the libraries already in the repo (Spark `^2.1.0`, model-viewer, Photo Sphere Viewer
  `^5.14.1`) behind this unified shell.

---

## 7. Carry-over of the 4 earlier specs (folded in)

- **Token UX**: pre-flight estimate + confirm before dispatch, wallet/balance, one-tap buy-more
  (at cost), trial hard-caps. Metering points already exist (`*_usage_events`, `deductCredits`,
  twin charge-on-callback); the gap is the **pre-flight check** and **buy-more flow**.
- **Deliverable builder** = §1.
- **Enterprise console** (desktop-only): seat assign/revoke (`org_member_app_access`,
  `increment_app_seat`), **permission matrix**, **oversight/audit dashboards** (built from
  `*_usage_events` + `project_notifications` + activity logs), org token pool, quote path.
- **Project spine**: canonical project header (name, client, **logo/brand**, **location/geo**,
  **plans**, team, folders) flows into both apps **and** into deliverable branding and SlateDrop
  folders. Mostly surfacing — the shared `projects` table + NOT NULL FKs already enforce it.

---

## 8. Open research prompts (hand to external AIs / OSS evaluation)

- **I — Unified multi-media web player**: one shell hosting Gaussian-splat twins, 360 photos/tours
  (equirectangular), video, image galleries, and slideshows, with a **single consistent control
  grammar** across desktop mouse + mobile touch; embed-friendly, token-gated. Evaluate building
  on three.js/R3F vs. per-engine libs (Spark, Photo Sphere Viewer, video.js) and how to unify
  gestures + fullscreen + state.
- **J — Splat viewer UX**: intuitive **orbit-from-outside + walk-inside** controls with reliable
  **auto-centering/auto-framing** (world-space bounds), mobile touch parity, and discoverable
  on-screen controls. Compare Spark vs mkkellogg/GaussianSplats3D vs PlayCanvas/Babylon for
  control quality and framing.
- **K — File manager**: keep a custom Dropbox/Finder-like manager vs adopt
  @cubone/@ray-solutions react-file-manager; permission model (view/upload/download per
  folder + per person), external upload-intake links, and a great **mobile** file UX.
- **L — Notification fan-out** on Next.js + Supabase: one service → in-app realtime + email
  (Resend) + SMS (Twilio) + **Web Push** with per-user prefs; iOS-PWA push constraints and
  reliability.
- **M — Calendar via ICS**: tokenized per-user **subscribe feeds** + add-to-calendar links for
  Apple/Google/Outlook, recurring events, reminders; pitfalls (CRLF, timezones, caching).
- **N — Report aesthetics + pipeline**: a sophisticated, high-end visual system for construction
  site-walk reports, and a **Puppeteer** pipeline that yields web + PDF parity from one template.

---

## 8b. Resolved decisions (CEO, 2026-06)

1. **File manager** → **Keep & polish the custom SlateDrop.** Add: copy, a per-folder/per-person
   permission-assignment UI, upload notifications, and mobile polish. Do NOT swap in a library.
2. **Inbox scope** → **Link-reply threads first.** Unify the inbox around notifications +
   two-way stakeholder Q&A/RFI threads (owner can reply, external party emailed). **Defer**
   internal user-to-user DMs (no data model yet; not the urgent need).
3. **Viewers** → **Build one universal multi-media player** (consistent control grammar across
   twins/360/video/photos/slideshows), and fix twin **centering** as part of that work.
4. **Build status** → **Planning only.** No app code until a build phase is greenlit.

---

## 9. Suggested ordering (when un-held)

0. **Quick wins**: create `/app/slatedrop/page.tsx` (unbreak Files); twin **centering fix**;
   delete dead `MobileBottomNav.tsx`.
1. **Notifications service** + **upload notifications** + realtime bell (unlocks the "tell me when
   the client does X" experiences across the app).
2. **Universal media player** + twin control clarity → consistent interactive delivery.
3. **One-click report builder** (web + PDF) on top of the media player + project branding.
4. **Coordination**: calendar UI + ICS feed; two-way link-reply inbox.
5. **SlateDrop polish**: copy, permission UI, mobile.
6. **Token UX** (pre-flight + buy-more + trial caps), then **Enterprise console**.
