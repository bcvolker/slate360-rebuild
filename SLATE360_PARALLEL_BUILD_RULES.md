# Slate360 Parallel Build Rules

Last updated: 2026-05-21

Use with `SLATE360_PROJECT_MEMORY.md`, `SLATE360_LIVE_MAIN_WORKFLOW.md`, and `docs/SLATE360_GRAPHITE_GLASS_DESIGN_SYSTEM.md`.

## Live-main development

During pre-user development, agents push validated changes to **`main`** → Vercel **production** (not preview). See `SLATE360_LIVE_MAIN_WORKFLOW.md` for validation, deploy verification, cache-busted URLs, and rollback.

**Agent instruction:** Work on `main` by default; small commits; validate before push; provide cache-busted production URLs after deploy. Use feature branches only for high-risk changes.

## App-centric routing

| Audience | Home | Command center |
|----------|------|----------------|
| Desktop browser | `/dashboard` | Dashboard V3 shell (standalone) |
| Mobile / PWA | `/app` | `CommandCenterContent` inside `AppShell` |

## Mobile route quarantine (Phase 1)

Mobile users must **not** land on legacy desktop-first UI from direct URLs or in-app links.

**Redirect to `/app?blocked=<module>`** (shows `MobileComingSoonSheet` with explanation):

| Route | `?blocked=` value |
|-------|-------------------|
| `/projects`, `/project-hub` | `projects` |
| `/slatedrop` | `slatedrop` |
| `/settings` | `settings` |
| `/my-work` | `my-work` |
| `/coordination` | `coordination` |
| `/my-account` | `account` |

**Redirect to `/site-walk`** (Site Walk V1 home):

- `/site-walk/deliverables`, `/site-walk/reports`, `/site-walk/slatedrop`, `/site-walk/more`, `/site-walk/plans`

**Still allowed on mobile:** `/site-walk`, `/site-walk/setup`, `/site-walk/walks`, `/site-walk/capture`, `/more` (Account Hub).

Policy source: `lib/mobile-route-policy.ts` + `middleware.ts`.

## Desktop route policy

Desktop users keep existing routes unless already blocked by Phase 1 middleware (hidden apps, project-hub sub-tabs).

## Product boundaries

- **Site Walk** is the first core app.
- **SlateDrop** is shared filesystem infrastructure — not an app tile.
- **Project Hub** is legacy — not a current app. Do not add mobile links to `/project-hub`.
- Higher-tier project/workspace tools belong in **future Site Walk** functionality, not a separate Project Hub app.

## Shell consistency

- Mobile platform + module shells: `MobileAppShell`, `MobileTopBar`, `MobileBottomNav`, `MobileShellBrandMark`.
- Do not introduce per-page mobile headers or duplicate bottom navs.
- Site Walk V1 tabs must not `router.push` into legacy sub-routes until replacement UI ships (use `MobileComingSoonSheet`).
- New parallel build screens must not import or reuse legacy desktop page components.

## Do not touch without explicit approval

- `components/site-walk/capture/**` (capture-v2)
- Dashboard V3 layout (unless task says otherwise)
- Digital Twin
- Trigger.dev / plan rasterization
- Supabase migrations / billing backends
- Deleting legacy files
