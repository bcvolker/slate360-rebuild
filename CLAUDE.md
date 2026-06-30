# Slate360 — Project Guide for Claude

Read this first. It captures cross-session facts that are easy to lose between chats.

## Full backend access — YOU HAVE IT (verified 2026-06-30, runs on Brian's machine)

This session runs on Brian's Windows machine at `C:\s360`, where every backend CLI is already
authenticated. **A fresh chat that thinks it "can't reach the backend" is WRONG** — test, don't assume.
Verified working (do NOT echo secret values into chat):
- **Vercel** — `npx vercel whoami` → `slate360ceo-8370`. Read/edit prod env + deploy.
  - List/inspect env: `npx vercel env ls production`; pull to verify a value: `npx vercel env pull <file> --environment=production` then grep.
  - Set a var (the reliable non-interactive form — stdin pipes add an EMPTY value, don't use them):
    `npx vercel env add NAME production --value="..." --no-sensitive --yes`.
  - **Sensitive vars can't be un-toggled** — to fix/replace, `npx vercel env rm NAME production -y` then re-add with `--no-sensitive`.
  - Latest prod deploy + commit: `curl -s https://www.slate360.ai/api/deploy-info`.
- **Supabase** (prod, linked: `slate360-prod` / ref `hadnfcenpcfaeclczsmm`) — run SQL directly:
  `SUPABASE_TELEMETRY_DISABLED=1 npx supabase db query --linked -f path/to.sql`. Migrations are additive-only.
- **Modal** — `python -m modal profile current` → `bcvolker`. Deploy workers per the section below.
- **Trigger.dev** — `PYTHONIOENCODING=utf-8 npx trigger.dev@latest deploy` (project `proj_ydquoejbfqidzbjioyno`).
  `trigger.config.ts` uses `syncEnvVars(pickTriggerEnv)` → **Trigger task env (e.g. `MODAL_TWIN_ENDPOINT`,
  read in `src/trigger/*`) is synced from `.env.local` AT DEPLOY TIME** — so after changing a Modal endpoint,
  REDEPLOY Trigger, not just Vercel (the twin task reads the value on Trigger's infra, not Vercel's).
- **Storage** — Cloudflare R2 `slate360-storage`; diagnostics `npm run diag:storage-runtime`. DB deletes do
  NOT remove blobs (orphan cleanup is separate).

Use Bash/PowerShell tools to run these. Brian authorizes operating the backend as part of the work.
Full service map + secret locations: `_archived_context/slate360-context/BACKEND.md`. See [[slate360-backend-access]].

## Heavy-processing infrastructure — YOU HAVE ACCESS (Modal + Trigger.dev)

Slate360 offloads all heavy compute to the cloud. **Every chat has access to deploy
it** — the credentials persist on this machine. If a fresh chat thinks it "lost
access," that is wrong: the tooling just isn't imported yet. Fix it, don't give up.

**Modal (GPU/CPU workers — thermal + digital-twin processing):**
- Credentials persist at `~/.modal.toml` (profile `bcvolker`) — they survive across chats.
- The `modal` CLI is a Python package. If `python -m modal --version` fails, install it:
  `python -m pip install modal` (creds are already present; no re-login needed).
- Verify auth: `python -m modal profile current` → should print `bcvolker`.
- **Deploy the thermal worker** (required after any change under
  `workers/modal/thermal-analysis/`):
  ```bash
  cd workers/modal/thermal-analysis
  PYTHONIOENCODING=utf-8 python -m modal deploy worker.py
  ```
  App: `slate360-thermal-analysis`, endpoint label `process`, must match
  `MODAL_THERMAL_ENDPOINT` in `.env.local`.
- **Windows gotcha:** Modal/Trigger CLI print ✓/emoji that crash the cp1252 console.
  Always prefix `PYTHONIOENCODING=utf-8`.

**Trigger.dev (orchestrator — the "Run pipeline" buttons dispatch here, which then
POSTs to Modal):**
- Authed as `slate360ceo@gmail.com`, project `proj_ydquoejbfqidzbjioyno`.
- Runtime dispatch uses `TRIGGER_SECRET_KEY` (in `.env.local`).
- **Redeploy after changing anything under `src/trigger/`:**
  `npx trigger.dev@latest deploy` (UTF-8 env). Tasks: `thermal.process` (+ deprecated
  `thermal.extract`), twin tasks.
- Modal deployed but Trigger not (or vice-versa) ⇒ jobs sit `queued` and "green
  buttons do nothing." Both must be current.

**Deploy rule of thumb:** edited `workers/modal/**` → redeploy Modal. Edited
`src/trigger/**` → redeploy Trigger. Editing only Next.js app code → neither (Vercel
handles the app via git push). Brian authorizes deploys; do them as part of the work.

## Architecture principle: heavy work is cloud/desktop, never on the app

The mobile apps are **capture + light interaction only**. Digital-twin
reconstruction, site-walk processing, and thermal processing are **not** to be run
on-device or optimized into the apps — they are dispatched to the cloud (Trigger →
Modal) from server-side API routes. `MODAL_*_ENDPOINT` is invoked only in
`src/trigger/*`. When adding heavy features, keep the pattern: app captures/uploads
→ API enqueues a job → Trigger → Modal does the work → callback updates the row.
Do not introduce browser/WASM/GPU heavy compute into the mobile shells.

## Thermal Studio is private and quiet (CEO-only)

Thermal Studio (`/thermal-studio`) is for the CEO (Brian) only. It must never appear
to other users or in any public surface:
- Nav: left-hand **desktop** sidebar only, gated `ceoOnly: true`
  (`components/dashboard-desktop/dashboard-nav-config.ts`, filtered in
  `resolveDashboardNav`). It is not in any mobile nav.
- Route: `app/(dashboard)/thermal-studio/layout.tsx` calls `notFound()` unless
  `isSlateCeo` — keep this server-side gate.
- It must stay out of marketing, the homepage, login, onboarding, app launchers, and
  any feature lists. The only public-facing thermal surface is the **token-gated
  share viewer** (`/api/share/thermal/...`) for delivered reports — that is intended.
- When building thermal features, do not add discoverability (no dashboard cards, no
  "new!" badges, no marketing copy). Keep it silent.

## Verifying thermal UI (it's CEO-gated, so the sandbox can't log in)

Use the unauthenticated preview harnesses (render real components with mock data +
a real grid fixture): `/preview/thermal-studio`, `/preview/thermal-studio-shell`,
`/preview/thermal-probe`. Boot with the preview tooling, navigate, and **measure the
DOM via `preview_eval`** — screenshots time out on this app's backdrop-blur.

## tsc / typecheck note

`next.config` has `ignoreBuildErrors: true` (type errors don't block deploy). A bare
`npx tsc --noEmit` **OOM-crashes (exit 134) even at 16 GB** due to a pre-existing,
**non-thermal** deep-instantiation pathology — a clean `tsc` exit of 0 from a crash is
misleading. To typecheck a subsystem without tripping the global OOM, write a temp
`tsconfig.<name>.json` that `extends ./tsconfig.json`, sets `incremental: false`, and
`include`s only the relevant globs, then `npx tsc -p` it (completes in ~1–2 min). The
thermal subsystem (`lib/thermal`, `components/ops/thermal`, thermal routes/pages,
`src/trigger/thermal-extract.ts`, `hooks/useThermalJobRealtime.ts`) is tsc-clean.

## What Slate360 is (product map)

A construction field-documentation platform. Two capture apps sit inside one Slate360
shell and share infrastructure (projects, SlateDrop files, contacts, calendar, deliverables):
- **Site Walk** (accent green `--graphite-primary` `#00E699`) — photo / 360 / voice / notes
  walks; web/React in Capacitor. Capture code: `components/capture-v2/**`.
- **Twin 360** (accent blue `--twin360-blue` `#3D8EFF`) — multi-clip ARKit + LiDAR capture →
  cloud Gaussian-splat reconstruction. Native Swift lives in
  `ios/App/App/Plugins/LiDARCapture/**` (single-clip today; multi-clip planned).
- **SlateDrop** — Dropbox/Finder-class file system. Per-project auto-provisioned folders
  (Photos/Plans/Deliverables/Intake/Submissions) via `lib/slatedrop/**`; the browser lists
  the **`slatedrop_uploads`** table (NOT `unified_files`, which is a downstream bridge).
- **Deliverables** — PDF + interactive share viewer (`app/view/[token]/**`) + desktop editor.

**Form-factor rule:** phone = capture (focused, one-decision screens); desktop (login) =
**upload + author**, NOT capture (you don't shoot with a laptop — you upload from files).

## Design system — Graphite Glass (tokens only)

Canvas `#0B0F15`; glass panels `bg-white/[0.04]` + backdrop-blur + hairline `border-white/10`;
12px radius; IBM Plex Mono uppercase labels. **One accent per surface, used ONLY on interactive
states** (active/focus/CTA) — never as fills. Bans: amber, glow, `rounded-full`, hardcoded hex
(use CSS vars), and "a scrolling list as a tab/nav". Field targets 48–72px. Tokens in
`app/globals.css`. The `/preview/*` harnesses are the approved visual bar — build live to match them.

## Tiers

Both apps have lower/upper tiers. **Pro = 360 photos + walks-with-plans** (Site Walk) and
reconstruction (Twin). Entitlements live in `lib/entitlements.ts` + `org_app_subscriptions`
(`resolveModularEntitlements`). Gate **server-side** at the action AND surface in UI as
**visible-but-locked** with a contextual upgrade affordance — never silently hide a Pro feature.

## Conventions

- **Git / deploys:** work on `main`; push triggers Vercel deploy of the Next.js app. Commit with
  explicit paths; `git pull --rebase origin main` before push. End commit messages with the
  `Co-Authored-By: Claude Opus 4.8` trailer. **Push after each verified phase** so Brian gets a
  live deploy. Native iOS (`ios/**`) changes need a **TestFlight** rebuild (Codemagic); web changes
  ride the app bundle on the next TestFlight build. Brian is a non-coder CEO; Claude commits/pushes.
- **DB:** additive migrations only (no schema breakage); apply via the Supabase **Management API**
  (Brian applies; Claude prepares the SQL). Idempotency via `client_item_id` / `client_mutation_id`.
- **Persistence rule:** work + deliverables created in Site Walk / Twin 360 must save into their
  SlateDrop folders so users can re-open/continue and navigate to outputs. Deliverable→Deliverables-
  folder wiring exists for Site Walk (`lib/slatedrop/register-deliverable.ts`,
  `lib/site-walk/slatedrop-bridge.ts`).
- **Offline + evidentiary:** capture-time SHA-256 (`lib/site-walk/content-hash.ts` →
  `CaptureMetadata.content_sha256`); AI notes keep the verbatim raw note + provenance
  (`note_raw`/`ai_provenance`) — never AI-only. Full plan:
  `docs/design/OFFLINE_SYNC_EVIDENTIARY_ARCHITECTURE.md`.

## Where the plans live (read before building a subsystem)

`docs/TWIN360_CAPTURE_GAPS.md` is the authoritative task ledger (SW-/TWIN-/DEL-/REPORT-/
WORKFLOW-/CONFLICT- IDs + status). Locked designs in `docs/design/`:
`PROJECT_LAYER_AND_WALK_START.md`, `SLATEDROP_AND_DESKTOP_SHELL.md`,
`CINEMATIC_DELIVERABLE_VIEWER.md`, `OFFLINE_SYNC_EVIDENTIARY_ARCHITECTURE.md`,
`LIDAR_NATIVE_CAPTURE_BUILD_PLAN.md`, `SLATE360_DELIVERABLES_AND_PLATFORM.md`. Cross-session
state also lives in Claude's memory files (`MEMORY.md` index) — check both.

## Gates — run before every push

npm scripts that exist: `build`, `typecheck`, `guard:architecture`, `guard:file-size-regression`,
`guard:design`. Before pushing a slice, it should pass:
1. **typecheck** — but bare `npm run typecheck` (`tsc --noEmit`) **OOM-crashes (exit 134)**, so
   typecheck the touched subsystem with a scoped temp `tsconfig` (see the tsc note above), not the
   global script.
2. **build** — `node scripts/ops/next-production-build.mjs` (slow; run for non-trivial slices).
3. **guard:architecture** — forbidden import-direction + API auth-pattern violations.
4. **guard:file-size-regression** — a *baseline* guard (`ops/file-size-baseline.json`, 300-line
   threshold): new files must be <300 lines and baselined files must not grow. Existing oversized
   files are grandfathered. Fix by extracting code, or update the baseline only when growth is approved.
5. **guard:design** — bans hardcoded brand-color hex / amber; use `var(--graphite-primary)` /
   `var(--twin360-blue)` / `var(--primary)` so white-label + theming apply.

Final acceptance is **on-device on a real iPhone** (Brian, manual). Nothing is "done" until
iPhone-verified.

## Hard guardrails — never violate

- **Never `git add .`** — stage explicit file paths only.
- **Never hardcode hex** — tokens only (enforced by `guard:design`).
- **Forbidden edit zones** (READ for audit, never edit): entitlements, billing, Stripe,
  middleware, and **existing** database migrations. (Preparing a NEW *additive* migration for Brian
  to apply via the Supabase Management API is the established flow — that's not editing an existing one.)
- Treat `components/site-walk/capture/**` (the V1 capture flow) and `components/capture-v2/**`
  (V2 canvas) as distinct — don't cross-wire them (the "capture V1/V2 reuse hazard"). Both are
  live and editable; there is no blanket freeze, but check `guard:architecture` after touching either.

## Workflow note

Designs are typically validated by a multi-AI panel (Brian relays prompts → other platforms →
back), then locked into a `docs/design/*` doc + a memory file before building. Build in verifiable,
pushable slices; typecheck each via a scoped `tsconfig`; push after each so Brian gets a live deploy.
Treat existing project-selection / legacy PM UI as slop to rebuild on the sound backend — the
**data/APIs are strong, the screens are weak**. Full repo handoff: `docs/SESSION_HANDOFF.md`.
