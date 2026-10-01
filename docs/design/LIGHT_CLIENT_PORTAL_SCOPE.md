# Light client portal: scope (theme B, decided 2026-09-30)

**Decision (Brian, 2026-09-30):** clients see one light Slate360 product that matches slate360.ai. The client portal and the Directed Tour client viewer (PR-C2) move to the light theme **before** C2 is built. Brian's operator dashboard stays Graphite Glass for now.
This extends the 2026-09-10 direction ("light style for dashboard and client portals too"). The **client** side comes first because clients see it.

Status: **scope only. Nothing is built yet.** For Scout and Opus review before any light-portal UI work.

## 1. What changes and what doesn't

| Surface | Route / components | Theme after |
|---|---|---|
| Client portal | `/portal/[token]` + `reality`, `documents`, `items`, `item/[id]` → `PortalChrome`, `AecPortalLanding`, `PortalProjectSections`, `SpatialReferencesIndex` | **Light** |
| Token states | `TokenStatePage` (unavailable / expired / password) | **Light** |
| Walkthrough share page frame | `/w/[token]` → `WalkthroughShareClient`, `SharePasswordGate`, `ShareErrorBoundary` (page frame, gate, errors) | **Light frame.** Controls over the 360 image stay dark, because light chrome over imagery is illegible; see §3. |
| Directed Tour client viewer (C2) | new | **Built light from day one** |
| Legacy deliverable portal | `ExternalPortalShell`, `SharedDeliverableDocument`, `DeliverableSlideshow`, `DeliverableQnA`, `DeliverablePlanStage`, `PortalCta`, `PortalFooter`, `PortalGlassCard`, `PublicItemStage` | Light, **second slice** (same tokens; separate PR so the walkthrough portal isn't blocked) |
| Operator dashboard, Studio, Tour setup page, Client portal panel | `(dashboard)/**` | **Unchanged (Graphite)** |
| Twin share viewer, thermal share | `/share/twin`, `/share/thermal` | Out of scope (later) |

## 2. Tokens: one light palette, not a parallel system

- Reuse the marketing palette values (`--mkt-canvas`, `--mkt-surface`, `--mkt-ink`, `--mkt-ink-muted`, `--mkt-line`, `--mkt-accent*` in `app/globals.css`). They already pass `guard:design`.
- Add **portal aliases** (`--portal-canvas`, `--portal-surface`, `--portal-ink`, `--portal-ink-muted`, `--portal-line`, `--portal-accent`) that point at the `--mkt-*` values. Client components reference `--portal-*` only. The marketing file's rule "don't import MKT_L_* into app surfaces" stays true, and the two can diverge later without a hunt.
- **White-label:** `--portal-accent` resolves to the org brand accent (`resolveBrandTheme`) when set, and to the Slate360 green otherwise. There is one accent per surface, used only on interactive states (the Graphite Glass rule carries over).
- Type: same families as the marketing site (serif H1/H2 on overview only; UI sans elsewhere; mono labels kept for dates and IDs).
- Spacing, 12 px radius, and 48 px touch targets are unchanged.
- **Guard:** extend `guard:design` so `components/external-portal/**` and the new Tour client folder may not reference `--graphite-*` (ratchet: fails only on new usage).

## 3. Over-imagery rule

Controls that sit **on** a 360 frame (Play, scrub rail, chapter chip, Before/After toggle) use a dark translucent scrim with light text. That is legible on any photo, and it matches how the marketing hero treats video. Everything **around** the image (header, panels, sheets, lists, empty and error states) is light. So there is one product: light pages with dark-on-photo controls.

## 4. Slices (each a small PR with C1–C9 evidence at 375 / 768 / desktop)

| Slice | Scope | Acceptance |
|---|---|---|
| L1 | Portal tokens + aliases + guard ratchet; `PortalChrome`, `TokenStatePage` | Header, nav and all token states render light; no `--graphite-*` in the touched files |
| L2 | Overview (`AecPortalLanding`, `PortalProjectSections`) | Real portal (placeholder data) and the empty-package state screenshotted light; no clipped text; drop the duplicate "Walkthrough" tile when the hero already offers "Open Walkthrough"; one list for items (the Activity feed repeats Project items today) |
| L3 | Sub-pages: reality, documents, items, item detail, spatial references | Every portal route light; control sweep all 200 or redirect |
| L4 | `/w/[token]` frame: password gate, error boundary, poster gate | Frame light, over-imagery controls per §3 |
| L5 | Legacy deliverable portal components | Same as L3 for `/portal/[token]` legacy deliverables |

C2 starts after L1–L3 (L4 can run alongside C2). Estimate: L1–L3 is about 3 focused PRs; no schema or API changes.

## 5. Explicitly not in scope
- Restyling Brian's dashboard (a separate plan per the 2026-09-10 note).
- Changing homepage or marketing tokens.
- Any new portal features. This is a visual pass on existing behaviour only; packaging and fail-closed rules from PR-B are unchanged.

## 6. Open question for Scout
- Should the **walkthrough share page** (`/w/[token]`) also get a light frame in the same pass (L4), or stay as it is until C2 replaces it for Tour-packaged clients? **Default: L4 ships**, because non-Tour clients keep using `/w`.
