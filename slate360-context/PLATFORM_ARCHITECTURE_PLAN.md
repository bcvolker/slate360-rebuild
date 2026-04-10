# Slate360 — Platform Architecture Plan

Last Updated: 2026-04-10
Status: **Planning Phase — No coding until decisions are locked**

Read this before building any new features, apps, or infrastructure.

---

## 1. Business Model Overview

Slate360 is an **app-centric ecosystem** for construction professionals. One account, one dashboard, multiple specialized apps.

### Revenue Streams
| Type | How it works |
|---|---|
| **Individual app licenses** | User subscribes to Site Walk ($49/mo TBD). Gets full single-user access. |
| **Bundles** | Subscribe to multiple apps at a discount (pricing TBD). |
| **Enterprise packages** | Bulk seats + admin panel + white-label branding. Slate360 is invisible — looks like the client's own system. |
| **Credit packs** | Additional processing credits (AI, storage, exports). |

### Tier System (current, subject to change)
```
trial → creator → model → business → enterprise
```
Pricing, tier names, and what each tier includes are **TBD** after beta testing validates the product. The entitlement system (`lib/entitlements.ts`) already supports all 5 tiers.

---

## 2. Download / Install Pipeline (PWA Strategy)

### Decision: Progressive Web App (PWA)
Slate360 is NOT a native iOS/Android app. It is a **Progressive Web App** that users "download" by installing from their browser to their home screen.

### Why PWA
- Same codebase for mobile + desktop + web (Next.js)
- No App Store review cycles or fees
- Instant updates (deploy to Vercel, all users get it)
- Browser APIs support camera, GPS, offline storage — everything Site Walk needs
- Can wrap in Capacitor later for App Store distribution if needed (Phase 3+)

### The Install Flow
```
1. User visits slate360.ai (or custom enterprise domain)
2. Signs up → creates account (email/OAuth)
3. Lands on dashboard
4. Sees "Install App" banner/prompt
   - iOS: "Tap Share → Add to Home Screen"
   - Android: native "Install App" prompt (automatic from PWA manifest)
   - Desktop: "Install" button in browser address bar
5. App icon appears on home screen / desktop
6. Launches in standalone mode (no browser chrome)
7. User sees their dashboard → launches subscribed apps
```

### What Must Be Built for PWA
| Component | Status | What's needed |
|---|---|---|
| Web manifest (`app/manifest.ts`) | ✅ Exists | Fix `theme_color` + `background_color` to dark |
| Service worker | ❌ Missing | Register via `@serwist/next` or manual. Caches app shell + handles offline queue. |
| PNG icons (192x192, 512x512) | ❌ Missing | Generate from SVG logo, add to `public/` + manifest |
| Apple touch icon (180x180) | ❌ Missing | Required for iOS home screen |
| Install prompt UI | ❌ Missing | Banner on dashboard for first-time users |
| Offline queue | ❌ Missing | IndexedDB for photos/notes taken without connectivity; sync when back online |

### Post-Beta: Capacitor Wrapper (Phase 3+)
When beta validates the product, wrap the PWA in Capacitor for native App Store/Play Store distribution. Same codebase, native shell, push notifications, and deeper hardware access.

---

## 3. Beta Access Code System (Cost Protection)

### Purpose
Protect AWS/infrastructure costs during beta. Users can create free accounts, but apps remain locked unless they enter a valid beta access code.

### Design
- Generic `access_codes` table (reusable for promos, partner deals, sales demos later)
- CEO generates codes via CEO Command Center with usage limits
- User enters code on dashboard → unlocks the app

### Schema (planned)
```sql
CREATE TABLE access_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,          -- e.g. "SITEWALK-BETA-26"
  code_type TEXT NOT NULL,            -- 'beta' | 'promo' | 'partner' | 'demo'
  app_id TEXT,                        -- 'site_walk' | 'tour_builder' | NULL (all apps)
  max_uses INT NOT NULL DEFAULT 1,
  current_uses INT NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Redemption Flow
```
1. User sees locked app card on dashboard
2. Clicks "Unlock Beta" → modal with code input
3. Enters code → POST /api/access-codes/redeem
4. Server validates: exists? not expired? current_uses < max_uses?
5. If valid: increment current_uses, flip org_feature_flags.standalone_site_walk = true
6. Dashboard refreshes → app card is now active
7. "Download App" banner appears
```

### Bug Reporting (Beta)
Beta testers need an in-app way to report bugs. Reports go to CEO Command Center.
- Simple form: screenshot/photo + text description + device info (auto-captured)
- Stored in `beta_bug_reports` table (or use existing `suggest-feature` API pattern)
- CEO Command Center gets a "Beta Reports" tab showing all reports

---

## 4. User Roles & Permissions

### Individual / Small Team Users
Single license holders get full access to their subscribed apps. They can:
- Create projects
- Enter data (photos, notes via keyboard or voice-to-text)
- Generate deliverables (punch lists, proposals, inspections, reports)
- Brand deliverables with their company logo (PNG upload in account settings)
- Send deliverables digitally (viewer link, email, text)
- Download deliverables as PDF
- Share project access with external collaborators (token-based, no account needed)

### Organization Roles (when applicable)
| Role | Access level |
|---|---|
| **owner** | Everything + billing + delete org |
| **admin** | Manage users, branding, all projects, all apps |
| **manager** | Create projects, assign people, view all project data |
| **member** | Work in assigned projects/apps only |
| **viewer** | Read-only access to assigned projects |

Status: **Role names confirmed, specific permissions per role TBD after app is built**

### Contributors (Slate360 account required, tier-gated)
Contributors are project-level collaborators invited by a subscriber. They are NOT a type of account — they are a **role on a specific project**. A person can be a subscriber for their own company AND a contributor on someone else's project.

**How contributor seats work:**
- Each subscription tier includes a number of contributor invites (0, 3, 10, 25, unlimited — TBD per tier)
- Contributor must create a free Slate360 account (or already have one)
- Contributor gets access ONLY to the specific project(s) they're invited to
- Contributor can: walk sites, take photos, add notes, create punch lists, confirm work — scoped by what the subscriber assigns
- All contributor work saves to the subscriber's project folders automatically
- Subscriber gets notifications when contributors submit work
- Access is time-limited (set by subscriber: days, months, or project duration)
- Subscriber can revoke access at any time
- When access expires/is revoked: contributor loses project access, but their submitted work stays (it's the subscriber's data)

**Invitation flow (Decision #2 — CONFIRMED):**
1. Subscriber enters the contributor's email/phone in the project settings
2. Subscriber sets a custom access code for this invitation (subscriber chooses the code)
3. System sends an invite link via email/text
4. Contributor clicks link → creates account (or signs in) → enters the access code
5. Both the link AND the code are required for security
6. Contributor is now in the project with scoped permissions

**Viral growth opportunity:** Every contributor who downloads Slate360 is a potential subscriber for their own business (e.g., electrician contributing to a GC's project may subscribe for their own jobs).

### External Collaborators (no Slate360 account needed)
For people who really can't/won't create an account:
- Receive token-based links (existing `project_external_links` system)
- Can view, upload, or respond depending on permissions set by subscriber
- See project branding (the sender's company logo)
- No app experience, no notifications, no session continuity
- Future: pin notes/photos on drawings, upload to specific folders

### Enterprise White-Label (Phase 2+)
- Company gets the full Slate360 ecosystem branded as their own
- No trace of Slate360 visible to their employees or clients
- Possible approach: separate subdomain or custom domain pointing to Slate360 with org-level branding override
- Enterprise admin panel: manage users, roles, app access, branding, permissions
- `org_branding` table already exists (logo URL, color overrides)
- **Key question resolved**: Enterprise white-label will NOT be in Phase 1 MVP. Plan the schema now so it doesn't require rework later.

---

## 5. Project System

### Project Hub as Central Command (Decision #10 context)
The **Project Hub** (`/project-hub`) is the subscriber's control center for each project. This is where they manage everything: info, drawings, contributors, permissions, metrics, budgets, schedules, deliverables, and more.

**Already built (from previous development):**
| Feature | Status | Route/Component |
|---|---|---|
| All projects grid + portfolio metrics | ✅ Built | `/project-hub` |
| Project home/dashboard | ✅ Built | `/project-hub/[projectId]` |
| RFIs | ✅ Built | `/project-hub/[projectId]/rfis` |
| Submittals | ✅ Built | `/project-hub/[projectId]/submittals` |
| SlateDrop (project files) | ✅ Built | `/project-hub/[projectId]/slatedrop` |
| Schedule (Gantt + table) | ✅ Built | `/project-hub/[projectId]/schedule` |
| Budget (table + form) | ✅ Built | `/project-hub/[projectId]/budget` |
| Photos (photo log) | ✅ Built | `/project-hub/[projectId]/photos` |
| Drawings (viewer + grid) | ✅ Built | `/project-hub/[projectId]/drawings` |
| Punch List | ✅ Built | `/project-hub/[projectId]/punch-list` |
| Daily Logs | ✅ Built | `/project-hub/[projectId]/daily-logs` |
| Observations | ✅ Built | `/project-hub/[projectId]/observations` |
| Management (stakeholders, contracts, reports) | ✅ Built | `/project-hub/[projectId]/management` |
| Create Project Wizard (with location picker) | ✅ Built | `CreateProjectWizard.tsx` |
| Change History / Activity Log | ✅ Built | `ChangeHistory.tsx` |
| Access control logic | ✅ Built | `lib/projects/access.ts` |

**Needs to be added/extended for the new architecture:**
| Feature | Status | Where it goes |
|---|---|---|
| Contributor invitation + link management | 🔲 New | Project settings or management tab |
| Contributor permission scoping (what they can see/do) | 🔲 New | Project settings |
| Drawing sheet assignment (which sheets each contributor sees) | 🔲 New | Drawings section |
| Deliverable builder + send flow | 🔲 New | Project deliverables section |
| App-specific tool tabs (Site Walk sessions, 360 Tours, etc.) | 🔲 New | Auto-provisioned per app subscription |
| Real-time activity feed | 🔲 New | Project home |

**Key insight:** Most of the project management infrastructure is already built. The new work is primarily (1) contributor management, (2) permission scoping, (3) wiring apps into the project context, and (4) the deliverable builder.

**Note:** 9 of 14 existing tool pages exceed the 300-line limit and need component extraction before adding new features.

### Project Lifecycle
```
Create Project → Enter Details → Work in Apps → Generate Deliverables → Share/Export
```

### Project Creation (existing)
- User provides: name, scope, location (map picker), description, drawings (uploaded)
- System auto-provisions folder structure in SlateDrop
- Project exists across ALL of Slate360 — every app can access it

### Project Folders
**Base folders** (every project, regardless of apps):
```
/Projects/{Project Name}/
├── Documents/
├── Drawings/          ← user uploads plans, blueprints, drawings
├── Photos/
├── Reports/
├── Correspondence/
├── History/           ← immutable snapshots of submitted deliverables
└── Misc/
```

**App-specific folders** (auto-provisioned when user has that app):
```
├── Site Walk/         ← only if subscribed to Site Walk
├── 360 Tours/         ← only if subscribed to Tour Builder
├── Design Studio/     ← only if subscribed to Design Studio
└── ...future apps
```

**Sub-folder structure within app folders**: TBD after each app is built. The system supports dynamic folder provisioning — when an app is finalized, its required sub-folders are defined and auto-created.

Status: 16 system folders currently auto-provisioned (`lib/slatedrop/provisioning.ts`). Will be updated to match this plan.

### History / Record Keeping
- Every submitted deliverable auto-saves a timestamped snapshot to `/History/`
- Format: `2026-04-10_Punch-List_Building-A.pdf`
- Original deliverable remains editable; re-submission creates a new version in History

**Deletion policy (Decision #6 — CONFIRMED):**
- Owner/admin (the subscriber) CAN delete history items
- Requires **2-step confirmation**: first click shows warning ("This permanently removes this record. Are you sure?"), second click confirms
- Deletion is logged (who, what, when) for internal audit
- Rationale: it's the subscriber's data — they should have full control

**Download policy:**
- Every file in History (and all other folders) has a prominent **Download** action
- Bulk download (select multiple → ZIP) supported
- Subscriber can always export/keep their own data locally
- Download works from SlateDrop file explorer, project folder view, and inside apps

### Auto-Save & Draft Lifecycle
```
[Draft] → [In Progress] → [Submitted]
                              ↓
                      History snapshot (v1)
                              ↓
              [Edited] → [Re-Submitted]
                              ↓
                      History snapshot (v2)
```

- Every photo, note, or data entry saves **immediately** (not batched)
- If app closes, user resumes where they left off
- Voice-to-text notes can be edited/corrected before or after saving
- AI assistant can format notes for deliverables (punch list format, proposal format, etc.)

### Deliverable System (Decision #7 — CONFIRMED)

**Core principle: Maximum flexibility.** Subscribers choose how deliverables are created and sent. PDF is just ONE option.

**Subscriber deliverables (outbound to clients):**
- NO auto-PDF generation on submit
- Subscriber decides delivery format and method via the **Deliverables** button on the dashboard sidebar
- Available delivery formats (planned):
  - **PDF** — traditional document, downloadable and printable
  - **Interactive email** — rich HTML email with expandable images, embedded 360° tours, clickable plans, video playback — no attachment, everything inline
  - **Digital viewer link** — shareable URL where client can browse photos, 360° tours, 3D models, plans interactively
  - **Custom combinations** — subscriber picks what to include and how to send it
- The Deliverables section is where subscribers:
  - Select which project data to include
  - Choose format (PDF, email, viewer link, etc.)
  - Preview before sending
  - Send to clients (email, text, copy link)
  - Track delivery status (opened, viewed, downloaded)
- Specific delivery options and UI will be refined during app builds (especially Site Walk)

**Contributor submissions (inbound from subs/collaborators):**
- When a contributor submits work (e.g., subcontractor completes a walk with photos + notes), TWO versions are saved:
  1. **Editable UI version** — the subscriber can review, edit, annotate, or modify before using in their own deliverables
  2. **PDF snapshot** — auto-generated at submission time, saved to BOTH:
     - The project's `/History/` folder (permanent record)
     - The appropriate content folder (e.g., `/Site Walk/Inspections/` or `/Photos/`)
- The PDF snapshot captures the submission exactly as submitted (immutable record of what the contributor sent)
- The editable version is what the subscriber works with going forward
- All submissions include full metadata (time, geolocation, weather — see Contributor Submission Metadata below)

**Where submissions are filed:**
- Auto-routed to the appropriate project folder based on submission type
- E.g., a subcontractor's site walk completion → `/Projects/{Name}/Site Walk/{session}/`
- Filing rules will be defined per-app when each app is built
- Subscriber can always move/reorganize files in SlateDrop after the fact

### Contributor Submission Metadata (auto-captured)
When a contributor submits work (photos, notes, confirmations, punch list items, etc.), the system **automatically records** the following metadata alongside their submission:

| Metadata | How it's captured | Why it matters |
|---|---|---|
| **Timestamp** | `Date.now()` at submission time | Subscriber knows exactly when work was completed |
| **Geolocation** | Browser Geolocation API (lat/lng) | Proves the contributor was physically on-site |
| **Weather conditions** | Weather API lookup using lat/lng at submission time | Documents conditions at time of work (useful for exterior work, inspections, claims) |
| **Device info** | User-agent string | Audit trail |
| **Contributor identity** | Logged-in user ID | Who submitted it |

**Implementation notes:**
- Geolocation requires user permission (PWA will request on first app launch)
- If user denies location, submission still goes through — location field is "Not available"
- Weather lookup: free tier of OpenWeatherMap or similar (by lat/lng, cached per location per hour to minimize API calls)
- All metadata stored in a `submission_metadata` JSON column on the submission record
- Subscriber sees this metadata on every contributor submission: "John submitted 4 photos from 123 Main St at 2:47 PM, 72°F partly cloudy"
- This is a **major differentiator** — most construction apps don't capture weather + location automatically
- Useful for: proof of work, timeline verification, insurance claims, dispute resolution, weather-related delays

---

## 6. SlateDrop as Central File System

### Root Structure
```
SlateDrop/
├── Projects/                    ← all projects, opens folder tree
│   ├── {Project A}/
│   │   ├── Documents/
│   │   ├── Site Walk/           (if subscribed)
│   │   └── ...
│   └── {Project B}/
├── Site Walk/                   ← app folder (only if subscribed)
│   └── links to project Site Walk folders
├── 360 Tours/                   ← app folder (only if subscribed)
├── Design Studio/               ← app folder (only if subscribed)
├── Shared With Me/              ← files/folders shared with this user
└── Uploads/                     ← quick-dump area for field uploads
```

### Multiple Access Points (same underlying data)
| Where | What they see |
|---|---|
| Dashboard → SlateDrop widget | Recent files + quick upload |
| Dashboard → Project tile | Project list → project folder tree |
| SlateDrop standalone (`/slatedrop`) | Full file explorer (like Finder/Explorer) |
| Inside an app (e.g., Site Walk) | That project's app-specific folder |
| App root folder in SlateDrop | Cross-project view for that app |

### File Operations
All existing and working: upload (S3 presigned URL), download, move, rename, delete, share link, ZIP export, secure send.

### Mobile-First File Management
- SlateDrop must work like a native file manager on phones/tablets
- Large touch targets, swipe actions
- Quick camera upload (floating button → camera → auto-save)
- Offline queue (IndexedDB → sync when online)

---

## 7. Mobile ↔ Desktop Sync

### Same App, Different Screen Sizes
PWA means mobile and desktop are the same codebase hitting the same database. No separate sync layer needed for connected users.

### Offline Mode (Decision #8 — CONFIRMED: Full offline from beta)
Offline support is a **beta requirement**, not a post-launch feature. Field users work in dead zones — losing data is unacceptable.

**How it works:**
- ALL data (photos, notes, voice-to-text, form selections, metadata) saves to **IndexedDB first**, then syncs to server
- Auto-sync runs whenever connectivity is detected — no manual trigger needed
- Sync indicator always visible: "All saved" / "3 items waiting to upload" / "Syncing..."
- If user takes 50 photos with no signal, all 50 queue locally and upload automatically when back online
- Conflict resolution: timestamp-based (latest wins for text fields; photos/files never conflict since each is unique)
- Geolocation and timestamp are captured at the moment of action (not at sync time) — so offline submissions still have accurate location/time data

**Sync architecture (planned):**
```
User action → Save to IndexedDB (instant) → Show "Saved locally" ✓
                     ↓
          Background sync worker watches connectivity
                     ↓
          Online detected → Upload queue processes sequentially
                     ↓
          Each item: IndexedDB → S3 (files) + Supabase (records)
                     ↓
          Success → Remove from local queue → Update sync indicator
          Failure → Retry with exponential backoff → Keep in queue
```

**Service worker responsibilities:**
- Cache app shell (HTML, CSS, JS) for instant load even offline
- Intercept network requests — serve cached responses when offline
- Manage background sync queue
- Handle push notifications (when online)

### Required Permissions & Onboarding (Decision #8 — CONFIRMED)
The PWA needs several device permissions to function properly. These must be requested **upfront during first launch** with clear explanations of why each is needed.

**Permission onboarding flow:**
1. User installs PWA / first launches the app
2. App shows a **permissions onboarding screen** (before entering the main dashboard)
3. Each permission is explained with a clear reason:

| Permission | Why it's needed | What happens if denied |
|---|---|---|
| **Camera** | Take photos during site walks, inspections | Cannot capture photos in-app (must upload from gallery) |
| **Location (GPS)** | Auto-tag submissions with job site coordinates | Location field shows "Not available" — reduces value of records |
| **Storage / Files** | Save data offline, access photo gallery | Cannot work offline, cannot select existing photos |
| **Notifications** | Receive alerts when contributors submit work, project updates | Will miss real-time updates |
| **Microphone** | Voice-to-text for notes in the field | Must type all notes manually |

4. User grants/denies each permission individually
5. App clearly states: **"To unlock all features, please grant these permissions. You can change them anytime in your device settings."**
6. If a critical permission is denied (e.g., camera for Site Walk), the app shows a contextual prompt when the user tries to use that feature: "Camera access is required to take photos. Tap here to enable in settings."
7. Permissions can be re-requested later — never block the user entirely, but clearly explain what's limited

**Key principle:** The app works in a degraded mode if permissions are denied, but the user understands exactly what they're missing. No silent failures.

### Real-Time Updates (Decision #9 — CONFIRMED: Real-time from beta)
Real-time sync is a **beta requirement**. When a contributor submits work in the field, the subscriber should see it instantly — this is a central feature to test.

**How it works:**
- Supabase Realtime subscriptions on project-level channels
- When a contributor uploads photos / submits a walk / adds notes:
  - Subscriber gets an **instant push notification** (toast + badge)
  - Example: "John submitted 4 photos to Building A — 2:47 PM"
  - Project data view **auto-refreshes** with the new data (no manual reload)
- When a subscriber updates a project (assigns tasks, adds drawings, changes scope):
  - Contributors on that project see updates on their next app open (or live if app is open)
- Supabase Realtime channels scoped per project to avoid noise
- Browser Push Notifications for when the app is closed/backgrounded (requires Notification permission)

**Real-time events (planned):**
| Event | Who sees it | How |
|---|---|---|
| Contributor submits work | Subscriber + admins/managers | Toast + badge + auto-refresh |
| New file uploaded to project | All project members online | Auto-refresh file list |
| Task assigned / updated | Assignee | Push notification |
| Deliverable sent to client | Subscriber (confirmation) | Toast |
| Client views deliverable | Subscriber | Badge on deliverable |
| New contributor joins project | Subscriber | Toast + notification |

---

## 8. Cross-App Integration

### Principle: Apps Enhance Each Other
Subscribing to additional apps unlocks richer capabilities within each app. This encourages upgrades and bundles.

### Integration Examples (confirmed direction)
| If you have... | Plus... | You can... |
|---|---|---|
| Site Walk | 360 Tour Builder | Add 360° photos to site walks and deliverables |
| Site Walk | Design Studio | Include 3D models in walk sessions, pin notes on 3D views |
| 360 Tour Builder | Design Studio | Place 3D models inside 360° tours |
| Any app | Content Creation | Generate marketing-quality visuals from project data |

### How It Works Technically
- Each app checks the user's entitlements at render time
- If `canAccessTourBuilder == true`, Site Walk shows a "Add 360° Photo" option
- If `canAccessDesignStudio == true`, Site Walk shows "Attach 3D Model" option
- If neither, those options are hidden (not locked — hidden entirely, no tease)
- Cross-app data references use project-level folder paths (e.g., Site Walk session references a file in `/360 Tours/Captures/`)
- Bundle pricing incentivizes multi-app subscriptions (pricing TBD)

### App Build Order (confirmed)
1. **Site Walk** — field documentation, punch lists, inspections, proposals
2. **360 Tour Builder** — immersive virtual tours with hotspots
3. **Design Studio** — 3D modeling, rendering, design tools
4. **Content Creation** — marketing materials, presentations, social content
5. **More apps** — as the ecosystem grows

---

## 9. Deliverable Branding

### Individual Users (ALL subscription tiers, including lowest)
**CRITICAL: Company branding on deliverables is available to EVERY subscriber, including the lowest tier. This is core value, not a premium feature.**

- Upload company logo (PNG) in account settings
- Upload company info (name, address, phone, email, license numbers) for auto-population on deliverables
- Logo + company info appears on:
  - PDF deliverables (punch lists, proposals, inspections, reports)
  - Digital viewer links (when clients view photos, 360 tours, 3D models)
  - Exported documents
  - Shared project portals
- Deliverables look professional and represent the subscriber's business
- "Created with Slate360" watermark or subtle attribution is acceptable (confirms legitimacy)
- This is NOT the same as enterprise white-label (see below)

### Enterprise White-Label (Phase 2+)
- **Complete Slate360 removal** — enterprise client's brand EVERYWHERE
- No trace of Slate360 visible to their employees, clients, or deliverables
- Custom domain (e.g., `tools.bigfirm.com` → Slate360 infrastructure)
- Custom logo, colors, fonts throughout the ENTIRE ecosystem (dashboard, apps, emails, portals)
- Employee downloads the PWA and sees only their company's brand
- Enterprise admin panel: manage users, roles, app access, seat assignments, permissions
- Unlimited contributor/seat management
- `org_branding` table already supports logo + color overrides; needs extension for full white-label
- **Approach** (CEO's preferred model): Separate domain per enterprise client as part of contract. Slate360 routes the domain to the same infrastructure but applies org-level branding override at render time. This keeps the codebase single while delivering a fully custom experience.
- Technical approach: **TBD** (custom domain routing, Vercel domain aliases, or reverse proxy)
- **NOT in Phase 1 MVP** — but schema and branding system designed now to avoid rework later

---

## 9. Decisions Tracker

| # | Decision | Status | Answer |
|---|---|---|---|
| 1 | Org role hierarchy (owner/admin/manager/member/viewer) | **Confirmed** | Yes, this hierarchy works |
| 2 | Contributor invitation method | **Confirmed** | Option C: invite link (email/text) + custom access code (subscriber sets the code). Both required. |
| 3 | Company logo on deliverables for all tiers | **Confirmed** | YES — all tiers, including lowest. This is core value, not premium. |
| 4 | Cross-app integration (apps enhance each other) | **Confirmed** | Having 360 Tours adds 360 photos to Site Walk. Design Studio adds 3D models. Bundles encouraged. |
| 5 | App build order | **Confirmed** | Site Walk → 360 Tours → Design Studio → Content Creation → more |
| 6 | History folder — can owner/admin delete? | **Confirmed** | YES — owner/admin can delete with 2-step confirmation. Deletion is logged. It's their data. Download always available. |
| 7 | Deliverable system / auto-PDF | **Confirmed** | Subscriber deliverables: NO auto-PDF, flexible formats (PDF, interactive email, viewer link). Contributor submissions: YES auto-PDF + editable UI version. Dashboard sidebar Deliverables button is the control center. |
| 8 | Offline mode priority for beta? | **Confirmed** | Full offline from beta. Auto-save to IndexedDB, auto-sync when online. Upfront permissions onboarding with clear explanations. Degraded mode if permissions denied. |
| 9 | Real-time sync priority for beta? | **Confirmed** | YES — real-time from beta. Supabase Realtime for instant notifications + auto-refresh. Central feature to test. |
| 10 | External collaborators on drawings: full set or assigned sheets? | **Confirmed** | Subscriber controls this. They choose which sheets/drawings each contributor or external collaborator can see. Project Hub is the central place for all project management, contributor invites, and permission scoping. Much of Project Hub already built — needs contributor + deliverable extensions. |
| 11 | Shared With Me: cross-org, intra-org, or both? | **TBD** | — |
| 12 | Enterprise domain approach (custom domain vs. subdomain vs. branding-only)? | **Deferred to Phase 2** | Schema designed now to avoid rework |
| 13 | App-specific sub-folders within projects? | **Deferred to after app build** | Provisioning system supports dynamic folders |
| 14 | Contributor seat counts per tier? | **TBD** | Suggested: 0 / 3 / 10 / 25 / unlimited per tier |
| 15 | Bug reporting system for beta testers? | **Confirmed** | In-app reports → CEO Command Center |

---

## 10. Build Sequence (Ordered)

### Phase 0 — Foundation (before any app building)
1. ✅ Homepage + Learn More pages (done)
2. ✅ Auth system (done)
3. ✅ Stripe billing integration (done, env vars need wiring)
4. ✅ Entitlements system (done)
5. 🔲 PWA install support (service worker, icons, install prompt)
6. 🔲 Beta access code system
7. 🔲 Dashboard → real command center (entitlement-driven, real data)
8. 🔲 SlateDrop → real file system (mobile-first, project folders)

### Phase 1 — Site Walk Beta
9. 🔲 Lock architecture decisions (this document)
10. 🔲 Site Walk app build (see SITE_WALK_BUILD_PLAN.md)
11. 🔲 Beta code distribution + testers onboarded
12. 🔲 Bug reporting system (in-app → CEO Command Center)
13. 🔲 Iterate based on tester feedback

### Phase 2 — Production Hardening
14. 🔲 Finalize pricing / tiers / bundles
15. 🔲 Wire Stripe env vars + test payment flows
16. 🔲 Enterprise admin panel
17. 🔲 White-label branding UI
18. 🔲 Additional apps (Tour Builder, Design Studio)

### Phase 3 — Scale
19. 🔲 Capacitor native wrapper (App Store / Play Store)
20. 🔲 Full offline mode with background sync
21. 🔲 Real-time collaboration features
22. 🔲 AI-powered deliverable formatting
23. 🔲 Drawing overlay / markup tools
