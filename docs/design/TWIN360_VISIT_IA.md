# Twin 360 — visit information architecture (second opinion)

**Status:** written before code, 2026-09-06, on `feat/grok-workspace-twin-visits` (child of Grok's
`feat/grok-workspace` @ `9036030b`). Scope: the one operator fix the 2026-09-06 handoff allows
(Phase L3: "named session — thumbnail + date + Process, not a raw file list"). No App Store work.

## Verdict in one paragraph

Grok's direction is right and the plumbing is real: the visit name survives web → Capacitor →
`TwinUploader` → `/api/digital-twin/upload/init` → `digital_twin_captures.title`. One thing is
wrong at the model level: the name gate writes the *visit* name onto the **space**, with a
timestamp as the default. That makes every walk a new twin ("Sep 6 · 5:56 PM" beside "Sep 7 · 9:12
AM"), so nothing accumulates. The schema already has the three levels we need; the gate just
addressed the wrong one. Fix the addressing, keep everything else.

## The three levels already in the schema

| Level | Table | Meaning | Named by |
|---|---|---|---|
| **Project** | `projects` | The contractor job — AOB205 | Brian, once |
| **Space** | `digital_twin_spaces` | The thing being documented — "Kitchen", "Room 205", "Level 2 corridor". This is the twin; models version under it. | Brian, once per space |
| **Visit** | `digital_twin_captures` | One dated walk (LiDAR + RGB, later 360). Already has `title`, `created_at`, `capture_status`. | Auto "Sep 6 · 5:56 PM", editable |

So: **Project = job. Space = twin. Visit = dated capture that accumulates into the space's
timeline.** Models (`digital_twin_models`) are versions produced from one or more visits. Nothing
new is invented; `spatial_*` and Site Walk tables are untouched.

Answering the brief's two questions directly:

- *"Named visit under a project" vs "one twin = one space = one scan"?* — Named visit under a
  project, yes. But the visit is a **capture**, not a space. One space = one twin; many scans.
- *Should PROJECT be the job and VISITS dated walks that accumulate into one twin?* — Yes, and the
  tables already say so. Grok's gate is the only place that conflates them.

## What is wrong with Grok's UI (and what is fine)

**Fine — keep:**
- "Scan into a project" leads; "Scan without a project" is secondary. Correct emphasis.
- The name gate exists and blocks the camera. Correct.
- Home + list group by project. Correct.
- Tap-to-rename via `PATCH /api/digital-twin/spaces/[spaceId]`. Correct primitive.
- Tokens: `var(--twin360-blue)`, `var(--graphite-muted)`, `border-white/10` are the Graphite
  Glass idiom in this codebase. No token bikeshedding.

**Wrong — fix:**
1. **Gate names the space with a timestamp.** Default `formatVisitTitle()` = "Sep 6 5:56 PM"
   becomes the *space title* → one twin per walk. The gate must ask Project → Space (existing or
   new) → Visit label.
2. **`spaces` prop discarded** (`spaces: _spaces` in `TwinCaptureFlow`). The list of existing
   spaces per project is already loaded and is exactly what "walk this room again" needs.
3. **"Unfiled" is unreachable.** Quick scans go through `resolveOrCreateQuickScanProject()` into a
   real project named **"Quick Scans"**, so `groupTwinsByProject` never sees a null project — the
   dump pool shows up as if it were a client job. Treat the pool as unfiled.
4. **Dead end when there are no projects.** A disabled `<select>` reading "No projects yet" with
   no way forward. There is no `POST /api/projects` in the repo, so the gate must offer "Scan
   without a project" (into the pool) and say plainly that it can be filed later.
5. **Rename discoverability is a caption.** "· tap name to rename" as permanent subtitle text is
   chatty. Use a pencil affordance and show the *project* in the subtitle instead — that is the
   information the operator actually needs there.
6. **HUD never shows what you are scanning.** `TwinHudStateModel` has no title/project field; the
   header is `TWIN 360 · b<build>·<sha>`. The web passes `title` but native only forwards it to
   the uploader. Post-capture, Review & Sources shows the capture title but not the project or
   space, and the file list sits above the one action that matters.

## What survives the native round trip (verified in code)

```
TwinCaptureNameGate ─► POST /api/digital-twin/spaces {title, project_id | quick_scan}
   ─► TwinNativeCaptureLauncher ─► LiDARCapture.presentCapture({spaceId, projectId, title})
   ─► LiDARCapturePlugin.presentCapture  reads spaceId / projectId / title        ✔
   ─► TwinARKitCaptureViewController(options)   ← title NOT in options; HUD blind ✘
   ─► onFinish ─► uploadCapture(…, title) ─► TwinUploader ─► POST upload/init {space_id, project_id, title}  ✔
   ─► digital_twin_captures.title = visit label                                    ✔
   ─► /digital-twin/capture/submit?captureId → TwinReviewSourcesScreen (title only) ~
```

`TwinUploader` falls back to `createQuickScanSpace(title ?? "Quick scan")` **only when spaceId is
empty**, i.e. a stale web bundle. With a fresh build it never fires. One ARSession per visit across
clips is already the architecture (VC line ~175). Nothing to fix there.

## Decision

Implement the revision, not a rewrite:

- **Gate:** Project → Space (pick an existing space in that project, or type a new one) → Visit
  label (defaults to date · time). Space title is stable; visit label goes to the capture.
- **Native:** pass `spaceTitle` + `projectName` alongside `title`; HUD header becomes
  `AOB205 · Kitchen`, sub-line `Sep 6 · 5:56 PM · b123·abc1234` (build stamp stays — it is the
  stale-build tripwire).
- **Landing:** Review & Sources shows `Project · Space` over the visit title; sources collapse
  behind "Sources (n)"; **Process** is the one primary action.
- **Lists:** "Quick Scans" pool renders as **Unfiled**; cards keep name · project · relative date.
- **Move:** `PATCH /spaces/[id]` also accepts `project_id`; detail screen gets "Move to project".
  Cheap because the projects list is already loaded server-side.
- **Not doing:** a second project model, Site Walk changes, App Store polish, 360 playback, any
  migration.

Companion frame: `docs/design/TWIN360_AND_SITEWALK_PROJECT_FRAME.md`.
