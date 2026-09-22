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

The backfill for thermal does not read `layer_config`. Runtime still uses `isThermalSessionAvailable`, so an excluded capture is not rendered. Slice 10 can tighten the backfill.

Replacing scope deletes the project's rows and inserts the full set. If the insert fails after the delete, the project looks unconfigured: services hidden, portal sections on. That hides a service. It does not reveal one.

## Publication stand-in

Slice 10 replaces these with an explicit publish action. Until then, the central rule is:

| Capability | Included | Published / renderable stand-in used now |
|---|---|---|
| Reality | Row, or backfill when a ready splat exists in a live space | Ready splat in a live space. `ready` is temporarily treated as published. |
| Geometry | Same, for a ready glb/gltf | Ready mesh in a live space. Same temporary stand-in. |
| 360 | Row, or backfill when a non-deleted `photo_360` has `s3_key` | That photo. There is no separate publish flag. |
| Plans | Row, or backfill when a sheet has a thumbnail, raster, or image key | That sheet image. Processing sheets without an image stay out. |
| Thermal | Row, or backfill approximating a live share | `isThermalSessionAvailable`: share not revoked or expired, and a viewable capture remains. This is a real publish state. |
| Items | Portal default on | Non-deleted project items. |
| Documents | Portal default on | Active files in a client folder. |
| History | Portal default on | The Slice 7 record rules, then drop any visit whose representation is not included. |
| Compare | Portal default on | History is on, and both visits can render an included representation. |

An included service with nothing renderable is not shown. The client does not see "no thermal scans yet."

## Owner and client

The owner write contract exists. The owner screen that lists included services, internal assets, QA, and published sources does not. That is Slice 9 and Slice 10.
