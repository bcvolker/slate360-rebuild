# Project client delivery scope

Binding for every later vNext slice.

Slate360 sells services per project. A client sees a capability only when all of these are true:

```
CLIENT_VISIBLE
  = project access
  AND the capability is included for this project
  AND the source is published, where a publish state exists
  AND the source is renderable
```

These are three different facts. Do not collapse them.

| Fact | Meaning |
|---|---|
| Included | Brian sold or authorized this service for this project. Stored on `project_client_capabilities`. |
| Published | This specific source was released to the client. |
| Renderable | The app can open that source. |

This is not a subscription, tier, seat, trial, or billing entitlement. `org_feature_flags` is not project scope.

## Invisibility

If a capability is not included, the client portal does not mention it. No tab, filter, row, compare choice, search hit, count, empty state, lock, or upsell. A direct URL does not name the missing service. It is not found.

Included but not yet captured is an owner fact. The client does not get an empty tab while waiting.

## Capability ids

| Id | Client label | Kind |
|---|---|---|
| `reality` | Reality | Service |
| `geometry` | Geometry | Service |
| `pano360` | 360 | Service |
| `plans` | Plans | Service |
| `thermal` | Thermal | Service |
| `items` | Items | Portal section |
| `documents` | Documents | Portal section |
| `history` | History | Portal section |
| `compare` | Compare | Portal section |

Drone and Design Studio are not ids. They are not shown.

One resolver owns the rule: `resolveClientProjectScope`, `canClientSeeCapability`, `canClientSeeRepresentation`, `filterVisitsForScope`, `projectNavForScope`, `compareRepAllowed`. Overview, Explore, History, Search, and navigation consume that. They do not decide on their own.

## Storage and defaults

Table: `project_client_capabilities` (`project_id`, `capability_id`, `included`). Primary key is the pair. Writes require `user_can_manage_project` (owner, admin, member, manager). Collaborators and viewers cannot write. The API is `PUT /api/vnext/projects/[projectId]/scope` with `{ included: string[] }`. Unknown ids are dropped. Every known id is stored, so a project with services off stays configured.

| Situation | Rule |
|---|---|
| No rows | Unconfigured. Portal sections stay on. Services stay off. A ready file does not turn a service on. |
| Any stored row | Only ids with `included = true` are on. Missing ids stay off. |
| New project | Trigger seeds portal sections on and services off. |
| Existing projects | One-time backfill. Portal sections on. A service is on only when a client-visible source already exists. |

Thermal backfill uses `thermal_capture_allowed_by_share_layer`, the SQL form of `filterCapturesByLayerConfig`. A share whose `capture_ids` list hides every usable capture does not turn Thermal on. Runtime still uses `isThermalSessionAvailable`, so an included project with nothing viewable stays hidden.

Replacing scope calls `replace_project_client_scope`. That function upserts all nine ids in one transaction. It does not delete the rows first. A failed call leaves the previous set in place. The app still checks `user_can_manage_project` before the call, and the function checks it again.

## Publication

Ready is not published. The contract is `docs/vnext/PROCESS_QA_PUBLISH.md`. The Slice 10 migration backfills only sources that were already client-visible. A later ready source stays internal until an operator publishes it. `digital_twin_spaces.published_model_id` is not this contract.

| Capability | Included | Published and renderable |
|---|---|---|
| Reality | Row, or the Slice 7A backfill | Active `project_source_publications` row for that exact splat, and the model is ready. |
| Geometry | Same, for a mesh | Active row for that exact glb, gltf, or usdz. Independent of the Reality row. |
| 360 | Row, or backfill when a non-deleted `photo_360` has `s3_key` | Active row for that item, and the item still has storage. |
| Plans | Row, or backfill when a sheet has an image key | Active row for that sheet. `is_current_revision` is not publication. |
| Thermal | Row, or backfill from a live share whose `layer_config` still leaves a viewable capture | `isThermalSessionAvailable`. The share token is the publication. |
| Items | Portal default on | Non-deleted project items. |
| Documents | Portal default on | Active files in a client folder. |
| History | Portal default on | Slice 7 visit rules, then drop a visit whose representation is not included or whose source is not published. |
| Compare | Portal default on | History is on, and both visits can render an included published representation. |

An included service with nothing renderable is not shown. The client does not see "no thermal scans yet."

## Owner and client

The owner writes scope on the project page. Processing, QA, and preview as client are `/vnext/ops/processing`, `/vnext/ops/qa`, and `/vnext/ops/projects/[projectId]/client-preview`. Share recipients stay in Slice 11.
