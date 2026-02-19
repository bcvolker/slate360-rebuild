# Design Studio Features

## Purpose
Design Studio is Slate360's 3D and 2D workspace for model creation, review, markup, and fabrication preparation. It unifies 3D modeling and 2D plan markup in one tab.

## User Profiles and Modes
- Starter: drag-and-drop uploads, simple navigation, quick markups, easy exports.
- Pro: layers, transforms, basic print prep, attachments to Project Hub.
- Expert: parametric tools, advanced analysis, collaboration options.

## Primary Layout
- Shared dashboard shell for consistent navigation and actions.
- Left panel: assets, versions, uploads, and file list from SlateDrop.
- Center canvas: 3D or 2D surface depending on view.
- Right panel: context-aware tools based on mode.
- Mode bar: Upload, Model, Review, Print, Analysis.
- View toggle: 3D Model / 2D Plans to avoid tool fragmentation.

## Core Capabilities
### Upload and Convert
- Drag-and-drop for common 3D formats (GLB, OBJ, IFC, STL) and photo sets.
- Automatic conversion to internal GLB for fast rendering.
- Thumbnail generation and lightweight previews.
- File Prep modal determines file type and routes conversion.
- Revit and DWG conversion handled through an API service, returning GLB.
- PDF uploads route to the 2D plan viewer.

### 3D Model View
- Orbit, pan, zoom, and section planes.
- Measure and annotate in 3D space.
- Layer toggles for BIM categories.
- Simple transforms and snapping (Pro level).
- Export IFC and GLB for downstream workflows.

### 2D Plans View (Bluebeam-style)
- Toggle to switch from 3D to 2D plans.
- PDF viewer with markup layer (pen, cloud, text, measure).
- Export annotated PDF (flattened).
- Context-aware toolbar switches tools based on 2D vs 3D modes.

### Review and Collaboration
- Snapshots and annotated exports.
- Send model context to Virtual Studio.
- Attach views to Project Hub RFIs, submittals, and issues.
- Review links can share a specific view state.

### Print and Fabrication
- Basic STL export and print presets.
- Planned: print queue and multi-printer management.
- Material presets and time/cost estimates in Pro and Expert tiers.

### Analysis (Advanced)
- Flatness heatmaps for surface QA.
- Thermal overlays for inspection reporting.
- Simple PDF exports for compliance and reporting.
- Advanced users can compare versions and highlight diffs.

## Integration With Other Tabs
- SlateDrop provides a shared asset library for models and drawings.
- Project Hub can open Design Studio at a specific model and view.
- Virtual Studio receives scenes and snapshots for immersive review.
- Content Studio can consume sequences or clips exported from models.

## UX Principles
- Context-aware toolbar: only show tools that match the current view.
- Guided progression from simple to advanced tools.
- Clear AI disclaimers where automated analysis is used.
- Keep feature depth high but surface it through mode switching.

## Competitive Positioning
- SketchUp/Revit: simpler UX with adequate modeling and markup.
- Bluebeam: integrated 2D markup within the same tab.
- DroneDeploy/Pix4D: direct pipeline for photogrammetry and geo data.
