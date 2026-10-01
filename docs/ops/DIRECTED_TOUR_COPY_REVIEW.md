# Directed Tour: copy for Brian's OK (PRs #40, #42, #43, C1.1)

Mark any line you want changed. Audience: **Client** = what a client or GC sees; **Operator** = only Brian's dashboard.
Client-facing lines will be re-set in the light theme; the words stay unless you change them here.

## PR-A: homepage (public)
| Where | Text |
|---|---|
| Section label | Additional services |
| Row 1 | **Thermal condition documentation** · Available on request for specific situations. |
| Row 2 | **Delivery systems for small firms** · Websites, dashboards, and project tooling built for how you work. |
| Footnote | Ask about either one in your request below. |

## PR-B: client portal (Client)
| Where | Text |
|---|---|
| Nothing shared on the link | Nothing is shared on this link yet. Ask the sender for an updated link. |
| Item detail, links section | See it in place |
| Deep link to something not shared | *(silent redirect to Overview, no text)* |
| Operator preview banner (only on preview links) | Operator preview · this is what the client sees · link expires in 30 minutes |

## PR-B + C1.1: Client portal panel (Operator)
| Where | Text |
|---|---|
| Title | Client portal |
| Intro | Check what this client bought. Anything still waiting stays hidden from them until it is ready. |
| Rows | Walkthrough · 360 stations · 3D twin · Documents · Items and questions |
| Readiness badge | Ready / Waiting |
| Readiness notes | "1 walkthrough ready" / "No walkthrough is ready to share" · "Published station tour" / "No published station tour" · "Accepted in QA" / "Waiting on QA acceptance" / "No published twin" · "3 documents on client items" / "No documents on client-visible items" · "2 client-visible items" / "No items yet · clients can ask questions from the walkthrough" |
| Buttons | Save · Preview as client |
| No preview possible | Preview opens once a walkthrough is ready to share. |
| After save | Saved. The client portal updates on the next page load. |
| Errors | Could not save. Try again. · Could not open a preview. |

## PR-C1: Directed Tour setup (Operator)
| Where | Text |
|---|---|
| Entry card (Spatial Walkthroughs tab) | **Directed Tour** · Route, checkpoints and visits clients compare · Open |
| Create route intro | A route is the path every visit follows, with checkpoints you return to each time. Clients compare visits at those checkpoints. |
| No usable visit | Upload a walkthrough and run its privacy bake first. The route is defined from a processed visit. |
| Create form | Route name, e.g. Level 1 full walk · (visit picker) · Create route |
| Header | Directed Tour route · Capture card |
| Visit tab states | Draft · Published · Not on route |
| Visit not on route | This visit is not on the route yet. · Add this visit to the route |
| Loading | Loading route… · Marking unlocks once the video has loaded. |
| No video | This visit has no operator-free video yet. Run the privacy bake in the walkthrough studio, then come back to mark it. |
| Empty chapter | No checkpoints yet. Scrub to a spot you will return to on every visit and add one. |
| Checkpoint actions | Matched here · Approximate · Not captured · Retire · Add checkpoint · Add and mark here · Add chapter |
| Placeholders | Checkpoint name, e.g. Corridor at door 104 · New chapter, e.g. Level 2 or Exterior |
| Mark states | Not set · Matched · 0:08 · Approximate · 0:08 · Not captured · Extracting still · 0:08 · Still failed · 0:08 |
| Retire confirm | Retire this checkpoint? Old links to it keep working, but it leaves the route. |
| Publish panel | Publish this visit · Draft / Published · Sep 30, 2026 |
| Checklist | On the route (3 checkpoints / Add at least one checkpoint) · Every checkpoint resolved (Matched, approximate or not captured / 2 not set: …) · Operator-free video (Public derivative ready / Run the privacy bake first) · Checkpoint stills extracted (All ready / 1 still not ready) · Stills and poster reviewed (Open each checkpoint in the player and check its still / Confirmed) · Privacy reviewed (Faces, plates and the operator are out of the published frames / Confirmed) |
| Publish actions | I reviewed every still · Privacy review done · Publish to client · Unpublish · Retry stills |
| Published note | Unpublish to change this visit's checkpoints. |
| Server messages shown in the page | Unpublish this visit before changing its checkpoints. · Wait until every still is ready, then review them · Run the privacy bake on this clip before marking it · This project already has a route · Retire this chapter's checkpoints first · Name the route / chapter / checkpoint · Wait for the video to load, then scrub to the spot. |
| Still errors | This clip has no operator-free video yet (run the privacy bake) · Still extraction is not configured |

## PR-C1: capture card (Operator, printed for the field)
| Where | Text |
|---|---|
| Header | Capture card · revision 1 · (route name) |
| Instructions box placeholder | Camera heights, forward direction, required close-ups. Example: High mast 7 ft, low 4 ft. Walk with the mast ahead. Close-ups of every sleeve and fire-stop. |
| Buttons | Save instructions · Print card |
| Per checkpoint | (number) · (reference still or "No reference still yet") · (checkpoint name) · (note) · Deviation or not accessible: ____ |
| Empty | Add checkpoints on the route first; they appear here in walking order. |
