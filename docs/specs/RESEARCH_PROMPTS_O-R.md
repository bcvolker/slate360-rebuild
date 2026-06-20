# Research Prompts O–R (self-contained for AIs without repo access)

Each prompt embeds the context an external AI needs (it cannot see our code). Stack: Next.js 15 /
React 19 / Supabase (Postgres + RLS) / Tailwind / Zustand / Trigger.dev + Modal for heavy compute /
S3-R2 storage / Capacitor + PWA (Serwist). Design system = "Graphite Glass": dark canvas `#0B0F15`,
per-app accent CSS vars (Site Walk/platform `#00E699`, Twin 360 `#3D8EFF`), text white/`#F8FAFC`/
muted `#A3AED0`, **amber/orange banned**, no decorative glow, no `rounded-full` outside chips, sharp
~4px radii, glass surfaces with backdrop-blur. Three apps share one shell: a Slate360 platform shell
+ Site Walk + Twin 360 (plus SlateDrop files, Reports, Coordination). Mobile-first, but every
feature also has a fuller desktop version.

---

## Prompt O — Unified design system, chrome & navigation across a multi-app product
You are a senior product designer + design-systems engineer. A mobile-first PWA (also a desktop web
app) hosts several "apps" under one shell (a platform launcher + a field-capture app + a 3D-capture
app + a files app + a reports surface). It currently has inconsistent headers, toolbars, and
navigation between these apps. Design a **unified system** with: (1) a **token architecture** (dark
"Graphite Glass" theme, per-app accent via CSS variables, typography scale, spacing, elevation,
glass surfaces); (2) a **two-layer chrome model** — bottom nav = "which app am I in" (a **platform
nav** that **swaps to module-specific tabs with an accent strip** when you enter an app), top header
= context (title/breadcrumb, a **Back vs Exit** contract where Exit is confirmed when data is at
risk, sync status, profile, a token-balance chip); and a **capture/immersive mode** that strips both
layers to a floating glass control pill. (3) A **component inventory** (header, bottom nav, sidebar,
card, list row, data table↔list, tabs, sheet/bottom-sheet, context menu, FAB, toast-with-undo,
confirm dialog, empty state, selection-mode action bar) with **mobile↔desktop parity** (same token/
API, responsive layout). (4) A **navigation state model** that prevents deep sub-routes from
highlighting the wrong tab, and a route-manifest/guard approach so unentitled or unfinished routes
**redirect** instead of showing dead buttons or bare 404s. Provide concrete patterns, wireframe
sketches (ASCII ok), and a recommended file/component structure. Cite comparable apps (Procore,
Autodesk Build, Fieldwire, Linear, Notion) where useful.

## Prompt P — Token/credit wallet + pre-flight estimate UX for metered cloud compute
You are a SaaS UX + billing-systems expert. A construction app meters expensive cloud GPU work
(3D reconstruction, thermal analysis, AI transcription/enhancement, PDF rendering) with **tokens**
(1 token = 1 backend credit). Subscriptions include a generous monthly token allowance (where margin
lives); **extra tokens are sold at cost** (loss protection, not profit). There's a **14-day trial
that must be hard-capped** (card required, token ceiling, job size/count limits, watermarked/low-res
outputs) so trial floods can't drain compute budget. Design the **mobile + desktop UX** for: a
**token wallet** (balance, monthly allowance/used/remaining, reset date, usage history, buy-more,
auto-refill); a **pre-flight estimate-and-confirm** shown before every metered action ("this twin
≈120 tokens, you have 750"); a graceful **insufficient-balance → buy-more** path; **trial caps** and
how to communicate reduced quality without killing conversion; and **low-balance** nudges. Provide
the estimate-modal interaction, the wallet IA, copy examples, and how to keep all pricing numbers
**config-driven**. Note B2B vs consumer differences.

## Prompt Q — Enterprise admin console (seats, permissions, oversight) for B2B construction SaaS
You are an enterprise B2B product architect. A construction platform needs a **desktop-only** admin
console for organizations that buy multiple seats across several apps. Design: (1) **member
management** (invite/deactivate, org roles owner/admin/member/viewer); (2) **seat & license
management** (assign/revoke per-app seats, seats used/available, add seats, custom enterprise seat
counts via a quote flow, not self-serve checkout); (3) a **permissions matrix** (per member × per
project role × per-app access × per-folder view/upload/download/manage) that's legible at a glance
with drill-down; (4) **oversight/audit dashboards** built from existing usage events (who captured
what, when, which project; token consumption by member/project/app; deliverables/reports created;
share views) with CSV/PDF export; (5) an **org token pool** with per-member/per-project caps + alerts.
Provide IA, dashboard layouts, the permission-matrix interaction, and an enterprise onboarding/quote
flow. Reference Procore/Autodesk/Okta-style admin consoles.

## Prompt R — Shared-project information architecture across multiple capture apps
You are a product architect for field-construction software. Multiple apps (a 2D photo/site-walk
app and a 3D digital-twin app) must operate on the **same shared Project**. A Project owns: identity
(name, client, job number, status, dates), **branding** (logo, accent color), **location** (address,
lat/lng, optional site boundary), **floor plans** (PDFs), **team + permissions** (incl. external
collaborators), and a **shared folder/file tree**. Design the **information architecture + UX**
(mobile + desktop) for: a **project hub/detail** (tabs: Overview, Walks, Twins, Plans, Files, Team,
Reports, Settings) with a prominent capture CTA; **how each shared field flows into both apps and
into generated deliverables** (e.g. logo → report covers and 3D-viewer chrome; location → indoor
photo re-localization, maps, weather; plans → both walk overlays and twin georeferencing); a fast
**create-project** flow (mobile quick-form during "start walk" vs full desktop wizard); and a
recommendation on **merging "Workspace" vs "Project"** (treating an ad-hoc walk as belonging to a
default "General" project). Provide IA diagrams, the carry-over map, and create-flow wireframes.

---

### How to use the returns
Send back any prompt's response (patterns, IA, wireframes, code) and it will be folded into the
matching spec: O → `UI_NAV_BRANDING_UNIFICATION.md`, P → `TOKEN_UX.md`, Q → `ENTERPRISE_CONSOLE.md`,
R → `PROJECT_SPINE.md`.
