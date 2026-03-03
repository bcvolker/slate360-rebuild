# Design Studio — Implementation Plan

## Purpose
Build flagship design/review workspace for 2D/3D/BIM collaboration, annotation, and export workflows.

## Current State
- Route scaffold exists.
- Functional module is not built yet.

## Source Coverage
Derived from uploaded `raw-upload.txt` plus `FUTURE_FEATURES.md` Phase 2.

## MVP Scope
1. Shell layout (top actions, left library, center canvas, right inspector).
2. File ingest + viewer baseline (2D PDF + 3D model).
3. Annotation/review + export artifacts into SlateDrop.
4. Mode presets: upload, model, review, print, analysis.

## Data Contracts
- `DesignAsset`, `DesignScene`, `Annotation`, `ReviewPin`, `ExportArtifact`.

## API Plan
- Upload/convert status routes.
- Save/load workspace state routes.
- Export/report routes for stakeholder deliverables.

## Customization Requirements
- Resizable left/right panels.
- Movable toolbar groups.
- Expandable libraries and inspector sections.
- Mode presets and per-user custom layouts.

## Dependencies
- Viewer stack decisions (Three.js + PDF.js + optional IFC path).
- Queue pipeline for conversion-heavy assets.

## Definition of Done
- User can ingest files, review/annotate, export.
- Workspace layout customizations persist and restore.
