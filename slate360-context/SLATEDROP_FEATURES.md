# SlateDrop Features

## Purpose
SlateDrop is the single, unified file system for all users and all tabs. It behaves like Finder/Explorer with Dropbox-style sharing, and it is accessed consistently from the dashboard, project hub, and studio tabs.

## One SlateDrop, Everywhere
- Dashboard widget opens the same SlateDrop used across the app.
- Project Hub and Project Workspace open SlateDrop in a project context, but still the same system.
- Design Studio and other studios open the same SlateDrop panel for assets.

## Folder System
### System Folders (Locked)
- Always include: General, History.
- Tab folders are provisioned by tier and cannot be moved/renamed/deleted.
- Business/Enterprise (and Trial for upgrade continuity) also get a Projects folder.

### Tier-Specific Tab Folders
- Trial: all tabs visible, but deliverables are limited. Folders are created for each tab.
- Creator: Content Studio and 360 Tour Builder folders + General + History.
- Model: Design Studio, Content Studio, 360 Tour Builder, Geospatial & Robotics + General + History.
- Business/Enterprise: all tab folders + Projects + General + History.

### User Folders (Fully Editable)
- User-created folders allow rename, move, copy, delete, and share.
- Permissions can be applied at folder level for uploads and downloads.

### Projects Folder (Business/Enterprise)
- Each project creates a project root at /Projects/{projectId}.
- Subfolders for documents, drawings, photos, RFIs, submittals, schedule, budget, and records.
- Project folders are not locked for deletion by default unless explicitly protected.

## Permissions and Sharing
- Share links for external users with granular upload/download rights.
- Stakeholder links can be scoped to folders and time-limited.
- External response workflows drop files into response folders automatically.
- Central permissions should be managed from My Account (single source of truth).

## Explorer UI
- Sidebar folder tree with solid color icons and readable labels.
- List/grid/details view with drag-and-drop uploads.
- Context menu for file and folder actions.
- Drag targets are visible and usable with large, solid icons.

## Data Retention
- Trial users keep data on upgrade; nothing is deleted or moved.
- System folders remain stable across tier changes.
- Project data never leaves SlateDrop unless exported by the user.

## Exports
- Project Export & History is a My Account feature, not a SlateDrop folder.
- Archive exports should be generated from My Account with project selection.
- Exports are intended for audit and project closeout needs.
