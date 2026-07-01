# UI/UX Overhaul Backlog (2026-06-30)

Consolidated from a UI/UX expert agent + desktop-dashboard, twin-viewer, and dead-UI sub-audits. Brian's
directive: treat the **current build as a rough draft** and elevate it to a **top-tier, elegant, expert-designed
construction-tech platform** (not vibe-coded). Design system = Graphite Glass (dark `#0B0F15`, translucent glass
`bg-white/[0.04]`+blur+hairline, 12px radius, IBM Plex Mono labels, ONE accent per surface used ONLY on
interactive states, 48–72px field targets; bans: amber/gold, glow, `rounded-full`, hardcoded hex, scrolling-list-as-nav).

## CRITICAL (fix first — visibly broken or core-workflow gaps)
1. **Desktop light/dark collision** — `DashboardDesktopShell.tsx:62` forces the dark canvas but never sets `.dark`
   / `color-scheme: dark`, and `:root` is `color-scheme: light`. Native `<select>`, date pickers, scrollbars render
   **light-on-dark** (white popups); shadcn components may be pulling `:root` (light) vars → the "washed-out/cheap"
   look. FIX (needs preview verification — `.dark` also flips Tailwind `dark:` variants + activates the canonical
   `.dark` var block): add `.dark` to the shell root and verify the whole cockpit renders correctly. **Do NOT ship blind.**
2. **Post-completion discoverability** — after a twin/deliverable finishes there's no surfaced way to view/edit/crop/
   clean/share from the object itself. The twin **Edit/Crop tool** (`DesktopSplatEditor`, a real non-destructive
   editor with undo via layer toggle/remove) is **desktop-only + flag-gated + `hidden md:block`** — invisible from
   the viewer, zero affordance on phone (`DesktopWorkspaceLinks.tsx:10,21`). FIX: an always-visible "Edit / Clean
   up" CTA in the twin viewer header (visible-but-locked with "open on desktop" hint on phone). Same for dashboard
   cards (`DashboardTwinsContent`/`DashboardHomeContent:160` are single flat Links — add status-aware Share/Edit/Open).

## HIGH
3. **Opaque zinc cards masquerading as glass** — `CustomizableWidgetBoard.tsx:173` uses `--surface-zinc` (#27272A flat
   gray) while stat/list cards use `bg-white/[0.04]`. Two card fills → inconsistent/un-premium. Standardize on ONE
   translucent glass token.
4. **Three parallel "primary button" systems in Twin alone** — `twinAccent.button` (soft accent FILL — violates
   accent-only-on-interactive), `twinSubmitTokens.primaryCta` (solid fill), and inline `style={{background:BLUE}}` on
   the submit screen. Unify to one CTA treatment (tinted-accent-on-interactive, never a fill).
5. **Three toolbar idioms in the twin viewer** — `TwinViewerControlsOverlay` (40px icon cluster) vs `TwinShareToolStrip`
   (text pills) vs `TwinMeasureTool` (third). The authenticated viewer has NO on-canvas overlay (controls stacked
   below in a scroll). Unify to one toolbar; give the authed viewer the same on-canvas overlay as the share viewer.
6. **Banned amber/gold hardcoded hex (live)** — `TwinCaptureGuide.tsx:144` `#EAB308`; `twin-capture-polish-tokens.ts:93,95`
   `#22C55E`/`#EAB308`; `DashboardProjectsRail.tsx:66,114` `#fca5a5`; `InboxTabs.tsx:52,66,68` `#6EA7A0`. Replace with
   tokens; introduce a `--danger`/`--caution` token (there's no shared danger token — red drifts across the app).
7. **Sidebar nav is an unbounded scrolling list** (~14 CEO items, `DashboardDesktopSidebar.tsx:51` `overflow-y-auto`) —
   banned. Group into labeled sections (Workspace / Studios / Account); pin account/billing to a fixed footer.
8. **CEO/staff nav items silently dropped** — `DashboardDesktopShellGate.tsx:29-37` doesn't thread `showOpsConsole`/
   `isCeo` → sidebar filters out Thermal/Ops/Tours. Thread them through.
9. **Two divergent "recent item" components** — home `RowLink` rows vs workspace grid cards, different date formats
   ("Jun 30, 2026" vs "Jun 30"). Extract one shared item component + one date formatter.
10. **Twin submit flow clarity** — `TwinSubmitStepSources.tsx:109-122` "Surrounding context / 3D tiles" is an **inert
    info card** (no picker) yet reads like an action; the purpose of upload-other-files, how quality→tokens and
    context→credits/time work is opaque. Redesign the submit flow: clearer labels, show the credit/time delta live per
    choice, mark inactive features "Coming soon", fewer clicks.

## MEDIUM
11. `window.prompt`/`window.confirm` for rename/delete (`DashboardProjectsRail.tsx:23,44`) — replace with glass modals.
12. No loading/skeleton states in the dashboard board; error states are bare red lines with no retry.
13. `rounded-full` — `DashboardProjectsRail.tsx:73` (+ badge), `DeliverableSlideshow.tsx:79,88` (nav arrows). Use `rounded-xl`.
14. Nested scroll-in-scroll on the dashboard home (`CustomizableWidgetBoard.tsx:164,224` + shell) — collapse to one scroll owner.
15. Ad-hoc per-component toasts (`DesktopSplatEditor`, `TwinShareAnnotateShell`) — extract one glass toast primitive.
16. Splat editor: no empty/first-run coaching, no disabled-until-ready tool states, no unsaved-changes guard.
17. Cross-app parity: the twin share viewer has no "present/slideshow" mode while Site Walk `DeliverableSlideshow` is a
    polished cinematic viewer — a twin-link recipient gets a bare canvas. Align share chrome across both.
18. Export MP4 stub (`CinematicCameraPath.tsx:81`) — honest "not wired" but should be a labeled "Coming soon".

## Branding / customization (Brian's explicit asks — new feature area)
19. **Editable deliverable title** — SHIPPED (owner viewer inline title editor, commit 4d378487).
20. **Logo overlay on the viewer** (size / opacity / position) — MISSING entirely (grep `logoOpacity|logoScale|logoPosition`
    = 0 hits). Org branding form exists (`BrandSettingsForm` → `/api/site-walk/branding/settings`: header/footer/logo/
    colors) but the viewer only shows a tiny corner `senderLogo`. Build an adjustable logo overlay + project/org
    branding settings, managed from BOTH apps (Twin 360 + Site Walk). See the branding prompt in SESSION notes.
21. **Tier-gated white-label** — higher tiers show the subscriber's branding to stakeholders; default to Slate360 when none.

## Themes for the redesign (top-10 highest-impact)
Desktop `.dark` fix · Edit/Clean CTA on viewer · one glass-card archetype · one primary-CTA treatment · one twin
toolbar · kill amber + add danger token · sectioned non-scrolling sidebar · unified recent-item component · submit-flow
clarity (live credit/time deltas + "coming soon" on inactive) · logo overlay + white-label branding.

## How to execute
These need **preview-verified** implementation (auth-gated app — the sandbox can't log in; verify via `/preview/*`
harnesses + DOM measurement). Sequence: (a) desktop `.dark` + glass-card token unification (biggest visual lift),
(b) discoverability CTAs, (c) toolbar/button unification + danger token + amber purge, (d) submit-flow redesign,
(e) branding/logo-overlay + white-label. Related: [[slate360-design-system]], [[slate360-unified-shell]].
