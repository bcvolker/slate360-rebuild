# AI Delegation Prompts (June 2026)

Copy-paste prompts for offloading work to Composer (Cursor, has repo access — implements
directly) and Grok (no repo access — generates specs/code from context provided in the
prompt). Claude Code reviews/integrates everything and runs gates + deploys.

---

## Standing header for EVERY Composer task

> Before any work: read `AGENTS.md`, `docs/design/GRAPHITE_GLASS.md`, and
> `components/studio-ui/app-home-tokens.ts`. Rules: amber/orange accents are BANNED
> (`npm run guard:design` must pass); colors only via CSS vars (`--graphite-*`,
> `--twin360-blue`, `--mobile-shell-accent`) — never raw hex in components. Validate every
> slice with `npm run typecheck:changed -- <paths>`, `npm run build`,
> `npm run guard:architecture`, `npm run guard:design`. Small single-concern commits,
> individual file staging (no `git add .`), commit messages `fix(scope): ...` /
> `feat(scope): ...`. DO NOT touch `components/capture-v2/**`, `components/digital-twin/**`,
> or `components/site-walk/capture/**` (V1, preserved) — another agent owns those. Do not
> push without showing the diff summary first.

## Composer task 1 — My Account rebuild
Rebuild the My Account / settings area. `components/settings/AccountSettingsClient.tsx` is
legacy (amber-era, has a missing-options bug). Build a new settings surface on Graphite
Glass: profile (name, email, photo), security/password, notification preferences,
organization settings, subscription & credits summary (read-only Stripe portal link),
account deletion (existing AccountDeletionPanel flow in `app/(dashboard)/more/_components/`).
Mobile-first inside the `/app` shell; desktop reuses same components in wider layout. Wire to
the existing API routes/supabase queries the old client used — UI rebuild, not a backend
change. Delete the legacy file once the new surface fully replaces it and remove its entry
from `ops/design-allowlist.json`.

## Composer task 2 — Auth screens de-amber
Restyle login / signup / forgot-password / reset / verify / pending-verification pages to
neutral graphite glass with the gradient S-mark logo (`components/shared/SlateIcon.tsx`) and
`--graphite-primary` CTAs. No layout rebuild — color/token sweep + polish. The auth shared
styles live in `app/globals.css` ("Auth Page Shared Styles" section). Remove cleaned files
from `ops/design-allowlist.json` (run `node scripts/ops/check-design-guardrails.mjs --update`).

## Composer task 3 — Email templates de-amber
`lib/email-theme.ts` (+ `lib/email-assignments.ts`, `lib/email-collaborators.ts`) still use
amber. Restyle to graphite header/footer, accent CTA `#00E699`, neutral body. Keep table-based
email-safe HTML. Update allowlist after.

## Composer task 4 — SlateDrop auto-folder backend (NO UI)
Implement the project folder taxonomy from `docs/ops/` Grok spec / memory: on project
creation, auto-create the numbered folder tree (01_Project_Info … 05_Team_Shared with
documented subfolders); add auto-routing so Site Walk captures (photos/notes/voice memos) and
Twin assets (.spz models, clips) land in the right subfolder with
`YYYY-MM-DD_HH-MM_[Type]_[ID].ext` naming. Backend/API only — do not mix UI changes
(AGENTS.md rule). Feature-branch this (touches persistence).

## Composer task 5 — Dashboard scaffold from IA spec
Using the dashboard IA spec (sidebar: Dashboard / Projects / Site Walks / Digital Twins /
SlateDrop / Team / Billing; home = real-count stat bar + recent projects/walks/twins
sections): build the desktop sidebar shell + dashboard home with REAL Supabase counts only —
no fake metrics, helpful empty states. Project detail page = header + Overview tab only in
this pass (other tabs are follow-up slices).

---

## Grok prompts (no repo access — paste the context pack below into each)

### Context pack (include with any Grok CODE-generation prompt)
> Stack: Next.js 15 App Router, React 19, TypeScript, Tailwind v4. Dark theme via CSS vars:
> canvas `#0B0F15` = `var(--graphite-canvas)`; accents `var(--graphite-primary)` (#00E699,
> Site Walk/platform green) and `var(--twin360-blue)` (#3D8EFF, Twin); text
> `var(--graphite-text-header)` #FFF, `var(--graphite-text-body)` #F8FAFC, muted
> `var(--graphite-muted)` #A3AED0; borders `var(--mobile-app-card-border)`. Glass surface
> class: `border border-[var(--mobile-app-card-border)]
> bg-[color-mix(in_srgb,var(--graphite-canvas)_76%,transparent)] backdrop-blur-md`. Radii:
> rounded-xl/rounded-2xl. NEVER use amber/orange/yellow. Icons: lucide-react. Components are
> "use client" function components with typed props; min tap target 44px; mobile viewport
> 390×844 with safe-area insets. Output complete .tsx files with mock-data props clearly
> marked `// TODO wire:` where backend data plugs in.

### Grok prompt D — My Account spec (feeds Composer task 1)
Spec the My Account section for a construction SaaS (dark graphite glass, mobile + desktop):
profile, security, notifications, organization branding, subscription & credits, team
overview, account deletion. Per section: fields, validation, save model (auto-save vs
explicit), empty/error states, mobile vs desktop layout. Output screens in build order.

### Grok prompt E — Twin wizard submission flow spec
Spec the mobile wizard for submitting a digital-twin processing job: review captured clips →
add data (360 photos, drone footage; future map-picker for surrounding context) → quality
level (Draft/Standard/High) → live credit calculator (base + per-asset + quality multiplier,
"X credits · ~Y min", insufficient-credits → top-up path) → confirm → processing status.
Blue accent #3D8EFF. Screen-by-screen layout + calculator update behavior.

### Grok prompt F — Walk review screen spec
Spec the end-of-walk review screen: stop grid (photo, title, note/memo indicators), per-stop
quick edit, walk metadata, actions (share, export later, done). Mobile 390×844 graphite
glass, green accent.

### Grok prompt G — Project creation wizard UI (CODE, use context pack)
Generate the mobile project-creation wizard: step 1 name/address/description; step 2 team
invites (email chips); step 3 confirm + "folders that will be created" preview (numbered
folder tree); success screen. 3-step progress header, glass cards, green CTAs. Complete .tsx
files with typed props and `// TODO wire:` markers.

### Grok prompt H — SlateDrop browser UI (CODE, use context pack)
Generate a mobile file-browser screen set: folder grid/list with numbered project folders,
breadcrumb bar, file rows (icon by type, name, date, size), upload FAB, search bar,
empty states, storage-usage ring header. And a desktop variant: left folder tree + right
file table. Mock data props, `// TODO wire:` markers.

**Integration note for Grok code → Composer:** give Composer the Grok output with: "Adapt
this into `components/<area>/`, replacing mock props with real data per the TODO markers,
verify against docs/design/GRAPHITE_GLASS.md, run the standard gates."
