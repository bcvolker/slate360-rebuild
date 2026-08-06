# Reference — Business Model Shift Context (service-first repositioning)

**Status:** CONTEXT ONLY — no execution scheduled. Captured 2026-08-05 so the
reasoning behind [TWIN_SERVICE_STUDIO_PLAN.md](TWIN_SERVICE_STUDIO_PLAN.md) is
traceable even though the homepage/marketing rebuild itself is explicitly
**not** in scope right now. Brian: "you don't need to worry about doing any
of that now but I want you to be aware of all of this."

## The shift (locked business direction, not yet executed on the public site)

| Was (live today) | Becomes (target) |
|---|---|
| Sell two SaaS apps (Site Walk, Twin 360) + free trials + credit pricing | Sell an on-site reality-capture + digital-twin **documentation service** — Brian (or trained field staff) captures, processes, cleans, and delivers |
| Software is the product | Software is the **delivery system**: client portal, version history, white-label re-share, exports |
| DIY / consumer-device marketing language | **Professional multi-sensor capture only** — never name consumer phones or low-cost cameras in marketing |
| Primary CTA: Start free trial | Primary CTA: Request a site documentation proposal |
| Secondary, if anything: none | Secondary band: "we can also implement the capture+delivery system for internal teams" (systems/implementation, kept quiet and low on the page) |

**Clients:** contractors and institutional owners (universities, healthcare,
commercial GCs) who hire Brian to capture and document interior/exterior
conditions, then use the resulting twins for project documentation and visual
coordination — and who need to hand pieces of that off to *their own* clients,
architects, and trade partners.

## Why this matters for the twin build (cross-reference to the locked plan)

Three independent AI panels converged on the same three-layer client
experience — and it maps **exactly** onto phases already locked in
[TWIN_SERVICE_STUDIO_PLAN.md](TWIN_SERVICE_STUDIO_PLAN.md):

| Marketing layer (what clients will be told they get) | Build phase that actually delivers it |
|---|---|
| "Interactive, cleaned digital twins" | Phase A′ (edit_list on shares — done) + Phase B (quality) |
| "Client portal: open any version, timeline, pins/measurements, download packages" | **Phase G** (client portal) |
| "Mint your own branded share links for owners/architects/trades" | **Phase F4** (Deliver tab: branding_snapshot, link management) + **Phase G3** (client-managed re-sharing) |
| "Floor-plan derivatives, areas, export packages" | **Phase F3** (floorplan.py/openings.py wiring) |
| "Raw capture assets retained for evidentiary value" | Already true today (SlateDrop bridge) — **Phase G2** exposes it as a client-facing export |
| "AI assistant for basic Q&A" | **Phase H** |

This is a strong signal the studio plan is scoped correctly — no changes to
the phase plan are needed because of this business context. It does mean the
**bar for F4/G/H is now "marketing-promise-grade,"** not just internally
useful: whatever copy eventually ships on the homepage must not describe
portal/re-share/export capabilities beyond what those phases actually deliver
(all three AI responses flagged "feature theater" — promising DXF/portal/
white-label chrome before the code exists — as the single biggest risk of a
SaaS→service pivot).

## Locked marketing/product-copy rules (propagate into F4/G/H UI copy later)

- **Accuracy language never changes**: estimating-grade, ±2–5 cm typical at
  room scale, never survey/permit-grade, verify critical dimensions with a
  laser. This is already the locked rule in the studio plan (§0.5) — the
  business-context docs independently re-derived the identical constraint.
- **No consumer-device language, anywhere client-facing.** Internal build
  docs can keep saying "iPhone + LiDAR" (that's the real hero capture
  recipe) — but portal copy, share-page chrome, and any future marketing
  surface must describe it as "professional multi-sensor capture," never
  name the phone.
- **Interior ‖ Exterior stay federated, not fused** — same rule already
  locked in the studio plan (§0.6). Do not let future portal/marketing copy
  imply one seamless indoor+outdoor model exists.
- **Client portal = "client portal," not "sign in" / "dashboard" in a SaaS
  sense** — frames Phase G as an outcome of hiring the service, not a
  self-serve software purchase.

## What is explicitly NOT happening right now

No homepage, nav, pricing, or public-site changes are scheduled. The three
attached AI responses (positioning plan, homepage structure/hero concepts,
site-wide audit of `app/(public)/**`) are preserved here as **future
reference** for whenever Brian says to execute the marketing rebuild — likely
as its own `M0–M4` slice sequence per those responses' own recommendation,
running in parallel with (not blocking) the twin studio phases above. If that
work starts, read this doc plus the three response transcripts Brian pasted
(2026-08-06) for full context before touching `app/(public)/**`.
