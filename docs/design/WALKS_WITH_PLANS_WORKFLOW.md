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

## E. What I'd build, in order (each verified before the next)
1. **Walk start sheet** (new, Graphite-Glass) — list project plan sets + Clean/annotated +
   inline "Add a plan". Replaces `WalkStartChoice`. Wire "Start walk" on the project page.
2. **S1 plan selection** — feed it real plan sets (no stubs); open onto the sheet.
3. **S2 auto-crop** — sheet opens centered on the drawing, legend/title-block excluded.
4. **S3 capture reuse** — long-press → the *shipped* V2 capture + quick-data sheet.
5. **S4–S6 viewer polish** — fit-to-width, bounded pan, sheet picker, pin move/edit.

Steps 1–3 get you a usable end-to-end walk you can device-test. 4–6 are polish.

## F. Resolved (see "Locked decisions" above)
1. Entry — **both** project page and Site Walk shell "Walk from project", equally prominent.
2. Quick-data — title + voice + priority, **all optional**; data screen always shown.
3. Off-plan stops — **allowed** within a plan walk.
