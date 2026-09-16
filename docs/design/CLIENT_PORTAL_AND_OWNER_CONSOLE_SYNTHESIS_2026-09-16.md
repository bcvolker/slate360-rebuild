# Client portal + owner console — synthesis (2026-09-16)

Input: Brian's external-AI architecture response (object model, folders, timeline, packaging,
closeout, roles, search, build order) reviewed against the codebase and the locked decisions in
[CLIENT_ACCOUNT_HOME_2026-09.md](./CLIENT_ACCOUNT_HOME_2026-09.md),
[CLIENT_PROJECT_PACKAGE_2026-09.md](./CLIENT_PROJECT_PACKAGE_2026-09.md),
[DASHBOARD_PORTAL_DESIGN_ALIGNMENT.md](./DASHBOARD_PORTAL_DESIGN_ALIGNMENT.md) and
`docs/ops/DESKTOP_SPLAT_MAP_SESSION_2026-09-15.md`. Status: **proposal for Brian's yes/no** on §6.

## 1. The one sentence to keep

"One continuously growing construction record where every photo, scan, measurement, plan,
document, question and visit can be found by place, time and responsibility." Everything below
serves that. The portal is a record, not a menu of capture technologies.

## 2. Two logins, one design language

| Who signs in | Lands on | Purpose | Style |
|---|---|---|---|
| Brian (owner) | Owner console | Produce and publish deliverables | Light `--mkt-*`, tools-first |
| Contractor (client) | Client portal | Read the record, ask, invite stakeholders | Same light system, client logo dominant |

Gating already exists (`lib/spatial-walkthrough/client-surface.ts`): the same `/login` sends
staff to `/dashboard` and spatial-only client orgs to `/client-home`. Nothing client-facing names
Twin 360, Site Walk, Splat, Map or Thermal Studio.

## 3. What to adopt from the external doc (verified against the repo)

| Idea | Verdict | Why / what exists |
|---|---|---|
| Project → Visit → Deliverable → Chapter | **Adopt — already the shape** | Shipped package page groups published chapters by visit date; `project_chapters` contract drafted. |
| Chapters only when published; no catalog, no empty tiles | **Adopt — already the rule** | Locked in UX handoff + package page. |
| Persistent **Location** (Building → Level → Room) separate from the dated observation | **Adopt — new** | Nothing models rooms today; pins carry viewer coordinates only. This is what makes "same room, two dates" and trade views possible. Additive `project_locations` table. |
| Pin = persistent location + dated observation; old pins never move on re-scan | **Adopt** | `spatial_pins` already dated and client-visible; needs the location link. |
| Documents are canonical; folders are *views* ("one file, many references") | **Adopt — new** | SlateDrop stores files physically under a folder id. Needs a `document_references` layer (document ↔ folder / pin / location / visit). Also the mechanism for the folder-template gap. |
| Three entrances: by date, by location, by trade | **Adopt, in that order** | Date exists (package page). Location next. Trade needs a `trade` field on pins — cheap. |
| Per-visit "What changed" page + forwardable summary | **Adopt early** | Mostly derivable from counts already loaded. Highest owner-facing value per effort. |
| Five client-facing packages (Project Record, Progress Intelligence, Site & Aerial, Reality & Measurement, Closeout & Owner Record) | **Adopt for negotiations** | Maps cleanly onto purchased-app flags + published chapters. Not shown as a catalog in the portal. |
| Roles instead of links | **Adopt — this is the reshare answer** | Under login-only, a contractor "shares with their client" by inviting a named Viewer seat, not by forwarding a URL. See §5. |
| Search that opens at place + date | **Adopt later** | Needs locations + metadata first; premature before a pilot has data. |
| Closeout generator, owner handover | **Adopt later** | Real differentiator; depends on disciplined metadata. Not pilot scope. |

## 4. Where it must bend to locked rules

- **Thermal** stays CEO-only and unadvertised; a delivered thermal report may appear as a chapter
  only when explicitly published, findings-only language, no certification claims.
- **Measurements** are planning/coordination-grade; never "survey" language in client chrome.
- **23 deliverables** is a menu for Brian's negotiations, not a build list. The pilot builds the
  doc's own "first pilot should feel like" path and nothing more.
- **Seven roles** is too many for a pilot. Start with three: Slate360 operator, Project admin
  (the contractor), Viewer (anyone the contractor invites). Trade Partner / Owner-archive roles
  come with punch and closeout.
- **No AI-only notes** — raw note kept beside any summary (already the evidentiary rule).

## 5. Sharing — decided by Brian 2026-09-16

Two different things, and the earlier "no tokens" applies only to the first:

1. **The contractor's own access is a login.** Brian creates it; they sign in and see their
   projects. No link is ever the contractor's way in.
2. **The contractor shares outward with controlled links.** They can show any deliverable to any
   stakeholder — owner, architect, their own client, a sub — with **no cap** on how many. Each
   share is a link the contractor controls: what it exposes (a whole project, one visit, one
   chapter, one item), who can open it (password, expiry, revoke), and how private it is.
   The recipient is **view-only**: they cannot change anything permanently or reach the rest of
   the project, but they can call out a spot in the model, comment there, and ask questions in a
   chat thread. A document exchange for those recipients is a later add-on.

Named viewer seats (email → login) can still exist for regular stakeholders, but the primary
mechanism is the controlled link. Every link view is logged (who/when/what), so the record stays
attributable even without a seat.

What already exists for this (verified in repo): per-walkthrough share tokens with password,
expiry, revoke and view counts (`spatial_share_tokens`, `lib/spatial-walkthrough/share-resolve.ts`,
viewer `/w/[token]`); a drafted-but-unapplied **project-level** share table with per-share grants
(`supabase/migrations/20260901120000_spatial_project_shares.sql`: `can_comment`,
`can_create_items`, `can_see_documents`, `can_see_internal_items`, `can_measure`); the
"Ask a question" flow with locators (`AskAboutThis`) and a deliverable Q&A widget
(`DeliverableQnA`). The gap is the **contractor-facing share manager** (create/scope/password/
expire/revoke a link, see who viewed) and a single recipient viewer that honors the grants.

## 6. Owner console — proposal

Not a launcher. A production line. Home answers: *what do I need to do to get deliverables out?*

**Work queue** (center): visits grouped by state — Captured → Processing → Authoring → Ready to
publish → Published. Each row: project, visit date, what was captured, what's blocking.

**Tools** (left, collapsible): Home · Projects · Clients · Produce (Splat, Map, Tours,
Walkthrough) · Publish · Settings. Thermal Studio stays a CEO-only entry, unlisted for anyone else.

**Per-visit workspace**: one screen per visit with the deliverable rows and the action each needs
— crop floaters (Splat, desktop track), set start/restrict view + plan pins (Tours), spaces /
waypoints / operator keyframes (Walkthrough), build ortho/DSM (Map) — and a **Publish** panel
that chooses which chapters the client sees, with a "preview as client" that renders the exact
package page. Publishing writes `project_chapters`; that's when the table becomes necessary.

**Clients**: create a client login, set their logo/colors, see their projects, invite seats on
their behalf, request-a-visit inbox.

**Folder templates**: Brian's defaults stay reserved; a contractor's custom tree sits alongside
and can be saved and reapplied.

Design: same light tokens, serif-free, one green accent on actions only, no cards-for-the-sake-
of-cards. The desktop chat's "four tiles (Projects, Process, Author, Publish)" collapses into the
work-queue + tools layout above — one owner (this track), one design.

## 7. Build order (reconciled with what's shipped)

| # | Slice | Value | Risk to watch |
|---|---|---|---|
| ✓ | Login home + project package page | Record exists | — |
| 1 | Wrap tour / 3D viewers behind authenticated routes | Login-only becomes airtight | Viewer regressions — wrap, don't touch internals |
| 2 | Per-visit "What changed" + visit report (PDF) | Superintendent/owner value in two minutes | Summaries must stay factual, counts only |
| 3 | Stakeholder seats (invite Viewer by email) | Reshare without links | Keep to 3 roles |
| 4 | Owner console home + Publish panel (+ `project_chapters`) | Brian runs production from one screen | Scope creep into PM software |
| 5 | Locations + pin ↔ location + trade field | Browse by place/trade; same room two dates | Plan registration quality |
| 6 | Documents as references + folder templates | One file, many places; contractor adoption | File-dump feel without tagging |
| 7 | Search across pins/docs/measurements | Compounds with data | Weak metadata → weak search |
| 8 | Closeout generator, owner handover role | End-of-job product, archive revenue | Needs 5–6 done well |

## 8. Decisions (Brian, 2026-09-16)

1. Three roles for the pilot — **yes** (operator / project admin / link recipient as view-only).
2. Stakeholder sharing — **controlled links, uncapped, contractor-scoped, view-only with
   callouts + questions + chat**; see §5. (Supersedes the "seats only" option.)
3. Owner console = work queue by visit state + Publish panel — **yes**.
4. Build order — revised below to put sharing where Brian put it: right after the record.

## 7b. Build order, revised

| # | Slice | Note |
|---|---|---|
| ✓ | Login home + project package page | shipped |
| 1 | **Contractor share manager + recipient viewer**: create a link scoped to project / visit / chapter, password, expiry, revoke, view log; recipient sees only that scope, view-only, can call out a location, comment, ask a question | applies the drafted `spatial_project_shares` migration; reuses `/w/[token]`, `AskAboutThis`, `DeliverableQnA`; adds the manager UI to the package page |
| 2 | Per-visit "What changed" + visit PDF | forwardable summary |
| 3 | Owner console home + Publish panel (`project_chapters`) | Brian's production line |
| 4 | Locations + pin ↔ location + trade | place / trade browsing, same-room compare |
| 5 | Documents as references + folder templates | one file, many places |
| 6 | Search | needs 4–5 |
| 7 | Closeout generator, owner handover | needs 4–5 |
