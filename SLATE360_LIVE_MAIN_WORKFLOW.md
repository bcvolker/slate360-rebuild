# Slate360 Live-Main Development Workflow

Last updated: 2026-05-21

## Summary

During **pre-user / early development**, we work **directly on `main`** and deploy to **Vercel production** so the owner can test on a real phone PWA without waiting for preview deployments.

**Live test surfaces:**

- https://www.slate360.ai/app
- https://www.slate360.ai/site-walk
- https://www.slate360.ai/dashboard

**Do not rely on Vercel preview URLs** unless explicitly requested.

---

## Why

- Preview deploys add latency and confusion when validating mobile shell, Site Walk V1, and PWA behavior.
- There are no external users on production yet; controlled pushes to `main` are acceptable with validation and a restore point.
- Faster feedback loop: push → production deploy → cache-busted URL on device.

---

## Restore point (created 2026-05-21)

| Type | Name | Commit |
|------|------|--------|
| Branch | `backup/pre-live-main-workflow` | `33ab09c0682c2ceb779269a9166c3a2278654d51` |
| Tag | `pre-live-main-workflow` | same |

**Rollback:** `git revert <bad-commit>` on `main`, or reset `main` to the backup branch (coordinate with team before force-push).

---

## Agent / developer rules

1. **Default branch:** `main` unless the user explicitly asks for a feature branch.
2. **No preview links** unless explicitly asked.
3. **Small, reversible commits** — one logical change per commit when possible.
4. **Validate before every push to `main`.**
5. **After push:** wait for Vercel production deployment, verify deploy metadata, provide cache-busted URLs.
6. **If production breaks:** identify the bad commit immediately and provide a revert plan (do not leave `main` broken overnight).

### Do not touch without explicit approval

- `components/site-walk/capture/**` (capture-v2)
- Supabase migrations
- Trigger.dev / plan rasterization jobs
- Billing / Stripe
- `middleware.ts` (unless the task is specifically route/auth work)
- Deleting legacy files

---

## Validation (required before push to `main`)

```bash
npm run typecheck
npm run build
npm run guard:architecture
```

On Windows (no bash), use:

```bash
npm run guard:file-size-regression
```

Or, if bash is available:

```bash
bash scripts/check-file-size.sh || true
```

Do not push if `typecheck` or `build` fails.

---

## After push to `main`

1. Wait for **Vercel production** deployment (GitHub → Vercel integration on `main`).
2. Confirm live commit:

   ```bash
   curl -s https://www.slate360.ai/api/deploy-info
   ```

   Expect `commit` to match your pushed `main` SHA.

3. Optional: open https://www.slate360.ai/deploy-check (human-readable deploy marker).

4. Provide **cache-busted production URLs** in the task report:

   ```
   https://www.slate360.ai/app?v=<short-sha>
   https://www.slate360.ai/site-walk?v=<short-sha>
   https://www.slate360.ai/dashboard?v=<short-sha>
   ```

   Use the first 7–12 characters of the commit hash for `<short-sha>`.

5. **Phone / PWA testing:** hard-refresh or close-reopen the installed PWA after deploy; service worker may cache — use query param `?v=` to bust HTML cache.

---

## Required report format (every task)

| Field | Content |
|-------|---------|
| Branch | Usually `main` |
| Commit hash | Full or short SHA pushed |
| Files changed | List or summary |
| Validation results | typecheck / build / guard:architecture |
| Pushed to main | yes / no |
| Vercel production deployment status | commit from `/api/deploy-info` |
| Production test URLs | cache-busted `/app`, `/site-walk`, `/dashboard` |
| Rollback plan | `git revert <sha>` or restore `backup/pre-live-main-workflow` |

---

## When to use feature branches again

Use a feature branch (and optional PR) for:

- Large backend changes
- Supabase migrations
- Auth / middleware changes
- Billing / Stripe
- Trigger.dev / heavy processing
- Destructive refactors
- Anything that could affect real users after public launch
- Work that must not ship to production until reviewed

Merge to `main` only after validation and explicit approval for high-risk areas.

---

## Production deploy verification

| Endpoint | Purpose |
|----------|---------|
| `GET /api/deploy-info` | JSON: `commit`, `branch`, `now` |
| `/deploy-check` | Human deploy marker page |

Example production check (PowerShell):

```powershell
Invoke-RestMethod https://www.slate360.ai/api/deploy-info
```

---

## Related docs

- `SLATE360_PROJECT_MEMORY.md` — product context
- `SLATE360_PARALLEL_BUILD_RULES.md` — parallel build + mobile quarantine
- `AGENTS.md` — agent guardrails (updated for live-main)
