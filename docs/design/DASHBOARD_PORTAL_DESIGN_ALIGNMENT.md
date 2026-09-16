# Dashboard + Portal design-token alignment — decision needed

Status: **CONFIRMED 2026-09-15** — Brian: "For design and style and colors I would like to continue
using what we have on the new home page since it looks pretty nice so far." Treated as sign-off on
questions 1–2 below. Question 3 (build order) proceeding on the same basis — flag if that's wrong.
Written 2026-09-15 on `feature/dashboard-portal-alignment-2026-09`. Companion:
[DASHBOARD_PORTAL_AUDIT_2026-09.md](./DASHBOARD_PORTAL_AUDIT_2026-09.md).

## The question

The homepage rebuild shipped a new light design system (`--mkt-*` tokens in `app/globals.css`,
`docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md`) and Brian has said he wants that visual language
extended to his CEO dashboard and the client portal, both of which are currently on the dark
Graphite Glass system (`--graphite-*`). The homepage's own `app/globals.css` carries a deliberate
guardrail comment: *"Never mix `--mkt-*` into dashboard/app surfaces or vice versa"* — written to
prevent accidental blending until a real decision gets made. This doc is that decision.

## Recommendation: shared neutrals, per-surface accent — not a single wholesale swap

The dashboard and the portal have different constraints, so they shouldn't necessarily get
identical answers:

### CEO dashboard — adopt `--mkt-*` directly

The dashboard is Brian's own internal, single-tenant tool. There's no white-label/per-org branding
requirement here (that's a portal-only concept). Nothing blocks reusing `--mkt-canvas` /
`--mkt-surface` / `--mkt-ink` / `--mkt-ink-muted` / `--mkt-line` / `--mkt-accent` directly, the same
way the public auth pages already do. **Recommendation: adopt wholesale.** Simpler, one less token
system to maintain, and there's no case where a second "sibling" set would earn its keep here.

### Client portal — reuse the neutrals, keep the accent dynamic

The portal is externally-facing and already has a real, working per-org branding mechanism:
`lib/spatial-experience/brand.ts` resolves a client's own `accentColor`/logo (paid default = client
logo dominant + small Slate360 mark; no client logo → Slate360 branding), fed from a
`spatial_org_themes` DB row via an authenticated dashboard settings route
(`app/(dashboard)/spatial-walkthrough/branding/page.tsx` — see the audit, #6: this exists today but
is admin/CEO-only, not yet client-self-service, which is a separate, tracked gap from Brian's
2026-09-11 vision doc).

Hardcoding `--mkt-accent` (Slate360's fixed green) into the portal's interactive elements would
directly conflict with that mechanism — a client who sets their own brand color should see *their*
color on buttons/focus states, not Slate360's. **Recommendation: the portal reuses the `--mkt-*`
canvas/surface/ink/line neutrals (those aren't client-brand-specific — they're Slate360's own light
aesthetic and every client's portal should look and feel like the same clean, restrained product),
but interactive accent states keep resolving through the existing `--app-accent` /
`resolveProjectBrand` mechanism, not a hardcoded `--mkt-accent` reference.** This is additive to
what already exists — no rework of the branding resolver needed, just: portal components reference
`--mkt-canvas` etc. for their neutral surfaces going forward, and continue referencing the existing
brand-accent variable (whatever it's currently called in the portal's own CSS scope) for anything
interactive.

### What this means concretely

- Both surfaces get the same light canvas/surface/typography feel as the homepage — visually "one
  product," which is the actual goal.
- No sibling token set gets invented — avoids the "third half-finished design system" risk this
  sprint was explicitly set up to prevent.
- The `--graphite-*` system isn't deleted — mobile shell chrome, other still-dark surfaces, and
  anything not in scope for this sprint keep working unchanged. This is a scoped reskin, not a
  global retheme.
- The "never mix" comment in `app/globals.css` should be updated once this ships, to describe the
  new, deliberate scope (dashboard + portal now intentionally use `--mkt-*` neutrals) rather than
  being deleted outright — it's still correct that the two systems shouldn't blend *accidentally*.

## What's already true, verified 2026-09-15

The `--mkt-*` token block exists on `main` (merged via PRs #29/#30 into the homepage) but **not yet
on this branch** (`feature/aob205-spatial-experience-v3` predates that merge and never absorbed it —
a full `git merge origin/main` was attempted and aborted here because it collides with
forbidden-zone files under active development on the desktop track: `components/digital-twin/**`,
`hooks/useWalkthroughNavigation.ts`, iOS native capture — both branches modified those independently
and resolving those conflicts isn't this session's call to make). Instead, the token block itself
was copied verbatim into this branch's `app/globals.css` (inert until referenced — adds no visual
change on its own) so dashboard/portal components on this branch can start referencing it. When
this branch eventually merges, the real merge-vs-cherry-pick question for the *rest* of main's
commits is a separate, later problem — not blocking for design work done on this branch.

## Needs a yes/no from Brian

1. Dashboard → `--mkt-*` wholesale: **yes/no**
2. Portal → `--mkt-*` neutrals + existing dynamic brand-accent (not `--mkt-accent`): **yes/no**
3. OK to proceed with reskinning slices once 1–2 are confirmed, per the audit's ordering (fix the
   dead `capabilities.ts` gating wiring first since it's a correctness issue independent of tokens,
   then dashboard rebuild, then coordinate portal visual changes with the `feature/aob205-ux-polish-v3`
   session rather than duplicating its work): **yes/no**
