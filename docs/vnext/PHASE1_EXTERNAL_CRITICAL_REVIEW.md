# Phase 1 external critical review

Release-candidate handoff. Inspect the code. Do not treat this file as proof.

| | |
|---|---|
| Repository | `bcvolker/slate360-rebuild` |
| Branch | `feature/ui-vnext-phase1` |
| Head | `1dad19f742c622d7e03ccd2216302d083923a61b` |
| PR | https://github.com/bcvolker/slate360-rebuild/pull/39 |
| PR state at handoff | OPEN. Not merged. |
| Binding contracts | `docs/vnext/PROJECT_CLIENT_DELIVERY_SCOPE.md`, `docs/vnext/PROCESS_QA_PUBLISH.md`, `docs/vnext/VNEXT_SHARING.md`, `docs/vnext/CAPTURED_AND_PROPOSED.md`, `docs/vnext/VIEWER_SALVAGE.md` |

## Product

Slate360 Phase 1 is a service-first construction reality-documentation platform.

Brian / Slate360 captures, processes, reviews, publishes, and delivers project evidence. A client receives access to that evidence.

Phase 1 is not a subscription marketplace, a seat product, or an app store of modules. `org_feature_flags` and billing entitlements are not project scope. A future where a client captures their own evidence is allowed by the data model. It is not required to operate Phase 1.

## Canonical model

```
Client / organization
  → Project
    → Visit / scan
      → Deliverables
        → Reality / Geometry / 360 / Plan / Thermal
        → Items / Documents / History / Shares
```

Captured evidence is the measured record: splats, measured or reference geometry, 360 photos, plans, and thermal sessions that document the site. A later edit must not overwrite that record.

Proposed / design state is a separate, versioned scene for later exploration (materials, furniture, named proposal versions). It is not built. It is not a navigation item. It must never be presented as the as-built record. See `docs/vnext/CAPTURED_AND_PROPOSED.md`.

## Client visibility

Authenticated client visibility is all of:

1. authorized project access
2. capability included for this project
3. that exact source published
4. that source renderable

A public link also requires a valid, active share token (exists, not revoked, not expired).

Included, published, and renderable are different facts. A finished file is not a client deliverable. A service that is off is not named: no tab, row, count, empty state, lock, or upsell. A direct URL to a missing service is not found.

| Representation | Published means | Several sources |
|---|---|---|
| Reality | Active `project_source_publications` row for that splat | Publishing splat B leaves splat A published |
| Geometry | Active row for that glb, gltf, or usdz | Independent of the Reality row |
| 360 | Active row whose `source_id` is that `photo_360` item | Another station stays published |
| Plans | Active row whose `source_id` is that sheet | `is_current_revision` is not publication |
| Thermal | A live, unexpired `thermal_analysis_share_tokens` row whose layer still leaves a capture | No `project_source_publications` row |

Explore opens the newest valid published source. History and a Saved View keep the older exact source. `digital_twin_spaces.published_model_id` is the legacy twin-share pointer. vNext does not read it. A new first model is not client-visible until an operator publishes it.

Items and Documents are not in the publication table. Authenticated visibility is non-deleted items, and active files in a client folder, when those portal sections are included.

## Personas

| Persona | Home | Can | Cannot |
|---|---|---|---|
| Operations owner | `/vnext/ops` | Process, QA, Preview as Client, publish/unpublish, scope, Shares. Gate is `canAccessOperationsConsole` / `isOwnerEmail`. | This is not a second owner list. |
| Authenticated client | `/vnext/projects` | Open included, published, renderable evidence: Overview, Explore, Items, Documents, History. | QA, publish, Shares, unpublished sources, services that are off. |
| Mobile field operator | `/app` and Site Walk capture | Capture and ingest in the retained field tools. `/app` is not redirected. | The field shell is not the default product home. |
| Public Project-share recipient | `/share/project/[token]` | Live published portal: Overview, Explore, History, when included. Read only. | Items, Documents, Thermal, QA, publish, save, questions, account nav. |
| Public Evidence-share recipient | `/share/project/[token]` for a Saved View | That exact source, date, and saved view state. | A newer publish does not replace it. Unpublished or excluded sources say the link is not available. |
| Legacy specialized public-link recipient | `/share/twin/[token]`, `/share/thermal/[token]`, deliverable `/portal/[token]`, SlateDrop file shares | Those existing token families | They are not copied into `project_share_links`. |

Explicit `redirectTo` wins over the default home. `/dashboard` splits by persona when signed in. `/projects/new` stays. Billing paths collapse to `/vnext/home` after auth.

## Routes

Client: `/vnext/projects`, then `.../projects/[projectId]` Overview, `.../explore`, `.../items`, `.../documents`, `.../history`.

Owner: `/vnext/ops`, `.../clients`, `.../projects`, `.../processing`, `.../qa`, `.../shares`. Preview as Client is `/vnext/ops/projects/[projectId]/client-preview`. Candidate preview adds `/[representation]/[sourceId]`. Settings and account under ops are pointers, not a billing product.

Public: `/share/project/[token]`.

Retained on purpose:

| Route | Why it stays |
|---|---|
| `/app` | Field shell. Capture is not done in the client portal. |
| `/projects/new` | Project creation is still the legacy tool. |
| Site Walk capture | Plan and photo capture for the pilot. |
| Twin Studio | Reconstruction ingest and owner model work. |
| Thermal Studio | CEO-only thermal authoring. Public thermal delivery stays on the thermal share token. |
| `/share/twin`, `/share/thermal`, deliverable and SlateDrop tokens | Existing paid or delivered links. Phase 1 did not replace them. |

## Paid-project lifecycle

1. Create the project in the legacy project tool.
2. Set included services on `project_client_capabilities`. New projects seed portal sections on and services off.
3. Capture or ingest in Site Walk, Twin, or Thermal. These are legacy operational tools.
4. Processing appears at `/vnext/ops/processing` (twin jobs, plan sets, thermal jobs). Retry is not offered.
5. QA at `/vnext/ops/qa`. Approval is not publication.
6. Preview as Client. Leaving preview does not write.
7. Publish that exact source. Requires the service included and the latest review `approved`.
8. The authenticated client opens `/vnext/projects`.
9. Optional public share from `/vnext/ops/shares`.
10. History and Saved Views keep the exact source.
11. A newer source can be published later. The older published source stays available.
12. Explicit unpublish sets `revoked_at` on that source only. The file stays stored.

Publish and revoke run as `service_role` through `POST /api/vnext/ops/projects/[projectId]/release`. The route requires the operations console, then checks the source belongs to that project.

## Data and security

| Table | Purpose | Read | Write |
|---|---|---|---|
| `project_client_capabilities` | Which services and portal sections this project includes | Project scope resolver | `PUT /api/vnext/projects/[projectId]/scope` then `replace_project_client_scope`. Documented write check is `user_can_manage_project`. Unknown ids are dropped. |
| `project_saved_views` | Exact representation, source, date, and saved camera or view state | Client when the bound source is still visible | Owner authoring on the vNext viewer |
| `project_source_reviews` | Operator approve/reject of one source. Optional note. `needs_recapture` only when checked. | Service role. Authenticated members cannot select the table. | Service role. No default pending row. |
| `project_source_publications` | Exact client release for Reality, Geometry, 360, Plans | Client visibility resolvers | `publish_project_source` / `revoke_project_source`, service role only, from the owner release route |
| `project_share_links` | Project or Saved View token | Anonymous roles cannot read the table. Server resolves with the service role. | Operations owner at `/vnext/ops/shares` |

Reviews are operator-private. Share-token rows are private. A cross-project source id is not found. A service that is off is invisible. An unpublished source is unavailable to the client and to public links. Anonymous links are read-only: no QA, publish, save, or questions.

Media routes for a token also require the source project to match the token, the capability to be included, and the source to be published. A Saved View token can stream only that saved source.

Opens: one claim per browser session via HttpOnly `s360_share_open`, posted once from the token layout to `/share/project/[token]/entry`. The cookie is not an access grant. Revoked or expired links do not render and do not increment.

## History and evidence

Publication is not “current” or “default.”

Several versions of one representation may stay published. A Saved View stays bound to its exact source. Publishing B does not convert A into B. Unpublishing A removes A from client and public access. Internal storage remains. Deleting a Saved View cascades its evidence link. Revoking a link does not unpublish the source and does not remove authenticated client access.

## Public sharing

Project share = the live published portal. A later publish appears. An unpublish disappears. Turning a capability off removes that service. Turning it back on does not publish an unpublished source.

Evidence share = one Saved View: project, representation, source, date, and saved view state.

Revoke sets `is_revoked`. Expiry belongs to the link only. Items and Documents are omitted. Thermal is omitted from the generic link and keeps `/share/thermal/[token]`. Password protection on the generic link is deferred. Failure copy is one sentence: “This link is not available.”

## Viewer architecture

| Representation | Engine |
|---|---|
| Reality | Spark |
| Geometry | Current mesh / model viewer |
| 360 | Photo Sphere Viewer |
| Point cloud | Potree path |
| Plan | `VnextPlanViewer` / current plan stack |
| Thermal | Current thermal viewer |
| Saved Views / Presentation | vNext system |

Demo viewers (Payne, Backyard, Aerial, Hassayampa, Gammage, Sun Deck) are capability references. They have no authority over page design, navigation, visual style, toolbars, or client information architecture. Do not import them. See `docs/vnext/VIEWER_SALVAGE.md`.

Salvage later, inside the current engines, not as new shells:

- Reality: Walk / Dollhouse / Plan navigation, stride, floor filtering. Do not start a second splat viewer.
- Model marker opens a 360 and returns to the same model camera.
- Named 360 stops, next/previous, thumbnails, hotspots. Not Pannellum.
- Radiometric thermal probing and 2D registration. Not the Sun Deck page.

None of that is in this PR.

## Reconstruction

Web product readiness and reconstruction quality are separate.

The site can organize, review, publish, secure, share, and open model outputs. It does not claim that the X4 / 360 / Gaussian pipeline produces commercially acceptable models. Room 213 and related reconstruction work stay in their own workstream. This PR does not change training or reconstruction algorithms.

## Future spatial clients

Not Phase 1 launch requirements: alternate mobile navigation, Vision Pro / VR, shared spatial sessions, world-anchored documents, historical time-travel viewing.

The current invariant those clients would need: project metadata, permissions, documents, annotations, and history stay in project tables and source coordinates. They are not stored only inside a Gaussian file. Appearance model, geometry/collision proxy, and spatial project data stay separable. This handoff does not add those clients.

## Known limitations

| Limitation | Affects the Phase 1 pilot? | Workaround | Later |
|---|---|---|---|
| Project creation is the legacy tool | Yes, for setup | Use `/projects/new` | vNext create |
| Capture and ingest are legacy tools | Yes, for field work | Site Walk, Twin Studio, Thermal Studio | Not a portal feature |
| No public Items or Documents | Yes, if a link must show punch items or files | Authenticated client | Public sections need an explicit share intent |
| Generic project share excludes Thermal | Yes, if thermal is delivered by URL | `/share/thermal/[token]` | Do not bolt Thermal onto the generic token |
| No password on the generic share | Yes, if the link must be gated | Revoke, expiry, or do not mint the link | Deferred on purpose |
| Geometry Saved View has no camera pose | Yes, if a mesh viewpoint must be restored | The view binds the model only | Pose when the mesh viewer exposes one |
| 360 Saved View does not store zoom | Limited | Yaw and pitch are stored | Zoom when the viewer reports it |
| No Drone viewer | No, if drone is not sold as a client representation | Drone assets can exist as twin files. The portal does not show a Drone tab | A real viewer, then a representation |
| No Walk / Dollhouse in vNext Reality | No for launch | Spark viewer as shipped | Salvage into Spark after release |
| Reconstruction quality | Separate commercial question | Deliver only models that pass QA | Reconstruction workstream |
| Open Site Walk bugs below | Field operations, not the client portal | See the bug table | Do not treat them as fixed |
| Physical iPhone BUG-079 check | Yes, before calling field capture released | Nine-step checklist in section BUG-079 | Device pass by Brian |

## Open critical and high bugs

Registry: `ops/bug-registry.json`. Severity was not changed. No open bug in this file is `critical`. BUG-079 is `fixed` in the registry and is called out separately because the phone pass is still pending.

| Bug | Module | Client portal uses it? | Operations need it? | Block |
|---|---|---|---|---|
| BUG-026 Market Robot fragmented; missing `NEXT_PUBLIC_POLYMARKET_SPENDER` | `market` | No | No for construction delivery | C. Neither this merge nor the construction pilot. Stays high for Market. |
| BUG-080 Markup tools wait on the capture item fetch | `site-walk/capture` | No | Yes, field capture | B. Pilot field risk until someone proves the strip is visible immediately. Not a portal merge blocker by itself. |
| BUG-081 Site Walk hub list can overflow the screen | `site-walk/hub` | No | Yes, field home | B. Pilot field risk. Not a portal merge blocker by itself. |
| BUG-086 Site Walk V1 mobile UI is still inconsistent | `site-walk/mobile-ui` | No | Yes, field capture | B. Pilot field UX risk. Not a portal data or security blocker. |

Open medium bugs exist (BUG-001, BUG-050, BUG-082, BUG-083, BUG-084). They are outside this critical/high list. The reviewer should still open the registry.

## BUG-079

Registry status: `fixed` for the software defects named in the May report.

What the code does now:

- `choosePlanSurface` returns `pending` until the viewport is known, `mobile-raster` on a phone with a raster, `mobile-processing` on a phone without one, and `desktop-pdf` only for a known desktop viewport.
- Mobile uses the existing server raster in Leaflet. Pins stay `x_pct` / `y_pct`.
- Leaflet fit depends on padding numbers, so a new padding object does not refit.
- Desktop PDF writes the live transform on the DOM node.
- Plan capture calls `openNativePickerInGesture` inside the tap. The delayed camera click stays off while `CaptureProvider` is mounted.
- `walkModeAfterPlanSave` returns to the plan after a plan-pin save.

Tests: `lib/site-walk/bug-079-plan-capture.test.ts` (12 cases at this head).

PHYSICAL IPHONE VALIDATION IS PENDING. Do not treat device validation as complete. Before merge approval, on an iPhone:

1. Open a project walk that already has a generated mobile plan.
2. The sheet is fitted and centered.
3. Pan and pinch survive a toolbar or details update.
4. A still long-press drops a pin. A drag pans and does not drop a pin.
5. Photo from that pin opens the camera or library once, from that tap.
6. Confirm, fill details, Save & Next.
7. The plan returns with evidence on that pin. No reload.
8. A second pin works the same way.
9. Landscape refits without horizontal overflow.

## Automated evidence at this head

Recorded against `1dad19f742c622d7e03ccd2216302d083923a61b`. This handoff did not rerun the expensive suites.

| Check | Result |
|---|---|
| `npm run typecheck` local, `NODE_OPTIONS=--max-old-space-size=12288` | exit 0 on this head before the handoff commit |
| `npm run typecheck:changed` | exit 0 |
| `npm run test:vnext` | Vitest 45 files / 330 tests; Playwright 162 passed |
| BUG-079 Vitest | 12 passed |
| `guard:architecture` | pass |
| `guard:design` | pass |
| `guard:file-size-regression` | pass |
| GitHub typecheck | SUCCESS https://github.com/bcvolker/slate360-rebuild/actions/runs/35890149298 |
| GitHub release-gates (`verify`) | SUCCESS https://github.com/bcvolker/slate360-rebuild/actions/runs/35890149411 |
| Vercel | SUCCESS https://vercel.com/slate360/slate360-rebuild/7cqXQrHVN91H6b97ftyHq8Cj6JVd |

If this documentation commit moves HEAD, re-check the PR status. The product SHA above is the release candidate these results describe.

## What PR #39 changes

About 35 commits on `feature/ui-vnext-phase1` ahead of `origin/main` (`a7b1c66c`). The branch is the Phase 1 client portal, owner console, publication, sharing, persona cutover, typecheck stabilization, and the BUG-079 plan-surface fix.

It does not change reconstruction algorithms or Gaussian training. It does not replace Site Walk business logic except the documented plan-surface, fit, and capture-gesture fixes. It does not replace specialized share-token families. It does not move project creation into vNext. It does not add viewer Walk/Dollhouse, AI, VR, or Design mode.

## Questions for the reviewer

Answer from the repository at the PR head. Cite files and routes. Do not give a reassuring summary by default.

A. SECURITY. Can an unauthorized user reach another project, a hidden capability, an unpublished source, operator QA, share metadata, or cross-project media?

B. DATA INTEGRITY. Can publish, unpublish, Saved Views, History, or source selection silently rewrite or lose evidence?

C. CLIENT EXPERIENCE. Are there dead ends, contradictory controls, missing states, or obvious filler that would make a paying client distrust the product?

D. OWNER OPERATIONS. Can Brian move a real project from ingest through QA, publication, delivery, and revocation?

E. CUTOVER. Can persona or device redirects break capture or send the wrong person to the wrong shell?

F. PUBLIC SHARING. Can a token expose content beyond the intended scope and publication?

G. MOBILE. Which touch, overflow, or navigation failures are not covered by desktop tests?

H. LEGACY DEPENDENCIES. Which retained tools are an unacceptable commercial risk?

I. VIEWERS. Can Reality, 360, thermal, and point cloud improve later without another portal rewrite?

J. RELEASE. List P0 blockers, P1 blockers, P2 pilot risks, and P3 post-launch items. Separate website readiness from reconstruction readiness. Say whether a paid pilot and a production merge have different readiness.
