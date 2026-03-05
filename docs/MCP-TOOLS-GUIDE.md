# Slate360 — MCP Tools Setup & AI Usage Guide

**Last updated:** 2026-03-05
**Project:** `bcvolker/slate360-rebuild` · branch: `main` · live: https://www.slate360.ai
**For:** Owner, developers, and every AI assistant (Copilot, Grok, Claude, Gemini, etc.)

> **Read this before writing a single line of code on Slate360.**
> These tools prevent AI from creating tangled fixes, breaking mobile layouts,
> corrupting subscriptions, or touching live data unsafely.

---

## 1. What Is MCP and Why Does Slate360 Use It?

MCP (Model Context Protocol) is a standard that lets AI assistants directly query
live project knowledge instead of guessing from file contents alone.

Slate360 uses **three MCP servers**:

| Server | Type | What It Knows |
|--------|------|---------------|
| **GitNexus** | Local (runs on your machine) | Every file, component, import graph, which files depend on which |
| **Supabase** | Remote (mcp.supabase.com) | Live DB schema, table names, column names, RLS policies, migrations |
| **Vercel** | Remote (mcp.vercel.com) | Current deployment, env var names, build logs, preview URLs |

Without these, AI assistants work from stale assumptions. With them, every AI chat
starts with ground truth about the real running system.

---

## 2. One-Time Setup (Do This Once Per Machine)

### Step 1 — Install GitNexus globally
```bash
npm install -g gitnexus
```

### Step 2 — Build the local knowledge graph
Run from the repo root. Takes 30–60 seconds. Reads every file and maps all imports.
```bash
npm run mcp:setup
```
(This runs `npx gitnexus analyze && npx gitnexus setup` internally.)

Re-run this after any large refactor or when new modules are added.

### Step 3 — Add your tokens as shell environment variables

**⚠️ NEVER paste tokens into `.env.local` for MCP use — shell env vars only.**
`.env.local` is for Next.js runtime. MCP servers read from your shell environment.

**Where to get each token:**
- **Supabase token** → https://supabase.com/dashboard/account/tokens
  - Project ref: `hadnfcenpcfaeclczsmm`
  - Click "Generate new token" → name it `slate360-mcp` → copy immediately
- **Vercel token** → https://vercel.com/account/tokens
  - Click "Create" → name it `slate360-mcp` → scope: your team → copy immediately

**Mac / Linux — paste into your terminal:**
```bash
export SUPABASE_ACCESS_TOKEN="PASTE_YOUR_SUPABASE_TOKEN_HERE"
export VERCEL_TOKEN="PASTE_YOUR_VERCEL_TOKEN_HERE"
```

**To make them permanent (Mac)** — add both lines to `~/.zshrc` or `~/.bashrc`:
```bash
echo 'export SUPABASE_ACCESS_TOKEN="PASTE_YOUR_SUPABASE_TOKEN_HERE"' >> ~/.zshrc
echo 'export VERCEL_TOKEN="PASTE_YOUR_VERCEL_TOKEN_HERE"' >> ~/.zshrc
source ~/.zshrc
```

**Windows (PowerShell):**
```powershell
$env:SUPABASE_ACCESS_TOKEN = "PASTE_YOUR_SUPABASE_TOKEN_HERE"
$env:VERCEL_TOKEN = "PASTE_YOUR_VERCEL_TOKEN_HERE"
```

**Codespaces / Dev Container (this repo):**
Add them as Codespace secrets at https://github.com/settings/codespaces
under the names `SUPABASE_ACCESS_TOKEN` and `VERCEL_TOKEN`.
They will be injected automatically into every new Codespace session.

### Step 4 — Start the GitNexus MCP server
Leave this terminal open for your whole coding session.
```bash
npm run mcp:start
```
(This runs `npx gitnexus mcp` internally. The Supabase and Vercel MCP servers are
remote — they connect automatically via the tokens, no local process needed.)

---

## 3. The MCP Config File (`.vscode/mcp.json`)

This file is already committed to the repo. It tells VS Code and all AI tools
connected to it exactly which MCP servers to use.

```json
{
  "servers": {
    "gitnexus":  { "type": "stdio", "command": "npx", "args": ["gitnexus", "mcp"] },
    "supabase":  { "type": "sse",   "url": "https://mcp.supabase.com/sse",
                   "headers": { "Authorization": "Bearer ${env:SUPABASE_ACCESS_TOKEN}" } },
    "vercel":    { "type": "sse",   "url": "https://mcp.vercel.com/sse",
                   "headers": { "Authorization": "Bearer ${env:VERCEL_TOKEN}" } }
  }
}
```

`${env:SUPABASE_ACCESS_TOKEN}` and `${env:VERCEL_TOKEN}` are automatically replaced
by VS Code from your shell environment — no hardcoded secrets, ever.

---

## 4. npm Scripts Reference

```bash
npm run mcp:setup    # One-time: build/rebuild the GitNexus knowledge graph
npm run mcp:start    # Every session: starts the local GitNexus MCP server
```

---

## 5. Rules for ALL AI Assistants Working on Slate360

**Every AI chat must follow these rules.** They exist because Slate360 is a
professional SaaS platform with paying users, government-grade security requirements,
and iOS/Android store submissions in progress.

---

### RULE 1 — Check GitNexus Before Changing Any Shared Component
Before touching a component used on more than one page (`Navbar`, `DashboardClient`,
`SlateDropClient`, `MarketClient`, `ProjectToolLayout`, any `ui/` component), query
GitNexus to see every file that imports it. **One change to a shared component can
silently break 10+ pages.**

---

### RULE 2 — Mobile First, Always
Design order: **375px mobile → tablet → desktop**. Never design desktop-first and
shrink it down. Every new component must work at 375px width before any desktop
styles are added. Slate360 targets the iOS App Store and Google Play — cramped or
broken mobile UIs will cause store rejections.

- Use `sm:`, `md:`, `lg:` Tailwind prefixes in ascending order
- Avoid horizontal overflow: test with `overflow-x: hidden` on the root
- No fixed pixel widths on containers — use `w-full max-w-*` patterns

---

### RULE 3 — Subscriptions Touch Only `lib/entitlements.ts`
`lib/entitlements.ts` is the **single source of truth** for all tier/feature gates.

**NEVER write:**
```typescript
if (tier === 'business' || tier === 'enterprise') { ... }
```

**ALWAYS write:**
```typescript
const e = getEntitlements(user.tier);
if (e.canAccessHub) { ... }
```

The subscription system must stay purchase-ready for web (Stripe), Apple IAP, and
Google Play Billing without any refactoring. Inline tier checks make that impossible.

---

### RULE 4 — Server Does the Work, Not the Browser
Slate360 is specifically designed so users don't need powerful devices. Heavy
computation belongs in API routes or Supabase edge functions — **never in client
components**.

Move to server if you're about to write in a `"use client"` file:
- AI/ML calls
- Image processing or PDF generation
- Trading bot logic
- Map calculations or geocoding
- Bulk database reads

---

### RULE 5 — Security Is Non-Negotiable (Government-Grade)
- **Never** expose `SUPABASE_SERVICE_ROLE_KEY` or any secret to the browser
- **Every** API route must use `withAuth()` or `withProjectAuth()` from `@/lib/server/api-auth`
- **Never** bypass RLS policies "just for testing" — use the admin client only when
  there is no other option, and only server-side
- **All** user input must be validated server-side — never trust the client
- SQL injection, XSS, and SSRF are checked on every PR — see OWASP Top 10

---

### RULE 6 — No File Over 300 Lines
```bash
bash scripts/check-file-size.sh
```
Run before every commit. If adding code pushes any file over 300 lines, extract a
sub-component or hook first. The largest known debts are tracked in the Known Tech
Debt section of `SLATE360_PROJECT_MEMORY.md`.

---

### RULE 7 — Verify Table + Column Names via Supabase MCP
Before writing any Supabase query, confirm against the MCP:
- Table name is correct (`project_folders` not `file_folders` — migration in progress)
- Column names match the live schema exactly
- RLS policy permits the operation for the intended user role

Never assume a column exists because it appears in old code. Check migrations in
`supabase/migrations/` or query the Supabase MCP directly.

---

### RULE 8 — Never Re-Inline Extracted Components
If a sub-component file already exists, **NEVER** copy its JSX back into the parent.

Examples of files that must stay extracted and imported:
- `components/dashboard/market/MarketTabBar.tsx`
- `components/dashboard/DashboardWidgetRenderer.tsx`
- `components/slatedrop/SlateDropSidebar.tsx`
- `components/project-hub/ProjectToolLayout.tsx`

Re-inlining is the fastest way to re-create the tech debt this project spent months
removing.

---

### RULE 9 — Check Vercel MCP Before Touching Environment Variables
Before adding, renaming, or removing an env var:
1. Query Vercel MCP to see what's set in production
2. Confirm the variable is in both `Vercel Dashboard → Settings → Environment Variables`
   AND referenced correctly in the code
3. Never remove a var that production relies on without a deployment plan

Missing env vars cause silent production failures that work perfectly in dev.

---

### RULE 10 — Paper Mode Before Live Mode (Market Robot)
All Market Robot changes must be verified in paper trade mode before live mode.
Live mode submits real CLOB orders to Polymarket via HMAC-signed API calls and
touches real USDC on Polygon. It must never fire without explicit user confirmation
in the UI.

---

## 6. Troubleshooting

**GitNexus not starting:**
```bash
npm install -g gitnexus
npm run mcp:setup
npm run mcp:start
```

**Supabase MCP gives auth error:**
Your `SUPABASE_ACCESS_TOKEN` shell variable is not set. Run:
```bash
echo $SUPABASE_ACCESS_TOKEN   # should print your token, not blank
```
If blank, re-export the variable (Step 3 above).

**Vercel MCP connection refused:**
Verify your `VERCEL_TOKEN` has read access to the `bcvolker/slate360-rebuild` project.
Generate a fresh one at https://vercel.com/account/tokens.

**AI assistant isn't using MCP context:**
Explicitly prompt it: *"Before answering, check the GitNexus MCP for all files that
import this component."* Some assistants need to be reminded to use available tools.

**Codespaces — tokens not available after new session:**
Add them as Codespace Secrets at https://github.com/settings/codespaces (not repo
secrets — personal Codespace secrets). They inject automatically on every `gh codespace create`.

---

## 7. Key Files Every AI Must Know

| File | Purpose |
|------|---------|
| `SLATE360_PROJECT_MEMORY.md` | Master project memory — attach to every new AI chat |
| `slate360-context/NEW_CHAT_HANDOFF_PROTOCOL.md` | Full startup checklist for new AI sessions |
| `slate360-context/ONGOING_ISSUES.md` | Active bugs and tech debt |
| `lib/entitlements.ts` | Only place for subscription/tier logic |
| `lib/server/api-auth.ts` | `withAuth()` / `withProjectAuth()` — required in every API route |
| `lib/server/api-response.ts` | `ok()`, `badRequest()`, `serverError()` response helpers |
| `lib/supabase/admin.ts` | Admin client — server-only, never browser |
| `ops/bug-registry.json` | Machine-readable bug tracker |
| `supabase/migrations/` | DB schema history — truth source for table/column names |
| `.vscode/mcp.json` | MCP server configuration (this file's companion) |

---

*This guide is version-controlled. Update it whenever MCP servers change or new
platform-wide rules are added.*
