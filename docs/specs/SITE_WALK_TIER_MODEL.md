# Spec: Site Walk Tier Model (simplified) + 360-on-Plans

Status: **planning / spec** (no code changes yet — change map below). Supersedes the
workspace-vs-project tier split and the full-PM model. Per CEO direction.

## 1. The simplified model
**Two tiers: Standard (lower) and Pro (higher).** Rename — "Basic" and "Workspace" are gone
("Standard/Pro" tells users which is better). The `project_type` field/full split and the
"Workspace Walk" button are **removed**: there's just **Quick Walk** and **Project Walk**.

### Both tiers (Standard + Pro) can:
- Create **projects**; add **files**; add **plans (PDFs)**; do **Project Walks**.
- **Quick Walk** (camera-only, no project) → and **attach it to a project later**.
- **SlateDrop** folders with the **same auto-created project subfolder structure** (both tiers).
- Generate **deliverables / reports**.

### Pro adds (the ONLY differences vs Standard):
1. **Walks *with plans*** — plan-pin capture mode (Standard can add plans, but can't walk-with-plans).
2. **Collaborators** — assign up to **3** (in project management after creating the project);
   buy more in **increments of 5**.
3. **360 photos on plans** — attach/import equirectangular 360s, pin them on plans, open them in an
   interactive 360 viewer (see §3).
4. **More storage** + **more tokens**.

### Removed entirely from Site Walk (both tiers):
**All project-management tools** — scheduling, budgeting, **RFIs, submittals**, tasks, daily logs,
punch-list-as-PM. Site Walk is capture + walks + plans + 360 + deliverables, **not** a PM platform.
(This also removes App-Store rejection risk from unfinished PM screens.)

### Digital twins in projects:
- **Site Walk Pro alone → NO twins** (they don't have the Twin 360 app).
- **Bundle (Site Walk + Twin 360) →** twins appear **inside projects**: a running list of twins per
  project over time = a progression record as the project nears completion.

### Enterprise:
Seats they manage/assign + permission controls (unchanged direction).

## 2. Why this is simpler (assessment)
- **One project concept** (no field/full), **one "Project Walk"** (+ Quick Walk) — fewer mental models.
- **No PM tools to build/maintain** — big scope + risk reduction.
- **Crisp tier line:** Pro = *plans-in-walks + collaborators + 360-on-plans + more storage/tokens*;
  Standard = everything else. Easy to explain on the pricing page.
- Both tiers create projects + get the SlateDrop subfolder structure → consistent, less confusing.

## 3. 360-photos-on-plans workflow (Pro) — designed
Constraint: **phones can't shoot 360**; equirectangular files must be imported **without re-encoding**
(re-encoding/treating as a normal camera photo destroys the equirectangular projection).

**Storage:** on project create for a **Pro** org, auto-add a **"360 Photos"** subfolder to the
project's SlateDrop tree.

**Import (no quality loss — always a file upload, never phone-camera capture):**
- **Desktop:** drag-and-drop the 360 camera's `.jpg` files into the project's *360 Photos* SlateDrop
  folder (stored as-is in R2 → equirectangular preserved).
- **Mobile:** import a 360 file from the phone's Files (transferred from the camera) via the file
  picker — uploaded raw, no transcode.

**Place on a plan (desktop, Project → Plans viewer):**
1. Open a plan PDF in the desktop plan viewer.
2. Click (or long-press) a location on the plan → "Add 360 here".
3. Browse the project's *360 Photos* folder as **thumbnails**; click through them like a mini tour
   (Photo Sphere Viewer) → pick one → it pins at that spot. Set the initial yaw if desired.
4. The plan shows a **360 icon** at each pinned location.

**View (in-app, and in deliverables/share links):**
- Click a 360 icon → opens the equirectangular photo in the interactive viewer (drag/pan, zoom,
  gyro on mobile). Multiple pins on a plan = a **plan-based 360 tour**.
- Viewing 360s inside a **delivered report/share link** works for any recipient (the universal
  viewer is unauthenticated/token-gated); *placing/importing* 360s is Pro-only.

**Tech reuse:** SlateDrop (360 subfolder) + existing plan-pin system + Photo Sphere Viewer
(`@photo-sphere-viewer/core`, already in repo) + the unified player. Pins stored as plan
annotations referencing the 360 file. Minimal new tech.

## 4. Change map (where the code must change)
| Area | File(s) | Change |
|---|---|---|
| Pricing copy | `lib/marketing/pricing-config.ts`, `app/(public)/_components/marketing-pricing.tsx` | Rename Site Walk "Basic"→**Standard**; rewrite feature bullets to the §1 model; remove PM-tool copy; note Bundle enables twins-in-projects |
| Entitlements | `lib/entitlements-modular.ts`, `lib/entitlements.ts`, `lib/server/org-feature-flags.ts` | Display "Standard"/"Pro"; add flags `canWalkWithPlans`, `canAssignCollaborators`(+maxCollaborators), `can360OnPlans` (all Pro); **both** tiers `canCreateProjects=true`; **remove** PM entitlements |
| Walk start | `lib/site-walk/resolve-walk-start-tier.ts`, `components/site-walk/SiteWalkHomeClient.tsx` | Remove workspace-vs-project tiering + "Workspace Walk" button → just **Quick Walk** + **Project Walk** for both tiers |
| Project type | `app/api/projects/create/route.ts` + schema usage | Collapse `project_type` field/full gating — both tiers create the same project; same folder provisioning |
| Remove PM | `components/projects/projectDetailTabs.ts`, `/projects/[id]/punch-list` + any RFI/submittal/schedule/budget routes/components | Drop PM tabs/routes. Keep: Overview · Walks · Plans · Files · 360 (Pro) · Twins (bundle) · Deliverables · Team |
| Collaborators | `lib/projects/project-collaborator-entitlement.ts`, `collaborator_addons`, `billing-apps.ts` | Pro base **3**; add-on **packs of 5**; Stripe price for the 5-pack |
| Twins-in-projects | project detail + entitlement | Twins tab only when org has Twin 360 (bundle/twin sub); Site Walk Pro alone → hidden |
| Walk-with-plans gate | capture-v2 plan mode entry | Gate plan-pin capture behind `canWalkWithPlans` (Pro) |
| 360-on-plans (NEW) | SlateDrop provision (+360 folder for Pro), desktop plan viewer (import/pin UI), Photo Sphere viewer on click, plan-annotation model | New feature build (§3) |
| Stripe | `billing-apps.ts`, Stripe dashboard | Rename SKUs; collaborator 5-pack SKU; verify twins require bundle |

## 5. Open questions (small)
- Can **Standard** *view* (not place) a 360 inside the app's plan viewer if a Pro teammate placed
  one? (Lean: yes view, no place — but in-app this only matters for shared orgs.)
- Collaborator 5-pack price (CEO to set; config-driven).
- Keep `project_type` column for now (set everything to one value) vs migrate it out (lean: keep
  column, stop gating on it — lower risk).

## 6. Suggested build sequence
1. **Naming + pricing copy** (Standard/Pro; new bullets) — low risk, user-visible.
2. **Entitlement flags** (`canWalkWithPlans`/`canAssignCollaborators`/`can360OnPlans`; both create
   projects) + remove workspace tiering + "Workspace Walk" button.
3. **Remove PM tools** (tabs + routes) — scope/risk reduction.
4. **Collaborators** base-3 + 5-packs (+ Stripe).
5. **Twins-in-projects** gated to bundle.
6. **360-on-plans** feature (the one real new build).

## 7. Upgrade dynamics — Standard → Pro (retroactive, instant)
**Entitlements are resolved dynamically per-org at runtime** (`resolveOrgEntitlements(orgId)` reads
the current subscription each request) — they are NOT baked into projects. So the moment Stripe
flips `org_app_subscriptions.site_walk` to `pro`:
- **All projects — old and new — instantly gain Pro capabilities**: walk-with-plans, assign
  collaborators, 360-on-plans, higher storage cap. No per-project migration for *access*.
- **Storage cap / token allowance** change immediately (tier limits read at runtime; Stripe handles
  proration / next-cycle allowance).
- **Collaborators**: can now assign up to 3 (and buy 5-packs).

**The only creation-time artifact is the folder structure.** A project created while Standard won't
have a "360 Photos" folder. Fix: **idempotent provisioning** — `ensureProjectFolders(projectId)`
that creates-if-missing. Trigger it (a) **lazily** the first time a Pro user opens the 360 feature on
an older project (simplest), and/or (b) **on the upgrade webhook**, back-filling the 360 folder for
all the org's existing projects. Idempotent = safe to run repeatedly.
**Net:** upgrading is instant and fully retroactive; nothing is locked to pre-upgrade projects.
(Downgrade Pro→Standard: features gate off at runtime; existing 360 pins/folders are preserved but
read-only — no data loss.)

## 8. Desktop UI / workflow (parallel to the app, desktop-optimized)
Same model, but desktop is the **management + authoring + 360-on-plans powerhouse**; mobile stays
**capture + light review + quick deliverables**.

Desktop shell = left sidebar (Projects · Files · Activity · Account [· Admin for enterprise]) + top
breadcrumb/context. Project detail tabs (desktop): **Overview · Walks · Plans · Files · 360 (Pro) ·
Twins (Bundle) · Deliverables · Team**. (PM tabs removed.)

Desktop process:
1. **Create project** — full wizard: name, client, branding (logo/accent), location (map pin),
   **upload plans**, **invite collaborators** (Pro). Auto-provisions the SlateDrop subfolder tree
   (incl. **360 Photos** for Pro).
2. **Drag 360s** from the 360 camera into the project's *360 Photos* folder (SlateDrop file manager
   — desktop drag-drop preserves equirectangular).
3. **Plans (desktop power surface)** — open a plan in a large viewer; **click a spot → pick a 360**
   from the project's 360 folder (browse as thumbnails / mini-tour) → place a 360 pin. Mouse
   precision; collapsible side panel listing pins/360s. This is where 360-on-plans lives.
4. **Field crew captures walks on mobile** → syncs to the project.
5. **Desktop authoring** — review walks, **build deliverables/reports** (full builder: branding,
   before/after, embedded 360s/twins), send token-gated share links.
6. **Manage** — collaborators (assign 3, buy 5-packs), storage/token wallet, upgrade plan; enterprise
   admins manage seats + permissions (desktop-only console).

Capture stays mobile-only (camera); desktop is review/organize/author. Both consume the same
entitlements + project spine, so behavior is identical — only the layout/interaction differ.
