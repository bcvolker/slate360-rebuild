# Twin 360 visits and Site Walk walks on one project (product frame)

**Status:** one page, 2026-09-06. Companion to `TWIN360_VISIT_IA.md`. Locked sequencing from
`GROK_BUILD_HANDOFF_2026-09-06.md` applies: Brian is the operator; no self-serve twins; no
homepage feature theater; Site Walk stays the clean App Store surface.

## The one shared thing is `project_id`

Both apps already key everything off the same `projects` row. That is the entire integration:

```
projects (AOB205)                         ← the contractor job. Created once. Shared.
├─ Site Walk  (capture-v2, FROZEN)
│    site_walks / plan sets / pins        ← dated field walks: photos, plan pins, punches
├─ Twin 360   (native LiDAR capture tool)
│    digital_twin_spaces  "Kitchen"       ← the twin (one per documented space)
│      digital_twin_captures  Sep 6 · 5:56 PM   ← a visit: LiDAR + RGB, later 360
│      digital_twin_models    v1, v2…     ← versions (desktop 3090 now, cloud later)
├─ SlateDrop folders                      ← every asset mirrored per project (already true)
└─ share tokens / portal (later)          ← client sees the job, not the apps
```

Nothing is merged. Site Walk never learns about spaces or captures; Twin 360 never learns
about pins. They meet only at the project, and downstream only in the client portal, where a
GC sees **one job** with dated walks (Site Walk) and dated twins (Twin 360) on one timeline.

## What "sits next to" means in each surface

| Surface | Site Walk | Twin 360 | Shared |
|---|---|---|---|
| Project picker | existing capture-v2 picker (frozen) | `TwinCaptureNameGate` project select | same `projects` query (`status = active`, org-scoped) |
| Home / list | walks by project | spaces grouped by project (`groupTwinsByProject`) | project name + date is the row grammar in both |
| Capture | photos · plan pins · voice | LiDAR + RGB clips in one ARSession | one visit = one dated row under one project |
| Deliverable | pinned photos on plans | splat / model versions | portal shows both under the job (Phase G, later) |
| Files | SlateDrop per project | SlateDrop per project | already identical |

## What this does NOT require

- **No Site Walk changes.** capture-v2 stays frozen. Its project picker already emits
  `project_id`; that is the only contract Twin 360 relies on. If a shared picker component is
  ever wanted it is a one-line swap on both sides, not a redesign — and not now.
- **No new tables, no migration.** Project / space / capture / model already exist and already
  carry the fields used here (`captures.title`, `captures.created_at`, `spaces.project_id`).
- **No "second project model."** The "Quick Scans" pool is a real `projects` row used as an
  inbox; the UI renders it as **Unfiled** and offers *Move to project*. Nothing else knows it
  is special.
- **No App Store work.** Twin 360 ships inside the existing native shell for the CEO / entitled
  orgs via TestFlight. Site Walk remains the store-visible app.

## Operator flow this frame supports (the success test)

1. New Scan → **Scan into a project** → choose **AOB205**.
2. Space: pick **Kitchen** if it exists, else type it. Visit label defaults to now.
3. Native HUD reads `AOB205 · Kitchen` with `Sep 6 · 5:56 PM · b123·abc1234` beneath.
4. Walk. Clips share one ARSession. Stop.
5. Review & Sources shows `AOB205 · Kitchen`, the visit label, **Process** as the one action;
   sources are a collapsed "Sources (n)".
6. Home shows one card **Kitchen** under **AOB205**, not a pile of timestamps.
7. Yesterday's untitled Quick Scans sit under **Unfiled** with rename and *Move to project*.

## Later (explicitly not now)

- Client portal timeline that interleaves Site Walk walks and Twin visits per project (Phase G).
- Desktop-trained splats attaching to a visit as a model version (`digital_twin_models` +
  `qaStatus`) — the local pipeline is Grok's; the attachment contract already exists.
- Cloud processing for other users; self-capture; any marketing that describes the above.
