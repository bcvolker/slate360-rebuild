# Granting backend access to Claude Code **web** sessions

Status: **ACTION REQUIRED** · Written 2026-07-26 after diagnosing a blocked session.

## Why a web session differs from the desktop CLI

`CLAUDE.md` states the session "runs on Brian's machine at `C:\s360`" with every backend CLI
already authenticated. That is true of **Claude Code CLI running locally on Windows**. It is not
true of **Claude Code on the web**, which runs each session in a disposable cloud container:
a fresh `git clone`, no `~/.modal.toml`, no `.env.local`, no Supabase login, and a restrictive
outbound network policy.

Both are "Claude Code." Only one of them is on the machine that holds your credentials.

## Diagnosis performed 2026-07-26 (what is actually missing)

| Layer | Status | Evidence |
|---|---|---|
| CLI availability | ✅ **Solvable in-session** | `pip install modal` succeeds → `modal client version: 1.5.3`. PyPI and npm are allowlisted. |
| Credentials | ❌ Absent | No `~/.modal.toml`, no `.env*` beyond `.env.example`, zero matching env vars, no mounted secrets, `~/.aws/config` has no keys. Supabase CLI: `Access token not provided`. Modal CLI: `Token missing`. |
| **Network policy** | ❌ **BLOCKING — fix this first** | Proxy returns **HTTP 403 on CONNECT** for `*.supabase.co`, `api.supabase.com`, `api.modal.com`. `curl` gets HTTP 000. Only npm/PyPI/GitHub/Anthropic are permitted. |
| MCP servers | ❌ Only `github` | `ListMcpResourcesTool` returns github UI resources exclusively — no database tooling. |

**The network policy is the real wall.** Credentials alone would not help: the gateway refuses the
connection before any authentication happens. Fix order is **policy → credentials → CLIs**.

## Recommended fix: teleport, don't reconfigure

**If you work locally (Cursor, terminal) on the machine that holds the credentials, do NOT
configure the cloud environment.** Pull the cloud session down to that machine instead:

```bash
cd C:\s360
claude --teleport            # interactive picker, or: claude --teleport <session-id>
```

Teleport checks out the cloud session's branch and loads its **full conversation history** into
your local terminal, where Claude Code already has Supabase, Modal, Vercel and R2 authenticated.
Nothing to allowlist, no credentials to copy, no keys to rotate afterwards.

Other ways into the same thing: `/teleport` (or `/tp`) inside a running CLI session; `/tasks`
then press `t`; or **Open in CLI** in the web interface, which copies the command for you.

Caveats:
- Requires the Claude Code CLI signed in to the same claude.ai account.
- Handoff is **one-way**: work continued locally does not flow back into the web session. That
  is harmless here because everything is committed and pushed to the branch.
- Commit or stash local changes first; you will be prompted otherwise.

Configure the cloud environment (below) only if you want **web or mobile** sessions to reach the
backend autonomously — e.g. kicking off a deploy from your phone. For desk-bound work it is
strictly more setup and more secret-handling for no gain.

## Alternative fix: configure the cloud environment

### 1. Network policy (required)

Web-session egress is governed by the **environment's network policy**, chosen when the
environment was created. The current policy denies the backend hosts. Change it to a policy that
permits, at minimum:

```
*.supabase.co          # project REST/DB endpoints (ref: hadnfcenpcfaeclczsmm)
api.supabase.com       # Supabase Management API / CLI
*.modal.com            # Modal control plane
*.modal.run            # deployed Modal endpoints (e.g. bcvolker--reconstruct.modal.run)
*.r2.cloudflarestorage.com   # R2 (S3 API) — only if the session must touch storage
api.vercel.com         # only if the session must deploy or read env
```

Settings live with the Claude Code environment configuration, not in this repo. Docs:
https://code.claude.com/docs/en/claude-code-on-the-web

### 2. Credentials as environment variables

**No new keys need to be generated.** These values already exist in Vercel production; copy them
rather than minting replacements. On the local machine, `npx vercel env pull .env.prod
--environment=production` dumps them for copying (delete the file afterwards). The exception is
Modal: its tokens live in `~/.modal.toml`, not Vercel, so either copy from there or mint a token
at modal.com/settings/tokens.

Environments support configured environment variables. Add the minimum set for the task at hand —
**do not paste secrets into chat**; put them in the environment config, where they are injected
into the container rather than written into a transcript.

For **Supabase** (schema migrations, benchmark queries):
```
NEXT_PUBLIC_SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY      # server-side only; never exposed to the browser
SUPABASE_ACCESS_TOKEN          # only if the `supabase` CLI is used rather than direct SQL
```

For **Modal** (worker deploys, experiment dispatch):
```
MODAL_TOKEN_ID
MODAL_TOKEN_SECRET
MODAL_TWIN_ENDPOINT
GPU_WORKER_SECRET_KEY          # HMAC signing for worker callbacks
```

Names come from `.env.example`, which is the canonical list.

### 3. CLIs (self-service once 1 and 2 are done)

Installable from inside the session — no action needed from you:
```
pip install modal                 # verified working
npx supabase@latest ...           # npx-resolved
npm i -g vercel                   # only if Vercel access is granted
```

## Least-privilege note

Grant the narrowest set that unblocks the work. For the current Twin 360 phase, **Supabase alone**
is enough to apply the migration and list benchmark captures. Modal is only needed to deploy the
worker and dispatch A/B arms. Vercel and R2 are not required at all right now.

Service-role keys bypass RLS entirely. If a web session is granted one, treat that session's
transcript as sensitive and rotate the key if anything looks wrong.

## If access is not granted

The work does not stop — it splits:
- **Buildable without backend access:** all application and worker code, migrations (written here,
  applied by you), typechecking, guards, docs. This covers Phase 0 and all of Phase 4.
- **Requires access:** applying migrations, deploying Modal/Trigger, dispatching A/B arms, and
  anything whose acceptance test is "the built image responds" (all of Phase 1).
