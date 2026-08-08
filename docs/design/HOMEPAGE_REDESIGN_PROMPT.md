# Homepage Redesign Prompt — Service-First Repositioning

Copy everything below the line into a fresh chat (repo: `C:\s360`). Written 2026-08-08.

---

Redesign the Slate360 public homepage (and only the homepage + its nav/footer) to sell the
NEW business model. Work in `C:\s360`. Read these before writing any code, in this order:

1. `CLAUDE.md` — project rules, guardrails, deploy flow. Obey all of it.
2. `docs/design/TWIN_SERVICE_BUSINESS_CONTEXT.md` — the business model this page must sell.
3. `docs/design/TWIN_SERVICE_STUDIO_PLAN.md` §"COMMITTED" + Phase F/G notes — what actually
   exists today vs planned, so the page never promises unbuilt features ("feature theater"
   was flagged by three independent reviews as the #1 risk of this redesign).

## The business (what the page sells)

Slate360 is a professional reality-capture and digital-twin DOCUMENTATION SERVICE for
construction and institutional clients (GCs, universities, healthcare, commercial property).
Brian (ITC-certified thermographer, construction background) captures sites on location —
interiors and exteriors — processes them into interactive 3D walkthroughs, and DELIVERS them
through a branded client portal. The software is the delivery system, not the product:
clients get a link they can open, walk through, inspect, annotate, and re-share to their own
stakeholders under their own branding. Use cases to speak to: phase/stage documentation of
construction projects, pre/post condition records, inspection walkthroughs, as-built
visual records, dispute-proof documentation.

The visitor's takeaways, in priority order:
1. "They come to my site, capture it, and I get an interactive walkthrough I can actually use."
2. "I can hand it to my client/architect/owner under my own brand."
3. "This is documentation-grade: versioned, measurable, evidence-aware."
4. A clear next step: request a capture / book a walkthrough demo.

## Hard copy rules (locked — violating these is a review-blocker)

- Accuracy language: "estimating-grade" positioning ONLY (±2–5 cm room scale). NEVER
  "survey-grade", never permit/legal-measurement claims; critical dimensions get laser-verified.
- NEVER name consumer capture devices (no "iPhone", "Insta360", drone model names) in public
  copy. Say "professional multi-sensor capture" (LiDAR, 360° imaging, aerial photogrammetry).
- Interior and exterior walkthroughs are SEPARATE deliverables — never imply one seamless
  fused indoor/outdoor model.
- Do not promise: object recognition/counting, automatic quantity takeoff, section-cut
  "dollhouse" views, real-time collaboration, or square footage inside the client share link.
  (Floor plans + square footage exist as operator-produced exports — fine to show as a
  deliverable artifact, not as an interactive client feature.)
- No pricing on the page (unresolved). CTA is contact/booking, not checkout.

## What exists today (safe to show/say)

- Interactive 3D walkthrough share links: walk-through navigation, pins/annotations,
  measurements display, view-limited token-gated access, client branding on the share page.
- Version history: reprocessed/updated captures over time (phase documentation story).
- Floor plan exports (SVG/DXF) + square-footage figures produced by the service.
- PDF + interactive deliverables from the Site Walk product line.
- Thermal inspection capability exists but is NOT to be marketed on this page (CEO-only tool;
  the only public thermal surface is delivered reports).

## Placeholders to design for (assets arriving later — build the slots now)

- 2–3 embedded example walkthroughs (interior + exterior) — design a "sample deliverable"
  section that can embed a live share-link viewer or a captioned video/poster fallback until
  the real links are supplied. Ship with tasteful placeholder posters, no fake screenshots.
- Client-portal screenshots — design the section, ship with abstracted/illustrative mock
  frames clearly not pretending to be real UI, swap-ready.

## Design constraints

- Graphite Glass system, tokens only (`app/globals.css`): canvas `#0B0F15` via var, glass
  panels `bg-white/[0.04]` + hairline `border-white/10`, 12px radius, IBM Plex Mono uppercase
  labels, ONE accent per surface on interactive states only. Bans: amber, glow, rounded-full,
  hardcoded hex (guard:design enforces). Marketing page may breathe more than the app (larger
  type, more whitespace) but must read as the same brand.
- Responsive, fast, no heavy 3D on first paint (embed viewers lazily below the fold).
- Homepage scope: `app/page.tsx` and its components + public nav/footer. Do NOT touch
  dashboard, auth, entitlements, billing, middleware, or existing migrations.

## Process requirements

- Work in verifiable slices; after each slice run the scoped typecheck (see CLAUDE.md tsc
  note — bare tsc OOMs), `npm run guard:design`, `npm run guard:architecture`,
  `npm run guard:file-size-regression`; commit with explicit paths and push (push = live
  Vercel deploy).
- Never `git add .`. End commits with the Co-Authored-By trailer per CLAUDE.md.
- Before building, present a one-screen section-by-section outline (hero promise, how it
  works, sample deliverables, portal/branding story, who it's for, credibility, CTA) for
  Brian's approval — then build without further check-ins.
