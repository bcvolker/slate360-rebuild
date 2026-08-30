# Spatial Walkthrough — chapters and long-capture navigation

Branch base: `feature/spatial-walkthrough-rc1` (branding + privacy integrated).  
Scope: logical Spaces/Chapters on a long capture. No media ingest, branding, privacy, or headset work.

## Model

Capture / visit → Clips → Chapters / spaces → Waypoints + Pins

A chapter is a time range on a source clip. It is not a copied video. Deleting a chapter never deletes the clip, master, or project files.

## Schema (additive)

`spatial_chapters`: id, walkthrough_id, clip_id, name, building, floor, zone (room), chapter_type, start_time, end_time, default_yaw, default_pitch, sort_order, thumbnail_key, visibility, description.

`spatial_clip_edges`: source/dest clip + endpoint, default look, transition_type (`door` | `stairs` | `exterior` | `aerial` | `manual`).

`spatial_share_tokens.chapter_id` optional — a Space can be shared on its own.

Entire Walk is virtual (not a row) and may cross clips via edges.

## Authoring

Paused video: **Start space here** / **End space here**, or timestamps. Timeline shows chapter bands. Rename, reorder, delete.

## Viewer

Picker: Entire Walk or a space. Selecting a chapter seeks to start, looks to default yaw/pitch, pauses, scopes Next/Prev waypoints, and shows the name. Same-clip chapter boundaries do not cut; the video continues. Crossing clips uses a short fade and a location chip.

## Deep links

`/w/{token}` unchanged (Entire Walk). Optional `?clip=&chapter=&t=&yaw=&pitch=&pin=`.

## Library

Spaces are listed beside walkthroughs and filter by date, building, floor, room/zone, and capture type.

## Screenshots

`docs/qa/spatial-chapters-screenshots/` via `node scripts/ops/capture-spatial-chapters.mjs`.
