# How to give a Claude Code **web** session real backend access

Status: **ACTION REQUIRED — Brian only** · 2026-07-27
Audience: Brian, who does not code and works by copy-paste. **No terminal, no commands.**

This is the answer to *"is there something I can get you so you can do it yourself?"*
**Yes — two settings in a web form.** You never type a command and you never paste a secret into
a chat.

---

## What is actually wrong (30 seconds)

A web session runs in a throwaway cloud computer, not on your Windows machine. Two things are
missing there, and **both** must be fixed or nothing changes:

1. **The network is locked down.** GitHub is allowed. Supabase, Modal and Vercel are blocked at
   the gate — the connection is refused before any password is even offered.
2. **The logins aren't there.** Your credentials live on your Windows machine, not in the cloud.

Fixing only #2 changes nothing: a key is useless if the door is welded shut. That is why pasting
secrets into a chat would leak them *and* still fail.

---

## The fix — 10 minutes in the browser

### Step 1 — open the environment editor

1. Go to **<https://claude.ai/code>**
2. Find the **cloud icon** showing the current environment's name (near where you start a
   session). Click it — a list of environments opens.
3. **Hover over** the environment used for this project. A **settings (gear) icon** appears on
   the right. Click it.

You are now in the environment dialog. It has: **Name**, **Network access**, **Environment
variables**, **Setup script**.

### Step 2 — open the network

In **Network access**, change the selector from **Trusted** to **Custom**.

An **Allowed domains** box appears. Paste exactly this, one per line:

```
api.modal.com
*.modal.com
*.modal.run
api.supabase.com
*.supabase.co
api.vercel.com
vercel.com
api.trigger.dev
*.r2.cloudflarestorage.com
```

**Tick the box that says "Also include default list of common package managers."** Without it you
lose npm, PyPI and GitHub, and the session breaks entirely.

> Prefer less thinking? Choose **Full** instead of Custom. It allows every domain. For a
> pre-launch project with keys you are rotating before launch anyway, that is a reasonable
> trade — and it is one click instead of nine lines.

### Step 3 — add the logins

In **Environment variables**, paste the block below **with the real values filled in**. They are
on your machine in `.local/ai-platform-backend/CLI_TOKENS.env` and `DEV_SECRETS.env`.

```
SUPABASE_ACCESS_TOKEN=
SUPABASE_DB_PASSWORD=
MODAL_TOKEN_ID=
MODAL_TOKEN_SECRET=
VERCEL_TOKEN=
VERCEL_ORG_ID=
VERCEL_PROJECT_ID=
TRIGGER_SECRET_KEY=
```

Rules that matter:
- **One `KEY=value` per line.**
- **No quotes around the values.** Quotes get stored as part of the value and everything breaks.
- **No spaces around the `=`.**
- Delete any line you cannot find a value for. A blank value is worse than a missing one.

`MODAL_TOKEN_ID` and `MODAL_TOKEN_SECRET` are inside `modal.toml` — they may be written there as
`token_id` and `token_secret`.

### Step 4 — save, then start a **new** session

Click save/done.

**This is the part people miss:** every session gets a fresh computer, so **the session you are
currently in will not pick up these settings.** Start a **new** session on the same repository.
The existing conversation stays where it is.

### Step 5 — hand the new session this one line

```
Verify backend access: run `npx vercel whoami`, `python -m modal profile current`, and a
Supabase linked query. Then read docs/ops/EXECUTE_ON_LOCAL_MACHINE.md and run it top to bottom
on the branch claude/dronedeploy-reconstruction-analysis-py2toz. Report results per its §6.
```

If all three verifications pass, that session can do everything itself from then on — migrations,
Modal deploys, experiments — with no further involvement from you.

---

## One thing to know before you do it

Anthropic's documentation states plainly:

> Environment variables and setup scripts are stored in the environment configuration,
> **visible to anyone who can edit that environment.**

For a solo pre-launch project this is fine, and you already plan to rotate every key before
launch. Two sensible precautions:

- **Do this on the environment for this project only**, not a shared/organization environment.
- **Rotate these keys at launch**, exactly as the runbook already says.

This is still far safer than pasting keys into a chat: a settings field is stored config, whereas
a chat message is permanent transcript.

---

## If you would rather change nothing

You already have a working path that needs no setup at all, because **the other Claude Code chat
runs on your Windows machine and already has every login.**

Paste this to *that* chat:

```
Read docs/ops/EXECUTE_ON_LOCAL_MACHINE.md on the branch
claude/dronedeploy-reconstruction-analysis-py2toz. Check out that branch, then execute the file
top to bottom. Every step has a verification command — run it and report the output. Stop and
report if any verification fails rather than continuing. Do not promote any experiment arm to
default; that needs Brian's visual comparison.
```

That is one copy-paste and it needs nothing new from you. The trade-off is that the work happens
in that chat rather than this one — the code and results land in the same repository either way.

**Both paths are fine. Doing nothing is the only bad option**, because five of the seven
outstanding steps are blocked on backend access no matter who runs them.
