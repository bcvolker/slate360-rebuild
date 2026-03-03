# 360 Tour Builder — Implementation Plan

## Purpose
Create immersive multi-scene 360 tours with hotspots, branding, and publish/share workflows.

## Current State
- Route scaffold exists.
- Uploaded specs are rich but duplicated; now normalized here.

## Source Coverage
Derived from uploaded `raw-upload-1.txt` + `raw-upload-2.txt` and roadmap notes.

## MVP Scope
1. Panorama ingest and scene sequencing.
2. Hotspot authoring with media embeds.
3. Tour publish/share controls (password, expiry, embed).
4. Basic analytics handoff to Analytics & Reports.

## Feature Extensions (planned)
- AI hotspot suggestions.
- Progression tours and before/after states.
- VR/web export variants.

## Data Contracts
- `Tour`, `Scene`, `Hotspot`, `BrandPreset`, `SharePolicy`, `TourEvent`.

## API Plan
- Upload/stitch queue routes.
- Scene/hotspot CRUD routes.
- Publish/embed and access policy routes.
- View/click telemetry routes.

## Customization Requirements
- 70% center viewport by default.
- Collapsible scene library panel and settings panel.
- Movable top toolbar groups.
- Expandable timeline and queue sections.

## Dependencies
- Panorama stack + queue processing.
- SlateDrop artifact IO and public link controls.

## Definition of Done
- User can build and publish a branded tour end-to-end.
- Permissions/expiry/share behavior is reliable.
- Layout customization persists across sessions.
