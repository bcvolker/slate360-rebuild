# Slate360 — Session Handoff (June 14 2026)

Authoritative state for a new chat to continue. Slate360 = app-centric product
(Site Walk + Twin 360) with a web portal. Live on `main`; CEO Brian is a non-coder
(Claude commits/pushes). Read the `~/.claude/.../memory/MEMORY.md` index too.

## Working agreement / gotchas (read first)
- **Commit + push to `main`** after each verified slice (lint-staged + guard:design run on commit). End commit messages with `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **Design system:** Graphite Glass, tokens-only, **amber banned** (`guard:design` ratchet; currently 159 allowlisted files, 0 stale). Neutral graphite chrome + per-app accents: Site Walk/platform `--graphite-primary` (teal/green), Twin `--twin360-blue`.
- **I cannot log into the authed app** from the preview env, so authed pages (dashboard, studio, projects, account) are verified by rendering components in **`/preview/*` harness routes** with mock data + `preview_eval` DOM measurement. **Screenshots time out on full-height backdrop-blur** — use `preview_eval` measurements. Preview server uses `autoPort` (random port) — Google Maps referrer is restricted to `localhost:3000` so the map shows AuthFailure in preview (works in prod).
- **Migrations:** apply via `node scripts/run-migration.mjs <file>`; the script's `split("\n")` trips on CRLF `.env.local`, so pass the token inline: extract `SUPABASE_ACCESS_TOKEN` and run `SUPABASE_ACCESS_TOKEN=$TOKEN node scripts/run-migration.mjs <file>`.
- **A parallel agent was committing earlier** (commits 77d8f55f/1e5d7e51/507da60d appeared). Re-fetch before pushing.
- `py` (Windows Python launcher) has numpy/cv2/PIL — used to run worker code locally.

## ✅ COMPLETED (this multi-session marathon)
- **Thermal Studio** (CEO-only): HIKMICRO Pocket2 decoder (`lib/thermal/hikmicro-extract.ts`, validated ±0.5°F on real dog photos), interactive probe viewer (`ThermalProbeViewer`: 6 palettes, circle/crosshair/box targets, label/min/max/°F-°C toggles, unlimited spots + multi-spot deltas), grid API, manual tuning panel (`ThermalTuningPanel` → analyze.py), in-app report templates (5 seeds, ASTM/NFPA, editable), tabbed Studio shell (`ThermalStudioShell`). **Pipeline DEPLOYED end-to-end: Modal worker (fixed ModuleNotFoundError via add_local_python_source) + Trigger.dev (`npx trigger.dev@latest deploy`, v20260613.4).** Verified the analysis logic produces correct results on real photos.
- **Dashboard** (`components/dashboard-desktop/*`): rebuilt to fit one screen (no scroll), Overview/Activity tabs, image-backed featured + project cards (text overlay), collapsible sidebar (pin closed, persists), CEO-gated Thermal Studio, app launchers in sidebar. Density: sidebar 208px, title 18px.
- **Legacy purge:** deleted `project-hub` + `_quarantine_v1` (176 files / 23k lines) — the "un-deletable" pages. Repointed all refs to `/projects` first. Amber allowlist 190→159.
- **Logo fix** (SlateLogo size bug), **APP_STORE_MODE now opt-in** (Twin visible; set `NEXT_PUBLIC_APP_STORE_MODE=true` in Vercel before Apple submission), **mobile launcher** shows only Site Walk + Twin (hid 360 Tours/Design/Content/SlateDrop).
- **Marketing:** card depth; **mock phones** show real construction photos (`public/mock/sitewalk.jpg`, `twin.jpg`) full-bleed with capture-UI overlay (`PhoneCaptureMock`) — BUT overlay accuracy still not exact (see bugs).
- **Projects:** workspace shell (`ProjectDetailShell`: image cover header + tabs Overview/Site Walks/Twins/Issues/Files/Team); **comprehensive 2-step creation wizard** (`MobileProjectCreateWizard`: details=name/type/scope/client/location/dates/size, collaborators REMOVED from creation→management); **clean Google location picker** (`components/projects/mobile/ProjectLocationPicker.tsx`, @vis.gl, minimal edge controls + pop-out, autocomplete+pin+latlng — NOT the old buggy WizardLocationPicker).
- **Walks-with-plans S0-B** (pin authoritative-ID): idempotent pin POST on `client_pin_id` (`app/api/site-walk/pins`), backfill migration (APPLIED), offline queue for pin drops (`lib/capture-v2/plan-pin-drop.ts`).
- **My Account:** removed the over-prominent delete-account block from the landing (deletion stays in Settings).
- Google APIs confirmed enabled + referrers correct (Maps JS/Places/Geocoding; slate360.ai + localhost:3000).

## 🔄 IN PROGRESS / immediate next
- **Project management tabs + collaborators** (NOT STARTED — the next big build): open a project → tabbed sections; collaborators (3 included, **purchasable +5 increments**, invite by email → collaborator installs app + signs up with SAME email to link project; **enterprise admin** manages licenses/permissions by org email domain). Infra exists: `app/api/projects/[id]/collaborators/*`, `lib/entitlements.ts` `maxCollaborators` (free 0/mid 3/pro 10/ent ∞), `project_members.role='collaborator'`. Collaborator gets a COLLECT-ONLY app (capture + complete assigned walks + before/after; no deliverables/other projects) — needs an `isCollaborator` entitlement profile + walk-assignment UI.
- **Mock-phone overlay accuracy** — Brian to choose: (a) rebuild overlay from the REAL capture component in code, or (b) he sends a full-res screenshot. Then restore the multi-screen roll-through. Refs: `images/image1.png` (Quick Scans·Ready), `images/image0 (2).png` (Stop 1·End·Ghost).

## 🗺️ REMAINING for full app functionality
1. **Walks-with-plans:** on-device 4-step pin proof test (Brian, once create works) → viewer slices S1 plan-selection, S2 auto-crop/legend-exclude, S3 capture-screen reuse, S4-S6 viewer/sheet-nav/pin-lifecycle. Plan: `docs/design/PLAN_PIN_ID_LIFECYCLE.md` + memory `slate360-walks-with-plans-plan`.
2. **Project management** (above) + edit/delete everything; contacts (account-wide list + per-project, import from account list, drive collaborator-assign + deliverable recipients); schedule/budget = drag-drop PDF → SMART parse → HIGH-LEVEL digital view (milestones/budget, NOT a Gantt builder — novel AI-parse feature, own build).
3. **Coordination Hub** (`components/coordination/*` — Inbox/Contacts/Calendar exist, OLD flat styling): Graphite-Glass restyle + cross-project calendar/contacts + phone import + deliverable distribution to groups (secure-send exists: `app/api/slatedrop/secure-send`). Design doc: `docs/design/PROJECT_WORKSPACE_AND_COORDINATION.md`.
4. **App-wide consistency:** no-scroll paged flows, "1 of N" step headers, top nav (back/forward/home) + bottom nav on EVERY screen incl capture/data, safe-area buffers (full-screen flows like capture/wizard render own header — verify they pad `env(safe-area-inset-top)`).
5. **Real cover images:** populate project/twin/featured card images from recent walk photo / twin still (rendering ready; data wiring left). `app/api/static-map` can make a map-snapshot cover from latlng.
6. **De-amber/glass pass** (Grok audit): auth pages (oversized headings, amber pills), `app/~offline` (amber button), legal pages (amber boxes), collaborator/upload portals, emails, legacy widgets. Migrate to glass tokens; gated by guard:design.
7. **Location picker styling** is graphite now (clean); old `components/projects/WizardLocationPicker*` still used by `components/projects/CreateProjectWizard.tsx` (likely legacy desktop) — migrate/remove later.

## 🐞 KNOWN BUGS / OPEN ISSUES
- **Mock-phone capture overlay not pixel-accurate** to the real app (Brian flagged twice). Needs real-component replication or full-res screenshots.
- **"Can't create a project"** — wizard EXISTS+works+handles safe-area; blocker is likely the small "+" FAB discoverability on `MobileProjectsClient` OR a submit error Brian must report (can't test authed). The projects list page is bare + may overflow on his device → needs the hub redesign (prominent New Project, contained, coordination quick-access, image cards).
- Maps shows **RefererNotAllowedMapError** only in dev preview (random port) — fine in prod.
- HMR "hooks order changed" warnings appear after live-editing hooks — artifact, clears on fresh load.
- Homepage `PhoneDemo` multi-screen roll-through was replaced by single photo+overlay; restore once overlay is accurate.

## Key files / entry points
- Projects: `app/(mobile)/projects/{page,new}`, `components/mobile-system/MobileProjectsClient.tsx`, `components/projects/mobile/*`, `app/(dashboard)/projects/[projectId]/*`, `components/projects/ProjectDetailShell.tsx`.
- Thermal: `app/(dashboard)/operations-console/thermal/*`, `components/ops/thermal/*`, `workers/modal/thermal-analysis/*`, `src/trigger/thermal-extract.ts`.
- SlateDrop taxonomy: `lib/slatedrop/folder-taxonomy.ts` (auto-provisioned per project).
- Preview harnesses: `/preview/{dashboard-look,thermal-studio,thermal-studio-shell,thermal-probe,project-shell,project-wizard}`.
