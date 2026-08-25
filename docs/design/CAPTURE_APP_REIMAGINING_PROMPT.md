# Prompt — reimagine the Slate360 capture app (everything after the capture screen)

Give this to another AI platform. **Deliberately provided without screenshots.** The current
app past the capture screen is being replaced, not refined, and showing it would anchor the
design on what exists. Design from the job to be done.

---

You are designing the field workflow for a construction reality-capture app. One person uses
it — the business owner — to scan buildings, which are then processed into measurable digital
twins.

## The single user, today

One operator. No teams, no customers in the app, no billing, no credits, no tokens, no
entitlements, no trials. All of that is legacy from an abandoned subscription product and
should be designed out entirely. It may return years from now; designing for it now is the
mistake that produced the current mess.

## What works and must not be touched

**The capture screen is good.** Live camera, depth feedback, clear record control. It is the
one part that survives. Everything after it is being replaced.

## What is wrong today — the operator's own words

- After a scan, a long undifferentiated list of every previous quick scan appears, with no
  way to tell what any of them are. *"A complete mess... it brings noise to everything."*
- No way to simply save and upload. The app **forces** a twin to be processed, which spends
  money the operator did not intend.
- Upload progress lies — it showed 25% long after the upload had actually completed.
- Tokens and credits are still surfaced, and mean nothing.
- The bottom navigation still shows features from the abandoned product.
- No way to see, from a desk, what the phone actually captured.

## The real job to be done

**On a construction site, quickly and reliably capture a space, then get on with the day.**

Concretely: arrive, scan one or many areas back to back, leave. Later, at a desk, add the
files that never touched the phone (360 video, drone footage, plans) and send the set for
processing.

Two properties matter above all others:

1. **Speed on site.** Every tap between arriving and recording is a tax paid on every scan of
   every job, forever.
2. **Knowing what you captured.** A scan you cannot identify a week later is worthless — and
   this is the current app's central failure.

## The organising principle

**Every scan belongs to a project.** Never a free-floating file.

But — and this is the tension to solve well — **filing must never slow down capture.** The
operator may be standing in a live job site with a superintendent waiting. The design that
works is: **record first, file immediately after**, while the operator still remembers what
they just walked.

## Design this

### 1. Landing
What the operator sees on opening the app on site. It should take them to recording in as few
taps as possible, while still knowing where the scan will land.

### 2. Capture-to-file flow
Record → stop → what happens next. Filing to a project should take about two taps and be
impossible to skip accidentally, without ever blocking the next scan.

### 3. Sequential capture — the large-space problem, and the most important part

A commercial floor is not one scan. It is fifteen or thirty: room by room, corridor by
corridor, area by area, often over hours.

Design for that explicitly:
- After finishing one scan, starting the next must be nearly instant.
- Each scan needs an identity the operator can assign in seconds — a room name, a number, a
  spoken note, a photo of the door plaque, a floor-plan tap. **Consider what is fastest with
  gloves on, in bright sun, with someone waiting.**
- The operator must be able to see coverage at a glance: what has been scanned, what has not,
  where they are in the building.
- Battery, storage and upload backlog must be visible before they become a problem, because
  running out on the twentieth room loses the day.
- Address the practical failure: forgetting whether a room was already done.

### 4. The scan list
Scoped to the active project. Never a global list of everything ever recorded. Design how a
scan is identified — thumbnail, name, area, time, status — so a week later it is obvious.

### 5. Upload
- Resumable, survives backgrounding and the drive home.
- **Honest progress**, including a clear terminal state. The current app leaves the operator
  unsure whether a 4 GB upload finished.
- **Uploading never starts processing.** Processing is a separate, explicit, desk-side
  decision.
- Must be usable over cellular with the option to defer to Wi-Fi.

### 6. Phone-to-desk handoff
The operator later sits at a computer to assemble the full set. Design how the desk sees what
the phone holds: which scans, which files, sizes, upload state. Then how files that never
touched the phone — 360 video, drone footage, plans, PDFs — get added, and how the operator
declares a set complete and ready to process.

### 7. Navigation
Rebuild it around what this app is for now: capture, projects, upload status, settings. No
features from the abandoned product.

## Constraints

- iOS, Capacitor + web views, with a native Swift capture module.
- Design phone-first for a construction site: gloves, hard hats, glare, one-handed, noise,
  intermittent connectivity.
- Dark interface, high contrast, large touch targets.
- Offline-first. Nothing may be lost because signal dropped.
- No billing, credits, tokens, trials, or team features.

## Deliverable

1. **Screen-by-screen flow** for: arrive → scan → file → scan again → leave → upload → desk.
2. **The sequential-capture design in detail.** This is the part that decides whether a large
   commercial job is practical or exhausting.
3. **How a scan gets identified**, with the trade-off between speed and later clarity argued
   explicitly.
4. **Navigation structure.**
5. **What to delete** from the current app.
6. **The three decisions you are least sure about**, stated plainly, with what you would need
   to know to settle them.

Where a requirement is ambiguous, choose the option that **gets the operator recording
faster**, provided the scan can still be identified a week later. Those two goals are in
tension and that tension is the actual design problem.
