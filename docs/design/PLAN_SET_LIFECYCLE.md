# Plan-Set Lifecycle — Master / Working Layers / Revisions (DESIGN, 2026-06-30)

Designs how plan sets, pins, walks, and revisions relate so users get maximum flexibility:
a pristine master, accumulating annotated sets, clean walk sets, and drawing revisions — all
clearly identified at walk-start. Grounded in the EXISTING schema (`site_walk_plan_sets`,
`site_walk_plan_sheets`, `site_walk_session_plan_sheets`, `site_walk_pins`). Additive migration only.

## The mental model: a Master is never pinned; pins live in Layers

Three roles, one source of truth:

1. **Master Plan Set (the "key")** — every plan upload creates a master. It is the pristine drawing
   and is **never pinned on directly**. It's the reference of record. (`kind = 'master'`.)
2. **Working Set (a Layer)** — a lightweight annotation layer *over a master's sheets* (it does NOT
   re-render or duplicate files — it references the master's sheets). This is where pins + captures
   + walks accumulate. (`kind = 'working'`, `master_plan_set_id → the master`.) Two flavors:
   - **Cumulative layer** — the project's living annotated set; pins build up across many walks.
   - **Clean walk layer** — a fresh isolated layer created for one walk; starts with zero pins.
3. **Revision** — a new drawing upload that supersedes a prior master (`revision_number`,
   `supersedes_plan_set_id`, `is_current_revision`). Old revisions are retained (history/as-built).
   Pins stay bound to the revision they were placed on (a Rev-A pin doesn't silently jump to Rev B);
   the UI flags "Rev B available" so a new walk can start on the current revision.

Why "master is never pinned": it keeps a guaranteed-clean reference for re-issuing clean sets,
comparing revisions, and exporting an unannotated drawing — exactly Brian's "saved as the key."

## Walk-start selection (the picker) — what the user chooses

Two quick decisions, every option clearly labeled:

**Step 1 — Which drawings?** Pick the master set + revision. Labeled:
`"A-100 Floor Plans · Rev B (current) · 12 sheets"`. If a newer revision exists, the older ones
show `"Rev A (superseded)"`.

**Step 2 — Which layer?**
- **Fresh walk (clean plans)** → creates a new Clean working layer; no prior pins shown. For a clean
  re-walk / punch list on untouched drawings.
- **Continue "[Cumulative]" (8 pins · last walked Jun 28)** → opens the project's living layer; prior
  pins shown and added to. For ongoing documentation that builds over time.
- **Continue a specific prior working set** (optional advanced) → pick any named working layer.

Each option shows: title · revision · **pin count** · last-walked date · who. That's the
"identification when starting a new walk" requirement.

## Data model (additive migration — prepared for Brian to apply)

- **`site_walk_plan_sets`** add: `kind text default 'master' check (kind in ('master','working'))`,
  `master_plan_set_id uuid references site_walk_plan_sets(id)` (null for masters; set for working),
  `revision_number int default 1`, `revision_label text` (e.g. "Rev B"),
  `supersedes_plan_set_id uuid references site_walk_plan_sets(id)`,
  `is_current_revision boolean default true`, `layer_kind text` (working only:
  'cumulative' | 'clean'). Backfill existing rows → `kind='master'`.
- **`site_walk_pins`** add: `plan_set_id uuid references site_walk_plan_sets(id)` — the WORKING set
  (layer) the pin belongs to. Keep `session_id` (which walk created it) + `plan_sheet_id` (geometry).
  Accumulation = pins WHERE `plan_set_id = <working layer>` across sessions. A clean walk gets a new
  working layer → sees none. A cumulative walk reuses the project's cumulative layer → sees all.
- **`site_walk_sessions`** add: `plan_set_id uuid` (the working layer this walk wrote to) +
  `plan_mode text check (plan_mode in ('clean','cumulative','none'))`.
- Working layers reference the master's `site_walk_plan_sheets` directly (pin `plan_sheet_id` points
  at the master's sheet rows) — **no sheet/file duplication**; a layer is just a pin namespace + metadata.

## Revisions — how a new drawing upload is handled
1. Upload into the same project → new master with `revision_number = max+1`, `supersedes_plan_set_id`
   = prior current master, prior master `is_current_revision=false`.
2. Existing working layers keep pointing at the revision they were built on (their pins are valid for
   that geometry). 
3. Walk-start defaults to the current revision; offers "carry pins forward?" later (a future
   sheet-matching feature — out of scope for v1; v1 just keeps layers on their own revision).

## Tier gating (Pro)
Walks-with-plans + 360-on-plans = Site Walk **Pro** (`resolveModularEntitlements`). Gate server-side at
walk-start; in the picker, plan options are **visible-but-locked** with an upgrade affordance (never
hidden). A Pro user drops a 360 onto an **existing pin** (continue a working layer) or a **new pin**
(fresh layer) — both already supported by the long-press → source-picker → capture flow.

## Build slices (after this design is locked)
1. **Additive migration** (above) — Brian applies via Supabase Management API.
2. **Master-on-upload**: `createPlanSet` (`lib/site-walk/plan-upload.ts`) stamps `kind='master'`,
   revision fields. Re-upload into a project → revision chain.
3. **Wire `PlanPickerSheet`** (built, stranded in `/preview/walk-start`) into `CaptureV2Orchestrator`:
   Step-1 master/revision list + Step-2 Fresh vs Continue, creating/selecting the working layer and
   passing `planSetId` + `plan_mode` into `useWithPlansCaptureCanvas` (replacing its hard-default).
4. **Pin accumulation read**: cumulative walk loads pins by working-layer; clean walk loads none.
5. **Pin drag** (independent of the above — ship first): make session markers `draggable`, persist
   `dragend` → `x_pct/y_pct` (DB already allows UPDATE per `20260423`).

## REFINEMENT (Brian, 2026-06-30) — CLEAN BY DEFAULT, history hidden, opt-in to view
Critical correction to the model above: **do NOT accumulate pins visibly by default.** Mini-walks over
a long period on the same plans would pile up into an unreadable, unusable mess. So:
- **Every walk is CLEAN by default** — the plan shows ONLY the current walk's pins. (Pins stay
  session-scoped, exactly as the schema already is — no `plan_set_id`-on-pins accumulation needed for v1.)
- **History is preserved but HIDDEN** — every walk's pins (and, later, the walk PATH taken) are saved
  in the background, never shown unless asked for.
- **Opt-in overlay toggle** — the user can turn ON "Show previous activity" to see prior walks' pins
  (and walk paths) as a **dimmed, read-only underlay** for context. Off by default.
- **Accumulation is a deliberate choice, never automatic** — a user who wants a living annotated set
  explicitly chooses "add to / continue" that set; otherwise each walk is its own clean record.

**Impact on the data model:** v1 needs LESS than first drafted. Keep pins session-scoped. The
"previous activity" overlay is a READ-ONLY QUERY ("all pins on this master's sheets across prior
sessions") rendered dimmed — not a stored cumulative layer. The master/revision fields on
`site_walk_plan_sets` (`kind`, `revision_number`, `supersedes_plan_set_id`, `is_current_revision`)
still apply. Defer any cumulative-layer table until a user actually needs persistent shared annotation.

**Walk paths (future):** "paths taken during walks" = record a breadcrumb (pin-drop order + optional
movement) per session, replayable as a dimmed polyline under the same toggle. Net-new capture; v1 logs
nothing, just leaves room for it.

## Resolved decisions
- **D1 (cumulative scope):** N/A for v1 — no default cumulative layer; clean-per-walk + opt-in history view.
- **D2 (promote clean→cumulative):** deferred — accumulation is opt-in only, revisit when a living-set need appears.
- **D3 (revisions carry pins forward):** v1 = no (pins stay on their revision).
