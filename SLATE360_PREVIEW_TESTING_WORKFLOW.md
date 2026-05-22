# Slate360 Preview & Visual Testing Workflow

Use this guide to preview mobile/PWA changes on desktop and on a physical phone, and to know whether you are looking at **local**, **Vercel preview**, or **production**.

---

## Quick reference: where am I?

| Surface | How to tell | Typical URL |
|--------|-------------|-------------|
| **Local dev** | `npm run dev`, commit only on your machine | `http://localhost:3000/...` |
| **Branch pushed, no PR** | `git status` clean/ahead; no Vercel preview comment | Same as local until you open a preview |
| **Vercel PR preview** | GitHub PR → Vercel bot comment / Checks | `https://slate360-rebuild-*-slate360.vercel.app/...` |
| **Production** | `www.slate360.ai`, `main` merged & deployed | `https://www.slate360.ai/...` |

Run `npm run preview:info` after every Composer session for branch, commit, cache-bust suffix, and local URLs.

---

## A. Current dev/preview setup (audit)

### Package manager & dev server

| Item | Value |
|------|--------|
| Package manager | **npm** (`package-lock.json`; Vercel `installCommand`: `npm install --ignore-scripts`) |
| Dev command | **`npm run dev`** → `next dev` (port **3000** by default) |
| Production start | `npm run build` then `npm start` |

Not used in this repo: `pnpm dev`, `yarn dev` (no `pnpm-lock.yaml` / `yarn.lock`).

### Canonical local routes

| Path | Purpose |
|------|---------|
| `/app` | Mobile app shell (primary mobile entry) |
| `/site-walk` | Site Walk V1 home |
| `/dashboard` | Desktop dashboard (mobile UA redirects to `/app`) |
| `/login` | Auth; unauthenticated protected routes redirect here (307) |

Other useful routes: `/deploy-check` (shows `VERCEL_GIT_COMMIT_SHA` on preview/prod), `/m/diag` (service worker diagnostics).

### Vercel preview deployments

- Project: **slate360-rebuild** on Vercel (`vercel.json` present).
- **PR branches** typically get automatic preview deployments when the GitHub repo is linked to Vercel (standard Next.js integration).
- Preview URL appears in the **Vercel bot comment** on the PR after the first push to that branch.
- Same branch/PR usually keeps a **stable preview hostname**; new branches get new preview hostnames.
- Production: **https://www.slate360.ai** (`main` only — do not push directly to `main`).

### PWA / service worker (stale preview risk)

| Item | Detail |
|------|--------|
| Generator | **Serwist** (`@serwist/next`) — source `app/sw.ts`, output `public/sw.js` |
| Dev | SW **disabled** when `NODE_ENV === "development"` (`next.config.ts`) |
| Production/preview | SW built at deploy; registered from `components/providers/SWRegistrar.tsx` |
| Cache version | Hardcoded kill-switch: `2026-05-12-build-02` in `app/sw.ts` and `SWRegistrar.tsx` |
| Behavior | **Kill-switch worker**: on activate, clears all caches and **unregisters** itself (no fetch caching) |
| `/sw.js` CDN/browser | `Cache-Control: no-cache, no-store, must-revalidate` |
| HTML routes | `Cache-Control: public, max-age=0, must-revalidate` for non-static paths |

**Stale risk:** Home-screen PWA installed from an **old production** build can still show old assets until cleared. PR previews in a **private/incognito** tab avoid most SW bleed. Local dev has **no active SW** by default.

`/app` and `/site-walk` are **not** offline-cached by the current SW (no runtime fetch handler). Stale UI usually comes from **browser cache**, **installed PWA**, or **old tabs**, not route-level SW precache.

---

## B. Local desktop preview

1. **Start dev server**
   ```bash
   npm run dev
   ```
2. **Open**
   - http://localhost:3000/app
   - http://localhost:3000/site-walk
3. **Chrome or Edge DevTools**
   - Toggle device toolbar (Ctrl+Shift+M)
   - Presets: **iPhone SE**, **iPhone 14 Pro** (or custom 390×844)
4. **Optional cache-bust** (habit for preview parity)
   ```
   http://localhost:3000/app?v=<shortCommitHash>
   http://localhost:3000/site-walk?v=<shortCommitHash>
   ```
   Get hash: `npm run preview:info`

---

## C. Physical phone preview

### Option 1 — Vercel PR preview (recommended for “what will ship on this branch”)

1. Push branch and open/update a PR against `main`.
2. Wait for Vercel **Preview** deployment (green check).
3. Copy preview URL from the Vercel comment on the PR.
4. Open on phone (Safari/Chrome), preferably **private/incognito**:
   - `https://<preview-host>/app?v=<commitHash>`
   - `https://<preview-host>/site-walk?v=<commitHash>`
5. Confirm deployment: open `/deploy-check` on the same host and compare **Commit** to your branch HEAD.

### Option 2 — Local network (fast iteration while coding)

1. Start dev server bound to all interfaces:
   ```bash
   npm run dev -- --hostname 0.0.0.0 --port 3000
   ```
2. Find your PC’s LAN IP (e.g. `ipconfig` on Windows → IPv4).
3. On phone (same Wi‑Fi): `http://<LAN-IP>:3000/app` and `/site-walk`.
4. **Caveats:** Auth cookies are origin-specific; Supabase redirect URLs must allow your LAN origin if you log in locally. No Vercel edge behavior; SW disabled in dev.

### Option 3 — Production (after merge to `main` only)

- https://www.slate360.ai/app
- https://www.slate360.ai/site-walk

Use only to verify **released** behavior — not for in-progress branch work.

---

## D. Vercel preview links & cache busting

- **Same branch / same PR** → usually the **same** `*.vercel.app` hostname until the project is reconfigured.
- **New branch** → new preview hostname when Vercel first deploys that branch.
- **Always append** `?v=<shortCommitHash>` when sharing or bookmarking test URLs.
- If the UI looks stale:
  - Private/incognito tab
  - Hard refresh
  - Remove stale **Add to Home Screen** PWA
  - Check Application → Service Workers in DevTools
  - Bump is only needed on deploy when changing `KILL_SWITCH_VERSION` / `SWRegistrar` build id (coordinated release step)

**Production PWA vs preview:** A phone home-screen icon pointing at `www.slate360.ai` tracks **production**, not your PR preview. PR testing should use the `*.vercel.app` URL in a normal browser tab or private window.

---

## E. Avoid stale PWA / service worker caches

1. Use a **private/incognito** window for PR preview testing.
2. **Delete** old home-screen PWA if it pins production or an old preview.
3. **Force refresh** (pull-to-refresh on mobile Safari, or reload with cache disabled on desktop).
4. Add **`?v=<commitHash>`** to every test URL.
5. **Check SW:** DevTools → Application → Service Workers, or visit `/m/diag` when logged in.
6. **Production lag:** Merging to `main` does not update installed PWAs until users reload and the new deploy’s kill-switch/build id runs.

---

## F. Verify a deployment

1. **Vercel dashboard** — deployment status = Ready, correct branch & commit.
2. **Git** — `git rev-parse --short HEAD` matches Vercel / `/deploy-check` **Commit**.
3. **HTTP smoke** (local or preview base URL):
   ```bash
   npm run smoke:mobile-routes
   # or against preview:
   SMOKE_BASE_URL=https://your-preview.vercel.app npm run smoke:mobile-routes
   ```
4. **Manual curl** (unauthenticated):
   ```bash
   curl -sI "https://<host>/app"
   curl -sI "https://<host>/site-walk"
   ```
   | Status | Meaning |
   |--------|---------|
   | **307** → `/login?redirectTo=...` | Expected when not logged in |
   | **200** | Route served (often when session cookie present) |
   | **404** | Route missing or wrong deployment |
   | **500** | Runtime/server error — check Vercel logs |

---

## G. Required report after every Composer change

Copy this block into the session summary (or have the agent fill it):

```markdown
## Preview report
- **Branch:** 
- **Commit:** 
- **Pushed:** yes / no
- **PR:** #___ / none — link: 
- **Vercel preview URL:** 
- **Cache-busted /app:** `<preview>/app?v=<hash>`
- **Cache-busted /site-walk:** `<preview>/site-walk?v=<hash>`
- **Validation:** typecheck ☐  build ☐  guard:architecture ☐  smoke:mobile-routes ☐
- **Production touched:** no / yes (explain)
```

---

## H. NPM scripts

| Script | Purpose |
|--------|---------|
| `npm run preview:info` | Branch, commit, clean tree, local URLs, `?v=` suffix |
| `npm run smoke:mobile-routes` | HEAD `/app`, `/site-walk`, `/dashboard` (default `http://127.0.0.1:3000`) |
| `npm run dev` | Local Next.js dev server |
| `npm run test:e2e:mobile` | Starts dev on port 3111 and runs broader homepage/dashboard smoke |

Environment variables:

- `SMOKE_BASE_URL` or `PREVIEW_BASE_URL` — base URL for smoke script (no trailing slash).
- `PORT` — local port for `preview:info` (default `3000`).

---

## I. Do not use for preview

- Do not push directly to **`main`** for experiments.
- Do not treat **`/preview/*`** marketing/shell mock routes as Site Walk production surfaces.
- Do not rely on **Playwright** for quick route checks unless already running E2E — use `smoke:mobile-routes` first.
