# Slate360 — Project Guide for Claude

Read this first. It captures cross-session facts that are easy to lose between chats.

> **Active workstream: capture-screen rebuild (Twin 360 + Site Walk).** Status & handoff:
> `docs/CAPTURE_SCREENS_REBUILD_STATUS.md`. Pipeline works end-to-end (model `281b1ebb`);
> we're unifying both capture screens. Open blocker: Vercel production deploy is stuck.

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
