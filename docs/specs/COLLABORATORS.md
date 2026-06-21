# Spec: Collaborators (invite, buy, restricted access, completion loop)

Status: **planning / spec** (no code yet). Pro-only. Builds on existing
`project_collaborator_invites`, `collaborator_addons`, `entitlements-collaborator.ts`,
`/api/projects/[projectId]/collaborators/invite`. Ties to NOTIFICATION_SERVICE, SLATEDROP,
REPORT_EDITOR, UI_NAV, STORE_IAP.

## 1. What a collaborator IS
An **outside, limited contributor** (sub, inspector, client rep) invited **by email** to a Pro
subscriber's **project** (and optionally specific **walks**). They get a **free** Slate360 account;
the subscriber pays for the collaborator slot. They are NOT a team seat and NOT a paying user.

**Can:** capture (photos/notes/pins), fill the data screens, see their own captured items + the
review/"next" screen, submit/complete a walk.
**Cannot:** delete anything, manage the project, invite others, see other projects, build
deliverables, touch billing/settings, see anything they weren't assigned. Scoped to assigned
project/walks only.

Role already exists (`project_collaborator_invites.role = 'collaborator'`). Enforce in **both** UI
(no delete buttons) and **server** (RLS + API: collaborator role may INSERT captures + READ assigned
walk/items, but DELETE is denied; cross-project access denied).

## 2. Buying collaborators — one-click, from the project page (Pro)
- Project page → **Collaborators** panel shows used/limit (e.g. "2 of 3 used").
- At the limit, **"Add 5 collaborators — $25/mo"** → **one-click purchase** against the subscriber's
  **already-saved payment method** (they have an active subscription, so no card re-entry): add a
  Stripe **subscription line item** (recurring 5-pack) — or an `off_session` charge — → on webhook,
  insert a `collaborator_addons` row (count 5) → max collaborators += 5 immediately.
- Stackable (buy multiple 5-packs). Annual option 17% off. Price is **config-driven**
  (`billing-apps.ts`). Base Pro = 3 included.

## 3. Assigning — by email, from the project page
- Collaborators panel → **"Invite by email"** → enter email → creates a
  `project_collaborator_invite` (status `pending`) → sends email (Resend) + optional SMS with a
  download/sign-in link.
- **Assignment scope:** whole project (sees all its walks) OR specific walks/tasks. Lean: assign to
  project by default; optional per-walk scoping.
- Subscriber sees the roster: Pending · Active · Completed-something, with status + last activity +
  Revoke. Revoke removes access immediately.

## 4. Collaborator onboarding & the collaborator app shell (NEW chrome)
Invite email: *"You've been invited to collaborate on [Project]. Download Slate360 and sign in with
**this email** to start."* On sign-in, the account is **matched to pending invites by email** →
invite flips to `active`.

**Collaborators do NOT get the full app shell.** They get a focused **Collaborator mode** — a
stripped shell so they instantly understand what to do:
```
┌───────────────────────────────────────┐
│  Slate360            (no app switcher) │
│  Assigned to you                       │
├───────────────────────────────────────┤
│  ▸ [Project] · Walk: Level 2          │
│     "Capture the north corridor"       │
│     [ Start Walk ]                     │
│  ▸ [Project] · Walk: Roof   ✓ Done    │
├───────────────────────────────────────┤
│  Assigned │ (no Projects/Files/etc.)   │
└───────────────────────────────────────┘
```
- Home = **"Assigned to you"** list of walks they can do (reuses the existing *assigned-work*
  surface, locked to collaborator scope). No Projects/SlateDrop/Twin nav, no billing, no settings
  beyond profile.
- Tap a walk → instructions/what-to-capture → **Start** → capture UI (same as Site Walk, but
  **delete disabled**) → data screens → **review/"next" screen** (see captured items, can't delete)
  → **Submit / Mark complete**.

## 5. Completion loop → back to the subscriber
- On submit, the walk is marked **completed by collaborator** → fires a notification event
  **`walk.completed_by_collaborator`** (via NOTIFICATION_SERVICE) to the subscriber: in-app bell +
  email/push — *"[Collaborator] completed '[Walk]' on [Project]."*
- Subscriber opens it → reviews the walk → options:
  - **Keep as record** (it lives in the project),
  - **Move/file** it into a SlateDrop folder for record-keeping,
  - **Build a deliverable** from it (REPORT_EDITOR).
- Collaborator's submitted walk is **locked from collaborator edits** after submit (read-only to
  them); the subscriber retains full control (incl. delete).

## 6. Subscriber project UI (what "manage the project" needs)
When a subscriber opens a project, the page must include a **Collaborators** section:
- Roster (pending/active) + per-collaborator activity (which walks completed, when).
- **Invite by email** + assign-to-walk.
- **"Add 5 — $25/mo"** one-click buy when at limit (used/limit indicator).
- Revoke access.
- Completion notifications surface here too (recent collaborator activity feed).
Desktop = full management; mobile = invite + roster + buy + status (lighter).

## 7. Permissions matrix (enforced server-side)
| Action | Collaborator | Subscriber/owner |
|---|---|---|
| Capture (photo/note/pin), fill data | ✅ (assigned walks) | ✅ |
| View assigned walk + own items + review screen | ✅ | ✅ |
| Delete anything | ❌ | ✅ |
| Manage project / plans / settings | ❌ | ✅ |
| Invite/manage other collaborators | ❌ | ✅ |
| See other projects | ❌ | ✅ (own org) |
| Build deliverables, billing | ❌ | ✅ |
RLS: collaborator rows scoped by invite → project/walk; DELETE policy denies collaborator role.

## 8. Data / build notes
- Reuse `project_collaborator_invites` (email, role, status, channel) + `collaborator_addons`
  (extend to packs of 5). Add invite↔user matching on sign-in (by email).
- Optional `collaborator_walk_assignments(invite_id, session_id)` for per-walk scoping.
- New notification event `walk.completed_by_collaborator`.
- New chrome: **Collaborator shell** (a `mode="collaborator"` variant of the mobile shell —
  Assigned list only).
- One-click buy: Stripe subscription item / saved-PM `off_session`; webhook → `collaborator_addons`.

## 9. Build sequence
1. Permissions: collaborator role server gates (capture-yes/delete-no/scope) + RLS.
2. Subscriber **Collaborators panel** (roster, invite-by-email, assign, revoke, used/limit).
3. **One-click buy** 5-pack (Stripe item + webhook + addon row + limit bump).
4. **Collaborator shell** (Assigned-to-you home → walk → capture(no-delete) → review → submit).
5. **Completion loop** (`walk.completed_by_collaborator` notification → review/file/deliverable).
6. Desktop parity for the Collaborators panel + activity feed.

## 10. Open questions
- Per-walk assignment vs whole-project (lean: project default, per-walk optional).
- Do revoked/expired collaborators keep submitted data? (Yes — data stays with the project.)
- Collaborator free-account abuse limits (tie to the invite; no self-serve signup as collaborator).
