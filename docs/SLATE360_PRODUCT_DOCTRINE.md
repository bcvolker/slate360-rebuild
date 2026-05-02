# Slate360 — Product Doctrine

**Created:** 2026-05-02  
**Status:** LOCKED — This is the binding ecosystem doctrine. All coding sessions must read this first.  
**Source of authority:** Supersedes any prior scattered planning notes on shell design, app scope, or product intent.

> **Rule:** If a coding session produces UI, code, or architecture that violates this doctrine, stop and correct it before continuing. No exceptions.

---

## 1. What Slate360 Is

Slate360 is a **multi-app ecosystem** delivered inside a single native-app shell.

The shell is app-neutral. It serves users regardless of which apps they subscribe to. The shell must never assume "Site Walk is the main workflow." It must feel useful and complete for:

- A Site Walk-only subscriber
- A 360 Tours-only subscriber
- A Design Studio-only subscriber
- A Content Studio-only subscriber
- Any combination of the above
- A high-tier subscriber with Project Management tools
- A lightweight collaborator with no subscription of their own
- An organization executive with read-across-all-projects access

The shell is the container. The apps are the products inside it.

---

## 2. The App Ecosystem

```
Slate360 (master app shell)
├── Slate360 Core ————————— auth, billing, orgs, projects/field-projects,
│                            SlateDrop, coordination, account, app launcher
├── App 1: Site Walk ———————— field capture, punch, inspection, proposals,
│                            deliverables, field↔office coordination
├── App 2: 360 Tours ———————— 360 hosting, scene nav, hotspots, embed links
├── App 3: Design Studio ————— model/BIM upload, design review, annotations
└── App 4: Content Studio ————— media editing, branded clips, polished outputs
```

### V1 Scope (App Store submission — Site Walk + Core Shell)

For V1, implement UI only for:
- Slate360 Core shell (nav, projects/field-projects, SlateDrop, coordination, account)
- Site Walk (Act 1 Setup / Act 2 Capture / Act 3 Deliver)

Design the **database and entitlement models** to support all 4 apps from day one. Do not build UI for apps 2–4 yet, but do not design the DB in a way that requires rewrites when they are added.

---

## 3. Slate360 Shell — App-Neutral Rules

### What the Shell Owns
- Authentication (signup, login, OAuth, session management)
- Organization and team management (roles, invites, seats)
- Project registry (Field Projects + full Projects, entitlement-gated)
- SlateDrop (the shared file/folder/deliverable system — see `SLATEDROP_ARCHITECTURE.md`)
- Coordination center (inbox, calendar, contacts, communications)
- Account and org settings (profile, billing, branding, sign out)
- App launcher (shows only subscribed apps; others hidden not "Coming Soon" in V1)
- Entitlement-aware quick actions (see §4)
- Notifications center
- Activity feed (cross-app events for the authenticated user)

### What the Shell Must NOT Do
- Bias navigation toward Site Walk when the user has no Site Walk subscription
- Show Site Walk capture buttons, walk CTAs, or punch-list concepts in the global shell
- Duplicate Site Walk's own nav/tabs inside the platform shell
- Show "Coming Soon" cards for apps the user hasn't purchased
- Show empty Project Hub-style screens when the user is a Site Walk-only subscriber

### Platform Bottom Nav (locked)
```
Home | Projects | SlateDrop | Coordination | Account
```

### Entitlement-Aware Quick Actions (Home tab)

The Home tab quick actions must adapt based on subscriptions:

| Subscription | Quick Actions Shown |
|---|---|
| Site Walk only | New Walk, Open Plans, View Deliverables, SlateDrop |
| 360 Tours only | New Tour, My Tours, SlateDrop, Share Tour |
| Site Walk + 360 Tours | New Walk, New Tour, SlateDrop, Recent Deliverables |
| No apps (trial) | Explore Apps, Start Free Trial, SlateDrop, Invite |
| Collaborator | Assigned Work, My Walks, Messages, Submit |

"Continue Work" = resumes most recent unfinished item across ALL subscribed apps.

---

## 4. Organization Profile & Branding

Company branding data is **platform infrastructure**, not a per-app setting.

Stored in `organizations.brand_settings` (JSONB), exposed to all apps:
- Company name
- Company logo (R2 path)
- Primary color / secondary color
- Report/proposal disclaimer footer
- Signature block (title, phone, email, address)
- License number / certification text
- Default proposal footer
- Email/SMS send-from name

This data must flow automatically into:
- Site Walk reports, punch lists, proposals, and share pages
- 360 Tour hosted sessions and share links
- Design Studio exports
- Content Studio branded clips
- All deliverable email/text templates

Users must not be required to re-enter this information in each app. A one-time organization settings save should persist across everything.

---

## 5. Collaborator Access Model

Collaborator access is fundamentally different from subscriber access. These are distinct experience shells:

| Role | Shell | Can Do |
|---|---|---|
| **Full Subscriber** | Full Slate360 shell | Access all entitled apps, create projects, manage org |
| **Org Executive/Viewer** | Full shell, read-only mode | View all org projects, walks, and deliverables; no edit |
| **Project Manager** | Full shell, scoped | Full access to assigned projects only |
| **Project Contributor** | Full shell, scoped | Create/edit items in assigned projects; no deliverable generation |
| **Lightweight Collaborator** | Simplified shell (CollaboratorShell) | Assigned work, limited capture, submit, messages |
| **Client/Stakeholder Viewer** | Share link only, no login | Read deliverable via token; no app access |

**Lightweight Collaborator Shell nav:**
```
Assigned Work | My Walks | Plans | Messages | Account
```

Lightweight collaborators are invited by a subscriber. They download the app, sign in, and see only their assigned work. They do not see the full Slate360 ecosystem. They cannot create projects, view other users' walks, or access billing.

---

## 6. Cross-App Bundle Doctrine

Apps are designed to be better together — but never dependent on each other.

| Bundle | Unlocks |
|---|---|
| Site Walk + 360 Tours | Pin 360 scenes to walk plans; include 360 link in deliverables; "Open immersive view" button |
| Site Walk + Design Studio | Reference model views in findings; connect issues to design elements |
| Site Walk + Content Studio | Attach polished clips as proof; branded video deliverables |
| All apps (Enterprise) | Full cross-app project timeline, executive dashboards, org-wide deliverable history |

Bundle checks use `resolveModularEntitlements()` from `lib/entitlements.ts`.  
Cross-app API routes must verify both sides before exposing cross-app records.  
Bundle features that are not entitled → hidden, not "Coming Soon" banners.

---

## 7. Site Walk — Three-Act Workflow (locked)

Site Walk is built around three acts. The UI and routing must follow this structure.

### Act 1 — Setup (`/site-walk/setup`)
Create or select the project context, configure the walk, and start.
1. Choose / create Field Project or full Project (entitlement-gated)
2. Enter location, scope, client/site information
3. Add or confirm contacts
4. Add or confirm collaborators
5. Choose walk type (Punch / Progress / Inspection / Conditions / Proposal / Custom)
6. Choose / upload plans
7. Choose template (or start blank)
8. Start Walk → routes to Act 2

### Act 2 — Capture (`/site-walk/capture`)
The field capture engine. THIS IS OFFLINE-FIRST. See `APP_STORE_AND_OFFLINE_STRATEGY.md`.
- Photo, video, voice note, text note
- Plan pin with X/Y coordinates
- Status, priority, assignee, due date, trade
- Room / floor / area / gridline metadata
- Attachments and comments
- Offline queue (IndexedDB) → sync when connected

### Act 3 — Deliver (`/site-walk/deliverables`)
Create, preview, and send the deliverable from captured data.
1. Choose deliverable type (Punch list / Inspection / Progress / Proposal / Custom)
2. Select items to include (filter by status, trade, area, etc.)
3. Apply branding (logo, colors, footer from org profile)
4. AI summary (optional, credit-gated)
5. PDF preview
6. Interactive link preview
7. Recipient picker (from org contacts + project contacts)
8. Send (email / SMS share link)
9. Save to SlateDrop under the project folder
10. Record in project/field-project delivery history

---

## 8. Credit and Usage Doctrine

Subscriptions include hard limits. The metering system must enforce these before expensive operations run.

| Operation | Meter |
|---|---|
| File upload | Storage GB |
| Photo compression + thumbnail | Processing credits |
| Voice transcription | AI credits |
| AI note cleanup / summary | AI credits |
| Report / PDF export | Processing credits |
| Interactive deliverable generation | Processing credits |
| 360 model render | Processing credits (requires 360 Tours entitlement) |
| Email send | Credits (small, but tracked) |
| SMS send | Credits |
| Long-term hosted deliverable link | Storage GB |
| Background large-file processing | Processing credits |

Usage tracks per: user, org, app, project, and month.  
Tables: `site_walk_usage_events`, `site_walk_usage_monthly`, `record_site_walk_usage()`  
Metering guard: must be called before presigned R2/S3 upload URLs are issued.

---

## 9. Guiding Rules for AI Coding Sessions

1. **Read this file before writing any app shell, navigation, or project-related code.**
2. **The shell is app-neutral.** If you are adding something to the dashboard that only makes sense for Site Walk users, it belongs in Site Walk, not the platform shell.
3. **SlateDrop is infrastructure, not a page.** Never treat it as "just a file upload area." See `SLATEDROP_ARCHITECTURE.md`.
4. **Entitlements are not optional.** Every major UI surface must be entitlement-aware. Never show features the user hasn't subscribed to.
5. **V1 = Site Walk + Core Shell only.** Do not build UI for 360 Tours, Design Studio, or Content Studio yet.
6. **Offline capture is not optional.** Photos and notes in Act 2 must save locally first, sync second. See `APP_STORE_AND_OFFLINE_STRATEGY.md`.
7. **Org branding flows everywhere.** Never ask users to re-enter company info in a per-app form.
8. **No mock data.** Empty states must be clean functional states, not placeholder content.
9. **No Coming Soon in the shell.** If a feature isn't built, hide it. Don't show a broken button.
10. **Collaborators get the Collaborator shell, not the subscriber shell.**
