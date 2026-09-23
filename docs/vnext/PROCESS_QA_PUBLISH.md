# Process, review, publish

Binding for client visibility after Slice 10.

A finished file is not a client deliverable. The operator path is process, review, preview as the client, then publish.

## States

| State | Meaning |
|---|---|
| Included | The service belongs to the project (`project_client_capabilities`). |
| Internal | A source exists. The client cannot open it. |
| Processing | A job is queued or running. |
| Ready | The output finished and can be opened. |
| Reviewed | An operator approved or rejected that exact source. Approval does not publish. |
| Published | That exact source is the client release. |
| Renderable | The client viewer can open it. |

Client visible = project access AND included AND published AND renderable.

## What is reviewed

The reviewed object is the client source, not the capture that produced it.

| Representation | Source |
|---|---|
| Reality | One ready splat model |
| Geometry | One ready mesh model |
| 360 | One non-deleted `photo_360` with storage |
| Plans | One sheet that has a thumbnail, raster, or image |
| Thermal | One thermal session with a usable capture |

`digital_twin_captures.review_status` is not the queue. It defaults to pending and nothing clears it.

## Publication source of truth

| Representation | Source of truth | Revoke |
|---|---|---|
| Reality | Active `project_source_publications` row, `representation = reality` | Sets `revoked_at`. Does not delete the model. |
| Geometry | Active row, `representation = geometry` | Same. Does not touch the Reality row. |
| 360 | Active row, `representation = pano360`, `source_id` is the item | Same. Does not delete the photo. |
| Plans | Active row, `representation = plans`, `source_id` is the sheet | Same. Does not delete the sheet or an older revision. |
| Thermal | A live, unexpired `thermal_analysis_share_tokens` row whose `layer_config` still leaves a capture | Sets `is_revoked`. No second published flag. |

`digital_twin_spaces.published_model_id` remains the legacy twin-share pointer. It is one model per space, so it cannot publish a splat and a mesh independently. vNext does not read it.

`is_current_revision` is the current drawing revision. It is not client publication.

Items and documents keep their existing client-folder and non-deleted rules. They are not in this publication table.

## Publish and revoke

`publish_project_source` revokes other active rows for the same project and representation, then upserts the chosen source. It does not revoke the other representation. Publishing model B leaves a published mesh in place.

`revoke_project_source` sets `revoked_at` on that source only.

Both functions execute as `service_role` only. The route is `POST /api/vnext/ops/projects/[projectId]/release`. It requires `canAccessOperationsConsole`, then checks the source belongs to that project. A cross-project id is not found. `user_can_manage_project` is not enough.

Review rows live in `project_source_reviews`. `approved` or `rejected`. No default pending. A missing row on a renderable unpublished source means it needs review. A note is optional and stays internal. `needs_recapture` is set only when the operator checks it.

## Backfill

The migration inserts publication rows only for sources the client could already open:

- Ready non-deleted splat in a live space.
- Ready non-deleted glb, gltf, or usdz in a live space.
- Non-deleted `photo_360` with a non-empty `s3_key`.
- A plan sheet with a thumbnail, raster, or image key.

It does not insert ply or splat_ply. It does not collapse several active rows. The next explicit publish of that representation leaves one active source. A source that was not client-visible is not backfilled.

## First model

The reconstruction callback still sets `published_model_id` and `is_primary` when a space has no model. Legacy twin share reads that pointer. vNext ignores it. A new first model is not client-visible until an operator publishes it.

## Preview as client

Current client view: `/vnext/ops/projects/[projectId]/client-preview`.

Candidate: `/vnext/ops/projects/[projectId]/client-preview/[representation]/[sourceId]`.

Both render the client shell. The candidate is a server argument on that owner route. It is not a query on `/vnext/projects/...`. A normal client who knows the id cannot open the media route unless the source is published or the caller is the operations owner. Leaving preview does not write.

If Thermal is not included, candidate preview does not add Thermal.

## Processing

`/vnext/ops/processing` lists queued, running, failed, and recently completed jobs from twin jobs, plan sets, and thermal jobs. Stage text comes from the job. `progress_pct` is shown only when the worker stored a number. Retry is not offered. Reconstruction retry charges credits.

## Home

Attention can be `processing_failed`, `ready_for_review`, or `ready_to_publish`. Review and publish rows exist only when the service is included and the QA row is still waiting. Approving, rejecting, or publishing removes that row. A finished internal file with no included service does not create attention.

## Deferred

Share recipients, expiry, passwords, and copy-link. Retry and reprocess. Recapture requests to the client. AI review.
