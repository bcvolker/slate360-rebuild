# Slate360 Parallel Build Rules

Last updated: 2026-05-20

Use with `SLATE360_PROJECT_MEMORY.md` and `docs/SLATE360_GRAPHITE_GLASS_DESIGN_SYSTEM.md`.

## App-centric routing

| Audience | Home | Command center |
|----------|------|----------------|
| Desktop browser | `/dashboard` | Dashboard V3 shell (standalone) |
| Mobile / PWA | `/app` | `CommandCenterContent` inside `AppShell` |

## Mobile route quarantine (Phase 1)

Mobile users must **not** land on legacy desktop-first UI from direct URLs or in-app links.

**Redirect to `/app?blocked=<module>`** (shows `MobileComingSoonSheet`):

- `/projects`, `/project-hub`, `/slatedrop`, `/settings`, `/my-work`, `/coordination`, `/my-account`

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

## Do not touch (parallel tracks)

- `components/site-walk/capture/**` (production capture — capture-v2 not started)
- Dashboard V3 layout/components
- Digital Twin
- Trigger.dev / plan rasterization
- Supabase migrations / billing backends
