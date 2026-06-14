# Walks-with-Plans — Workflow Scope (for Brian's sign-off, pre-build)

Goal: the simplest possible path to *walk a job against its plans*. Fewest screens,
fewest taps. The engine already exists (`WithPlansCaptureCanvas`, `plan-sets` API,
authoritative pin lifecycle — S0-B). This doc scopes only the **workflow & screens**
to reach and run it. Nothing here is built yet.

## Core principle: ONE working screen
Once a walk is running, the **plan sheet is the only screen.** You never page
between stops. Capture and data entry are transient overlays *on top of* the plan.
This is the single-screen / no-scroll rule applied to the field.

---

## Locked decisions (Brian, June 14 2026)
- **Two equal entry doors:** (1) a project's **"Start walk"** button, and (2) a
  **"Walk from project"** button on the Site Walk app shell (which then asks which
  project). Neither is "primary" — both first-class.
- **Data screen always appears, never required.** After capture you always advance to
  the quick-data screen, but every field is optional — photo-only is a valid stop. No
  field ever blocks moving on.
- **Off-plan stops allowed mid-walk:** while walking on plans you can also drop a plain
  camera-only stop for an area not on the sheet; they coexist in the one walk.

## Where plans live
Plans are **project-scoped** (a plan set belongs to a project, auto-filed into
SlateDrop → Site Walk Files / Plans). But you can **add them inline at walk-start** —
you are never forced to leave and go "manage the project" first. Adding a plan during
a walk silently saves it to the project for next time.

---

## A. The happy path — project already has plans  (target: 3 taps to capturing)

```
Project page ──tap "Start walk"──▶  Walk start sheet ──tap a plan set──▶  Plan opens, walking
   (or Site Walk home ▸ New walk)        (shows the project's plan sets)      (long-press = first stop)
```

1. **Tap 1 — "Start walk"** on the project (one primary button on the project page).
2. **Tap 2 — pick the plan set** from a simple list (thumbnail + name + sheet count).
   If the set has one sheet it auto-opens; multi-sheet shows the sheet picker.
   Toggle here: **Clean** (no prior pins) vs **Continue annotated** (see prior walk's pins).
3. **Tap 3 — you're on the plan, walking.** Long-press to drop your first stop.

## B. First-time path — no plans on the project yet  (add inline, ~2 extra taps)

Same Walk start sheet, but instead of a list it shows one big target:
**"Add a plan (PDF)"**. Tap → file picker → the existing upload+rasterize pipeline runs
in the background with a clear progress line ("Converting… your plan will open
automatically"). When ready it drops you straight onto the sheet. The plan is now saved
to the project, so path A applies forever after.

> Reimagine note: today this is the amber `WalkStartChoice` + `PlanUploaderCard` with a
> confusing "Open Plan Room / Upload Plans" button. Those get **replaced** by this single
> Walk start sheet — not recolored.

---

## C. The walk loop — per stop (all on the one plan screen)

A "stop" = a location on the plan. The loop never leaves the plan sheet:

```
        ┌──────────────────────────────────────────────┐
        │   PLAN SHEET (auto-cropped to the drawing)     │
        │   • pinch/pan freely, can't lose the sheet     │
        │   • dropped pins visible, numbered             │
        └───────────────┬────────────────────────────────┘
                        │ long-press where you're standing
                        ▼
                 ① Pin drops (this IS the stop)
                        │ camera opens immediately (overlay)
                        ▼
                 ② Capture — photos / video / before-after
                        │ swipe up / tap ✓
                        ▼
                 ③ Quick-data screen — ALWAYS shown, NEVER required
                    title · voice note · priority (all optional)
                        │ tap Done (photo-only is valid)
                        ▼
                 ④ Back on the plan — pin now filled
                    walk to next spot, long-press again ⟲
```

- **Drop = capture.** Long-press doesn't just place a marker; it opens the camera in the
  same motion. One gesture gets you shooting. (Reuses the shipped V2 capture screen — S3.)
- **Data screen always appears, nothing required.** After capture you advance to the
  quick-data sheet every time (consistent with camera-only walks), but every field is
  optional — tap Done with zero input and the photo-only pin still saves (authoritative
  id — S0-B already guarantees this).
- **Next stop = long-press again.** No "next" button, no list navigation. The plan is the map.
- **Off-plan stop:** a secondary control drops a plain camera-only stop for an area not on
  the sheet; it joins the same walk.
- **End walk** = one persistent control in the header (`STOP n` / `END`), same as camera-only.

---

## D. Screen inventory (how few screens this really is)

| # | Screen | New / reuse | Notes |
|---|--------|-------------|-------|
| 1 | Project page "Start walk" button | reuse `ProjectDetailShell` | already exists |
| 2 | **Walk start sheet** (pick set · Clean/annotated · or Add plan) | **NEW (replaces amber `WalkStartChoice`)** | the one new screen |
| 3 | Plan sheet (the walk) | reuse `WithPlansCaptureCanvas` + Leaflet viewer | engine built |
| 4 | Capture overlay | reuse shipped V2 capture (S3) | not a new screen |
| 5 | Quick-data bottom sheet | reuse V2 note-review, trimmed | not a new screen |

So: **one genuinely new screen** (the Walk start sheet), everything else is reuse.
The whole field experience is effectively a single screen with two overlays.

---

## D2. Refinements folded in from the Grok review (June 14 2026)
Grok endorsed the architecture (~85% there) and added five hardening items that
close real "stuck in the field" gaps. All adopted:

1. **Stop filmstrip** — a thin, persistent row of numbered stops along the bottom of
   the plan sheet. Tap one to re-center the plan on that pin and open its data; you can
   review/jump between any stops **without leaving the plan or losing work**. (Was missing
   — fixes "navigation between stops is implied but not first-class.")
2. **Live edit / move / delete on the active plan** — pulled FORWARD from S6 polish into
   the core. Tap a pin → edit data, retake photo, **drag to move**, delete (with undo
   toast). "Nothing stuck" must be true during the walk, not only in review.
3. **Pause / resume without ending the walk** — a persistent "Back to Site Walk" that
   **auto-saves the full session** (pins, partial data, drafts) so you can duck into the
   shell/project and resume from the project's Walks tab with zero loss.
4. **Live auto-save on every transition** — drop, capture, data, any back/forward writes
   to the session draft immediately. No navigation can lose data.
5. **Every button has loading / disabled / error states** — "Start walk" with no plans
   gracefully surfaces "Add a plan" as the primary action; upload/rasterize show explicit
   progress + retry on failure; no dead buttons, no dead progress moments.

**Where it lives (Site Walk fit):** the Plans surface and the walk run entirely inside the
unified mobile shell (`MobileAppShell` + `MobileBottomNav` + `MobileSection`). End-walk
deliverables **reuse existing Site Walk report/share/export patterns** — no new sharing
system. **Thermal Studio stays owner-only/web-only** — never referenced in any Site Walk,
mobile-shell, capture, or project-tab surface (re-confirmed: grep-clean in
`components/mobile-system/**` and `app/(mobile)/**`).

**One conflict with Grok, resolved in Brian's favor:** Grok wanted to *minimize/skip* the
quick-data screen for photo-only speed. Brian's locked rule is the opposite — the data
screen **always appears** (consistency with camera-only walks) but is **never required**.
Resolution: keep it always-shown, but a **single swipe-down = Done** makes it a one-gesture
pass-through. Satisfies Grok's "don't make it a blocker" within Brian's "always advance."

## E. What I'd build, in order (each verified before the next)
0. **S0 (already done)** — pin authoritative-ID lifecycle (S0-B shipped; on-device proof
   test pending Brian). Gates everything below.
1. **Light "Plans" surface in the project-detail tabs** (reuse `ProjectDetailShell` + tokens,
   like the existing Files/Team tabs — NOT a parallel UI): read-only plan-set list (thumbnail
   · name · sheet count · status), first-class **Start walk** + **Duplicate as clean master**
   + inline **Add a plan (PDF)**. All buttons stateful (loading/disabled/error).
2. **Walk start sheet** (the one new screen, Graphite-Glass) — replaces amber `WalkStartChoice`.
   Wire BOTH equal doors: project "Start walk" + Site Walk shell "Walk from project" (shell
   surfaces recent projects first). Plan-set list + Clean/annotated; if none → "Add a plan"
   is the primary action.
3. **Plan sheet + capture reuse** — long-press = drop pin + open the *shipped* V2 capture in
   one motion; auto-cropped sheet (S2). Photo-only valid.
4. **Quick-data + mid-walk control** (the "nothing stuck" slice): always-shown/never-required
   data sheet (swipe-down = Done); **stop filmstrip**; **live edit/move/delete** on the plan
   (undo toast); **pause/resume to shell** with full auto-save; off-plan camera stop.
5. **End-walk + deliverables** — reuse existing Site Walk report/share/export; one tap from
   the plan. Off-plan stops included.
6. **Viewer polish** — fit-to-width, bounded inertial pan, sheet picker + metadata search,
   review shows mini-plan thumbnail with the pin highlighted.

Steps 1–4 get you a usable, "nothing stuck" end-to-end walk to device-test. 5–6 close + polish.
Each slice device-tested + harness-asserted before the next; never batch the viewer slices.

## F. Resolved (see "Locked decisions" above)
1. Entry — **both** project page and Site Walk shell "Walk from project", equally prominent.
2. Quick-data — title + voice + priority, **all optional**; data screen always shown.
3. Off-plan stops — **allowed** within a plan walk.
