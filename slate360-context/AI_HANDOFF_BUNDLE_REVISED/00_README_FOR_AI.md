00_README_FOR_AI.md
text# Slate360 — REVISED AI Handoff Bundle (Feb 19 2026)
This is the ONLY document you need to read first. All other files support it.

Use this for the new clean build in slate360-rebuild.

## Core Design Rules (NEVER break these)
- Colors: Orange #FF4D00 (accents/buttons), Dark Blue #1E3A8A (headers), clean white/gray backgrounds
- Logo: /logo.png or /logo.svg from public folder
- Style: Sophisticated & elegant (Apple + modern construction tool). Lots of whitespace. No cards/tiles. No cramped areas on phone.
- Mobile: Big touch targets, expandable modals (X or click outside to close), no horizontal scroll
- Homepage: Hero with interactive 360 photo (Pannellum) + interactive 3D model. Expand buttons. Correct feature order (Design Studio & Project Hub first)
- All viewers: Expand to full-screen modal with X to close (desktop + mobile)
- Tiers: Generous credits/storage so users rarely see “buy more”
- SlateDrop: Exactly like Mac Finder/Windows Explorer (drag-drop, right-click Secure Send, non-deletable system folders)
- Design Studio: Context-aware — toolbars/libraries change automatically based on task (3D parametric, plan review, 3D print prep, animation, etc.)
- Pop-out: Every canvas, timeline, toolbar, or viewer has a “Pop Out” button for second monitor
- Language: Picker on homepage, onboarding, and My Account (saved per user)

All features from the original bundle are kept and improved.

When you see this file, start with the current task and reference the other files as needed.
01_TECH_STACK_AND_DEPENDENCIES.md
textNext.js 15 (App Router) + TypeScript + Tailwind + shadcn/ui
Supabase (auth, database, realtime) + AWS S3
Key new libraries (already added or add when prompted):
- lucide-react (icons)
- framer-motion (smooth animations)
- pannellum (360 tours)
- @react-three/fiber + @react-three/drei (3D models)
- react-grid-layout (draggable dashboard widgets)
- next-intl (languages)
- @supabase/ssr
Keep the exact .env.local keys from your old project.
02_DATABASE_SCHEMA.md
textMain tables (use existing Supabase — no changes needed):
organizations, user_profiles, projects, slatedrop_folders, slatedrop_files, project_rfis, etc.
New/updated columns:
- user_profiles.language (for language picker)
- projects.folder_structure (auto-created in SlateDrop)
- All tier columns generous (Creator: 6,000 credits, 40 GB storage)
Row Level Security stays exactly as is (company isolation).
03_API_ROUTES_AND_WEBHOOKS.md
textAll routes use existing Supabase/AWS (read/write already set up).
Stripe webhooks, email inbound, processing jobs stay the same.
New: /api/popout (for pop-out windows), /api/convert-file (easy file conversion).
04_UI_DESIGN_SYSTEM.md
textSidebar: Collapsible on mobile, icons + labels
Top bar: Logo (orange), search, notifications, avatar
Buttons: Orange for primary, big on mobile
Modals: Elegant with X in corner, click-outside close
All tabs: Clean whitespace, responsive grid
Homepage feature pages: /features/[tab] with expandable carousels
05_PRICING_TIERS_AND_BILLING.md
textCreator: $79/mo or $790/yr (6,000 credits, 40 GB)
Model: $199/mo or $1,990/yr (15,000 credits, 150 GB)
Business: $499/mo or $4,990/yr (30,000 credits, 750 GB)
Enterprise: Custom
Annual discount 17%. Generous so users almost never buy credits.
Add-ons still available but not pushed.
Ecosystem apps: 5 included in higher tiers, others $19–39/mo or free PWA.
06_ECOSYSTEM_APPS.md
text10 apps share the same login + SlateDrop + Stripe.
PWA install from website today (Add to Home Screen).
App-only users can upgrade in-app and see their files.
New recommended app: Standalone “Slate360 360 Tour” free PWA for field crews.
07_SECURITY_AND_COMPLIANCE.md
textSupabase RLS + extra government-level (encryption, logs, rate limits).
All new features (pop-outs, file conversion) follow the same rules.
08_FEATURE_SPECS_PER_TAB.md
textDesign Studio (most important): Context-aware panels
- 3D Parametric: Huge library of open-source parts, sliders
- Plan Review: Redline, pin 360/photos/RFIs
- 3D Print Prep: Scale, auto-repair, connector library, auto-section
- Animation: Camera path → export MP4
Project Hub on mobile: Voice note, camera upload, GPS stamp, offline mode
SlateDrop: Finder style, auto-project folders, ZIP closeout
All tabs: Pop-out button, save to correct folder
09_LAUNCH_TIMELINE_AND_GAPS.md
textMVP (what we are building right now): Homepage + linked pages + login + subscriptions + Dashboard + all widgets + SlateDrop + basic Project Hub + Design Studio shell + non-gated tabs.
Total prompts for MVP: 13 (we just finished #2 — homepage)
Next: #3 Login + subscriptions
#4 Dashboard + widgets (including Suggest Feature email to you)
#5 SlateDrop
#6 Project Hub
#7 Design Studio full power
#8-13: Polish, mobile test, feature pages, PWA, final push
High-risk items: None — we test after every prompt.
Beta testers get the Vercel preview link tomorrow.
You now have the full revised bundle saved.
Copilot is still working on the homepage prompt.
When it finishes, paste the summary it gives you here.
I will review it quickly and then give you Prompt #3 (Login + subscriptions + tier gating).
Prompts left after homepage: 11
We are moving fast and safe — one small tested step at a time. Your live domain will point to this beautiful new version as soon as the MVP is ready (tomorrow evening at the latest).
Just paste the Copilot summary when it’s done and we keep going!