# Geospatial & Robotics — Implementation Plan

## Purpose
Provide map-first mission planning and geospatial processing workflows for site intelligence and robotics operations.

## Current State
- Route scaffold exists.
- Strong spec for workflow/state; deep viewers still pending.

## Source Coverage
Derived from uploaded `raw-upload.txt` and roadmap notes.

## MVP Scope
1. Mission creation and AOI drawing.
2. Upload datasets + processing queue.
3. Map review and export package generation.
4. Interop with Project Hub and Virtual Studio.

## Data Contracts
- `Mission`, `MissionLayer`, `MissionUpload`, `ProcessJob`, `ExportPackage`.

## API Plan
- `/api/s3/presign`
- `/api/s3/presign-rinex`
- `/api/geospatial/process`
- Mission CRUD and export endpoints.

## Customization Requirements
- Map/3D mode switch with saved preference.
- Collapsible layer library and processing drawer.
- Resizable inspector panels.
- Mode presets (`simple`, `advanced`) persisted.

## Dependencies
- Storage + queue stability.
- Optional 3D point-cloud stack.

## Definition of Done
- Mission pipeline works from setup to export.
- Processing state is observable and recoverable.
- Layout and mode customizations persist.
