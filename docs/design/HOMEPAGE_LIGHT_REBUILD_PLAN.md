# Slate360 Homepage — Light Professional Rebuild Plan (v11)

**Status:** REVISED after Brian's direct follow-up on v10 (pricing tone, measurement language,
nav login placement, and a new interactive location-picker + attachment spec for the contact
form). This is the version to build from once Brian gives the go-ahead.
**Supersedes:** v10 of this document for the sections changed below (pricing, measurement
language, nav/login, contact form). Everything else in v10 stands unchanged.
**Still canonical:** `docs/business/BUSINESS_PLAN.md`, `docs/design/WEBSITE_REFRAME_PROMPT.md`.

---

## 0. What changed from v10, and why

1. **Pricing copy drops all contract/PO language.** Brian doesn't want that register at all — replaced
   with a plain "contact for pricing" approach, framed around scope/schedule, not procurement process.
2. **Measurement language softened further, and the term "estimation-grade" is retired as a
   marketed label.** No formal "grade" terminology anywhere. Describe the capability plainly (rough,
   reference-only measurement tools in the viewer) instead of naming an accuracy tier.
3. **Login moves to the far top-right of the nav**, in its own clearly secondary position — a real,
   working login form, with no public account-creation path, and no accounts behind it yet (by
   design — Brian isn't taking official clients yet). The page should read as "this exists and
   works for real clients" without inviting anyone to try to sign up.
4. **The contact form gains two new pieces:** an optional file/photo attachment, and an interactive
   satellite location picker (search an address, drop/drag a pin, or outline the property) — full
   spec in §4. This also gives Brian exact coordinates to check airspace restrictions before
   agreeing to any aerial work, which is a real operational need, not a decoration.
5. **General tone shift, applied across the whole site:** plainer, warmer, less legal/procurement-
   sounding language everywhere — this round's changes (pricing, measurement, and the login note)
   are all instances of the same underlying instruction, so it's stated once here as a standing
   principle for anyone writing final copy: **prefer plain, human sentences over formal or
   technical-sounding terms**, while keeping every hard commercial rule intact underneath.

---

## 1. The 60-second test — unchanged, still governs everything

> "This guy visits my job site, captures it himself, and gives me an interactive record I can use
> to manage the project and show my own client — I don't do any of the capturing myself."

---

## 2. Visual system — unchanged from v10

Light canvas, graphite ink, cobalt accent used only on interactive states, serif headlines / sans
body, no decorative icon tiles, no dark band, real photography where imagery is used, 48px+ touch
targets, high contrast for outdoor mobile reading. See v10 §2 for full detail — nothing here changed.

---

## 3. Section-by-section (only the changed sections are detailed below; everything else — hero,
problem beat, what-you-get, portal, how-it-works, examples, who-it's-for, thermal, builds line,
footer — stands exactly as written in v10)

### 3.1 Nav (revised) — including the logo/header sizing fix

Layout, left to right: **Logo** · center-right nav links (Client portal anchor · How it works) ·
then, at the far right, **two visually distinct elements**:
- **"Request a site visit"** — the bold primary button, sits closer to center-right.
- **"Login"** — small, secondary, all the way at the top-right corner. Plain text or a small
  icon + "Login," not styled as a competing call to action. This is the standard place users
  expect account access to live, and keeping it visually quiet (vs. the bold primary CTA) signals
  correctly: "this is for people who already have access," not "sign up here."

**Logo sizing — the specific fix for the "header was too thin for the logo" problem.** A common,
well-tested pattern on professional B2B sites is a header bar in the 72–96px range on desktop, with
the logo mark sized to roughly 45–55% of that height — leaving genuine breathing room above and
below rather than the logo touching the edges. This plan uses **a 78px-tall bar with a 40px-tall
logo** (about a 51% fill ratio), which is squarely in that range — proportionate, not cramped, and
nowhere near the "thick, distracting" header Brian is also trying to avoid. On scroll, the bar
compresses smoothly to **62px with a 31px logo** (the same ~50% ratio, just smaller), which is a
normal, expected behavior on marketing sites and keeps more screen available for content once a
visitor is reading rather than just arriving. The wordmark text scales alongside the icon at every
size, so the two always read as one balanced unit rather than the icon and text drifting out of
proportion with each other. This was already specified this way in the plan for exactly the
reason Brian raised — confirming it here concretely rather than leaving it implicit.

### 3.2 Login page (new)

A real, working login form — reuses the same authentication the rest of the app already runs on
(Supabase Auth), not a fake or disabled-looking page. What makes it correct for this stage:

- **No "Create account" or "Sign up" link anywhere on the page.** The only account-creation path
  is Brian manually provisioning a client org once he takes on a real client — which is already
  the locked model (one "Portal login" entitlement-routes clients to their portal and Brian to his
  own operator dashboard; no public self-serve signup, per the original handoff).
- Because no client accounts exist yet, nobody can actually sign in — that's expected, not a bug,
  and nothing needs to be artificially disabled to achieve it.
- **Add one honest, helpful line under the form:** something like *"Portal access is set up when
  you begin a project with us,"* with a link back to **"Request a site visit"** instead of a dead
  end. This turns a would-be failed-login moment into another path back into the funnel.
- Visually: same light/professional system as the rest of the site — a clean, single-purpose page,
  not a stripped-down afterthought. It should look like a real product's login page, because it is
  one.

### 3.8 (revision) What makes it different — measurement row only

Replace the earlier "estimation-grade" row with plain, tool-focused language, no grade/accuracy
terminology at all:

> **Measurement tools built into the viewer** — useful for getting a rough sense of scale and
> distance while reviewing a space. Not a substitute for a formal survey.

Same underlying protection as before (never implies exact/certified/survey-grade), phrased as a
plain description of a feature rather than a named accuracy tier. This same plain phrasing should
replace "estimation-grade" everywhere else it appeared (footer disclaimer included — see below).

### 3.11 (revision) Pricing approach — no contract/PO language

Full replacement. Short, warm, no procurement register at all:

> Every project is different — pricing depends on the size and scope of the site, how often you
> need it revisited, and what the project needs documented. Reach out and we'll put together a
> quote. [**Get a quote**] *(anchors to the contact form)*

No mention of contracts, purchase orders, or invoicing. No numbers. This section can be short —
one paragraph plus the button — it doesn't need to justify itself at length.

### 3.13 (revision) Contact form — new fields and new interaction

Base fields unchanged from v10: Name, Company, Phone, Email, When you need us there, What's
happening on site, optional notes. **New, this round:**

- **Attachment (optional):** a single file upload — a photo of the site, a plan, anything useful
  for context. Accept images and PDFs, reasonable size cap (e.g. 15MB). See §4.2 for the build
  approach.
- **Location (replaces a plain address field):** the interactive picker in §4 — search an address,
  drop or drag a pin on a satellite view, or outline the property. Falls back gracefully to typing
  an address if someone doesn't want to use the map.

Confirmation state unchanged: plain "Thanks — we'll follow up within one business day," no account
creation.

### 3.14 (revision) Footer accuracy line

Replace with plain wording matching §3.8's change:

> *"Measurement tools in the viewer are for general reference, not a formal survey."*

**Confirming the full footer, since Brian asked directly:** yes — logo, Portal login, a real
contact path (phone/email), **Terms**, **Privacy**, service-area line, and the accuracy line above.
Terms and Privacy already exist as real pages in the app (`app/(public)/terms`,
`app/(public)/privacy`) — this is a content review/update pass to bring their wording in line with
the new service-based business model, not building them from nothing.

---

## 4. The interactive location picker — full spec

This is the one genuinely new, sophisticated interactive element on the page, and it's tied to a
real use: before Brian commits to any aerial capture, he needs to know what's actually permitted
in that airspace. The map isn't decoration — it's how he gets the information he needs to respond
to an inquiry correctly, and it happens to also be a nice, modern moment on the page.

### 4.1 Interaction design — and the answer to "how do both paths work together"

The picker supports two ways in, and they're not separate modes — they both just move the same
pin on the same map, so a visitor can mix them freely:

1. **Type an address.** A prominent "Project location" search field with live autocomplete
   suggests real addresses as the visitor types. Selecting one flies the satellite map to that
   spot and drops a pin automatically.
2. **Or just explore the map directly.** The satellite view underneath is fully interactive from
   the start — scroll/drag to pan, pinch or scroll-wheel to zoom, and **a genuine 3D tilt view is
   available** (confirmed available on the existing key — "Maps 3D SDK" is on the enabled-API
   list), which is worth keeping front and center since it's exactly the kind of real, useful
   sophistication Brian asked for. Clicking anywhere on the map drops or moves the pin directly —
   useful for raw land or a site with no clean street address.
3. **Refine — drag the pin.** Whichever way the pin landed, it can be dragged to the exact spot.
4. **Optional, more precise — outline the property.** A clearly-labeled "Outline the project area"
   toggle switches into a simple draw mode (tap to place corner points, tap the first point again
   to close the shape). Not required to submit — most visitors will just use the pin.
5. **On submit:** coordinates (and the outline, if drawn) save with the inquiry — never shown
   publicly, used only so Brian can review the location and check airspace restrictions before
   responding.

**Simplification from the internal wizard version:** the map-type toggle drops from three options
(Map/Satellite/Hybrid) to two (Map/Satellite, satellite as the default) — Hybrid isn't needed for
this context and one fewer button reduces clutter. The 2D/3D toggle stays, since Brian specifically
wants the 3D satellite experience available.

### 4.2 Build approach — REVISED: this is reuse, not new infrastructure

Verified directly against the codebase and Vercel: **`NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` and
`NEXT_PUBLIC_GOOGLE_MAPS_MAP_ID` already exist**, locally and in Vercel Production/Preview/
Development. Per the app's own audit log (`slate360-context/ONGOING_ISSUES.md`, Mar 4 2026), the
Maps JavaScript API, Places API (New), Geocoding API, and Maps Static API are all **confirmed
enabled** on that key, with a real, documented 403-error fix already behind them. **No new Google
Cloud project, API key, or billing setup is needed** — the earlier draft of this plan was wrong to
flag this as new infrastructure.

Better still: **the underlying logic largely already exists**, in
`components/projects/WizardLocationPicker.tsx` (+ `WizardLocationPickerController.tsx` +
`useWizardLocationPickerController`) — address search, a drop-pin tool, a native click-based
"draw site boundary" tool, and a maptype toggle. **The visual chrome does not get reused as-is —
it gets fully redesigned.** Brian is right that the current toolbar (dark floating pill clusters,
tiny 13px icons, abbreviated two-letter labels like "Sat"/"Hyb", raw lat/lng coordinates printed
on screen) is an internal operator tool, not something presentable to a prospective client. Build
approach: a brand-new public component that calls the same underlying controller/hook (so the
proven address-search, pin, and boundary-drawing logic isn't rebuilt from scratch) but with
entirely new chrome:

- **Light, not dark.** The toolbar sits on the same white/glass surface language as the rest of
  the homepage — no `bg-slate-950` floating chips.
- **The search bar is the dominant element**, full-width or near it, sitting clearly above the
  map rather than cramped into a corner overlapping the imagery.
- **Full words, not abbreviations.** "Satellite" and "Map," not "Sat"/"Hyb" — and the map-type
  toggle drops to two options instead of three (see §4.1).
- **Real touch targets.** Icons and buttons sized to the same ≥48px standard as the rest of the
  site, not the dense 13px icons built for a mouse-driven internal tool.
- **No raw coordinates on screen.** The internal version prints latitude/longitude as a HUD-style
  readout — appropriate for an operator, confusing for a prospective client. The public version
  shows the resolved address in plain text instead; coordinates are still captured and sent with
  the submission, just not displayed.
- **Boundary-drawing instructions read as a sentence**, not a technical status line — plain,
  friendly copy consistent with the rest of the site's voice.
- **Note for whoever builds this:** the boundary tool already uses native `google.maps`
  click-based drawing, not Google's deprecated `DrawingManager` (a different, unrelated dashboard
  component still uses that one, and Google's own removal timeline for it has already passed as of
  this writing — not this plan's concern, but worth knowing the safe pattern to follow is
  `WizardLocationPicker`'s, not `LocationMap.tsx`'s).
- **Gesture handling:** switch from the internal `gestureHandling="greedy"` to `"cooperative"` for
  the public version, so one-finger scrolling moves the page normally and the map only responds to
  deliberate two-finger interaction — the standard fix for maps trapping scroll on mobile forms.
- **Data stored:** latitude/longitude, the formatted address, and the boundary points if drawn —
  added as fields on the Supabase inquiry row, included in the notification email as a plain link
  to view the location on a map.

### 4.3 Address autocomplete — confirmed root cause, diagnosed live

Brian reported the address lookup not working while typing. I reproduced this directly (loaded the
app's own diagnostic page locally and tested a real partial address) rather than guess at it.
Confirmed, live, right now:

- The modern method the app currently prefers (`AutocompleteSuggestion`, part of "Places API
  (New)") **fails with an explicit "blocked" error** — `Requests to this API
  places.googleapis.com method google.maps.places.v1.Places.AutocompletePlaces are blocked.` This
  is a Google Cloud Console **API-restriction setting on the key**, not a code bug, and not a
  network/quota problem. (Worth noting: an internal doc from March 2026 recorded this same API as
  "confirmed enabled" at the time — it's since been restricted again, whether intentionally or not.)
- **The older, legacy Places method (`AutocompleteService`) works correctly, right now** — tested
  live, returned 5 real, correct address suggestions instantly. Google still supports this method;
  it isn't the newest one, but it isn't broken or shut off.
- The current production fallback chain, when the new method is blocked, drops straight to a plain
  geocode lookup rather than the legacy method — which returns one coarse result instead of a live
  suggestion list, and reads to a visitor as "nothing is happening while I type." That matches
  Brian's exact description.

**Fix, two parts:**
1. **Immediate, no Google Cloud access needed:** build the new public location picker to use the
   confirmed-working legacy `AutocompleteService` as its primary method, rather than leading with
   the currently-blocked one. This ships working, responsive autocomplete on day one with zero
   dependency on anyone changing anything in Google Cloud Console.
2. **Optional cleanup, whenever convenient:** re-enabling "Places API (New)" for this key in Google
   Cloud Console (Credentials → this API key → API restrictions) would let the site use Google's
   newer method too, but it isn't required — the legacy method is a fully working substitute, not
   a workaround that degrades the experience.

### 4.4 What this deliberately does not do

No automated airspace-restriction lookup is built in this pass — the map's job is to get Brian an
accurate location fast; checking actual restrictions (FAA airspace, local rules) stays a manual
step Brian does himself before responding to a given inquiry. That keeps this piece scoped to what
it needs to do well, rather than growing into a second product.

---

## 4.5 No mention of the apps, anywhere

Site Walk and Twin 360 (the mobile apps) are still in development and not ready to offer to
clients. This is now its own named rule, not just folded into "no future-roadmap mentions": **no
app name, no app-store badge, no "download our app," no reference to a mobile companion product,
anywhere on the homepage** — nav, hero, services, portal section, footer, everything. The portal
is described purely as something opened in a browser. Audited the current plan doc for this while
revising it — no such reference exists in it; stated here explicitly as a standing rule so it
can't drift back in during actual build.

## 4.6 Visual rhythm — so the page doesn't read as "one long scrolling wall"

Brian's concern, directly addressed: a light page can still end up feeling like an undifferentiated
column if every section looks the same. The plan already alternates background tone
(`--canvas` / `--canvas-alt`, §2) section by section — concretely, going down the page: Hero
(canvas) → Problem beat (canvas) → What you get (canvas-alt) → Client portal (canvas, white panel
for the portal mock) → How it works (canvas-alt) → What makes it different (canvas) → Who it's for
/ Pricing (canvas-alt) → Thermal / Builds line (canvas) → Form (canvas-alt) → Footer (canvas-2,
slightly deeper tone to visually close the page). No two adjacent sections share the same tone,
which alone creates real separation without needing dark color anywhere.

Two more concrete rules against "crowded" and "empty":
- **Against crowded:** every section keeps the same generous vertical rhythm (consistent padding
  between sections, real line-height in body text, ruled/numbered rows instead of dense icon
  grids) — nothing on this page should ever need to shrink type or tighten spacing to fit.
- **Against empty:** a section only exists if it has real content to fill it (copy, a real photo,
  a real panel) — this is why the Interactive Examples section is simply absent until a real
  project exists (§3.7/§4) rather than sitting there as a big blank placeholder. The hero is the
  one place that might be typographic-only for a while (§3.2) — kept intentionally compact rather
  than a huge empty visual area, so it reads as a confident, simple opening statement, not a gap.

## 5. File attachment — build approach

A single optional file input on the contact form, uploaded to the same Cloudflare R2 storage the
rest of the platform already uses. Practical notes:
- Server-side validation on type (images + PDF only) and size (~15MB cap).
- Stored under a namespaced key tied to the inquiry, not publicly browsable.
- A link to the file is included in Brian's notification email and the Supabase row.
- Basic abuse protection on the upload endpoint (rate limiting), since it's a public, unauthenticated
  surface — standard practice for any public upload form, not a big lift, just worth doing correctly
  from the start.

---

## 6. Sophistication, without gimmicks

Brian asked for other ideas along these lines — the guiding rule stays the same as everywhere else
in this plan: **real and useful, never decorative motion for its own sake.** A short list, in
order of how worth building each one is:

1. **The location picker itself (§4)** is the headline sophistication moment on the page — it's
   genuinely useful to Brian, not just a demo of technology, which is exactly the kind of "cutting
   edge" that reads as substance rather than flash.
2. **A small in-progress save for the contact form** — if someone starts filling it out and
   navigates away, their entries persist (a simple local save, not an account) so a half-finished
   inquiry isn't lost. Cheap to build, genuinely considerate, invisible unless it's needed.
3. **A quiet service-area reference** — a small, static map badge or inset near the footer showing
   the Greater Phoenix coverage area, reusing the same map component from §4 in a read-only, non-
   interactive form. Optional, low priority, nice continuity if there's time.

Deliberately not recommending: any animated 3D scene, particle effect, or auto-playing graphic —
consistent with every prior round of this plan, and with Brian's original, clearest objection.

---

## 7. Slice count — how many pushes this actually takes

Per the repo's own convention (small, verifiable, independently-pushed slices, each passing
typecheck/build/guard scripts before merging), the realistic breakdown:

| # | Slice |
|---|---|
| 1 | Header/nav + footer shell (logo sizing, top-right login link, nav links, legal links) |
| 2 | Hero (headline, subhead, CTAs, service-area line) |
| 3 | Problem beat + "What you get" (merged section, incl. white-label + document-pinning rows) |
| 4 | Client portal section (elevated, full white-label/pinning copy, placeholder visual) |
| 5 | How it works (5-step animated line) |
| 6 | What makes it different + Who this is for + Pricing approach (three short sections, one slice) |
| 7 | Thermal one-liner + Technical builds one-liner (both tiny, one slice) |
| 8 | Contact form — base fields, email + Supabase wiring, no map/attachment yet |
| 9 | Redesigned location picker (new public component + chrome per §4.2) wired into the form |
| 10 | File attachment upload (R2) wired into the form |
| 11 | Login page (§3.2) |
| 12 | Old SaaS teardown — pricing/trial/app-store surfaces, `/product/*`, metadata/JSON-LD rewrite |
| 13 | Terms/Privacy content pass for the new business model |
| 14 | "Open the walkthrough" poster-card component, built and ready, unwired until a real project exists |
| 15 | Final self-review pass: correctness against this doc, hard-rule + no-app-mention audit, phone and tablet QA across every section |

**On when real example deliverables are needed:** not before launch, at all. The whole design is
built so the site is complete, honest, and sellable with zero real projects loaded — slice 14
ships the mechanism, unwired. The day a permissioned pilot project exists, wiring it in is a small
follow-up (swap a token, drop in a real photo), not a rebuild or a blocking dependency on any of
slices 1–15.

**Roughly 12–14 pushable slices.** Some of the smaller ones (6+7, or 12+13) could reasonably
combine in practice, so the realistic range is closer to **11–13** — but 14 is the honest count if
each stays independently reviewable. None of these are large; the file-size guard already forces
things to stay small, which is part of why this breaks into this many discrete pieces rather than
one or two giant ones.

---

## 8. Build sequencing (revised)

1. Rebuild `app/(public)` homepage to the full spec (v10 structure + this round's pricing,
   measurement-copy, and nav changes) — light tokens via `app/globals.css`, no hardcoded hex.
2. **Same release:** remove/redirect old SaaS surfaces and rewrite site metadata/JSON-LD, as
   already scoped in v10 §7.
3. Build the login page (§3.2) — real Supabase-auth-backed form, no signup path, the "portal
   access is set up when you begin a project" fallback line.
4. ~~Set up Google Maps Platform~~ — **not needed.** Verified the API key and every required
   Google API (Maps JS, Places New, Geocoding, Static) already exist and are enabled, in both
   `.env.local` and Vercel. Skip straight to building.
5. Build the contact form with the location picker (reusing `WizardLocationPicker`'s controller
   pattern per the revised §4.2, restyled for public/light use) and the file attachment (§5) — wire
   to email + Supabase, including the new location/boundary fields and the attachment reference.
6. Build the reusable "Open the walkthrough" poster card from v10 §3.7 — still absent from the
   page until a real permissioned project exists.
7. When the contractor pilot is captured and permissioned: wire its token in, swap the portal
   section's placeholder for a real sanitized screenshot if one exists, and update the hero's
   secondary CTA once there's a live example to point to.

Nothing in this sequence ships in a half-working state — the login page works (it's just empty of
accounts by design), the map works the day it ships, the form works end to end from step 5 on.
