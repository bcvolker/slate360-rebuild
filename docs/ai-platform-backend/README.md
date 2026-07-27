# Slate360 — AI Platform Backend Access Pack

**Audience:** Any AI coding agent working on Slate360 that needs to run, deploy, query, or push against live backend services.

**Status:** Pre-launch development only (no external end users yet).  
**Generated:** 2026-07-26  
**Machine of record:** Brian’s Windows workstation at `C:\s360`

---

## CRITICAL SECURITY WARNING

**GitHub Push Protection blocks committing live keys.** Secrets are **not** in this git folder.

Live credentials live only on Brian’s machine at:

```
.local/ai-platform-backend/     ← gitignored — never push
  DEV_SECRETS.env               ← full app env (copy → `.env.local`)
  CLI_TOKENS.env                ← Vercel + Modal CLI tokens
  modal.toml                    ← copy → `~/.modal.toml`
  vercel-auth.json / vercel-config.json
  github-pat.txt
```

See also `SECRETS_LOCATION.md` in this folder.

| Rule | Detail |
|------|--------|
| Temporary | Rotate **every** key/token before public launch |
| Do not commit secrets | GitHub will reject the push and may auto-revoke tokens |
| Share out-of-band | Copy `.local/ai-platform-backend/` via private channel if another machine needs it |
| Same-machine AI | If the other AI runs on `C:\s360`, it already has `.env.local` + `.local/` |

---

## 1. Service map (what is what)

| Service | Role | Identity |
|---------|------|----------|
| **GitHub** | Source of truth; push to `main` deploys the Next.js app | Repo: `https://github.com/bcvolker/slate360-rebuild` |
| **Vercel** | Hosts Next.js app + prod env vars | Team `slate360`, project `slate360-rebuild`, URL `https://www.slate360.ai`, user `slate360ceo-8370` |
| **Supabase** | Auth + Postgres + RLS | Project `slate360-prod`, ref `hadnfcenpcfaeclczsmm`, region `us-west-1` |
| **Trigger.dev** | Orchestrates heavy jobs (dispatches Modal) | Project `proj_ydquoejbfqidzbjioyno` |
| **Modal** | GPU/CPU workers (twin, thermal, tour, content, photogrammetry) | Profile `bcvolker` |
| **Cloudflare R2** | Primary object storage (S3-compatible) | Bucket `slate360-storage`, account in `DEV_SECRETS.env` |
| **AWS S3** | Legacy/fallback storage path (same bucket name historically) | Region `us-east-2`, bucket `slate360-storage` |
| **Stripe** | Billing | Keys in `DEV_SECRETS.env` / Vercel env |
| **Codemagic** | iOS TestFlight builds | `CODEMAGIC_API_TOKEN` in secrets |

**Architecture rule:** Mobile/web apps = capture + light UI only. Heavy compute = API → Trigger.dev → Modal → callback. Never put photogrammetry / splat / thermal GPU work in the browser or on-device.

---

## 2. Bootstrap on a new machine (do this first)

```bash
# 1) Clone
git clone https://github.com/bcvolker/slate360-rebuild.git
cd slate360-rebuild

# 2) Get secrets (NOT in git — see SECRETS_LOCATION.md)
# On Brian's machine they already exist at:
#   .local/ai-platform-backend/   and   .env.local
# On a new machine, Brian must copy that folder privately, then:
cp .local/ai-platform-backend/DEV_SECRETS.env .env.local

# 3) Modal CLI auth
cp .local/ai-platform-backend/modal.toml ~/.modal.toml   # Windows: %USERPROFILE%\.modal.toml
python -m pip install modal
python -m modal profile current   # expect: bcvolker

# 4) Vercel CLI auth
export VERCEL_TOKEN="$(grep '^VERCEL_TOKEN=' .local/ai-platform-backend/CLI_TOKENS.env | cut -d= -f2-)"
# Windows PowerShell:
#   $env:VERCEL_TOKEN = (Select-String -Path .local\ai-platform-backend\CLI_TOKENS.env -Pattern '^VERCEL_TOKEN=').Line.Split('=',2)[1]
npx vercel whoami   # expect: slate360ceo-8370

# Optional: restore Vercel CLI files to
#   Windows: %APPDATA%\com.vercel.cli\Data\auth.json + config.json

# 5) Install deps
npm install

# 6) Supabase CLI (linked project)
# SUPABASE_ACCESS_TOKEN is inside DEV_SECRETS.env / .env.local
npx supabase link --project-ref hadnfcenpcfaeclczsmm
```

**Windows note:** chain commands with `;`, not `&&`. Prefix Modal/Trigger CLI with `PYTHONIOENCODING=utf-8` (or `$env:PYTHONIOENCODING='utf-8'`) to avoid cp1252 emoji crashes.

---

## 3. GitHub — commit & push (live-main workflow)

Pre-user development works **directly on `main`**. Push → Vercel production deploy.

```bash
git pull --rebase origin main

# Stage EXPLICIT paths only — never `git add .`
git add path/to/file1 path/to/file2

git commit -m "$(cat <<'EOF'
Short why-focused message.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"

git push origin main
```

After push, verify production:

```bash
curl -s https://www.slate360.ai/api/deploy-info
```

**Do not touch without explicit approval:** billing/Stripe, middleware, entitlements, existing migrations, Trigger PDF rasterization unless the task is that work.

**Validation before push (Tier A):**

```bash
npm run typecheck:changed
npm run guard:architecture
npm run guard:design
npm run guard:file-size-regression
# For non-trivial slices also:
node scripts/ops/next-production-build.mjs
```

Full `npm run typecheck` often OOMs locally — use scoped `typecheck:changed` or a temp `tsconfig`; CI runs the full gate.

---

## 4. Vercel — env, deploy, inspect

| Item | Value |
|------|-------|
| Project | `slate360-rebuild` |
| Prod URL | https://www.slate360.ai |
| Whoami | `slate360ceo-8370` |
| Team | `slate360` (`team_sI0m72uIMs2FPbYIlkgp7RRS`) |

```bash
npx vercel whoami
npx vercel env ls production

# Pull prod env to a file (do not commit the pull)
npx vercel env pull /tmp/vercel-prod.env --environment=production

# Add/update a non-sensitive var (stdin pipes can write EMPTY — avoid them):
npx vercel env add NAME production --value="..." --no-sensitive --yes

# Replace a sensitive var: remove then re-add
npx vercel env rm NAME production -y
npx vercel env add NAME production --value="..." --no-sensitive --yes

# Deployments
npx vercel ls slate360-rebuild
curl -s https://www.slate360.ai/api/deploy-info
```

Normal app deploys = **git push to `main`**. Manual `vercel deploy --prod` only when explicitly needed.

---

## 5. Supabase — query, migrate, admin

| Item | Value |
|------|-------|
| Project name | `slate360-prod` |
| Ref | `hadnfcenpcfaeclczsmm` |
| API URL | `https://hadnfcenpcfaeclczsmm.supabase.co` |
| Linked locally | yes (`npx supabase projects list` shows linked) |

**Keys in `DEV_SECRETS.env`:**

- `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (server-only, bypasses RLS)
- `SUPABASE_ACCESS_TOKEN` (Management API / CLI)
- `POSTGRES_*` (direct DB when needed)

**Run SQL (preferred linked CLI):**

```bash
# Load token from .env.local first, or export SUPABASE_ACCESS_TOKEN=...
SUPABASE_TELEMETRY_DISABLED=1 npx supabase db query --linked -f path/to.sql
```

**Run a migration file via Management API script:**

```bash
# Windows CRLF gotcha: pass token explicitly if the script mis-parses .env.local
node scripts/run-migration.mjs supabase/migrations/YOUR_NEW_FILE.sql
```

**Rules:**

- Migrations are **additive only** — never edit already-applied migration files
- Prepare new SQL under `supabase/migrations/`; apply via Management API / linked query
- App clients: browser → `@/lib/supabase/client`; server → `@/lib/supabase/server`; admin → `@/lib/supabase/admin`

---

## 6. Trigger.dev — orchestrator

| Item | Value |
|------|-------|
| Project | `proj_ydquoejbfqidzbjioyno` |
| Runtime secret | `TRIGGER_SECRET_KEY` in `.env.local` |
| Task code | `src/trigger/**` |
| Config | `trigger.config.ts` |

**Deploy after any change under `src/trigger/`:**

```bash
# UTF-8 required on Windows
$env:PYTHONIOENCODING='utf-8'   # PowerShell
npx trigger.dev@latest deploy
```

**Critical:** `trigger.config.ts` uses `syncEnvVars(pickTriggerEnv)` — Trigger task env (including `MODAL_*_ENDPOINT`, R2 keys, Supabase service role) is synced from **`.env.local` at deploy time**.

So if you change a Modal endpoint:

1. Update `.env.local` **and** Vercel env
2. **Redeploy Trigger** (not only Vercel)

Tasks include: `thermal.process` / thermal extract, twin gaussian splat, tour ingest, content-studio ingest/render, design generate, etc.

---

## 7. Modal — GPU/CPU workers

| Item | Value |
|------|-------|
| Profile | `bcvolker` |
| Creds file | `~/.modal.toml` (from `modal.toml` in this folder) |

**Deploy matrix:**

| Worker dir | Typical app / label | Env var Trigger reads |
|------------|---------------------|------------------------|
| `workers/modal/thermal-analysis/` | `slate360-thermal-analysis` / `process` | `MODAL_THERMAL_ENDPOINT` |
| `workers/modal/twin-gaussian-splat/` | reconstruct endpoint | `MODAL_TWIN_ENDPOINT` |
| `workers/modal/tour-ingest/` | tour ingest | `MODAL_TOUR_ENDPOINT` |
| `workers/modal/content-studio/` | ingest + render | `MODAL_CONTENT_INGEST_ENDPOINT`, `MODAL_CONTENT_ENDPOINT` |
| `workers/modal/photogrammetry/` | ODM / geo / stats apps | twin / survey related |

```bash
cd workers/modal/thermal-analysis
$env:PYTHONIOENCODING='utf-8'
python -m modal deploy worker.py

cd ../twin-gaussian-splat
python -m modal deploy worker.py
```

After deploy, copy the printed HTTPS endpoint into:

1. `.env.local`
2. Vercel production env
3. Redeploy Trigger (`npx trigger.dev@latest deploy`)

Modal secrets (R2 + `GPU_WORKER_SECRET_KEY` + `SITE_URL`) live in Modal secret objects such as `slate360-thermal-worker` / `slate360-twin-worker` — values must match app env. See each worker’s `DEPLOY.md`.

---

## 8. Cloudflare R2 (+ AWS fallback)

Primary storage is **R2** (S3-compatible). Runtime selection is in `lib/s3.ts`.

Required env (already in `DEV_SECRETS.env`):

- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET` (e.g. `slate360-storage`)
- `R2_ENDPOINT` **or** `CLOUDFLARE_ACCOUNT_ID`
- `R2_REGION` (usually `auto`)
- Also present: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_R2_API_TOKEN*`

AWS keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_S3_BUCKET`, `AWS_REGION=us-east-2`) remain as fallback.

**Diagnostics:**

```bash
npm run diag:storage-runtime
npm run diag:storage-runtime:write
npm run diag:storage-runtime:presign
```

SlateDrop lists the `slatedrop_uploads` table (not `unified_files` as the primary browser list). DB deletes do **not** auto-delete blobs.

---

## 9. End-to-end “submit work” patterns

### A) Ship a Next.js UI/API change

```text
edit code → typecheck:changed + guards → commit explicit paths → push main
→ Vercel builds production → verify /api/deploy-info
```

### B) Change a Trigger task

```text
edit src/trigger/* → ensure .env.local has current MODAL_* endpoints
→ npx trigger.dev@latest deploy
```

### C) Change a Modal worker

```text
edit workers/modal/<app>/ → python -m modal deploy worker.py
→ update MODAL_*_ENDPOINT in .env.local + Vercel if URL changed
→ redeploy Trigger
```

### D) Apply DB schema change

```text
add NEW additive supabase/migrations/<timestamp>_name.sql
→ node scripts/run-migration.mjs <file>
  OR: SUPABASE_TELEMETRY_DISABLED=1 npx supabase db query --linked -f <file>
→ never rewrite old migration files
```

### E) Change a production env var only

```text
npx vercel env add/rm … production
→ for Trigger-consumed vars: also update .env.local and redeploy Trigger
```

---

## 10. Useful URLs & IDs (quick reference)

```
App:              https://www.slate360.ai
Deploy info:      https://www.slate360.ai/api/deploy-info
GitHub:           https://github.com/bcvolker/slate360-rebuild
Supabase ref:     hadnfcenpcfaeclczsmm
Supabase URL:     https://hadnfcenpcfaeclczsmm.supabase.co
Trigger project:  proj_ydquoejbfqidzbjioyno
Vercel project:   slate360-rebuild
Vercel team:      slate360 / team_sI0m72uIMs2FPbYIlkgp7RRS
Modal profile:    bcvolker
R2/S3 bucket:     slate360-storage
CEO email gate:   PRIMARY_CEO_EMAIL / CEO_EMAIL in secrets (Thermal Studio CEO-only)
```

---

## 11. Hard guardrails (do not violate)

- Never `git add .` — stage explicit paths
- Never hardcode brand hex — use CSS tokens (`guard:design`)
- Do not edit: entitlements, billing/Stripe, middleware, **existing** migrations
- Thermal Studio is CEO-only — no marketing/nav discoverability for other users
- Heavy processing stays on Trigger → Modal, not in the app shell
- Site Walk is the App Store–visible product; keep unfinished modules out of authenticated nav

---

## 12. Deeper docs in the repo

- `CLAUDE.md` — living backend access + deploy rules
- `AGENTS.md` — agent guardrails + validation tiers
- `SLATE360_LIVE_MAIN_WORKFLOW.md` — push-to-main workflow
- `_archived_context/slate360-context/BACKEND.md` — older service map
- `docs/SESSION_HANDOFF.md` — product state handoff
- Worker `DEPLOY.md` files under `workers/modal/*/`

---

## 13. Give this pack to another AI

Paste this instruction:

> Read `docs/ai-platform-backend/README.md`. Secrets are gitignored at `.local/ai-platform-backend/` (and `.env.local` on Brian’s machine) — see `SECRETS_LOCATION.md`. If those files are present, copy `DEV_SECRETS.env` → `.env.local` and install CLI auth from that folder. Test with `npx vercel whoami`, `python -m modal profile current`, and a Supabase linked query. Do not mint new API keys unless something is revoked. Do not commit secrets (GitHub push protection will block/revoke them). Work on `main`, push after verified slices, and redeploy Trigger when Modal endpoints or `src/trigger/**` change.

When launch approaches: **rotate all secrets** and delete `.local/ai-platform-backend/`.
