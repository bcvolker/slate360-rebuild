# Virtual Studio — Implementation Plan

## Purpose
Deliver interactive 3D collaboration surface for exploration, comparison, and stakeholder walkthroughs.

## Current State
- Route scaffold exists.
- Feature set mostly specification-level.

## Source Coverage
Derived from uploaded `raw-upload.txt` and roadmap references.

## MVP Scope
1. Load and explore scene assets.
2. Compare mode (design vs scan) with blend/x-ray controls.
3. Hotspot capture and share/export flow.
4. Interop with Tour Builder and Analytics.

## Data Contracts
- `VirtualScene`, `ComparisonSet`, `VirtualHotspot`, `Viewpoint`, `ReportArtifact`.

## API Plan
- `POST /api/virtual-studio/load-scene`
- `POST /api/virtual-studio/load-comparison`
- `POST /api/virtual-studio/generate-tour`
- `POST /api/virtual-studio/export-report`

## Customization Requirements
- Movable mode/tool clusters.
- Expandable hotspot tray and inspector.
- Resizable side panels.
- Persisted per-mode layout.

## Dependencies
- Stable model loading and signed URL access.
- Report generation integration.

## Definition of Done
- User can explore, compare, annotate, and export.
- View modes and layout preferences persist.
