# SlateDrop — Prompt Backlog

Last Updated: 2026-04-14
Doctrine Source: docs/SLATE360_MASTER_BUILD_PLAN.md

## Phase A — Pre-Design (Before Beta)

### SD-A1: Wire Site Walk Uploads to SlateDrop
- When /api/site-walk/upload stores a file to S3, also create slatedrop_uploads record
- Link to project's Site Walk subfolder in project_folders
- Ensure provisioning.ts creates Site Walk subfolder on project creation
- **Why now:** CRITICAL — doctrine requires connected project records

### SD-A2: Extract ProjectFileExplorer
- ProjectFileExplorer.tsx at 363 lines — exceeds 300-line limit
- Extract into: ProjectFileExplorerTree.tsx + ProjectFileExplorerActions.tsx or similar
- **Why now:** MODERATE — non-negotiable rule #1

### SD-A3: Verify Storage Tracking
- Check if lib/slatedrop/track-storage.ts is actually called on upload
- Check if storage limits are enforced based on subscription tier
- Document the gap if not wired
- **Why now:** MODERATE — storage is a billing dimension

### SD-A4: Add Collaborator File Access Scoping
- File access APIs must check project membership for collaborator role
- Collaborators can only view/upload files within their assigned project scope
- Collaborator uploads auto-placed in project folder structure (e.g., `Projects/{projectName}/Site Walk/Collaborator Uploads/`)
- Subscribers retain full control to move/organize collaborator files
- **Why now:** MODERATE — needed before collaborator flow can work with files

## Phase B — After Beta Stable

### SD-B1: Verify SlateDrop Auth
- SlateDrop is included with all tiers — verify auth wrappers are correct
- Should use withAuth() since it's a platform feature
- No subscription gating needed

### SD-B2: Share Link Security Audit
- Check share link expiry settings
- Verify access tokens are properly scoped
- Test: create link → access as external user → revoke → verify blocked

### SD-B3: File Preview Enhancement
- In-app preview for: images, PDFs, videos
- useSlateDropPreviewUrl.ts exists — wire into UI
- Thumbnail generation for grid view

## Deprioritized (Not Phase 1)

### SD-X1: Version History
- Track file versions on re-upload — future

### SD-X2: Bulk Upload UI
- Upload progress bar for multiple files — future

### SD-X3: Advanced Permissions
- Per-folder/file access control — future

### SD-X4: Notifications Overlay
- SlateDropNotificationsOverlay.tsx scaffolded (41 lines) — future
