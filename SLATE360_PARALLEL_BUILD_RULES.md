# Slate360 Parallel Build Rules

Last updated: 2026-05-21

Use with `SLATE360_PROJECT_MEMORY.md`, `SLATE360_LIVE_MAIN_WORKFLOW.md`, and `docs/SLATE360_GRAPHITE_GLASS_DESIGN_SYSTEM.md`.

## Live-main development

During pre-user development, agents push validated changes to **`main`** → Vercel **production** (not preview). See `SLATE360_LIVE_MAIN_WORKFLOW.md` for validation, deploy verification, cache-busted URLs, and rollback.

**Agent instruction:** Work on `main` by default; small commits; validate before push; provide cache-busted production URLs after deploy. Use feature branches only for high-risk changes.

## Product boundaries (unchanged)

- **Site Walk** is the first core app.
- **SlateDrop** is shared filesystem infrastructure — not an app.
- **Project Hub** is legacy — not a current app.
- Higher-tier project/workspace tools are future **Site Walk** functionality.

## Do not touch without explicit approval

- `components/site-walk/capture/**` (capture-v2)
- Dashboard V3 layout (unless task says otherwise)
- Digital Twin
- Trigger.dev / plan rasterization
- Supabase migrations / billing backends
- Deleting legacy files
