# Homepage — status handoff for the dashboard/portal overhaul chat

Written 2026-09-15. Paste this into the other (laptop/Cursor) chat so it has accurate, current
context on the homepage work before it starts on the dashboard + client portal.

---

## Where this lives

- **Worktree:** `C:\slate360-homepage-rebuild` — a dedicated git worktree, separate from
  `C:\s360` (which is Cursor's active tree — don't develop there for homepage work).
- **Live site:** https://www.slate360.ai — confirmed live and matching the latest commit below.
- All homepage work has been **merged into `main`** (not sitting on a stale feature branch) —
  the other chat can build on `main` directly for anything homepage-adjacent.

## What changed, chronologically

### 1. Full service-pivot rebuild (2026-09-10, PRs #29/#30, squashed into `main` at `2213b1f9`→`0c83c77e`)

Replaced the old self-serve-SaaS marketing site (subscriptions, trials, two-app pitch) with a
done-for-you reality-capture service pitch. Governed by `docs/design/HOMEPAGE_LIGHT_REBUILD_PLAN.md`.

- New light design system: `--mkt-*` CSS custom properties in `app/globals.css` (search `--mkt-`) —
  canvas `#FAFAF8`, surface white, ink `#1A2433`/`#5B6B80`, one accent `--mkt-accent` =
  `--mkt-brand-green` `#0C7A52`. **Scoped to the public homepage + auth pages only** — do not mix
  into dashboard/app surfaces (those stay on the dark `--graphite-*` Graphite Glass system) without
  a deliberate, documented decision — see the open item at the bottom.
- All-new component tree under `app/(public)/_components/`: `home-nav-light.tsx`,
  `home-hero-light.tsx` + `home-hero-viewer-panel.tsx` (expandable placeholder for a future
  interactive project example), `home-problem-light.tsx`, `home-what-you-get-light.tsx`,
  `home-portal-light.tsx`, `home-examples-light.tsx` (empty until real examples exist — renders
  nothing), `home-how-it-works-light.tsx`, `home-different-light.tsx`, `home-who-pricing-light.tsx`,
  `home-thermal-builds-light.tsx`, `home-contact-form.tsx`, `home-location-picker.tsx` +
  `useHomeLocationPicker.ts`, `home-footer-light.tsx`. Assembled in `app/(public)/page.tsx`.
- Deleted the old dark marketing components (`marketing-page.tsx`, `-hero.tsx`, `-faq.tsx`,
  `-pricing.tsx`, `-apps.tsx`, `-nav.tsx`).
- New contact-form backend: `app/api/site-visit-inquiry/route.ts` +
  `supabase/migrations/20260910180000_site_visit_inquiries.sql` (already applied in prod) +
  allowlisted in `ops/architecture-allowlist.json`.
- Auth pages restyled: `/login`, `/signup`, `/forgot-password`, `/reset-password` moved from dark
  Graphite Glass onto the light `--mkt-*` tokens (shared `auth-*` CSS utilities in
  `app/globals.css`), so the login gateway visually matches the public site. This is the one place
  dashboard-adjacent chrome already adopted the light system — contained because these are public
  gateway pages, not the authenticated app.
- Location picker: Google Maps (`@vis.gl/react-google-maps`), satellite/roadmap toggle, click-to-drop
  pin with reverse geocode, click-to-draw a property boundary, and a **clear-location control**
  (both in the search bar and on the resolved-address chip) — `clearLocation()` in
  `useHomeLocationPicker.ts`. `gestureHandling: "cooperative"` is already set on the `<Map>` in
  `home-location-picker.tsx` — this is Google's built-in fix for "scrolling the page with a finger
  accidentally pans the map": in cooperative mode, one-finger touch on mobile scrolls the page
  through the map (Google shows its own "use two fingers to move the map" hint), and desktop
  requires Ctrl+scroll to zoom. **This may already solve the accidental-pan concern below — verify
  on a real device before building something new.**

### 2. Two live bugs found + fixed via hands-on QA (same session)

- Autocomplete dropdown was reopening itself after selecting a suggestion (a `setInput()` call was
  re-triggering the search effect) — fixed with a `skipNextSearchRef` guard on all 4 programmatic
  `setInput()` call sites in `useHomeLocationPicker.ts`.
- Hero left an obviously dead gap on the right at desktop widths (`e585bf5c`) — later fully
  superseded by the two-column hero rebuild in the next slice.

### 3. Hero viewer panel + clear-location + login theming (still 2026-09-10, `5eff4e8e`, PR #30)

- Hero became two columns: pitch text left, an **expandable/closable, mobile-optimized placeholder
  panel** right (`home-hero-viewer-panel.tsx`) showing where a real interactive project example
  will eventually go. Dashed outline + icon, not a blank box.
- Copy is deliberately generic — does **not** say "your project" or name specific deliverable types,
  because only one real (permissioned) example will ever be featured, not something personalized
  per visitor. Get this nuance right if touching this copy again.

### 4. Polish pass (2026-09-15, PR #31, merged at `92a39fa4`, confirmed live)

- Portal preview slot (`home-portal-light.tsx`) now uses the same dashed-outline + icon "coming
  soon" treatment as the hero panel, instead of a flat gray box — it was reading as broken/empty to
  a first-time visitor.
- Added a visible hint next to the location field ("You can clear it and start over anytime with
  the × next to it.") — the clear control already existed and worked, it just wasn't discoverable
  before someone had picked a location.
- Reworded "Where a legal dimension is required, a laser still governs" (cryptic industry shorthand)
  into "Where a measurement needs to hold up legally, a licensed surveyor is still the standard —
  our tools are for planning, not certification." Same liability-hedging intent, plainer language.
- Subtle hover-lift + shadow + `focus-visible` rings added to the shared button classes
  (`MKT_L_BTN_PRIMARY` / `MKT_L_BTN_GHOST` in `marketing-styles-light.ts`) and the nav CTA — a small,
  low-risk "premium feel" pass, not a redesign.

I went through the rest of the page copy looking for confusing/internal-jargon language and didn't
find anything else that needs fixing — but a fresh pass against the current business plan doc
(below) is worth doing since I was checking for clarity, not strategic alignment.

## How to push changes to GitHub (the actual working flow used above)

```bash
cd C:\slate360-homepage-rebuild
git fetch origin main --quiet
git checkout main --quiet
git merge --ff-only origin/main   # IMPORTANT — see gotcha below
git checkout -b feature/<short-description>-$(date +%Y-%m-%d)
# ...make changes...
git add <explicit paths>          # never `git add .` / `git add -A`
git commit -m "..."               # husky/lint-staged auto-runs eslint --fix + a CSS brace check
git push -u origin feature/<branch-name>
gh pr create --base main --head feature/<branch-name> --title "..." --body "..."
gh pr merge <PR#> --merge --delete-branch=false
# Vercel auto-deploys main -> production. Confirm with:
curl -s https://www.slate360.ai/api/deploy-info
```

**Gotcha I hit today:** this worktree's local `main` branch ref can go stale — a bare
`git checkout main` switches to whatever the local ref last pointed at, which is not necessarily
`origin/main`'s current tip if other sessions have pushed since. Always `git fetch` +
`git merge --ff-only origin/main` (or just branch directly off `origin/main`) before starting new
work, or you'll silently branch from an old base and get confusing diffs.

**Gates before pushing** (from `CLAUDE.md`): scoped `tsc` via a temp tsconfig (bare `tsc --noEmit`
OOMs on this repo — see the note there), `node scripts/ops/check-design-guardrails.mjs`,
`node scripts/ops/check-architecture-guardrails.mjs`, and `node scripts/ops/next-production-build.mjs`
for non-trivial changes.

## Open items for your chat

1. **Marketing copy vs. current business plan** — do a fresh pass of all homepage copy against
   `docs/business/BUSINESS_PLAN.md` and whatever's changed since 2026-09-10. I checked for
   confusing/jargon-y language, not for whether the pitch itself still matches the business model —
   that's a different pass.
2. **Map selection UX** — the clear button already exists and works (search bar + address chip, now
   with a discoverability hint), and `gestureHandling: "cooperative"` is already set specifically to
   prevent one-finger scroll from panning the map. Before building anything new here: test it on a
   real phone and see if cooperative mode's behavior (and Google's own on-map hint) is actually
   intuitive enough, or if it needs a custom overlay/instruction on first load. Don't duplicate the
   clear-button work — it's done; focus on whether it's discoverable/obvious enough, and on the
   accidental-pan question specifically.
3. **Dashboard/portal design-token decision** — still open, see
   `docs/design/WEB_OVERHAUL_LAPTOP_KICKOFF_PROMPT_2026-09-11.md` if that hasn't already been acted
   on: whether dashboard/portal adopt `--mkt-*` wholesale or get a sibling system.
